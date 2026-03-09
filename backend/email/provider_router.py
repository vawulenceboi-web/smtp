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


def _env_first(*keys: str) -> str:
    """Return the first non-empty environment variable value from keys."""
    for key in keys:
        val = os.getenv(key)
        if val and val.strip():
            return val.strip()
    return ""

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
# Provider detection from environment variables
# ---------------------------------------------------------------------------

def _detect_providers(override_smtp: Optional[Dict[str, Any]] = None) -> List[RoutedProviderConfig]:
    """
    Build a priority-ordered list of configured providers by reading env vars.
    API providers are prioritized before SMTP fallback.
    """
    chain: List[RoutedProviderConfig] = []

    # 1 — Resend
    resend_key = _env_first("PROVIDER_RESEND_API_KEY", "RESEND_API_KEY")
    if resend_key:
        chain.append(RoutedProviderConfig(
            name="resend",
            provider_type="resend",
            api_key=resend_key,
            from_email=_env_first("PROVIDER_RESEND_FROM_EMAIL", "RESEND_FROM_EMAIL"),
            base_url=_env_first("PROVIDER_RESEND_BASE_URL", "RESEND_BASE_URL") or "https://api.resend.com/emails",
        ))

    # 2 — SendGrid
    sg_key = _env_first("PROVIDER_SENDGRID_API_KEY", "SENDGRID_API_KEY")
    if sg_key:
        chain.append(RoutedProviderConfig(
            name="sendgrid",
            provider_type="sendgrid",
            api_key=sg_key,
            from_email=_env_first("PROVIDER_SENDGRID_FROM_EMAIL", "SENDGRID_FROM_EMAIL"),
            base_url=_env_first("PROVIDER_SENDGRID_BASE_URL", "SENDGRID_BASE_URL") or "https://api.sendgrid.com/v3/mail/send",
        ))

    # 3 — Mailgun
    mg_key = _env_first("PROVIDER_MAILGUN_API_KEY", "MAILGUN_API_KEY")
    mg_domain = _env_first("PROVIDER_MAILGUN_DOMAIN", "MAILGUN_DOMAIN")
    if mg_key and mg_domain:
        chain.append(RoutedProviderConfig(
            name="mailgun",
            provider_type="mailgun",
            api_key=mg_key,
            domain=mg_domain,
            from_email=_env_first("PROVIDER_MAILGUN_FROM_EMAIL", "MAILGUN_FROM_EMAIL"),
            base_url=_env_first("PROVIDER_MAILGUN_BASE_URL", "MAILGUN_BASE_URL") or f"https://api.mailgun.net/v3/{mg_domain}/messages",
        ))

    # 4 — Brevo
    brevo_key = _env_first("PROVIDER_BREVO_API_KEY", "BREVO_API_KEY")
    if brevo_key:
        chain.append(RoutedProviderConfig(
            name="brevo",
            provider_type="brevo",
            api_key=brevo_key,
            from_email=_env_first("PROVIDER_BREVO_FROM_EMAIL", "BREVO_FROM_EMAIL"),
            base_url=_env_first("PROVIDER_BREVO_BASE_URL", "BREVO_BASE_URL") or "https://api.brevo.com/v3/smtp/email",
        ))

    # 5 — Postmark
    pm_key = _env_first("PROVIDER_POSTMARK_API_KEY", "POSTMARK_API_KEY")
    if pm_key:
        chain.append(RoutedProviderConfig(
            name="postmark",
            provider_type="postmark",
            api_key=pm_key,
            from_email=_env_first("PROVIDER_POSTMARK_FROM_EMAIL", "POSTMARK_FROM_EMAIL"),
            base_url=_env_first("PROVIDER_POSTMARK_BASE_URL", "POSTMARK_BASE_URL") or "https://api.postmarkapp.com/email",
        ))

    # 6 — Zoho API (only if API key is configured — not SMTP mode)
    zoho_api_key = _env_first("PROVIDER_ZOHO_API_KEY", "ZOHO_API_KEY")
    zoho_account_id = _env_first("PROVIDER_ZOHO_ACCOUNT_ID", "ZOHO_ACCOUNT_ID")
    if zoho_api_key and zoho_account_id:
        chain.append(RoutedProviderConfig(
            name="zoho-api",
            provider_type="zoho-api",
            api_key=zoho_api_key,
            from_email=_env_first("PROVIDER_ZOHO_FROM_EMAIL", "ZOHO_FROM_EMAIL"),
            base_url=f"https://mail.zoho.com/api/accounts/{zoho_account_id}/messages",
        ))

    # 7 — SMTP from env (e.g. Zoho SMTP, custom SMTP relay)
    smtp_host_env = _env_first("SMTP_HOST", "PROVIDER_ZOHO_HOST")
    smtp_user_env = _env_first("SMTP_USERNAME", "PROVIDER_ZOHO_USERNAME")
    smtp_pass_env = _env_first("SMTP_PASSWORD", "PROVIDER_ZOHO_PASSWORD")
    smtp_from_env = _env_first("SMTP_FROM_EMAIL", "PROVIDER_ZOHO_FROM_EMAIL")
    smtp_port_raw = _env_first("SMTP_PORT", "PROVIDER_ZOHO_PORT") or "587"
    try:
        smtp_port_env = int(smtp_port_raw)
    except ValueError:
        smtp_port_env = 587

    if smtp_host_env and smtp_user_env and smtp_pass_env:
        chain.append(RoutedProviderConfig(
            name="smtp",
            provider_type="smtp",
            smtp_host=smtp_host_env,
            smtp_port=smtp_port_env,
            smtp_username=smtp_user_env,
            smtp_password=smtp_pass_env,
            from_email=smtp_from_env or smtp_user_env,
            extra={"use_tls": True},
        ))

    return chain


def _chain_label(cfg: RoutedProviderConfig) -> str:
    return cfg.provider_type or cfg.name


def _log_provider_chain(chain: List[RoutedProviderConfig]) -> None:
    labels = [_chain_label(c) for c in chain]
    logger.info(f"[router] Provider chain ({len(labels)}): {' -> '.join(labels)}")


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

        logger.info(f"[provider:{cfg.name}] Sending to {to}" + (f" (campaign:{campaign_id})" if campaign_id else ""))
        try:
            send_fn(cfg, to, subject, body)
            logger.info(f"[provider:{cfg.name}] ✅ Sent to {to}")
            return cfg.name, "sent"
        except Exception as exc:
            last_exc = exc
            # Find next provider name for logging
            cur_idx = provider_chain.index(cfg)
            next_cfg = provider_chain[cur_idx + 1] if cur_idx + 1 < len(provider_chain) else None
            if next_cfg:
                logger.warning(
                    f"[provider:{cfg.name}] ❌ Failed → falling back to [{next_cfg.name}] | error: {exc}"
                )
            else:
                logger.error(
                    f"[provider:{cfg.name}] ❌ Failed — no more providers | error: {exc}"
                )

    raise RuntimeError(
        f"All providers exhausted for {to}. Last error: {last_exc}"
    ) from last_exc


def build_provider_chain(override_smtp: Optional[Dict[str, Any]] = None) -> List[RoutedProviderConfig]:
    """
    Backwards-compatible wrapper for legacy calls.
    NOTE: New code should call build_provider_chain_from_payload instead.
    """
    chain = _detect_providers()

    # Legacy behaviour: allow SMTP from payload as last fallback when explicitly passed.
    if override_smtp:
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
      1. Environment API providers (priority order from _detect_providers)
      2. Payload API providers (primary + fallback_provider_configs)
      3. SMTP providers only as final fallback (env SMTP, then payload SMTP)

    Ensures:
      - API providers are always tried before SMTP.
      - Duplicate providers (same provider_type + base_url / smtp_host) are removed.
    """
    env_chain = _detect_providers()
    api_chain: List[RoutedProviderConfig] = []
    smtp_chain: List[RoutedProviderConfig] = []
    seen_keys: set[Tuple[str, str]] = set()

    def _key(c: RoutedProviderConfig) -> Tuple[str, str]:
        # Uniqueness key: (provider_type, identifier)
        if c.provider_type == "smtp":
            # Keep a single SMTP fallback slot at the end of the chain.
            ident = "smtp"
        else:
            ident = c.base_url or c.domain or c.name
        return (c.provider_type, ident or c.name)

    def _add(cfg: RoutedProviderConfig) -> bool:
        k = _key(cfg)
        if k in seen_keys:
            return False
        seen_keys.add(k)
        if cfg.provider_type == "smtp":
            smtp_chain.append(cfg)
        else:
            api_chain.append(cfg)
        return True

    # 1) Environment-configured providers (API first in _detect_providers, SMTP last)
    for cfg in env_chain:
        _add(cfg)

    # 2) Primary provider from payload (if it is API, append after env APIs)
    payload_primary: Optional[RoutedProviderConfig] = None
    if provider_payload:
        try:
            payload_primary = _routed_from_payload(provider_payload)
            if payload_primary.provider_type != "smtp":
                if _add(payload_primary):
                    logger.info(f"[router] Added payload API provider: {payload_primary.name}")
        except ValueError as exc:
            logger.error(f"[router] Invalid provider payload: {exc}")

    # 3) Fallback API providers from payload.extra.fallback_provider_configs (if any)
    if provider_payload:
        extra = provider_payload.get("extra") or {}
        fallbacks = extra.get("fallback_provider_configs") or []
        if isinstance(fallbacks, list):
            for raw_fb in fallbacks:
                if not isinstance(raw_fb, dict):
                    continue
                try:
                    fb_cfg = _routed_from_payload(raw_fb)
                except ValueError:
                    continue
                if fb_cfg.provider_type == "smtp":
                    continue
                if _add(fb_cfg):
                    logger.info(f"[router] Added payload fallback API provider: {fb_cfg.name}")

    # 4) SMTP from payload as absolute final fallback (if configured and not already present)
    if payload_primary and payload_primary.provider_type == "smtp":
        if _add(payload_primary):
            logger.info("[router] Added payload SMTP as final fallback")

    chain = api_chain + smtp_chain

    if not chain:
        logger.error(
            "No email providers configured from payload or environment. "
            "Expected at least one API provider (api_key+base_url) or SMTP (smtp_host)."
        )
    else:
        _log_provider_chain(chain)

    return chain
