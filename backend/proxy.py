import asyncio
import random
from dataclasses import dataclass, field
from typing import List, Optional

from pydantic.dataclasses import dataclass
from python_socks.async_.asyncio import Proxy


@dataclass
class ProxyConfig:
    socks5_proxies: List[str] = field(default_factory=list)  # e.g. ["socks5://user:pass@host:port", ...]
    rotate_after: int = 10  # rotate proxy after N successful sends

    def to_dict(self):
        return {
            "socks5_proxies": list(self.socks5_proxies or []),
            "rotate_after": int(self.rotate_after),
        }


class ProxyRotationManager:
    """
    Handles IP rotation and proxying for outbound requests.

    For HTTP-based ESP APIs we simply return a proxy URL usable by httpx/aiohttp.
    For SMTP, we expose metadata; wiring a SOCKS5 proxy into the SMTP connection
    stack can be done using python-socks or a separate tunnel process.
    """

    def __init__(self, config: Optional[ProxyConfig] = None):
        self.config = config or ProxyConfig()
        self._success_count = 0
        self._current_index: Optional[int] = 0 if self.config.socks5_proxies else None

    def current_http_proxy(self) -> Optional[str]:
        if self._current_index is None or not self.config.socks5_proxies:
            return None
        return self.config.socks5_proxies[self._current_index]

    async def current_smtp_proxy(self) -> Optional[str]:
        if self._current_index is None or not self.config.socks5_proxies:
            return None
        return self.config.socks5_proxies[self._current_index]

    async def connect_smtp_socket(self, dest_host: str, dest_port: int):
        """
        Create a socket connected to the SMTP server, optionally via SOCKS5 proxy.
        Returns a connected socket usable by aiosmtplib (sock=...).
        """
        proxy_url = await self.current_smtp_proxy()
        if not proxy_url:
            return None
        proxy = Proxy.from_url(proxy_url)
        return await proxy.connect(dest_host, dest_port)

    def record_success(self):
        if self._current_index is None or not self.config.socks5_proxies:
            return
        self._success_count += 1
        target = random.randint(5, self.config.rotate_after)
        if self._success_count >= target:
            self._rotate_proxy()
            self._success_count = 0

    def _rotate_proxy(self):
        if not self.config.socks5_proxies:
            return
        self._current_index = (self._current_index + 1) % len(self.config.socks5_proxies)

