import os
from celery import Celery

redis_url = os.getenv("REDIS_URL")
broker_url = os.getenv("CELERY_BROKER_URL") or redis_url or "redis://localhost:6379/0"
backend_url = os.getenv("CELERY_RESULT_BACKEND") or redis_url or "redis://localhost:6379/1"

celery_app = Celery(
    "email_orchestrator",
    broker=broker_url,
    backend=backend_url,
    include=["backend.tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    task_time_limit=60 * 30,
    task_soft_time_limit=60 * 25,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    broker_connection_retry_on_startup=True,
)

