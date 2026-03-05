# Email Orchestrator Backend

FastAPI-based backend for email campaign orchestration with support for:
- Multiple SMTP providers with failover
- Proxy rotation
- IP reputation checking
- Celery task queue integration
- Campaign batch processing

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the server:
```bash
uvicorn main:app --reload
```

## Deployment on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the build command: `pip install -r requirements.txt`
4. Set the start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from your .env file
6. Deploy!

## Project Structure

- `main.py` - FastAPI application entry point
- `api/` - API route handlers
- `providers.py` - SMTP provider abstraction
- `proxy.py` - Proxy rotation logic
- `database.py` - Database client setup
- `celery_app.py` - Celery task configuration
- `tasks.py` - Background task definitions
- `storage.py` - Campaign state management
- `reputation.py` - IP reputation checking
