"""
Email Orchestrator FastAPI application.

To run the API:
    uvicorn app.main:app --reload

To run the Celery worker:
    celery -A app.celery_app.celery_app worker -l info
"""

