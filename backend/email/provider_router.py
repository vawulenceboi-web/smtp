"""
backend/email/provider_router.py

Provider Priority Router
========================
Selects email providers in priority order:
  1. Zoho Mail API (API - HTTPS 443)
  2. Brevo         (API - HTTPS 443)
  3. Mailgun       (API - HTTPS 443)
  4. SendGrid      (API - HTTPS 443)
  5. Resend        (API - HTTPS 443)
  6. Postmark      (API - HTTPS 443)

For each recipient the router walks the chain until one succeeds.
All provider credentials are read from environment variables.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

PROVIDER_PRIORITY = ["zoho", "brevo", "mailgun", "sendgrid", "resend", "postmark"]


def _get_configured_providers() -> Dict[str, Any]:
    """
    Load providers from existing startup config module.
    Kept lazy to avoid import-time dependency failures in lightweight contexts.
    """
    try:
        from ..config import CONFIGURED_PROVIDERS  # local import by design
        return CONFIGURED_PROVIDERS or {}
    except Exception as exc:
        logger.warning(f"[router] Could not load configured providers: {exc}")
        return {}

# ---------------------------------------------------------------------------
# Config dataclass (mirrors ProviderConfig but lives here for worker isolation)
# ---------------------------------------------------------------------------

@dataclass
class RoutedProviderConfig:
    name: str                              # human-readable label for logs
    provider_type: str                     # "zoho" | "brevo" | "mailgun" | "sendgrid" | "resend" | "postmark"
    api_key: Optional[str] = None
    from_email: Optional[str] = None
    domain: Optional[str] = None
    base_url: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Provider detection from startup-loaded configuration
# ---------------------------------------------------------------------------


def _normalize_provider_type(provider_type: Any) -> str:
    raw = provider_type.value if hasattr(provider_type, "value") else provider_type
    val = str(raw or "").lower()
    if val == "sendinblue":
        return "brevo"
    if val == "zoho-api":
        return "zoho"
    return val


def _api_from_config(name: str, cfg: Any, provider_type: str) -> Optional[RoutedProviderConfig]:
    if provider_type == "zoho":
        account_id = (cfg.extra or {}).get("account_id")
        if not (cfg.base_url or account_id):
            return None
        base_url = cfg.base_url or f"https://www.zohoapis.com/mail/v1/accounts/{account_id}/messages"
        return RoutedProviderConfig(
            name=name or "zoho",
            provider_type="zoho",
            api_key=cfg.api_key,
            from_email=cfg.from_email,
            base_url=base_url,
            extra=cfg.extra or {},
        )

    if provider_type in {"brevo", "mailgun", "sendgrid", "resend", "postmark"} and cfg.api_key:
        return RoutedProviderConfig(
            name=name or provider_type,
            provider_type=provider_type,
            api_key=cfg.api_key,
            domain=cfg.domain,
            from_email=cfg.from_email,
            base_url=cfg.base_url,
            extra=cfg.extra or {},
        )

    return None


def _detect_providers() -> List[RoutedProviderConfig]:
    """
    Build provider chain from startup-loaded CONFIGURED_PROVIDERS.
    API providers only, ordered by PROVIDER_PRIORITY.
    """
    buckets = {provider: [] for provider in PROVIDER_PRIORITY}

    for name, cfg in _get_configured_providers().items():
        ptype = _normalize_provider_type(getattr(cfg, "provider_type", ""))
        api_cfg = _api_from_config(name, cfg, ptype)
        if api_cfg and ptype in buckets:
            buckets[ptype].append(api_cfg)

    chain: List[RoutedProviderConfig] = []
    for provider in PROVIDER_PRIORITY:
        chain.extend(buckets[provider])
    return chain


def _chain_label(cfg: RoutedProviderConfig) -> str:
    return cfg.name or cfg.provider_type


def _log_provider_chain(chain: List[RoutedProviderConfig]) -> None:
    labels = [_chain_label(c) for c in chain]
    logger.info(f"[router] Provider chain: {' -> '.join(labels)}")


# ---------------------------------------------------------------------------
# Provider send implementations (sync, for Celery workers)
# ---------------------------------------------------------------------------

def _send_via_resend(cfg: RoutedProviderConfig, to: str, subject: str, body: str) -> None:
    resp = httpx.post(
        cfg.base_url or "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {cfg.api_key}",
            "Content-Type": "application/json",
        },
        json={"from": cfg.from_email, "to": [to], "subject": subject, "html": body},
        timeout=20,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Resend {resp.status_code}: {resp.text[:200]}")


def _send_via_sendgrid(cfg: RoutedProviderConfig, to: str, subject: str, body: str) -> None:
    resp = httpx.post(
        cfg.base_url or "https://api.sendgrid.com/v3/mail/send",
        headers={
            "Authorization": f"Bearer {cfg.api_key}",
            "Content-Type": "application/json",
        },
        json={
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": cfg.from_email},
            "subject": subject,
            "content": [{"type": "text/html", "value": body}],
        },
        timeout=20,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"SendGrid {resp.status_code}: {resp.text[:200]}")


def _send_via_brevo(cfg: RoutedProviderConfig, to: str, subject: str, body: str) -> None:
    resp = httpx.post(
        cfg.base_url or "https://api.brevo.com/v3/smtp/email",
        headers={"api-key": cfg.api_key or "", "Content-Type": "application/json"},
        json={
            "sender": {"email": cfg.from_email},
            "to": [{"email": to}],
            "subject": subject,
            "htmlContent": body,
        },
        timeout=20,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Brevo {resp.status_code}: {resp.text[:200]}")


def _send_via_mailgun(cfg: RoutedProviderConfig, to: str, subject: str, body: str) -> None:
    resp = httpx.post(
        cfg.base_url or f"https://api.mailgun.net/v3/{cfg.domain}/messages",
        auth=("api", cfg.api_key or ""),
        data={"from": cfg.from_email, "to": [to], "subject": subject, "html": body},
        timeout=20,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Mailgun {resp.status_code}: {resp.text[:200]}")


def _send_via_postmark(cfg: RoutedProviderConfig, to: str, subject: str, body: str) -> None:
    resp = httpx.post(
        cfg.base_url or "https://api.postmarkapp.com/email",
        headers={
            "X-Postmark-Server-Token": cfg.api_key or "",
            "Content-Type": "application/json",
        },
        json={
            "From": cfg.from_email,
            "To": to,
            "Subject": subject,
            "HtmlBody": body,
        },
        timeout=20,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Postmark {resp.status_code}: {resp.text[:200]}")


def _send_via_zoho_api(cfg: RoutedProviderConfig, to: str, subject: str, body: str) -> None:
    from ..zoho_token_manager import get_valid_zoho_token

    access_token = cfg.api_key or get_valid_zoho_token()
    resp = httpx.post(
        cfg.base_url or "",
        headers={
            "Authorization": f"Zoho-oauthtoken {access_token}",
            "Content-Type": "application/json",
        },
        json={
            "fromAddress": cfg.from_email,
            "toAddress": to,
            "subject": subject,
            "content": body,
            "mailFormat": "html",
        },
        timeout=20,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Zoho API {resp.status_code}: {resp.text[:200]}")


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

_SEND_FUNC = {
    "resend":    _send_via_resend,
    "sendgrid":  _send_via_sendgrid,
    "brevo":     _send_via_brevo,
    "mailgun":   _send_via_mailgun,
    "postmark":  _send_via_postmark,
    "zoho":      _send_via_zoho_api,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def send_with_failover(
    to: str,
    subject: str,
    body: str,
    provider_chain: List[RoutedProviderConfig],
    campaign_id: str = "",
) -> Tuple[str, str]:
    """
    Try each provider in `provider_chain` in order. Returns (provider_name, "sent") on
    success, or raises after all providers are exhausted.

    Returns:
        (provider_name, status)
    """
    last_exc: Optional[Exception] = None

    for cfg in provider_chain:
        send_fn = _SEND_FUNC.get(cfg.provider_type)
        if send_fn is None:
            logger.warning(f"[provider:{cfg.name}] Unknown provider type '{cfg.provider_type}' — skipping")
            continue

        logger.info(f"[provider:{cfg.name}] attempting")
        try:
            send_fn(cfg, to, subject, body)
            logger.info(f"[provider:{cfg.name}] success")
            return cfg.name, "sent"
        except Exception as exc:
            last_exc = exc
            logger.warning(f"[provider:{cfg.name}] failed: {exc}")

    raise RuntimeError(
        f"All providers exhausted for {to}. Last error: {last_exc}"
    ) from last_exc


def build_provider_chain() -> List[RoutedProviderConfig]:
    """
    Backwards-compatible wrapper for legacy calls.
    NOTE: New code should call build_provider_chain_from_payload instead.
    """
    chain = _detect_providers()

    if not chain:
        logger.error(
            "No email providers configured! "
            "Set env vars like PROVIDER_RESEND_API_KEY, PROVIDER_SENDGRID_API_KEY, etc."
        )
    else:
        _log_provider_chain(chain)
    return chain


def build_provider_chain_from_payload(
    provider_payload: Optional[Dict[str, Any]] = None,
) -> List[RoutedProviderConfig]:
    """
    Build provider chain using:
      1. API providers from startup-loaded CONFIGURED_PROVIDERS

    Ensures:
      - API providers are always tried before any other provider type.
    """
    chain = _detect_providers()

    if not chain:
        logger.error(
            "No email providers configured from startup provider configuration."
        )
    else:
        _log_provider_chain(chain)

    return chain
