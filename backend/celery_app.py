import os

from celery import Celery


broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
backend_url = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery(
    "email_orchestrator",
    broker=broker_url,
    backend=backend_url,
)

celery_app.conf.update(
    task_track_started=True,
    task_time_limit=60 * 30,
)

