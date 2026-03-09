"""
Celery worker task definitions.

The task 'app.tasks.process_campaign_batch' is dispatched by the FastAPI backend
(backend/tasks.py → celery_app.send_task).  The worker picks it up here.

Provider priority (highest → lowest):
  1. Resend API
  2. SendGrid API
  3. Brevo API
  4. Mailgun API
  5. Postmark API
  6. Zoho API (OAuth)
  7. SMTP from env vars
  8. SMTP from campaign payload (absolute fallback)
"""

from __future__ import annotations

import logging
import os
import random
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from celery_worker import celery

# Import provider router — relative path works because tasks.py is at the
# repo root alongside the `backend/` package.
import sys
sys.path.insert(0, os.path.dirname(__file__))
from backend.email.provider_router import build_provider_chain, send_with_failover

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Supabase helper (sync, no supabase-py needed)
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
    """Upsert a campaign_recipients row in Supabase."""
    base = os.getenv("SUPABASE_URL", "")
    if not base:
        logger.warning("SUPABASE_URL not set — skipping recipient status update")
        return

    now = datetime.now(timezone.utc).isoformat()
    hdrs = _supabase_headers()

    try:
        with httpx.Client(timeout=10) as client:
            # Try PATCH first (update existing row)
            patch_resp = client.patch(
                f"{base}/rest/v1/campaign_recipients"
                f"?campaign_id=eq.{campaign_id}&email=eq.{email}",
                json={"status": status, "provider": provider, "updated_at": now},
                headers=hdrs,
            )
            # Content-Range: */0 means no rows were matched → INSERT instead
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
    """Update the campaigns table with final sent/failed counts."""
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
# Main Celery task
# ---------------------------------------------------------------------------

@celery.task(
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
) -> Dict[str, Any]:
    """
    Worker entry-point.  For each recipient:
      1. Build provider priority chain from env vars.
      2. SMTP from campaign payload is the absolute last fallback.
      3. Try each provider via send_with_failover().
      4. Write sent/failed status back to Supabase.
      5. Slow-drip delay between sends (disabled locally via CELERY_SLOW_DRIP=false).
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


# ---------------------------------------------------------------------------
# Health / legacy stubs
# ---------------------------------------------------------------------------

@celery.task(name="tasks.health_check")
def health_check() -> Dict[str, str]:
    return {"status": "healthy", "message": "Celery worker is running"}


@celery.task(name="tasks.send_email")
def send_email(to: str, subject: str, body: str) -> Dict[str, str]:
    """Legacy stub — kept for backward compat."""
    return {"status": "stub", "to": to}


@celery.task(name="tasks.process_campaign")
def process_campaign(campaign_id: str) -> Dict[str, str]:
    """Legacy stub — kept for backward compat."""
    return {"status": "stub", "campaign_id": campaign_id}
