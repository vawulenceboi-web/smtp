"""
Environment variable configuration for email providers.
Load all provider credentials from environment variables for production security.
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from .providers import ProviderType, ProviderConfig

logger = logging.getLogger(__name__)


class ProviderConfigManager:
    """Centralized provider configuration from environment variables"""
    
    # Environment variable naming convention:
    # PROVIDER_{PROVIDER_TYPE}_{FIELD} = value
    # Example: PROVIDER_ZOHO_HOST=smtp.zoho.com
    
    @staticmethod
    def load_zoho() -> Optional[ProviderConfig]:
        """Load Zoho API provider from env vars"""
        api_key = os.getenv("PROVIDER_ZOHO_API_KEY")
        account_id = os.getenv("PROVIDER_ZOHO_ACCOUNT_ID")
        if not api_key or not account_id:
            return None

        return ProviderConfig(
            provider_type=ProviderType.ZOHO,
            api_key=api_key,
            from_email=os.getenv("PROVIDER_ZOHO_FROM_EMAIL", ""),
            extra={"account_id": account_id},
        )
    
    @staticmethod
    def load_sendgrid() -> Optional[ProviderConfig]:
        """Load SendGrid API provider from env vars"""
        api_key = os.getenv("PROVIDER_SENDGRID_API_KEY")
        if not api_key:
            return None
        
        return ProviderConfig(
            provider_type=ProviderType.SENDGRID,
            api_key=api_key,
            from_email=os.getenv("PROVIDER_SENDGRID_FROM_EMAIL", ""),
            base_url=os.getenv("PROVIDER_SENDGRID_BASE_URL", "https://api.sendgrid.com/v3/mail/send"),
        )
    
    @staticmethod
    def load_resend() -> Optional[ProviderConfig]:
        """Load Resend API provider from env vars"""
        api_key = os.getenv("PROVIDER_RESEND_API_KEY")
        if not api_key:
            return None
        
        return ProviderConfig(
            provider_type=ProviderType.RESEND,
            api_key=api_key,
            from_email=os.getenv("PROVIDER_RESEND_FROM_EMAIL", ""),
            base_url=os.getenv("PROVIDER_RESEND_BASE_URL", "https://api.resend.com/emails"),
        )
    
    @staticmethod
    def load_postmark() -> Optional[ProviderConfig]:
        """Load Postmark API provider from env vars"""
        api_key = os.getenv("PROVIDER_POSTMARK_API_KEY")
        if not api_key:
            return None
        
        return ProviderConfig(
            provider_type=ProviderType.POSTMARK,
            api_key=api_key,
            from_email=os.getenv("PROVIDER_POSTMARK_FROM_EMAIL", ""),
            base_url=os.getenv("PROVIDER_POSTMARK_BASE_URL", "https://api.postmarkapp.com/email"),
        )
    
    @staticmethod
    def load_brevo() -> Optional[ProviderConfig]:
        """Load Brevo API provider from env vars"""
        api_key = os.getenv("PROVIDER_BREVO_API_KEY")
        if not api_key:
            return None
        
        return ProviderConfig(
            provider_type=ProviderType.BREVO,
            api_key=api_key,
            from_email=os.getenv("PROVIDER_BREVO_FROM_EMAIL", ""),
            base_url=os.getenv("PROVIDER_BREVO_BASE_URL", "https://api.brevo.com/v3/smtp/email"),
        )
    
    @staticmethod
    def load_mailgun() -> Optional[ProviderConfig]:
        """Load Mailgun API provider from env vars"""
        api_key = os.getenv("PROVIDER_MAILGUN_API_KEY")
        domain = os.getenv("PROVIDER_MAILGUN_DOMAIN")
        if not api_key or not domain:
            return None
        
        return ProviderConfig(
            provider_type=ProviderType.MAILGUN,
            api_key=api_key,
            domain=domain,
            from_email=os.getenv("PROVIDER_MAILGUN_FROM_EMAIL", ""),
            base_url=os.getenv("PROVIDER_MAILGUN_BASE_URL", f"https://api.mailgun.net/v3/{domain}/messages"),
        )
    
    @staticmethod
    def get_all_configured_providers() -> Dict[str, ProviderConfig]:
        """Load all configured providers from environment variables"""
        providers = {}
        
        zoho = ProviderConfigManager.load_zoho()
        if zoho:
            providers["zoho"] = zoho
            logger.info("✅ Loaded Zoho API provider from environment variables")
        
        sendgrid = ProviderConfigManager.load_sendgrid()
        if sendgrid:
            providers["sendgrid"] = sendgrid
            logger.info("✅ Loaded SendGrid API provider from environment variables")
        
        resend = ProviderConfigManager.load_resend()
        if resend:
            providers["resend"] = resend
            logger.info("✅ Loaded Resend API provider from environment variables")
        
        postmark = ProviderConfigManager.load_postmark()
        if postmark:
            providers["postmark"] = postmark
            logger.info("✅ Loaded Postmark API provider from environment variables")
        
        brevo = ProviderConfigManager.load_brevo()
        if brevo:
            providers["brevo"] = brevo
            logger.info("✅ Loaded Brevo API provider from environment variables")
        
        mailgun = ProviderConfigManager.load_mailgun()
        if mailgun:
            providers["mailgun"] = mailgun
            logger.info("✅ Loaded Mailgun API provider from environment variables")
        
        if not providers:
            logger.warning("⚠️  No email providers configured in environment variables!")
        
        return providers


# Load at startup
CONFIGURED_PROVIDERS = ProviderConfigManager.get_all_configured_providers()
