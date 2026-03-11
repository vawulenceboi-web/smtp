import os
import time
from typing import Optional

import redis
import requests

TOKEN_KEY = "zoho_access_token"
EXPIRY_KEY = "zoho_token_expiry"
ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"


def _get_redis_client() -> redis.Redis:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return redis.Redis.from_url(redis_url, decode_responses=True)


def _get_cached_token(client: redis.Redis) -> Optional[str]:
    token = client.get(TOKEN_KEY)
    expiry_raw = client.get(EXPIRY_KEY)
    if not token or not expiry_raw:
        return None
    try:
        if int(expiry_raw) > int(time.time()):
            return token
    except ValueError:
        return None
    return None


def get_valid_zoho_token() -> str:
    """
    Return a valid Zoho OAuth access token. Uses Redis cache and refresh token flow.
    """
    client = _get_redis_client()
    cached = _get_cached_token(client)
    if cached:
        return cached

    client_id = os.getenv("ZOHO_CLIENT_ID")
    client_secret = os.getenv("ZOHO_CLIENT_SECRET")
    refresh_token = os.getenv("ZOHO_REFRESH_TOKEN")
    if not client_id or not client_secret or not refresh_token:
        raise RuntimeError("Missing ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, or ZOHO_REFRESH_TOKEN")

    resp = requests.post(
        ZOHO_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
        },
        timeout=15,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Zoho token refresh failed: {resp.status_code} {resp.text}")

    payload = resp.json()
    access_token = payload.get("access_token")
    expires_in = payload.get("expires_in")
    if not access_token or not expires_in:
        raise RuntimeError("Zoho token refresh response missing access_token or expires_in")

    expiry_ts = int(time.time()) + int(expires_in) - 60
    client.set(TOKEN_KEY, access_token)
    client.set(EXPIRY_KEY, str(expiry_ts))
    return access_token


# Backwards-compatible alias
def get_zoho_access_token() -> str:
    return get_valid_zoho_token()
