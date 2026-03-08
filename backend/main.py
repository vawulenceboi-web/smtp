from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import logging
import sys
import os

from .providers import ProviderConfig, ProviderFactory
from .proxy import ProxyRotationManager, ProxyConfig
from .reputation import check_ip_reputation
from .tasks import enqueue_campaign_batch
from .storage import get_campaign_status, register_campaign, list_campaigns
from .api import relays, templates, settings, admins, notifications
from datetime import datetime

# Setup logging to stdout for Railway/production environments
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(name)s: %(message)s',
    stream=sys.stdout,  # Output to stdout (which Railway captures)
    force=True  # Override any previous logger config
)
logger = logging.getLogger(__name__)

# Log startup
logger.info("🚀 Starting Email Orchestrator API...")

app = FastAPI(title="Email Orchestrator")

# Configure CORS to allow requests from Vercel frontend and localhost
# This is needed so the frontend can make API calls to the backend
cors_origins = [
    "https://smtp-sable.vercel.app",  # Production Vercel frontend
    "https://smtp-85sf98lkj-ksmo12s-projects.vercel.app",  # Preview/staging Vercel
    "http://localhost:3000",  # Local development
    "http://localhost:5173",  # Vite dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers to frontend
)

logger.info("✅ CORS configured for frontend domains")

# Add middleware to log all requests
@app.middleware("http")
async def log_requests(request, call_next):
    try:
        logger.info(f"📥 {request.method} {request.url.path}")
        response = await call_next(request)
        logger.info(f"📤 {request.method} {request.url.path} -> {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ Error in request middleware: {str(e)}", exc_info=True)
        raise


class EmailRequest(BaseModel):
    to: List[str]
    subject: str
    body: str
    headers: Dict[str, Any] = Field(default_factory=dict)
    provider_config: ProviderConfig
    proxy_config: Optional[ProxyConfig] = None
    batch_id: Optional[str] = None
    large_batch: bool = False
    sender_ip: Optional[str] = None


def get_proxy_manager() -> ProxyRotationManager:
    return ProxyRotationManager()


@app.post("/send-email")
async def send_email_endpoint(
    payload: EmailRequest,
):
    """
    Fire a one-off send using the orchestrator abstraction.
    """
    proxy_manager = ProxyRotationManager(payload.proxy_config) if payload.proxy_config else ProxyRotationManager()
    provider = ProviderFactory.from_config(payload.provider_config, proxy_manager)

    # Optional IP reputation check for one-off sends
    if payload.large_batch and payload.sender_ip:
        is_listed, details = await check_ip_reputation(payload.sender_ip)
        if is_listed:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Sender IP has poor reputation; aborting send.",
                    "details": details,
                },
            )

    try:
        result = await provider.send_email(
            to=payload.to,
            subject=payload.subject,
            body=payload.body,
            headers=payload.headers,
            provider_config=payload.provider_config,
        )
        return {"status": "ok", "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


class CampaignRecipient(BaseModel):
    email: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CampaignRequest(BaseModel):
    campaign_id: str
    recipients: List[CampaignRecipient]
    subject: str
    body: str
    headers: Dict[str, Any] = Field(default_factory=dict)
    provider_config: ProviderConfig
    proxy_config: Optional[ProxyConfig] = None
    sender_ip: Optional[str] = None


@app.post("/api/campaigns/enqueue")
async def enqueue_campaign(payload: CampaignRequest):
    """
    Enqueue a batch campaign to be processed by Celery
    with slow-drip and provider failover.
    """
    logger.info(f"📨 Campaign enqueue request: campaign_id={payload.campaign_id}")
    logger.info(f"   Recipients: {len(payload.recipients)}, Subject: {payload.subject[:50]}")
    logger.info(f"   Provider: {payload.provider_config.provider_type}")
    
    # Optional IP reputation check before large batch
    if payload.sender_ip:
        logger.info(f"   Checking IP reputation for {payload.sender_ip}")
        is_listed, details = await check_ip_reputation(payload.sender_ip)
        if is_listed:
            logger.warning(f"   ⚠️ Sender IP {payload.sender_ip} has poor reputation")
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Sender IP has poor reputation; aborting campaign.",
                    "details": details,
                },
            )

    # record campaign metadata for listing
    logger.info(f"   Registering campaign {payload.campaign_id}")
    register_campaign(
        payload.campaign_id,
        {
            "name": payload.subject,
            "created_at": datetime.utcnow().isoformat(),
            "target_count": str(len(payload.recipients or [])),
            "status": "queued",
        },
    )

    logger.info(f"   Enqueueing campaign batch to Celery")
    enqueue_campaign_batch(
        campaign_id=payload.campaign_id,
        recipients=[r.model_dump() for r in payload.recipients],
        subject=payload.subject,
        body=payload.body,
        headers=payload.headers,
        provider_config=payload.provider_config.to_dict(),
        proxy_config=payload.proxy_config.to_dict() if payload.proxy_config else None,
    )
    logger.info(f"✅ Campaign {payload.campaign_id} queued successfully")
    return {"status": "queued", "campaign_id": payload.campaign_id}


@app.get("/health")
async def health():
    logger.info("🏥 Health check request")
    return {
        "status": "ok", 
        "service": "Email Orchestrator API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/campaigns")
async def campaigns():
    return {"campaigns": await list_campaigns()}


@app.get("/api/campaigns/{campaign_id}/status")
async def campaign_status(campaign_id: str):
    return await get_campaign_status(campaign_id)


# Register API routers with /api prefix
app.include_router(relays.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(admins.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

