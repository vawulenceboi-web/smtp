import os
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from .database import get_db

logger = logging.getLogger(__name__)


async def set_recipient_status(
    campaign_id: str, email: str, status: str, provider: Optional[str] = None
):
    """
    Update recipient status in Supabase
    """
    db = get_db()
    await db.update_recipient_status(
        campaign_id=campaign_id,
        email=email,
        status=status,
        provider=provider or ""
    )


async def register_campaign(campaign_id: str, metadata: Dict[str, Any]):
    """
    Store high-level campaign metadata in Supabase using the real schema columns:
    id, name, status, total_recipients, sent_count, failed_count, created_at, updated_at.

    NOTE: relay_id, template_id, sender_email must be nullable in the DB.
    Run this migration in the Supabase SQL editor if not already done:

        ALTER TABLE public.campaigns
          ALTER COLUMN relay_id     DROP NOT NULL,
          ALTER COLUMN template_id  DROP NOT NULL,
          ALTER COLUMN sender_email DROP NOT NULL;
    """
    db = get_db()

    # Check if campaign already exists — skip insert if so
    existing = await db.get_campaign(campaign_id)
    if existing:
        logger.info(f"   Campaign {campaign_id} already exists in DB")
        return

    # Map "queued" -> "running" — schema CHECK allows only:
    # 'draft', 'running', 'paused', 'completed', 'failed'
    raw_status = metadata.get("status", "running")
    status_map = {
        "queued": "running",
        "draft": "draft",
        "running": "running",
        "paused": "paused",
        "completed": "completed",
        "failed": "failed",
    }
    db_status = status_map.get(raw_status, "running")

    campaign_data = {
        "id": campaign_id,
        "name": metadata.get("name", "Untitled Campaign"),
        "status": db_status,
        "total_recipients": int(metadata.get("target_count", 0)),
        "sent_count": 0,
        "failed_count": 0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    await db.create_campaign(campaign_data)
    logger.info(f"   Campaign {campaign_id} registered in DB")


async def list_campaigns() -> List[Dict[str, Any]]:
    """
    Return all campaigns from Supabase.
    """
    db = get_db()
    return await db.list_campaigns()


async def get_campaign_status(campaign_id: str) -> Dict[str, Any]:
    """
    Get campaign status including all recipient statuses.
    """
    db = get_db()

    campaign = await db.get_campaign(campaign_id)
    recipients = await db.get_campaign_recipients(campaign_id)

    recipients_dict = {
        r["email"]: {"status": r["status"], "provider": r.get("provider", "")}
        for r in recipients
    }

    return {
        "campaign_id": campaign_id,
        "campaign": campaign,
        "recipients": recipients_dict,
    }

