# SMTP Orchestrator - Supabase Integration Setup Guide

## Overview
This guide walks you through setting up and using the Supabase integration for your SMTP Orchestrator application.

## What's Changed
✅ Removed Redis-based storage for relays and templates  
✅ Replaced with Supabase PostgreSQL database  
✅ Added dynamic data fetching in frontend views  
✅ Created REST API endpoints for relays and templates  
✅ Added database schema with automatic migrations (IF NOT EXISTS)  
✅ No connection pooling required - standard Supabase client works out of the box  

## Quick Start

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Choose your region and PostgreSQL version
4. Save your project URL and API key (anon key)

### 2. Initialize Database Schema
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Create a new query
4. Copy the contents from `scripts/init_supabase_db.sql`
5. Paste it into the SQL editor and run it
6. The schema will be created with automatic timestamps and indexes

### 3. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-from-dashboard

# Backend API (for frontend to communicate with FastAPI)
BACKEND_API_BASE_URL=http://localhost:8000

# Celery / Redis (keep your existing config)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

### 4. Install Python Dependencies
```bash
# In your virtual environment
pip install -r requirements.txt
```

### 5. Start Your Backend
```bash
# Make sure you're in the virtual environment
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Start Your Frontend
```bash
# In a new terminal
pnpm dev
```

## API Endpoints

### Relays
- `GET /relays` - List all relays
- `POST /relays` - Create new relay
- `GET /relays/{id}` - Get specific relay
- `PUT /relays/{id}` - Update relay
- `DELETE /relays/{id}` - Delete relay
- `POST /relays/{id}/test` - Test relay connection

### Templates
- `GET /templates` - List all templates
- `POST /templates` - Create new template
- `GET /templates/{id}` - Get specific template
- `PUT /templates/{id}` - Update template
- `DELETE /templates/{id}` - Delete template

### Campaigns
- `GET /campaigns` - List all campaigns
- `GET /campaigns/{id}/status` - Get campaign status
- `POST /campaigns/enqueue` - Start new campaign

## Frontend Components

### Using the API Hook
```typescript
import { useApi } from '@/hooks/use-api';

export function MyComponent() {
  const { relays, templates } = useApi();

  useEffect(() => {
    const fetch = async () => {
      const response = await relays.list();
      console.log(response.data);
    };
    fetch();
  }, [relays]);

  return <div>{/* your component */}</div>;
}
```

### Updated Views
- ✅ **Relays View** - Now fetches from `/api/relays` instead of mock data
- ✅ **Templates View** - Now fetches from `/api/templates` instead of mock data
- Both include loading states and error handling

## Database Schema

### Tables
1. **relays** - SMTP relay configurations
2. **templates** - Email templates
3. **campaigns** - Campaign metadata
4. **campaign_recipients** - Individual recipient tracking

All tables include:
- UUID primary keys
- Automatic created_at/updated_at timestamps
- Proper indexes for query performance
- Foreign key constraints

## Troubleshooting

### "SUPABASE_URL not configured"
Make sure your `.env.local` file has:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-key
```

### Backend returns 500 error
1. Check that both environment variables are set
2. Verify your Supabase project is active
3. Check that the SQL schema was fully executed
4. Check backend console for specific error messages

### Frontend shows "Failed to load relays"
1. Make sure `BACKEND_API_BASE_URL` is set correctly
2. Verify backend is running on the correct port
3. Check for CORS issues in browser console
4. Verify API endpoints exist: `curl http://localhost:8000/relays`

### Timestamps not updating
The database has triggers that automatically update `updated_at`:
- They're set up in the SQL schema
- If they're not working, re-run the SQL script

## Storage Migration Notes

### Redis → Supabase
Previously, relays and templates were stored in Redis. Now they use Supabase (PostgreSQL):
- More reliable for persistent data
- Better for production use
- Automatic backups on Supabase free tier
- Can scale with your needs

### Campaign Storage
Campaigns still use a hybrid approach:
- Metadata stored in Supabase
- Job queuing through Celery/Redis
- Recipient status tracked in Supabase tables

## Next Steps

1. **Add Authentication** - Use Supabase Auth for user management
2. **Add Validation** - Add more complex validation rules in backend
3. **Add Monitoring** - Log all API calls and errors
4. **Add Rate Limiting** - Protect API endpoints from abuse
5. **Add Caching** - Use Redis for frequently accessed data

## File Structure
```
app/
  ├── database.py          (NEW: Supabase client)
  ├── storage.py           (UPDATED: Uses Supabase)
  ├── main.py              (UPDATED: Registers routes)
  └── api/
      ├── relays.py        (NEW: Relay endpoints)
      └── templates.py     (NEW: Template endpoints)

scripts/
  └── init_supabase_db.sql (NEW: Database schema)

hooks/
  └── use-api.ts           (NEW: API client hook)

components/views/
  ├── relays-view.tsx      (UPDATED: Dynamic data)
  └── templates-view.tsx   (UPDATED: Dynamic data)
```

## Support

For issues with:
- **Supabase** - Visit [Supabase Docs](https://supabase.com/docs)
- **FastAPI** - Visit [FastAPI Docs](https://fastapi.tiangolo.com/)
- **This project** - Check the repository README
