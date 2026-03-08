# Database Initialization Guide

## Overview

The SMTP Orchestrator uses Supabase as the database. You need to initialize the database schema (tables, indexes, triggers) before the application can work.

## Step 1: Run the Initialization Script

1. **Go to Supabase Console**: https://app.supabase.com
2. **Select your project**
3. **Navigate to**: SQL Editor → New Query
4. **Copy and paste** the entire contents of:
   ```
   scripts/init_supabase_db.sql
   ```
5. **Click "Run"** button
6. **Wait for completion** - you should see: `Database initialization completed successfully!`

## What the Script Does

✅ **Creates tables** (if not exist):
- `relays` - SMTP relay configurations
- `templates` - Email templates  
- `campaigns` - Campaign metadata
- `campaign_recipients` - Individual recipient tracking
- `settings` - Configuration settings
- `admins` - Administrator accounts
- `notifications` - System notifications

✅ **Creates indexes** for query performance

✅ **Creates triggered functions** that auto-update `updated_at` timestamps

✅ **Inserts default settings** (SMTP timeout, batch size, etc.)

✅ **Grants permissions** to authenticated users

## Safe to Run Multiple Times ✅

The script uses:
- `CREATE TABLE IF NOT EXISTS` - won't fail if table already exists
- `CREATE INDEX IF NOT EXISTS` - won't fail if index already exists
- `DROP TRIGGER IF EXISTS ... CASCADE` - safely removes triggers before recreating
- `ON CONFLICT ... DO UPDATE` - safely handles duplicate settings

**You can run this script as many times as needed without errors.**

## Verify Initialization

After running the script, check in Supabase:

1. **Go to**: Database → Tables
2. **Verify you see all tables**:
   - ✅ relays
   - ✅ templates
   - ✅ campaigns
   - ✅ campaign_recipients
   - ✅ settings
   - ✅ admins
   - ✅ notifications

## If Something Goes Wrong

### Error: "Table already exists"
Don't worry! This means the table was already created. The `IF NOT EXISTS` clause prevents errors.

### Error: "Trigger already exists"
The script now drops triggers before creating them, so this shouldn't happen. If it does:
- Click "Run" again (the script is idempotent)

### Error: "UUID extension not found"
The first line of the script enables the UUID extension, so this shouldn't happen. If it does:
- Ensure you have the correct project selected
- Your Supabase account may need to enable extensions

## Troubleshooting

### Tables not showing up
1. Refresh the Supabase page
2. Run the script again
3. Check for error messages in the output

### Application still getting 404 on API calls
1. Verify all tables are created (see "Verify Initialization" above)
2. Check `NEXT_PUBLIC_API_URL` is set in Vercel
3. Verify backend environment variables are set in Railway (SUPABASE_URL, SUPABASE_KEY, DATABASE_URL)
4. Restart backend on Railway

## Backend Environment Variables

Make sure these are set in Railway:
```
SUPABASE_URL=https://xfxsozjwiqhljvoghirn.supabase.co
SUPABASE_KEY=your-anon-key-here
DATABASE_URL=postgresql://[user]:[password]@db.[project].supabase.co:5432/postgres
```

## Next Steps

Once initialization is complete:
1. Frontend can call `/api/relays`, `/api/templates`, etc.
2. Backend will read/write from Supabase database
3. Create your first relay via `/relays` page
4. Create email templates
5. Set up campaigns

---

**Last Updated**: March 8, 2026  
**Status**: Database initialization script ready to use
