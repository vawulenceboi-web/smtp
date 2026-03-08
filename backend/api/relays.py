from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import aiosmtplib
import ssl
import logging

from ..database import get_db, SupabaseDB

# Setup logging
logger = logging.getLogger(__name__)

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


class RelayTestRequest(BaseModel):
    """Test SMTP connection without creating a relay"""
    host: str
    port: int = 587
    username: str
    password: str
    use_tls: bool = True


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


async def test_smtp_connection(config: RelayTestRequest) -> dict:
    """Test SMTP connection and return result"""
    logger.info(f"🔍 Testing SMTP connection to {config.host}:{config.port} (TLS: {config.use_tls})")
    logger.info(f"   Username: {config.username}")
    
    try:
        # Create TLS context if TLS is enabled
        context = ssl.create_default_context() if config.use_tls else None
        logger.info(f"   TLS Context: {'created' if context else 'not created'}")
        
        # Test connection
        logger.info(f"   Creating SMTP connection...")
        async with aiosmtplib.SMTP(
            hostname=config.host,
            port=config.port,
            use_tls=config.use_tls,
            tls_context=context  # Fixed: was ssl_context, should be tls_context
        ) as smtp:
            logger.info(f"   SMTP connection established")
            # Login to test credentials
            logger.info(f"   Attempting login with username: {config.username}")
            await smtp.login(config.username, config.password)
            logger.info(f"✅ SMTP login successful for {config.username}@{config.host}")
            return {"success": True, "message": "SMTP connection successful"}
    except Exception as e:
        error_msg = f"Connection failed: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        return {"success": False, "message": error_msg}


@router.post("/test-connection", response_model=dict)
async def test_connection(config: RelayTestRequest):
    """Test SMTP connection without creating a relay"""
    logger.info(f"📨 POST /api/relays/test-connection endpoint called")
    logger.info(f"   Request body: host={config.host}, port={config.port}, username={config.username}, use_tls={config.use_tls}")
    
    result = await test_smtp_connection(config)
    
    logger.info(f"   Test result: {result}")
    
    if not result["success"]:
        logger.warning(f"   Raising HTTPException 400: {result['message']}")
        raise HTTPException(status_code=400, detail=result["message"])
    
    logger.info(f"   Returning success response")
    return result


@router.post("", response_model=RelayResponse)
async def create_relay(relay: RelayCreate, db: SupabaseDB = Depends(get_db)):
    """Create a new SMTP relay configuration"""
    try:
        # Test SMTP connection before saving
        logger.info(f"🔍 Testing SMTP before creating relay: {relay.name}")
        test_config = RelayTestRequest(
            host=relay.host,
            port=relay.port,
            username=relay.username,
            password=relay.password,
            use_tls=relay.use_tls
        )
        
        test_result = await test_smtp_connection(test_config)
        if not test_result["success"]:
            logger.warning(f"❌ SMTP test failed for relay {relay.name}: {test_result['message']}")
            raise HTTPException(status_code=400, detail=f"SMTP connection failed: {test_result['message']}")
        
        logger.info(f"✅ SMTP test passed, creating relay {relay.name}")
        
        relay_data = relay.model_dump()
        relay_data["created_at"] = datetime.utcnow().isoformat()
        relay_data["updated_at"] = datetime.utcnow().isoformat()
        relay_data["status"] = "active"
        
        result = await db.create_relay(relay_data)
        logger.info(f"✅ Relay {relay.name} created successfully")
        return RelayResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create relay: {str(e)}", exc_info=True)
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
    """Test existing SMTP relay connection (updates last_used_at)"""
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
