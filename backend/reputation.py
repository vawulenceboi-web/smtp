import asyncio
import socket
from typing import Tuple, Dict, Any


SPAMHAUS_ZEN = "zen.spamhaus.org"


async def _lookup_dnsbl(ip: str, zone: str) -> Tuple[bool, str]:
    """
    Simple Spamhaus-style DNSBL lookup.
    Returns (listed, raw_response_or_error).
    """
    try:
        octets = ip.split(".")
        if len(octets) != 4:
            return False, "invalid-ip"
        query = ".".join(reversed(octets)) + f".{zone}"
        result = await asyncio.to_thread(socket.gethostbyname, query)
        return True, result
    except socket.gaierror as exc:
        if exc.errno in (socket.EAI_NONAME,):
            return False, "not-listed"
        return False, f"dns-error:{exc}"
    except Exception as exc:  # pragma: no cover - safety net
        return False, f"error:{exc}"


async def check_ip_reputation(ip: str) -> Tuple[bool, Dict[str, Any]]:
    """
    Check IP reputation against Spamhaus ZEN.
    Returns (is_listed, details_dict).
    """
    listed, resp = await _lookup_dnsbl(ip, SPAMHAUS_ZEN)
    return listed, {"source": "spamhaus-zen", "response": resp}

