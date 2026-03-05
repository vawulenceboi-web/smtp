from typing import Any, Dict, List, Optional

from .celery_app import celery_app


def requeue_send_email(
    *,
    to: List[str],
    subject: str,
    body: str,
    headers: Dict[str, Any],
    provider_config: Dict[str, Any],
    proxy_config: Optional[Dict[str, Any]] = None,
    delay_seconds: int = 60,
):
    """
    Requeue a send for later execution via Celery.
    Designed to be importable by providers without importing app.tasks (avoids circular imports).
    """
    celery_app.send_task(
        "app.tasks.send_single_email_task",
        kwargs={
            "to": to,
            "subject": subject,
            "body": body,
            "headers": headers,
            "provider_config": provider_config,
            "proxy_config": proxy_config,
        },
        countdown=delay_seconds,
    )

