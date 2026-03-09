"""
backend/email/provider_router.py

Provider Priority Router
========================
Selects email providers in priority order:
  1. Resend        (API - HTTPS 443)
  2. SendGrid      (API - HTTPS 443)
  3. Mailgun       (API - HTTPS 443)
  4. Brevo         (API - HTTPS 443)
  5. Postmark      (API - HTTPS 443)
  6. Zoho Mail API (API - HTTPS 443, optional)
  7. SMTP          (final fallback - may be blocked on port 587)

For each recipient the router walks the chain until one succeeds.
All provider credentials are read from environment variables.
"""

from __future__ import annotations

import logging
import os
import smtplib
import socket
import time
from dataclasses import dataclass, field
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

SMTP_ENABLE_FLAGS = {"true", "1", "yes", "on"}


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
    provider_type: str                     # "resend" | "sendgrid" | … | "smtp"
    api_key: Optional[str] = None
    from_email: Optional[str] = None
    domain: Optional[str] = None
    base_url: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Provider detection from startup-loaded configuration
# ---------------------------------------------------------------------------

def _smtp_enabled(provider_payload: Optional[Dict[str, Any]] = None) -> bool:
    """
    SMTP is disabled by default. Enable only via explicit flag:
      - provider_payload.extra.enable_smtp = true
      - provider_payload.extra.allow_smtp = true
      - EMAIL_ROUTER_ENABLE_SMTP=true
    """
    if os.getenv("EMAIL_ROUTER_ENABLE_SMTP", "").strip().lower() in SMTP_ENABLE_FLAGS:
        return True
    if not provider_payload:
        return False
    extra = provider_payload.get("extra") or {}
    return bool(extra.get("enable_smtp") or extra.get("allow_smtp"))


def _normalize_provider_type(provider_type: Any) -> str:
    raw = provider_type.value if hasattr(provider_type, "value") else provider_type
    val = str(raw or "").lower()
    if val == "sendinblue":
        return "brevo"
    return val


def _smtp_from_config(name: str, cfg: Any) -> Optional[RoutedProviderConfig]:
    if not (cfg.smtp_host and cfg.smtp_username and cfg.smtp_password):
        return None
    return RoutedProviderConfig(
        name=name or "smtp",
        provider_type="smtp",
        smtp_host=cfg.smtp_host,
        smtp_port=int(cfg.smtp_port or 587),
        smtp_username=cfg.smtp_username,
        smtp_password=cfg.smtp_password,
        from_email=cfg.from_email or cfg.smtp_username,
        extra=cfg.extra or {"use_tls": True},
    )


def _api_from_config(name: str, cfg: Any, provider_type: str) -> Optional[RoutedProviderConfig]:
    if provider_type == "zoho":
        account_id = (cfg.extra or {}).get("account_id")
        if not (cfg.api_key and (cfg.base_url or account_id)):
            return None
        base_url = cfg.base_url or f"https://mail.zoho.com/api/accounts/{account_id}/messages"
        return RoutedProviderConfig(
            name=name or "zoho-api",
            provider_type="zoho-api",
            api_key=cfg.api_key,
            from_email=cfg.from_email,
            base_url=base_url,
            extra=cfg.extra or {},
        )

    if provider_type and provider_type != "smtp" and cfg.api_key:
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


def _detect_providers(include_smtp: bool = False) -> List[RoutedProviderConfig]:
    """
    Build provider chain from startup-loaded CONFIGURED_PROVIDERS.
    API providers are always first. SMTP is appended only if explicitly enabled.
    """
    api_chain: List[RoutedProviderConfig] = []
    smtp_chain: List[RoutedProviderConfig] = []

    for name, cfg in _get_configured_providers().items():
        ptype = _normalize_provider_type(getattr(cfg, "provider_type", ""))

        api_cfg = _api_from_config(name, cfg, ptype)
        if api_cfg:
            api_chain.append(api_cfg)
            continue

        if include_smtp:
            smtp_cfg = _smtp_from_config(name, cfg)
            if smtp_cfg:
                smtp_chain.append(smtp_cfg)

    # Keep a single SMTP fallback entry even if multiple SMTP-like providers exist.
    if smtp_chain:
        smtp_chain = [smtp_chain[0]]

    return api_chain + smtp_chain


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
    resp = httpx.post(
        cfg.base_url or "",
        headers={
            "Authorization": f"Zoho-oauthtoken {cfg.api_key}",
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


def _send_via_smtp(cfg: RoutedProviderConfig, to: str, subject: str, body: str) -> None:
    """
    Synchronous SMTP send with short connection timeout so port-blocked
    connections fail fast and fall back to the next API provider.
    """
    CONNECT_TIMEOUT = int(os.getenv("SMTP_CONNECT_TIMEOUT", "8"))  # seconds

    mime_type = "html" if body.strip().startswith("<") else "plain"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg.from_email or cfg.smtp_username or ""
    msg["To"] = to
    msg.attach(MIMEText(body, mime_type))

    use_tls = cfg.extra.get("use_tls", True)

    try:
        if use_tls:
            server = smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=CONNECT_TIMEOUT)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, timeout=CONNECT_TIMEOUT)

        server.login(cfg.smtp_username, cfg.smtp_password)
        server.sendmail(cfg.from_email or cfg.smtp_username, [to], msg.as_string())
        server.quit()

    except (socket.timeout, TimeoutError, OSError) as exc:
        raise RuntimeError(
            f"SMTP connection to {cfg.smtp_host}:{cfg.smtp_port} timed out "
            f"(timeout={CONNECT_TIMEOUT}s) — port may be blocked: {exc}"
        ) from exc
    except smtplib.SMTPException as exc:
        raise RuntimeError(f"SMTP error: {exc}") from exc


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

_SEND_FUNC = {
    "resend":    _send_via_resend,
    "sendgrid":  _send_via_sendgrid,
    "brevo":     _send_via_brevo,
    "mailgun":   _send_via_mailgun,
    "postmark":  _send_via_postmark,
    "zoho-api":  _send_via_zoho_api,
    "smtp":      _send_via_smtp,
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


def build_provider_chain(override_smtp: Optional[Dict[str, Any]] = None) -> List[RoutedProviderConfig]:
    """
    Backwards-compatible wrapper for legacy calls.
    NOTE: New code should call build_provider_chain_from_payload instead.
    """
    include_smtp = bool(override_smtp)
    chain = _detect_providers(include_smtp=include_smtp)

    # Legacy opt-in: if override_smtp was provided and no SMTP from configured
    # providers was available, add payload SMTP as final fallback.
    if include_smtp and not any(c.provider_type == "smtp" for c in chain):
        smtp_cfg = RoutedProviderConfig(
            name="smtp",
            provider_type="smtp",
            smtp_host=override_smtp.get("smtp_host", ""),
            smtp_port=int(override_smtp.get("smtp_port", 587)),
            smtp_username=override_smtp.get("smtp_username", ""),
            smtp_password=override_smtp.get("smtp_password", ""),
            from_email=override_smtp.get("from_email", ""),
            extra=override_smtp.get("extra") or {},
        )
        # Avoid duplicate SMTP entries with same host/username
        if not any(
            c.provider_type == "smtp"
            and c.smtp_host == smtp_cfg.smtp_host
            and c.smtp_username == smtp_cfg.smtp_username
            for c in chain
        ):
            chain.append(smtp_cfg)

    if not chain:
        logger.error(
            "No email providers configured! "
            "Set env vars like PROVIDER_RESEND_API_KEY, PROVIDER_SENDGRID_API_KEY, etc."
        )
    else:
        _log_provider_chain(chain)
    return chain


def _routed_from_payload(cfg: Dict[str, Any]) -> RoutedProviderConfig:
    """
    Classify a campaign-level provider_config into API vs SMTP.

    Rules:
      - If api_key and base_url are present -> treat as API provider
      - elif smtp_host is present -> treat as SMTP provider
      - else -> error
    """
    api_key = cfg.get("api_key")
    base_url = cfg.get("base_url")
    provider_type_raw = (cfg.get("provider_type") or "").lower()

    # API provider from payload
    if api_key and base_url:
        # Map high-level provider_type to internal routed type
        if provider_type_raw in {"zoho", "zoho-api"}:
            routed_type = "zoho-api"
            name = "zoho-api"
        else:
            routed_type = provider_type_raw or "api"
            name = routed_type

        return RoutedProviderConfig(
            name=name,
            provider_type=routed_type,
            api_key=api_key,
            from_email=cfg.get("from_email"),
            domain=cfg.get("domain"),
            base_url=base_url,
            extra=cfg.get("extra") or {},
        )

    # SMTP provider from payload
    smtp_host = cfg.get("smtp_host")
    if smtp_host:
        return RoutedProviderConfig(
            name="smtp",
            provider_type="smtp",
            smtp_host=smtp_host,
            smtp_port=int(cfg.get("smtp_port", 587)),
            smtp_username=cfg.get("smtp_username"),
            smtp_password=cfg.get("smtp_password"),
            from_email=cfg.get("from_email"),
            extra=cfg.get("extra") or {},
        )

    raise ValueError(
        "Invalid provider_config: expected api_key+base_url for API or smtp_host for SMTP"
    )


def build_provider_chain_from_payload(
    provider_payload: Optional[Dict[str, Any]] = None,
) -> List[RoutedProviderConfig]:
    """
    Build provider chain using:
      1. API providers from startup-loaded CONFIGURED_PROVIDERS
      2. SMTP only when explicitly enabled
         (provider_payload.extra.enable_smtp / allow_smtp, or EMAIL_ROUTER_ENABLE_SMTP=true)

    Ensures:
      - API providers are always tried before SMTP.
      - Payload provider_type="smtp" does not force SMTP routing by default.
    """
    include_smtp = _smtp_enabled(provider_payload)
    chain = _detect_providers(include_smtp=include_smtp)

    payload_type = str((provider_payload or {}).get("provider_type") or "").lower()
    if payload_type == "smtp" and not include_smtp:
        logger.info("[router] Ignoring payload provider_type=smtp (SMTP disabled by default)")

    # Optional explicit SMTP from payload (only when SMTP is enabled), as a final
    # fallback if no configured SMTP was loaded.
    if include_smtp and provider_payload and not any(c.provider_type == "smtp" for c in chain):
        try:
            payload_cfg = _routed_from_payload(provider_payload)
            if payload_cfg.provider_type == "smtp":
                chain.append(payload_cfg)
        except ValueError:
            pass

    if not chain:
        logger.error(
            "No email providers configured from startup provider configuration."
        )
    else:
        _log_provider_chain(chain)

    return chain
