"""Notifications API endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from ..database import get_supabase_client

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationSchema(BaseModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    admin_id: Optional[str]
    related_entity: Optional[str]
    related_entity_id: Optional[str]
    created_at: datetime
    read_at: Optional[datetime]


class NotificationCreateRequest(BaseModel):
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    type: str = Field(..., description="Notification type (info, warning, error, success)")
    admin_id: Optional[str] = Field(None, description="Admin ID if notification is for specific admin")
    related_entity: Optional[str] = Field(None, description="Related entity type (campaign, relay, template, etc.)")
    related_entity_id: Optional[str] = Field(None, description="Related entity ID")


class NotificationMarkRequest(BaseModel):
    is_read: bool = Field(default=True, description="Mark as read or unread")


@router.get("")
async def get_notifications(
    admin_id: Optional[str] = None,
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    limit: int = 50
):
    """Get notifications with optional filters."""
    client = get_supabase_client()
    
    query = client.table("notifications").select("*").order("created_at", desc=True).limit(limit)
    
    if admin_id:
        query = query.or_(f"admin_id.eq.{admin_id},admin_id.is.null")
    
    if is_read is not None:
        query = query.eq("is_read", is_read)
    
    if notification_type:
        query = query.eq("type", notification_type)
    
    response = query.execute()
    return response.data


@router.get("/{notification_id}")
async def get_notification(notification_id: str):
    """Get a specific notification."""
    client = get_supabase_client()
    
    response = client.table("notifications").select("*").eq("id", notification_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return response.data[0]


@router.get("/admin/{admin_id}")
async def get_admin_notifications(admin_id: str, is_read: Optional[bool] = None, limit: int = 50):
    """Get notifications for a specific admin."""
    client = get_supabase_client()
    
    query = client.table("notifications").select("*").or_(f"admin_id.eq.{admin_id},admin_id.is.null").order("created_at", desc=True).limit(limit)
    
    if is_read is not None:
        query = query.eq("is_read", is_read)
    
    response = query.execute()
    return response.data


@router.post("")
async def create_notification(request: NotificationCreateRequest):
    """Create a new notification."""
    client = get_supabase_client()
    
    # Validate notification type
    valid_types = ["info", "warning", "error", "success"]
    if request.type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {', '.join(valid_types)}")
    
    response = client.table("notifications").insert({
        "title": request.title,
        "message": request.message,
        "type": request.type,
        "admin_id": request.admin_id,
        "related_entity": request.related_entity,
        "related_entity_id": request.related_entity_id,
        "is_read": False,
    }).execute()
    
    return response.data[0] if response.data else None


@router.put("/{notification_id}")
async def update_notification(notification_id: str, request: NotificationMarkRequest):
    """Mark notification as read/unread."""
    client = get_supabase_client()
    
    update_data = {"is_read": request.is_read}
    if request.is_read:
        update_data["read_at"] = datetime.utcnow().isoformat()
    
    response = client.table("notifications").update(update_data).eq("id", notification_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return response.data[0]


@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read."""
    client = get_supabase_client()
    
    response = client.table("notifications").update({
        "is_read": True,
        "read_at": datetime.utcnow().isoformat()
    }).eq("id", notification_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return response.data[0]


@router.post("/admin/{admin_id}/mark-all-read")
async def mark_all_as_read(admin_id: str):
    """Mark all notifications for an admin as read."""
    client = get_supabase_client()
    
    response = client.table("notifications").update({
        "is_read": True,
        "read_at": datetime.utcnow().isoformat()
    }).or_(f"admin_id.eq.{admin_id},admin_id.is.null").eq("is_read", False).execute()
    
    return {"message": "All notifications marked as read", "count": len(response.data) if response.data else 0}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a notification."""
    client = get_supabase_client()
    
    response = client.table("notifications").delete().eq("id", notification_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted successfully"}


@router.get("/admin/{admin_id}/unread-count")
async def get_unread_count(admin_id: str):
    """Get unread notification count for an admin."""
    client = get_supabase_client()
    
    response = client.table("notifications").select("id", count="exact").or_(f"admin_id.eq.{admin_id},admin_id.is.null").eq("is_read", False).execute()
    
    return {"unread_count": response.count or 0}
