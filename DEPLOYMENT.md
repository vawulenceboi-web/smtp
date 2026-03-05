# Deployment Guide

This is a monorepo with separate frontend and backend applications that deploy to different platforms.

## Frontend Deployment (Vercel)

### Setup

1. **Create a new project on Vercel**
   - Go to https://vercel.com/new
   - Connect your GitHub repository

2. **Configure Vercel Settings**
   - Framework: **Next.js**
   - Root Directory: `frontend/`
   - Build Command: `pnpm install && pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

3. **Environment Variables**
   Add to Vercel project settings:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

4. **Deploy**
   - Push to GitHub
   - Vercel auto-deploys on push

## Backend Deployment (Render)

### Option 1: Deploy via Web Service

1. **Create Web Service on Render**
   - Go to https://render.com/
   - New → Web Service
   - Connect your GitHub repository
   - Select your repository and branch

2. **Configure Service**
   - Name: `email-orchestrator-api`
   - Environment: `Python 3.11`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `.` (root of repo)

3. **Environment Variables**
   ```
   CELERY_BROKER_URL=redis://your-redis-url
   CELERY_RESULT_BACKEND=redis://your-redis-url
   SUPABASE_URL=your_supabase_url
   SUPABASE_SECRET=your_supabase_key
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render auto-deploys on push

### Option 2: Use Procfile (if Render is configured to use root directory)

If your Render service is pointing to the root of the repository, it will use the `backend/Procfile.root` file (after renaming it to `Procfile`).

## Database & Services

### Redis (required for Celery)

Option 1: Deploy on Render
- Create Redis service on Render
- Copy the connection string to `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`

Option 2: Use Redis Cloud
- Sign up at https://redis.com/try-free/
- Use their hosted Redis instance

### Supabase (for campaign storage)

1. Create account at https://supabase.com/
2. Create a new project
3. Copy credentials to environment variables

## Local Development

See [README.md](../README.md) for local setup instructions.

## Troubleshooting

### Backend not starting
- Check that `backend/requirements.txt` exists
- Verify Python version (3.9+)
- Check environment variables are set

### Import errors in backend
- Ensure all relative imports work (e.g., `from .providers import ...`)
- Backend should be run from its directory or via `python -m backend.main`

### Frontend not connecting to backend
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify CORS is enabled on the backend
- Check browser console for connection errors

### Celery tasks not running
- Verify Redis is started and accessible
- Check `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` environment variables
