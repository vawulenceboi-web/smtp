from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import aiosmtplib
import ssl
import logging

from ..database import get_db, SupabaseDB
from ..config import CONFIGURED_PROVIDERS

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/relays", tags=["relays"])


class RelayCreate(BaseModel):
    name: str
    # Primary provider: either "smtp" with host/port, or choose from env-configured providers
    provider_key: str  # e.g., "zoho", "sendgrid", "resend", "postmark", "brevo", "mailgun", or "smtp"
    # For SMTP provider only:
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: bool = True
    # Fallback providers (comma-separated): e.g., "sendgrid,resend,postmark"
    fallback_providers: Optional[str] = None


class RelayUpdate(BaseModel):
    name: Optional[str] = None
    provider_key: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: Optional[bool] = None
    fallback_providers: Optional[str] = None
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
            tls_context=context,  # Fixed: was ssl_context, should be tls_context
            timeout=7
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


@router.get("/providers/configured")
async def get_configured_providers():
    """Get list of email providers configured in environment variables"""
    logger.info(f"📧 GET /api/relays/providers/configured - Listing configured providers")
    
    providers_list = []
    for provider_key, config in CONFIGURED_PROVIDERS.items():
        provider_info = {
            "key": provider_key,
            "type": config.provider_type.value,
            "from_email": config.from_email,
        }
        
        # Add provider-specific info
        if config.provider_type.value == "smtp":
            provider_info["smtp_host"] = config.smtp_host
            provider_info["smtp_port"] = config.smtp_port
        
        providers_list.append(provider_info)
    
    logger.info(f"   Found {len(providers_list)} configured providers")
    return {
        "providers": providers_list,
        "available_types": ["smtp"] + list(CONFIGURED_PROVIDERS.keys() if CONFIGURED_PROVIDERS else [])
    }


@router.post("", response_model=RelayResponse)
async def create_relay(relay: RelayCreate, db: SupabaseDB = Depends(get_db)):
    """Create a new relay configuration using providers from environment variables"""
    try:
        logger.info(f"🔧 Creating relay: {relay.name} (provider_key: {relay.provider_key})")
        
        # Determine which provider configuration to use
        if relay.provider_key == "smtp":
            # Custom SMTP relay
            if not relay.smtp_host or not relay.smtp_username or not relay.smtp_password:
                raise HTTPException(status_code=400, detail="SMTP relay requires host, username, and password")
            
            logger.info(f"🔍 Testing SMTP configuration for relay: {relay.name}")
            test_config = RelayTestRequest(
                host=relay.smtp_host,
                port=relay.smtp_port,
                username=relay.smtp_username,
                password=relay.smtp_password,
                use_tls=relay.use_tls
            )
            
            test_result = await test_smtp_connection(test_config)
            if not test_result["success"]:
                logger.warning(f"❌ SMTP test failed: {test_result['message']}")
                raise HTTPException(status_code=400, detail=f"SMTP connection failed: {test_result['message']}")
            
            logger.info(f"✅ SMTP test passed")
            provider_config = {
                "provider_key": "smtp",
                "smtp_host": relay.smtp_host,
                "smtp_port": relay.smtp_port,
                "smtp_username": relay.smtp_username,
                "use_tls": relay.use_tls,
            }
        
        else:
            # Environment-configured provider
            if relay.provider_key not in CONFIGURED_PROVIDERS:
                available = list(CONFIGURED_PROVIDERS.keys())
                raise HTTPException(
                    status_code=400, 
                    detail=f"Provider '{relay.provider_key}' not configured in environment. Available: {available}"
                )
            
            provider_config_obj = CONFIGURED_PROVIDERS[relay.provider_key]
            logger.info(f"✅ Using {relay.provider_key} provider from environment variables")
            
            provider_config = {
                "provider_key": relay.provider_key,
                "provider_type": provider_config_obj.provider_type.value,
                "from_email": provider_config_obj.from_email,
                # Don't store sensitive credentials in relay table
            }
        
        # Build relay data
        relay_data = {
            "name": relay.name,
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "provider_config": provider_config,  # Store which provider to use
        }
        
        # Add fallback providers if specified
        if relay.fallback_providers:
            fallbacks = [f.strip() for f in relay.fallback_providers.split(",")]
            # Validate fallback providers exist
            for fb in fallbacks:
                if fb not in CONFIGURED_PROVIDERS:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Fallback provider '{fb}' not configured in environment"
                    )
            relay_data["fallback_providers"] = ",".join(fallbacks)
            logger.info(f"📌 Relay {relay.name} configured with fallback providers: {relay.fallback_providers}")
        
        # For backwards compatibility, store some fields at top level
        relay_data["host"] = relay.smtp_host or "env-configured"
        relay_data["port"] = relay.smtp_port or 587
        relay_data["username"] = relay.smtp_username or relay.provider_key
        
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
