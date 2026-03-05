import os
from typing import Any, Dict, List, Optional
from datetime import datetime

from .database import get_db


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
    Store high-level campaign metadata in Supabase.
    If campaign exists, update it. Otherwise, create it.
    """
    db = get_db()
    
    # Check if campaign exists
    existing = await db.get_campaign(campaign_id)
    
    campaign_data = {
        **metadata,
        "id": campaign_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    if existing:
        await db.update_campaign(campaign_id, campaign_data)
    else:
        await db.create_campaign(campaign_data)


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
    
    recipients_dict = {r["email"]: {"status": r["status"], "provider": r.get("provider", "")} for r in recipients}
    
    return {
        "campaign_id": campaign_id,
        "campaign": campaign,
        "recipients": recipients_dict,
    }

