import logging
import os
import time
from datetime import datetime
from typing import Any, Optional, Tuple

import redis
import httpx

from .database import get_supabase_client

TOKEN_KEY = "zoho_access_token"
EXPIRY_KEY = "zoho_token_expiry"
API_DOMAIN_KEY = "zoho_api_domain"
ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"

logger = logging.getLogger(__name__)


def _get_redis_client() -> redis.Redis:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return redis.Redis.from_url(redis_url, decode_responses=True)


def _get_cached_token(client: redis.Redis) -> Optional[str]:
    try:
        token = client.get(TOKEN_KEY)
        expiry_raw = client.get(EXPIRY_KEY)
    except redis.RedisError as exc:
        logger.warning("Zoho token cache unavailable (Redis): %s", exc)
        return None
    if not token or not expiry_raw:
        return None
    try:
        if int(expiry_raw) > int(time.time()):
            return token
    except ValueError:
        return None
    return None


def _set_cached_token(client: redis.Redis, token: str, expiry_ts: int) -> None:
    try:
        client.set(TOKEN_KEY, token)
        client.set(EXPIRY_KEY, str(expiry_ts))
    except redis.RedisError as exc:
        logger.warning("Zoho token cache write failed (Redis): %s", exc)


def _get_cached_api_domain(client: redis.Redis) -> Optional[str]:
    try:
        domain = client.get(API_DOMAIN_KEY)
    except redis.RedisError as exc:
        logger.warning("Zoho api_domain cache unavailable (Redis): %s", exc)
        return None
    return domain or None


def _set_cached_api_domain(client: redis.Redis, api_domain: str) -> None:
    try:
        client.set(API_DOMAIN_KEY, api_domain)
    except redis.RedisError as exc:
        logger.warning("Zoho api_domain cache write failed (Redis): %s", exc)


def _supabase_ready() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"))


def _has_refresh_credentials() -> bool:
    return bool(
        os.getenv("ZOHO_CLIENT_ID")
        and os.getenv("ZOHO_CLIENT_SECRET")
        and os.getenv("ZOHO_REFRESH_TOKEN")
    )


def _get_db_latest_row() -> Optional[dict]:
    if not _supabase_ready():
        return None
    try:
        db = get_supabase_client()
        resp = (
            db.client.table("system_settings")
            .select("id, zoho_access_token, zoho_token_expiry")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.warning("Zoho token DB read failed (system_settings): %s", exc)
        return None
    if not resp.data:
        return None
    return resp.data[0]


def _extract_db_token(row: Optional[dict]) -> Optional[Tuple[str, int]]:
    if not row:
        return None
    token = row.get("zoho_access_token")
    expiry_raw = row.get("zoho_token_expiry")
    if not token or expiry_raw is None:
        return None
    try:
        expiry_ts = int(expiry_raw)
    except (TypeError, ValueError):
        return None
    if expiry_ts > int(time.time()):
        return token, expiry_ts
    return None


def _store_db_token(row: Optional[dict], token: str, expiry_ts: int) -> None:
    if not _supabase_ready():
        return
    try:
        db = get_supabase_client()
    except Exception as exc:
        logger.warning("Zoho token DB unavailable: %s", exc)
        return

    row_id = row.get("id") if row else None
    if not row_id:
        try:
            resp = (
                db.client.table("system_settings")
                .select("id")
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            if resp.data:
                row_id = resp.data[0].get("id")
        except Exception as exc:
            logger.warning("Zoho token DB lookup failed (system_settings): %s", exc)
            return

    if not row_id:
        logger.warning("Zoho token not stored: system_settings row missing")
        return

    try:
        db.client.table("system_settings").update(
            {
                "zoho_access_token": token,
                "zoho_token_expiry": expiry_ts,
                "updated_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", row_id).execute()
    except Exception as exc:
        logger.warning("Zoho token DB write failed (system_settings): %s", exc)


def _refresh_from_zoho(client: redis.Redis, db_row: Optional[dict]) -> str:
    client_id = os.getenv("ZOHO_CLIENT_ID")
    client_secret = os.getenv("ZOHO_CLIENT_SECRET")
    refresh_token = os.getenv("ZOHO_REFRESH_TOKEN")
    if not client_id or not client_secret or not refresh_token:
        raise RuntimeError("Missing ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, or ZOHO_REFRESH_TOKEN")

    resp = httpx.post(
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
    api_domain = payload.get("api_domain")
    if not access_token or not expires_in:
        raise RuntimeError("Zoho token refresh response missing access_token or expires_in")

    expiry_ts = int(time.time()) + int(expires_in) - 60
    _set_cached_token(client, access_token, expiry_ts)
    if api_domain:
        _set_cached_api_domain(client, str(api_domain).rstrip("/"))
    _store_db_token(db_row, access_token, expiry_ts)
    return access_token


def refresh_zoho_token() -> str:
    """Force refresh from Zoho Accounts API and update caches."""
    client = _get_redis_client()
    db_row = _get_db_latest_row()
    return _refresh_from_zoho(client, db_row)


def get_valid_zoho_token() -> str:
    """
    Return a valid Zoho OAuth access token. Uses Redis cache and refresh token flow.
    """
    client = _get_redis_client()
    cached = _get_cached_token(client)
    if cached:
        return cached

    db_row = _get_db_latest_row()
    db_cached = _extract_db_token(db_row)
    if db_cached:
        token, expiry_ts = db_cached
        _set_cached_token(client, token, expiry_ts)
        return token

    return _refresh_from_zoho(client, db_row)


def get_stored_zoho_token() -> Optional[str]:
    """
    Return the most recently stored Zoho access token without checking expiry.
    Prefers Redis cache, then falls back to the latest system_settings row.
    """
    client = _get_redis_client()
    try:
        token = client.get(TOKEN_KEY)
    except redis.RedisError as exc:
        logger.warning("Zoho token cache unavailable (Redis): %s", exc)
        token = None

    if token:
        return token

    db_row = _get_db_latest_row()
    if db_row:
        token = db_row.get("zoho_access_token")
        if token:
            return token

    return None


def get_zoho_api_domain() -> Optional[str]:
    """
    Return the cached Zoho api_domain (if present).
    """
    client = _get_redis_client()
    domain = _get_cached_api_domain(client)
    if domain:
        return str(domain).rstrip("/")
    return None


def build_zoho_messages_url(account_id: Optional[str], base_url: Optional[str] = None) -> str:
    """
    Build the Zoho Mail send-messages endpoint, preferring api_domain when available.
    """
    api_domain = get_zoho_api_domain()
    if api_domain and account_id:
        return f"{api_domain.rstrip('/')}/mail/v1/accounts/{account_id}/messages"
    if base_url:
        return base_url
    if account_id:
        return f"https://www.zohoapis.com/mail/v1/accounts/{account_id}/messages"
    return ""


def get_zoho_request_token(fallback_token: Optional[str] = None) -> str:
    """
    Return the currently stored access token, falling back to provided token.
    If neither exist, refresh to obtain a new token.
    """
    stored = get_stored_zoho_token()
    if stored:
        return stored
    if fallback_token:
        return fallback_token
    return get_valid_zoho_token()


def has_zoho_refresh_credentials() -> bool:
    """Public helper to check if refresh token flow is available."""
    return _has_refresh_credentials()


def _json_contains_invalid_oauth(value: Any) -> bool:
    marker = "INVALID_OAUTHTOKEN"
    if isinstance(value, dict):
        for k, v in value.items():
            if isinstance(v, str) and marker in v.upper():
                return True
            if isinstance(k, str) and k.lower() in ("code", "error", "errorcode"):
                if isinstance(v, str) and marker in v.upper():
                    return True
            if _json_contains_invalid_oauth(v):
                return True
        return False
    if isinstance(value, list):
        return any(_json_contains_invalid_oauth(item) for item in value)
    if isinstance(value, str):
        return marker in value.upper()
    return False


def is_invalid_zoho_token_response(resp: Any) -> bool:
    """Detect Zoho INVALID_OAUTHTOKEN responses across JSON/text payloads."""
    try:
        text = resp.text or ""
    except Exception:
        text = ""
    if "INVALID_OAUTHTOKEN" in text.upper():
        return True
    try:
        content_type = resp.headers.get("content-type", "")
        if content_type.startswith("application/json"):
            payload = resp.json()
            return _json_contains_invalid_oauth(payload)
    except Exception:
        return False
    return False


def should_refresh_zoho_token(resp: Any) -> bool:
    """Refresh only when the response is 401 and indicates INVALID_OAUTHTOKEN."""
    try:
        if getattr(resp, "status_code", None) != 401:
            return False
    except Exception:
        return False
    return is_invalid_zoho_token_response(resp)


def mask_zoho_token(token: str, keep_last: int = 4) -> str:
    if not token:
        return ""
    if keep_last <= 0:
        return "*" * len(token)
    if len(token) <= keep_last:
        return token
    return "*" * (len(token) - keep_last) + token[-keep_last:]


# Backwards-compatible alias
def get_zoho_access_token() -> str:
    return get_valid_zoho_token()
