import os
import random
import time
import logging
import httpx
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .celery_app import celery_app
from .providers import (
    ProviderConfig,
    ProviderType,
    ProviderFactory,
    HardBounceError,
    SpamBlockedError,
    RateLimitError,
)
from .proxy import ProxyConfig, ProxyRotationManager
from .storage import set_recipient_status as legacy_set_recipient_status

# Import the new synchronous provider router
from .email.provider_router import build_provider_chain, send_with_failover

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Legacy Helpers
# ---------------------------------------------------------------------------

def _build_provider_config(raw: Dict[str, Any]) -> ProviderConfig:
    return ProviderConfig(
        provider_type=ProviderType(raw.get("provider_type", "smtp")),
        api_key=raw.get("api_key"),
        domain=raw.get("domain"),
        base_url=raw.get("base_url"),
        smtp_host=raw.get("smtp_host"),
        smtp_port=int(raw.get("smtp_port", 587)),
        smtp_username=raw.get("smtp_username"),
        smtp_password=raw.get("smtp_password"),
        from_email=raw.get("from_email"),
        extra=raw.get("extra") or {},
    )

def _build_proxy_config(raw: Optional[Dict[str, Any]]) -> ProxyConfig:
    if not raw:
        return ProxyConfig()
    return ProxyConfig(
        socks5_proxies=raw.get("socks5_proxies", []),
        rotate_after=raw.get("rotate_after", 10),
    )


# ---------------------------------------------------------------------------
# Supabase sync helpers (for worker execution)
# ---------------------------------------------------------------------------

def _supabase_headers() -> Dict[str, str]:
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY", "")
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

def _update_recipient_status(
    campaign_id: str,
    email: str,
    status: str,
    provider: str = "",
) -> None:
    base = os.getenv("SUPABASE_URL", "")
    if not base:
        logger.warning("SUPABASE_URL not set — skipping recipient update")
        return

    now = datetime.now(timezone.utc).isoformat()
    hdrs = _supabase_headers()

    try:
        with httpx.Client(timeout=10) as client:
            patch_resp = client.patch(
                f"{base}/rest/v1/campaign_recipients"
                f"?campaign_id=eq.{campaign_id}&email=eq.{email}",
                json={"status": status, "provider": provider, "updated_at": now},
                headers=hdrs,
            )
            needs_insert = (
                patch_resp.status_code == 404
                or patch_resp.headers.get("content-range", "").endswith("/0")
                or patch_resp.text in ("", "[]")
            )
            if needs_insert:
                client.post(
                    f"{base}/rest/v1/campaign_recipients",
                    json={
                        "campaign_id": campaign_id,
                        "email": email,
                        "status": status,
                        "provider": provider,
                        "created_at": now,
                        "updated_at": now,
                    },
                    headers={**hdrs, "Prefer": "return=minimal"},
                )
    except Exception as exc:
        logger.warning(f"[supabase] Could not update recipient status: {exc}")

def _update_campaign_counts(campaign_id: str, sent: int, failed: int) -> None:
    base = os.getenv("SUPABASE_URL", "")
    if not base:
        return

    total = sent + failed
    status = "completed" if failed == 0 else ("failed" if sent == 0 else "completed")
    now = datetime.now(timezone.utc).isoformat()

    try:
        with httpx.Client(timeout=10) as client:
            client.patch(
                f"{base}/rest/v1/campaigns?id=eq.{campaign_id}",
                json={
                    "sent_count": sent,
                    "failed_count": failed,
                    "status": status,
                    "updated_at": now,
                },
                headers=_supabase_headers(),
            )
    except Exception as exc:
        logger.warning(f"[supabase] Could not update campaign counts: {exc}")


# ---------------------------------------------------------------------------
# Celery Tasks
# ---------------------------------------------------------------------------

@celery_app.task(name="app.tasks.send_single_email_task")
def send_single_email_task(
    to: List[str],
    subject: str,
    body: str,
    headers: Dict[str, Any],
    provider_config: Dict[str, Any],
    proxy_config: Optional[Dict[str, Any]] = None,
):
    """
    Synchronous wrapper to call async provider.send_email from Celery.
    Used for single immediate sends.
    """
    import asyncio

    cfg = _build_provider_config(provider_config)
    proxy_cfg = _build_proxy_config(proxy_config)
    proxy_mgr = ProxyRotationManager(proxy_cfg)
    provider = ProviderFactory.from_config(cfg, proxy_mgr)

    async def _run():
        await provider.send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=cfg,
        )

    asyncio.run(_run())


@celery_app.task(
    name="app.tasks.process_campaign_batch",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def process_campaign_batch(
    self,
    campaign_id: str,
    recipients: List[Dict[str, Any]],
    subject: str,
    body: str,
    headers: Dict[str, Any],
    provider_config: Dict[str, Any],
    proxy_config: Optional[Dict[str, Any]] = None,
):
    """
    Worker entry point to process a batch of recipients with slow-drip
    timing and priority provider failover logic.
    """
    logger.info(f"[campaign:{campaign_id}] ▶ Starting — {len(recipients)} recipient(s)")

    # Build provider chain once per batch (shared across all recipients)
    smtp_override = provider_config if provider_config.get("provider_type") == "smtp" else None
    provider_chain = build_provider_chain(override_smtp=smtp_override)

    if not provider_chain:
        logger.error(f"[campaign:{campaign_id}] No providers configured — aborting")
        return {"campaign_id": campaign_id, "sent": 0, "failed": len(recipients), "error": "no_providers"}

    slow_drip = os.getenv("CELERY_SLOW_DRIP", "true").lower() == "true"
    sent = 0
    failed = 0

    for idx, recipient in enumerate(recipients):
        email = recipient.get("email", "")
        if not email:
            logger.warning(f"[campaign:{campaign_id}] Skipping recipient with no email: {recipient}")
            failed += 1
            continue

        try:
            used_provider, _ = send_with_failover(
                to=email,
                subject=subject,
                body=body,
                provider_chain=provider_chain,
                campaign_id=campaign_id,
            )
            _update_recipient_status(campaign_id, email, "sent", provider=used_provider)
            sent += 1
        except Exception as exc:
            logger.error(f"[campaign:{campaign_id}] ❌ All providers failed for {email}: {exc}")
            _update_recipient_status(campaign_id, email, "failed", provider="none")
            failed += 1

        # Slow-drip wait between sends (skip after last recipient)
        if slow_drip and idx < len(recipients) - 1:
            delay = random.randint(30, 180)
            logger.info(f"[campaign:{campaign_id}] ⏳ Slow-drip: waiting {delay}s before next send…")
            time.sleep(delay)

    # Write final campaign row counts
    _update_campaign_counts(campaign_id, sent, failed)

    logger.info(f"[campaign:{campaign_id}] ✔ Finished — sent:{sent}  failed:{failed}")
    return {"campaign_id": campaign_id, "sent": sent, "failed": failed}


def enqueue_campaign_batch(
    campaign_id: str,
    recipients: List[Dict[str, Any]],
    subject: str,
    body: str,
    headers: Dict[str, Any],
    provider_config: Dict[str, Any],
    proxy_config: Optional[Dict[str, Any]] = None,
):
    """
    Called from FastAPI to enqueue a campaign batch.
    """
    celery_app.send_task(
        "app.tasks.process_campaign_batch",
        kwargs={
            "campaign_id": campaign_id,
            "recipients": recipients,
            "subject": subject,
            "body": body,
            "headers": headers,
            "provider_config": provider_config,
            "proxy_config": proxy_config,
        },
    )
