import random
from typing import Any, Dict, List, Optional

from .celery_app import celery_app
from .providers import (
    ProviderConfig,
    ProviderType,
    ProviderFactory,
    HardBounceError,
    SpamBlockedError,
    RateLimitError,
)
from .proxy import ProxyConfig, ProxyRotationManager
from .storage import set_recipient_status


def _build_provider_config(raw: Dict[str, Any]) -> ProviderConfig:
    return ProviderConfig(
        provider_type=ProviderType(raw["provider_type"]),
        api_key=raw.get("api_key"),
        domain=raw.get("domain"),
        base_url=raw.get("base_url"),
        smtp_host=raw.get("smtp_host"),
        smtp_port=raw.get("smtp_port", 587),
        smtp_username=raw.get("smtp_username"),
        smtp_password=raw.get("smtp_password"),
        from_email=raw.get("from_email"),
        extra=raw.get("extra") or {},
    )


def _build_proxy_config(raw: Optional[Dict[str, Any]]) -> ProxyConfig:
    if not raw:
        return ProxyConfig()
    return ProxyConfig(
        socks5_proxies=raw.get("socks5_proxies", []),
        rotate_after=raw.get("rotate_after", 10),
    )


@celery_app.task(name="app.tasks.send_single_email_task")
def send_single_email_task(
    to: List[str],
    subject: str,
    body: str,
    headers: Dict[str, Any],
    provider_config: Dict[str, Any],
    proxy_config: Optional[Dict[str, Any]] = None,
):
    """
    Synchronous wrapper to call async provider.send_email from Celery.
    """
    import asyncio

    cfg = _build_provider_config(provider_config)
    proxy_cfg = _build_proxy_config(proxy_config)
    proxy_mgr = ProxyRotationManager(proxy_cfg)
    provider = ProviderFactory.from_config(cfg, proxy_mgr)

    async def _run():
        await provider.send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=cfg,
        )

    asyncio.run(_run())


@celery_app.task(name="app.tasks.process_campaign_batch")
def process_campaign_batch(
    campaign_id: str,
    recipients: List[Dict[str, Any]],
    subject: str,
    body: str,
    headers: Dict[str, Any],
    provider_config: Dict[str, Any],
    proxy_config: Optional[Dict[str, Any]] = None,
):
    """
    Worker entry point to process a batch of recipients with slow-drip
    timing and provider failover on hard bounces / spam blocks.
    """
    import asyncio

    cfg = _build_provider_config(provider_config)
    proxy_cfg = _build_proxy_config(proxy_config)
    proxy_mgr = ProxyRotationManager(proxy_cfg)
    provider = ProviderFactory.from_config(cfg, proxy_mgr)

    # Optional explicit failover configs, supplied by frontend/backend caller.
    # Format: provider_config.extra.fallback_provider_configs = [ {provider_type: "...", ...}, ...]
    fallback_raw = (cfg.extra or {}).get("fallback_provider_configs") or []
    fallback_cfgs = [_build_provider_config(raw) for raw in fallback_raw if isinstance(raw, dict)]
    chain: List[ProviderConfig] = [cfg, *fallback_cfgs]
    chain_index = 0

    async def _handle_batch():
        nonlocal provider, cfg, chain_index
        for recipient in recipients:
            email = recipient["email"]
            try:
                await provider.send_email(
                    to=[email],
                    subject=subject,
                    body=body,
                    headers=headers,
                    provider_config=cfg,
                )
                set_recipient_status(campaign_id, email, "sent", provider=cfg.provider_type.value)
            except (HardBounceError, SpamBlockedError) as exc:
                set_recipient_status(campaign_id, email, "failed", provider=cfg.provider_type.value)
                if len(chain) > 1:
                    chain_index = (chain_index + 1) % len(chain)
                    cfg = chain[chain_index]
                    provider = ProviderFactory.from_config(cfg, proxy_mgr)
            except RateLimitError:
                set_recipient_status(campaign_id, email, "delayed", provider=cfg.provider_type.value)
            except Exception:
                set_recipient_status(campaign_id, email, "error", provider=cfg.provider_type.value)

            delay = random.randint(30, 180)
            await asyncio.sleep(delay)

    asyncio.run(_handle_batch())


def enqueue_campaign_batch(
    campaign_id: str,
    recipients: List[Dict[str, Any]],
    subject: str,
    body: str,
    headers: Dict[str, Any],
    provider_config: Dict[str, Any],
    proxy_config: Optional[Dict[str, Any]] = None,
):
    """
    Called from FastAPI to enqueue a campaign batch.
    """
    celery_app.send_task(
        "app.tasks.process_campaign_batch",
        kwargs={
            "campaign_id": campaign_id,
            "recipients": recipients,
            "subject": subject,
            "body": body,
            "headers": headers,
            "provider_config": provider_config,
            "proxy_config": proxy_config,
        },
    )

