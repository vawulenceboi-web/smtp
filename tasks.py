"""
Celery tasks for background job processing.

These tasks are discovered and executed by the Celery worker.
The task name 'app.tasks.process_campaign_batch' MUST match exactly
what backend/tasks.py sends via celery_app.send_task().
"""

from celery_worker import celery
import logging
import random
import os
import time

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _send_smtp_email(smtp_host, smtp_port, smtp_username, smtp_password,
                     from_email, to_list, subject, body, use_tls=True):
    """Synchronous SMTP send using Python's built-in smtplib."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = ", ".join(to_list)

    mime_type = "html" if body.strip().startswith("<") else "plain"
    msg.attach(MIMEText(body, mime_type))

    if use_tls:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
        server.ehlo()
        server.starttls()
        server.ehlo()
    else:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)

    server.login(smtp_username, smtp_password)
    server.sendmail(from_email, to_list, msg.as_string())
    server.quit()


def _update_recipient_status(campaign_id, email, status, provider="smtp"):
    """Write recipient status back to Supabase synchronously via REST API."""
    import httpx
    from datetime import datetime

    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_KEY", "")
    if not supabase_url or not supabase_key:
        logger.warning("Supabase env vars not set — skipping recipient status update")
        return

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    now = datetime.utcnow().isoformat()

    try:
        with httpx.Client(timeout=10) as client:
            # Try PATCH (update) first
            resp = client.patch(
                f"{supabase_url}/rest/v1/campaign_recipients"
                f"?campaign_id=eq.{campaign_id}&email=eq.{email}",
                json={"status": status, "provider": provider, "updated_at": now},
                headers=headers,
            )
            # If nothing was updated (row didn't exist), INSERT it
            if resp.headers.get("content-range", "").startswith("*/0") or resp.text in ("", "[]"):
                client.post(
                    f"{supabase_url}/rest/v1/campaign_recipients",
                    json={
                        "campaign_id": campaign_id,
                        "email": email,
                        "status": status,
                        "provider": provider,
                        "created_at": now,
                        "updated_at": now,
                    },
                    headers=headers,
                )
    except Exception as e:
        logger.warning(f"Could not update recipient status in Supabase: {e}")


# ---------------------------------------------------------------------------
# Main task — name MUST match what backend/tasks.py dispatches
# ---------------------------------------------------------------------------

@celery.task(name="app.tasks.process_campaign_batch", bind=True, max_retries=3)
def process_campaign_batch(
    self,
    campaign_id: str,
    recipients: list,
    subject: str,
    body: str,
    headers: dict,
    provider_config: dict,
    proxy_config=None,
):
    """
    Processes a campaign batch: sends emails to all recipients via SMTP.
    Registered as 'app.tasks.process_campaign_batch' to match the name
    the FastAPI backend dispatches via celery_app.send_task().
    """
    logger.info(f"[campaign:{campaign_id}] ▶ Starting — {len(recipients)} recipient(s)")

    smtp_host = provider_config.get("smtp_host", "")
    smtp_port = int(provider_config.get("smtp_port", 587))
    smtp_username = provider_config.get("smtp_username", "")
    smtp_password = provider_config.get("smtp_password", "")
    from_email = provider_config.get("from_email") or smtp_username
    use_tls = bool((provider_config.get("extra") or {}).get("use_tls", True))

    # Disable slow-drip locally, enable in production
    slow_drip = os.getenv("CELERY_SLOW_DRIP", "true").lower() == "true"

    sent = 0
    failed = 0

    for recipient in recipients:
        email = recipient["email"]
        try:
            logger.info(f"[campaign:{campaign_id}] 📧 Sending to {email} via {smtp_host}:{smtp_port}")
            _send_smtp_email(
                smtp_host=smtp_host,
                smtp_port=smtp_port,
                smtp_username=smtp_username,
                smtp_password=smtp_password,
                from_email=from_email,
                to_list=[email],
                subject=subject,
                body=body,
                use_tls=use_tls,
            )
            _update_recipient_status(campaign_id, email, "sent", provider="smtp")
            logger.info(f"[campaign:{campaign_id}] ✅ Sent to {email}")
            sent += 1
        except Exception as exc:
            logger.error(f"[campaign:{campaign_id}] ❌ Failed to send to {email}: {exc}")
            _update_recipient_status(campaign_id, email, "failed", provider="smtp")
            failed += 1

        # Slow-drip: wait between sends to avoid spam filters
        if slow_drip and recipients.index(recipient) < len(recipients) - 1:
            delay = random.randint(30, 180)
            logger.info(f"[campaign:{campaign_id}] ⏳ Waiting {delay}s before next send...")
            time.sleep(delay)

    logger.info(f"[campaign:{campaign_id}] ✔ Done — sent:{sent}  failed:{failed}")
    return {"campaign_id": campaign_id, "sent": sent, "failed": failed}


# ---------------------------------------------------------------------------
# Legacy / health check stubs
# ---------------------------------------------------------------------------

@celery.task(name="tasks.health_check")
def health_check():
    return {"status": "healthy", "message": "Celery worker is running"}


@celery.task(name="tasks.send_email")
def send_email(to: str, subject: str, body: str):
    return {"status": "stub", "to": to}


@celery.task(name="tasks.process_campaign")
def process_campaign(campaign_id: str):
    return {"status": "stub", "campaign_id": campaign_id}
