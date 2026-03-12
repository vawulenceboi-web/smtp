import logging
from dataclasses import field
from enum import Enum
from typing import Any, Dict, List, Optional

import httpx
import aiosmtplib

from .proxy import ProxyRotationManager
from .user_agent import random_user_agent, random_x_mailer
from .requeue import requeue_send_email
from .zoho_token_manager import (
    build_zoho_messages_url,
    get_zoho_request_token,
    has_zoho_refresh_credentials,
    mask_zoho_token,
    refresh_zoho_token,
    should_refresh_zoho_token,
)
from pydantic.dataclasses import dataclass

logger = logging.getLogger(__name__)

class ProviderType(str, Enum):
    BREVO = "brevo"
    MAILGUN = "mailgun"
    ZOHO = "zoho"
    SENDINBLUE = "sendinblue"
    SENDGRID = "sendgrid"
    RESEND = "resend"
    POSTMARK = "postmark"
    SMTP = "smtp"


@dataclass
class ProviderConfig:
    provider_type: ProviderType
    api_key: Optional[str] = None
    domain: Optional[str] = None
    base_url: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider_type": self.provider_type.value,
            "api_key": self.api_key,
            "domain": self.domain,
            "base_url": self.base_url,
            "smtp_host": self.smtp_host,
            "smtp_port": self.smtp_port,
            "smtp_username": self.smtp_username,
            "smtp_password": self.smtp_password,
            "from_email": self.from_email,
            "extra": self.extra or {},
        }


class HardBounceError(Exception):
    pass


class SpamBlockedError(Exception):
    pass


class RateLimitError(Exception):
    pass


class BaseEmailProvider:
    def __init__(self, config: ProviderConfig, proxy_manager: ProxyRotationManager):
        self.config = config
        self.proxy_manager = proxy_manager

    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        raise NotImplementedError

    def _augment_headers(self, headers: Dict[str, Any]) -> Dict[str, Any]:
        augmented = dict(headers or {})
        augmented.setdefault("User-Agent", random_user_agent())
        augmented.setdefault("X-Mailer", random_x_mailer())
        return augmented


class BrevoProvider(BaseEmailProvider):
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        url = provider_config.base_url or "https://api.brevo.com/v3/smtp/email"
        auth_headers = {
            "api-key": provider_config.api_key or "",
        }
        final_headers = self._augment_headers({**auth_headers, **(headers or {})})

        proxy = self.proxy_manager.current_http_proxy()
        async with httpx.AsyncClient(proxies=proxy, timeout=20.0) as client:
            try:
                resp = await client.post(
                    url,
                    json={
                        "sender": {"email": provider_config.from_email},
                        "to": [{"email": addr} for addr in to],
                        "subject": subject,
                        "htmlContent": body,
                    },
                    headers=final_headers,
                )
            except httpx.HTTPError as exc:
                raise Exception(f"Brevo HTTP error: {exc}") from exc

        if resp.status_code == 429:
            await self._handle_rate_limit(provider_config, to, subject, body, headers)
        if 400 <= resp.status_code < 600:
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            message = str(data)
            if "hard bounce" in message.lower():
                raise HardBounceError(message)
            if "spam" in message.lower():
                raise SpamBlockedError(message)
            raise Exception(f"Brevo error: {resp.status_code} {message}")

        return resp.json()

    async def _handle_rate_limit(
        self,
        provider_config: ProviderConfig,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
    ):
        requeue_send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=provider_config.to_dict(),
            delay_seconds=60,
        )
        raise RateLimitError("Brevo rate limited. Email requeued.")


class MailgunProvider(BaseEmailProvider):
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        domain = provider_config.domain
        url = provider_config.base_url or f"https://api.mailgun.net/v3/{domain}/messages"
        auth = ("api", provider_config.api_key or "")

        final_headers = self._augment_headers(headers or {})
        data = {
            "from": provider_config.from_email,
            "to": to,
            "subject": subject,
            "html": body,
        }

        proxy = self.proxy_manager.current_http_proxy()
        async with httpx.AsyncClient(proxies=proxy, timeout=20.0) as client:
            resp = await client.post(url, auth=auth, data=data, headers=final_headers)

        if resp.status_code == 429:
            await self._handle_rate_limit(provider_config, to, subject, body, headers)
        if 400 <= resp.status_code < 600:
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            message = str(data)
            if "hard bounce" in message.lower():
                raise HardBounceError(message)
            if "spam" in message.lower():
                raise SpamBlockedError(message)
            raise Exception(f"Mailgun error: {resp.status_code} {message}")

        return resp.json()

    async def _handle_rate_limit(
        self,
        provider_config: ProviderConfig,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
    ):
        requeue_send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=provider_config.to_dict(),
            delay_seconds=60,
        )
        raise RateLimitError("Mailgun rate limited. Email requeued.")


class ZohoProvider(BaseEmailProvider):
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        account_id = (provider_config.extra or {}).get("account_id")
        if not account_id and not provider_config.base_url:
            raise Exception("Zoho requires provider_config.extra.account_id")
        url = build_zoho_messages_url(account_id, provider_config.base_url)
        proxy = self.proxy_manager.current_http_proxy()

        payload = {
            "fromAddress": provider_config.from_email,
            "toAddress": ",".join(to),
            "subject": subject,
            "content": body,
            "mailFormat": "html",
        }
        base_headers = self._augment_headers(
            {**(headers or {}), "Content-Type": "application/x-www-form-urlencoded"}
        )

        async def _post_with_token(token: str) -> httpx.Response:
            final_headers = dict(base_headers)
            final_headers["Authorization"] = f"Zoho-oauthtoken {token}"
            async with httpx.AsyncClient(proxies=proxy, timeout=20.0) as client:
                return await client.post(
                    url,
                    data=payload,
                    headers=final_headers,
                )

        access_token = get_zoho_request_token(provider_config.api_key)
        resp = await _post_with_token(access_token)
        did_retry = False
        if should_refresh_zoho_token(resp) and has_zoho_refresh_credentials():
            access_token = refresh_zoho_token()
            resp = await _post_with_token(access_token)
            did_retry = True

        if resp.status_code == 429:
            await self._handle_rate_limit(provider_config, to, subject, body, headers)
        if 400 <= resp.status_code < 600:
            if did_retry:
                logger.error(
                    "Zoho retry failed",
                    extra={
                        "endpoint_url": url,
                        "status_code": resp.status_code,
                        "response_body": resp.text,
                        "access_token": mask_zoho_token(access_token),
                    },
                )
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            message = str(data)
            if "hard bounce" in message.lower():
                raise HardBounceError(message)
            if "spam" in message.lower():
                raise SpamBlockedError(message)
            raise Exception(f"Zoho error: {resp.status_code} {message}")

        return resp.json()

    async def _handle_rate_limit(
        self,
        provider_config: ProviderConfig,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
    ):
        requeue_send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=provider_config.to_dict(),
            delay_seconds=60,
        )
        raise RateLimitError("Zoho rate limited. Email requeued.")


class SendinblueProvider(BaseEmailProvider):
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        url = provider_config.base_url or "https://api.sendinblue.com/v3/smtp/email"
        auth_headers = {
            "api-key": provider_config.api_key or "",
        }
        final_headers = self._augment_headers({**auth_headers, **(headers or {})})

        proxy = self.proxy_manager.current_http_proxy()
        async with httpx.AsyncClient(proxies=proxy, timeout=20.0) as client:
            resp = await client.post(
                url,
                json={
                    "sender": {"email": provider_config.from_email},
                    "to": [{"email": addr} for addr in to],
                    "subject": subject,
                    "htmlContent": body,
                },
                headers=final_headers,
            )

        if resp.status_code == 429:
            await self._handle_rate_limit(provider_config, to, subject, body, headers)
        if 400 <= resp.status_code < 600:
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            message = str(data)
            if "hard bounce" in message.lower():
                raise HardBounceError(message)
            if "spam" in message.lower():
                raise SpamBlockedError(message)
            raise Exception(f"Sendinblue error: {resp.status_code} {message}")

        return resp.json()

    async def _handle_rate_limit(
        self,
        provider_config: ProviderConfig,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
    ):
        requeue_send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=provider_config.to_dict(),
            delay_seconds=60,
        )
        raise RateLimitError("Sendinblue rate limited. Email requeued.")


class SendgridProvider(BaseEmailProvider):
    """SendGrid API v3 provider - works over HTTPS 443"""
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        url = provider_config.base_url or "https://api.sendgrid.com/v3/mail/send"
        auth_headers = {
            "Authorization": f"Bearer {provider_config.api_key}",
            "Content-Type": "application/json",
        }
        final_headers = self._augment_headers({**auth_headers, **(headers or {})})

        proxy = self.proxy_manager.current_http_proxy()
        async with httpx.AsyncClient(proxies=proxy, timeout=20.0) as client:
            resp = await client.post(
                url,
                json={
                    "personalizations": [{"to": [{"email": addr} for addr in to]}],
                    "from": {"email": provider_config.from_email},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": body}],
                },
                headers=final_headers,
            )

        if resp.status_code == 429:
            await self._handle_rate_limit(provider_config, to, subject, body, headers)
        if 400 <= resp.status_code < 600:
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            message = str(data)
            if "hard bounce" in message.lower() or "invalid" in message.lower():
                raise HardBounceError(message)
            if "spam" in message.lower():
                raise SpamBlockedError(message)
            raise Exception(f"SendGrid error: {resp.status_code} {message}")

        return resp.json()

    async def _handle_rate_limit(
        self,
        provider_config: ProviderConfig,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
    ):
        requeue_send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=provider_config.to_dict(),
            delay_seconds=60,
        )
        raise RateLimitError("SendGrid rate limited. Email requeued.")


class ResendProvider(BaseEmailProvider):
    """Resend API provider - works over HTTPS 443"""
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        url = provider_config.base_url or "https://api.resend.com/emails"
        auth_headers = {
            "Authorization": f"Bearer {provider_config.api_key}",
            "Content-Type": "application/json",
        }
        final_headers = self._augment_headers({**auth_headers, **(headers or {})})

        proxy = self.proxy_manager.current_http_proxy()
        async with httpx.AsyncClient(proxies=proxy, timeout=20.0) as client:
            resp = await client.post(
                url,
                json={
                    "from": provider_config.from_email,
                    "to": to,
                    "subject": subject,
                    "html": body,
                },
                headers=final_headers,
            )

        if resp.status_code == 429:
            await self._handle_rate_limit(provider_config, to, subject, body, headers)
        if 400 <= resp.status_code < 600:
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            message = str(data)
            if "invalid" in message.lower() or "bounce" in message.lower():
                raise HardBounceError(message)
            if "spam" in message.lower():
                raise SpamBlockedError(message)
            raise Exception(f"Resend error: {resp.status_code} {message}")

        return resp.json()

    async def _handle_rate_limit(
        self,
        provider_config: ProviderConfig,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
    ):
        requeue_send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=provider_config.to_dict(),
            delay_seconds=60,
        )
        raise RateLimitError("Resend rate limited. Email requeued.")


class PostmarkProvider(BaseEmailProvider):
    """Postmark API provider - works over HTTPS 443"""
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        url = provider_config.base_url or "https://api.postmarkapp.com/email"
        auth_headers = {
            "X-Postmark-Server-Token": provider_config.api_key or "",
            "Content-Type": "application/json",
        }
        final_headers = self._augment_headers({**auth_headers, **(headers or {})})

        proxy = self.proxy_manager.current_http_proxy()
        async with httpx.AsyncClient(proxies=proxy, timeout=20.0) as client:
            resp = await client.post(
                url,
                json={
                    "From": provider_config.from_email,
                    "To": ",".join(to),
                    "Subject": subject,
                    "HtmlBody": body,
                },
                headers=final_headers,
            )

        if resp.status_code == 429:
            await self._handle_rate_limit(provider_config, to, subject, body, headers)
        if 400 <= resp.status_code < 600:
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            message = str(data)
            if "invalid" in message.lower() or "bounce" in message.lower():
                raise HardBounceError(message)
            if "spam" in message.lower():
                raise SpamBlockedError(message)
            raise Exception(f"Postmark error: {resp.status_code} {message}")

        return resp.json()

    async def _handle_rate_limit(
        self,
        provider_config: ProviderConfig,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
    ):
        requeue_send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=provider_config.to_dict(),
            delay_seconds=60,
        )
        raise RateLimitError("Postmark rate limited. Email requeued.")


class SMTPProvider(BaseEmailProvider):
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
        provider_config: ProviderConfig,
    ) -> Dict[str, Any]:
        final_headers = self._augment_headers(headers or {})

        message_lines = []
        for k, v in final_headers.items():
            message_lines.append(f"{k}: {v}")
        message_lines.append(f"Subject: {subject}")
        message_lines.append("")
        message_lines.append(body)
        message = "\r\n".join(message_lines)

        proxy = await self.proxy_manager.current_smtp_proxy()

        try:
            sock = await self.proxy_manager.connect_smtp_socket(
                provider_config.smtp_host,
                provider_config.smtp_port,
            )
            smtp = aiosmtplib.SMTP(
                hostname=provider_config.smtp_host,
                port=provider_config.smtp_port,
                use_tls=False,
                start_tls=True,
                timeout=7,  # 7-second timeout for SMTP operations
                username=provider_config.smtp_username,
                password=provider_config.smtp_password,
                sock=sock,
            )
            await smtp.connect()
            await smtp.sendmail(
                sender=provider_config.from_email,
                recipients=to,
                message=message,
            )
            await smtp.quit()
        except aiosmtplib.SMTPException as exc:
            msg = str(exc).lower()
            if "rate" in msg or "too many" in msg:
                await self._handle_rate_limit(provider_config, to, subject, body, headers)
            if "hard bounce" in msg:
                raise HardBounceError(str(exc))
            if "spam" in msg:
                raise SpamBlockedError(str(exc))
            raise

        self.proxy_manager.record_success()
        return {"status": "sent-via-smtp", "proxy": proxy}

    async def _handle_rate_limit(
        self,
        provider_config: ProviderConfig,
        to: List[str],
        subject: str,
        body: str,
        headers: Dict[str, Any],
    ):
        requeue_send_email(
            to=to,
            subject=subject,
            body=body,
            headers=headers,
            provider_config=provider_config.to_dict(),
            delay_seconds=60,
        )
        raise RateLimitError("SMTP provider rate limited. Email requeued.")


class ProviderFactory:
    @staticmethod
    def from_config(config: ProviderConfig, proxy_manager: ProxyRotationManager) -> BaseEmailProvider:
        if config.provider_type == ProviderType.BREVO:
            return BrevoProvider(config, proxy_manager)
        if config.provider_type == ProviderType.MAILGUN:
            return MailgunProvider(config, proxy_manager)
        if config.provider_type == ProviderType.ZOHO:
            return ZohoProvider(config, proxy_manager)
        if config.provider_type == ProviderType.SENDINBLUE:
            return SendinblueProvider(config, proxy_manager)
        if config.provider_type == ProviderType.SENDGRID:
            return SendgridProvider(config, proxy_manager)
        if config.provider_type == ProviderType.RESEND:
            return ResendProvider(config, proxy_manager)
        if config.provider_type == ProviderType.POSTMARK:
            return PostmarkProvider(config, proxy_manager)
        if config.provider_type == ProviderType.SMTP:
            return SMTPProvider(config, proxy_manager)
        raise ValueError(f"Unsupported provider type: {config.provider_type}")
