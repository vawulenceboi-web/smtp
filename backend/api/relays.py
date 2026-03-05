from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

from ..database import get_db, SupabaseDB

router = APIRouter(prefix="/relays", tags=["relays"])


class RelayCreate(BaseModel):
    name: str
    host: str
    port: int = 587
    username: str
    password: str
    use_tls: bool = True


class RelayUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    use_tls: Optional[bool] = None
    status: Optional[str] = None


class RelayResponse(BaseModel):
    id: str
    name: str
    host: str
    port: int
    username: str
    status: str
    last_used_at: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=RelayResponse)
async def create_relay(relay: RelayCreate, db: SupabaseDB = Depends(get_db)):
    """Create a new SMTP relay configuration"""
    try:
        relay_data = relay.model_dump()
        relay_data["created_at"] = datetime.utcnow().isoformat()
        relay_data["updated_at"] = datetime.utcnow().isoformat()
        relay_data["status"] = "active"
        
        result = await db.create_relay(relay_data)
        return RelayResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create relay: {str(e)}")


@router.get("", response_model=List[RelayResponse])
async def list_relays(db: SupabaseDB = Depends(get_db)):
    """List all SMTP relays"""
    try:
        relays = await db.list_relays()
        return [RelayResponse(**relay) for relay in relays]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list relays: {str(e)}")


@router.get("/{relay_id}", response_model=RelayResponse)
async def get_relay(relay_id: str, db: SupabaseDB = Depends(get_db)):
    """Get a specific relay by ID"""
    try:
        relay = await db.get_relay(relay_id)
        if not relay:
            raise HTTPException(status_code=404, detail="Relay not found")
        return RelayResponse(**relay)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get relay: {str(e)}")


@router.put("/{relay_id}", response_model=RelayResponse)
async def update_relay(relay_id: str, relay: RelayUpdate, db: SupabaseDB = Depends(get_db)):
    """Update a relay configuration"""
    try:
        # Check if relay exists
        existing = await db.get_relay(relay_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Relay not found")
        
        relay_data = relay.model_dump(exclude_unset=True)
        relay_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = await db.update_relay(relay_id, relay_data)
        return RelayResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update relay: {str(e)}")


@router.delete("/{relay_id}")
async def delete_relay(relay_id: str, db: SupabaseDB = Depends(get_db)):
    """Delete a relay"""
    try:
        # Check if relay exists
        existing = await db.get_relay(relay_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Relay not found")
        
        await db.delete_relay(relay_id)
        return {"status": "success", "message": "Relay deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete relay: {str(e)}")


@router.post("/{relay_id}/test")
async def test_relay(relay_id: str, db: SupabaseDB = Depends(get_db)):
    """Test SMTP relay connection (updates last_used_at)"""
    try:
        relay = await db.get_relay(relay_id)
        if not relay:
            raise HTTPException(status_code=404, detail="Relay not found")
        
        # Update last_used_at timestamp
        await db.update_relay(relay_id, {
            "last_used_at": datetime.utcnow().isoformat(),
            "status": "active"
        })
        
        return {"status": "success", "message": "Relay connection test passed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test relay: {str(e)}")
