"""Settings API endpoints for application configuration."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from ..database import get_supabase_client

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsSchema(BaseModel):
    id: str
    key: str
    value: str
    category: str = "general"
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SettingsCreateRequest(BaseModel):
    key: str = Field(..., description="Setting key (e.g., 'smtp_timeout')")
    value: str = Field(..., description="Setting value")
    category: str = Field(default="general", description="Category (general, security, performance, etc.)")
    description: Optional[str] = Field(None, description="Description of the setting")


class SettingsUpdateRequest(BaseModel):
    value: str
    description: Optional[str] = None


@router.get("")
async def get_all_settings(category: Optional[str] = None):
    """Get all settings, optionally filtered by category."""
    client = get_supabase_client()
    
    query = client.table("settings").select("*")
    
    if category:
        query = query.eq("category", category)
    
    response = query.execute()
    return response.data


@router.get("/{setting_id}")
async def get_setting(setting_id: str):
    """Get a specific setting by ID."""
    client = get_supabase_client()
    
    response = client.table("settings").select("*").eq("id", setting_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return response.data[0]


@router.get("/key/{key}")
async def get_setting_by_key(key: str):
    """Get a setting by its key name."""
    client = get_supabase_client()
    
    response = client.table("settings").select("*").eq("key", key).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return response.data[0]


@router.post("")
async def create_setting(request: SettingsCreateRequest):
    """Create a new setting."""
    client = get_supabase_client()
    
    # Check if key already exists
    existing = client.table("settings").select("id").eq("key", request.key).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Setting with this key already exists")
    
    response = client.table("settings").insert({
        "key": request.key,
        "value": request.value,
        "category": request.category,
        "description": request.description,
    }).execute()
    
    return response.data[0] if response.data else None


@router.put("/{setting_id}")
async def update_setting(setting_id: str, request: SettingsUpdateRequest):
    """Update an existing setting."""
    client = get_supabase_client()
    
    response = client.table("settings").update({
        "value": request.value,
        "description": request.description,
    }).eq("id", setting_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return response.data[0]


@router.delete("/{setting_id}")
async def delete_setting(setting_id: str):
    """Delete a setting."""
    client = get_supabase_client()
    
    response = client.table("settings").delete().eq("id", setting_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return {"message": "Setting deleted successfully"}
