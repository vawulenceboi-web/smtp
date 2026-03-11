"""Access key verification endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import uuid

from ..database import get_supabase_client

router = APIRouter(prefix="/access", tags=["access"])


class AccessVerifyRequest(BaseModel):
    access_key: str = Field(..., description="Access key to verify")


@router.post("/verify")
async def verify_access(request: AccessVerifyRequest):
    client = get_supabase_client()

    response = (
        client.table("system_settings")
        .select("id, access_key, updated_at")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Access key not configured")

    stored_key = response.data[0].get("access_key")

    if not stored_key or request.access_key != stored_key:
        raise HTTPException(status_code=401, detail="Invalid access key")

    return {"status": "ok", "token": str(uuid.uuid4())}
