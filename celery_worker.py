"""
Celery worker app configuration.

This file provides the Celery app instance that Railway's worker process uses.
Railway runs: celery -A celery_worker worker
"""

import os
from celery import Celery

# Get Redis URLs from environment variables (set in Railway)
broker_url = os.getenv(
    "CELERY_BROKER_URL",
    "redis://localhost:6379/0"
)
result_backend = os.getenv(
    "CELERY_RESULT_BACKEND",
    "redis://localhost:6379/1"
)

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
)

# Auto-discover tasks from tasks.py in the same directory
celery.autodiscover_tasks(['tasks'], force=True)
