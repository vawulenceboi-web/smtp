"""
Celery worker app configuration.

This file provides the Celery app instance that Railway's worker process uses.
Railway runs: celery -A celery_worker worker
"""

import os
import logging
import sys

# Setup logging for Celery
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] celery: %(message)s',
    stream=sys.stdout,  # Output to stdout (which Railway captures)
    force=True
)
logger = logging.getLogger(__name__)

from celery import Celery

# Railway provides REDIS_URL automatically when you add a Redis service
# But we also check for custom CELERY_* variables for flexibility
redis_url = os.getenv("REDIS_URL")
broker_url = os.getenv("CELERY_BROKER_URL") or redis_url or "redis://localhost:6379/0"
result_backend = os.getenv("CELERY_RESULT_BACKEND") or redis_url or "redis://localhost:6379/1"

# Validate that we have a broker URL
if not broker_url or not result_backend:
    raise RuntimeError(
        "Celery broker/backend not configured. "
        "Set REDIS_URL or CELERY_BROKER_URL/CELERY_RESULT_BACKEND"
    )

logger.info(f"Celery Broker: {broker_url.split('@')[0] if '@' in broker_url else 'configured'}...")
logger.info(f"Celery Backend: {result_backend.split('@')[0] if '@' in result_backend else 'configured'}...")

# Create the Celery app instance
celery = Celery(
    "email_orchestrator",
    broker=broker_url,
    backend=result_backend,
)

# Configure Celery settings
celery.conf.update(
    task_track_started=True,
    task_time_limit=60 * 30,  # 30 minutes
    task_soft_time_limit=60 * 25,  # 25 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    broker_connection_retry_on_startup=True,
)

# Auto-discover tasks from tasks.py in the same directory
celery.autodiscover_tasks(['tasks'], force=True)
