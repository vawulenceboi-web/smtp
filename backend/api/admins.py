"""Admin management API endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from ..database import get_supabase_client

router = APIRouter(prefix="/admins", tags=["admins"])


class AdminSchema(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class AdminCreateRequest(BaseModel):
    email: EmailStr = Field(..., description="Admin email address")
    name: str = Field(..., description="Admin full name")
    role: str = Field(default="admin", description="Admin role (admin, moderator, viewer)")


class AdminUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_admins(is_active: Optional[bool] = None):
    """List all admins, optionally filtered by active status."""
    client = get_supabase_client()
    
    query = client.table("admins").select("*")
    
    if is_active is not None:
        query = query.eq("is_active", is_active)
    
    response = query.execute()
    return response.data


@router.get("/{admin_id}")
async def get_admin(admin_id: str):
    """Get a specific admin by ID."""
    client = get_supabase_client()
    
    response = client.table("admins").select("*").eq("id", admin_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return response.data[0]


@router.post("")
async def create_admin(request: AdminCreateRequest):
    """Create a new admin user."""
    client = get_supabase_client()
    
    # Check if email already exists
    existing = client.table("admins").select("id").eq("email", request.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Admin with this email already exists")
    
    # Validate role
    valid_roles = ["admin", "moderator", "viewer"]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    response = client.table("admins").insert({
        "email": request.email,
        "name": request.name,
        "role": request.role,
        "is_active": True,
    }).execute()
    
    return response.data[0] if response.data else None


@router.put("/{admin_id}")
async def update_admin(admin_id: str, request: AdminUpdateRequest):
    """Update an admin user."""
    client = get_supabase_client()
    
    # Validate role if provided
    if request.role:
        valid_roles = ["admin", "moderator", "viewer"]
        if request.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    update_data = {k: v for k, v in request.dict().items() if v is not None}
    
    response = client.table("admins").update(update_data).eq("id", admin_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return response.data[0]


@router.delete("/{admin_id}")
async def delete_admin(admin_id: str):
    """Delete an admin user (soft delete - marks as inactive)."""
    client = get_supabase_client()
    
    # Soft delete - mark as inactive instead of removing
    response = client.table("admins").update({"is_active": False}).eq("id", admin_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return {"message": "Admin deactivated successfully"}


@router.post("/{admin_id}/activate")
async def activate_admin(admin_id: str):
    """Reactivate a deactivated admin."""
    client = get_supabase_client()
    
    response = client.table("admins").update({"is_active": True}).eq("id", admin_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return response.data[0]


@router.post("/{admin_id}/login")
async def record_admin_login(admin_id: str):
    """Record admin login timestamp."""
    client = get_supabase_client()
    
    response = client.table("admins").update({"last_login": datetime.utcnow().isoformat()}).eq("id", admin_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return response.data[0]
