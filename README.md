# Email Orchestrator - Monorepo

A professional email campaign orchestration platform with a FastAPI backend and Next.js frontend.

This is a monorepo containing:

- **`frontend/`** - Next.js 13+ React dashboard (Vercel-ready)
- **`backend/`** - FastAPI + Celery email orchestrator (Render-ready)

## Monorepo Structure

```
.
├── frontend/                 # Next.js application
│   ├── app/                  # Next.js app router
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities & contexts
│   ├── public/               # Static assets
│   ├── styles/               # Global CSS
│   ├── package.json
│   ├── next.config.mjs
│   ├── tsconfig.json
│   └── README.md
│
├── backend/                  # FastAPI application
│   ├── api/                  # API routes
│   ├── main.py               # FastAPI app entry
│   ├── requirements.txt
│   ├── Procfile              # Render deployment
│   └── README.md
│
├── scripts/                  # Shared scripts
└── README.md                 # This file
```

## Quick Start - Local Development

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup (in a new terminal)

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend will be available at `http://localhost:3000`
Backend API at `http://localhost:8000`

## Deployment

### Deploy Frontend to Vercel

1. Push to GitHub
2. Connect your repository to Vercel
3. Vercel auto-detects the Next.js app in `frontend/` directory
4. Set `NEXT_PUBLIC_API_URL` environment variable to your backend URL
5. Deploy!

[Frontend README](frontend/README.md)

### Deploy Backend to Render

1. Push to GitHub
2. Create new Web Service on Render
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (CELERY_BROKER_URL, etc.)
6. Deploy!

[Backend README](backend/README.md)

## Backend API

### Endpoints

- `POST /send-email` - Send individual email
- `POST /campaigns/enqueue` - Queue batch campaign
- `GET /health` - Health check

### Supported Providers

- `brevo`
- `mailgun`
- `sendinblue`
- `smtp`

### Features

- **Multiple SMTP providers** with automatic failover
- **Proxy rotation** for reputation protection
- **IP reputation checking** via Spamhaus ZEN DNSBL
- **Batch campaigns** with slow-drip scheduling
- **Celery workers** for background processing
- **Rate limiting** with automatic retry logic

## Frontend Features

- Campaign builder with multi-step wizard
- Real-time execution monitoring
- Email template editor
- Settings & relay management
- Admin panel
- Responsive dashboard

## Environment Variables

### Backend (`.env`)

```
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET=your_supabase_key
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Documentation

- [Backend Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)
- [Implementation Details](IMPLEMENTATION.md)
- [Setup & Configuration](SETUP_SUPABASE.md)
