# SMTP Project - Configuration and Troubleshooting Guide

## Current Status

**Issue**: Frontend and backend cannot communicate. API calls return **HTTP 404** errors.

**Root Cause**: `NEXT_PUBLIC_API_URL` environment variable is not set in Vercel production.

## Quick Fix (5 minutes)

### In Vercel Dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add new variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://smtp-production-2752.up.railway.app`
   - Select: **Production**
3. Click **Add**
4. Go to **Deployments** → Redeploy latest commit

### After Redeploy:

1. Hard refresh frontend: **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac)
2. You should see:
   - Red error banner disappears
   - Relays page shows empty list (no 404)
   - API calls start working

## What Was Fixed

### Cache Busting (Frontend)
- Added HTTP cache headers: `Cache-Control: no-cache, no-store, must-revalidate`
- Added timestamp to all API requests (`?_t=1234567890`)
- Prevents browser from returning 304 (cached) responses

### Configuration Check
- **New Component**: `frontend/components/config-check.tsx`
- Shows red error banner if `NEXT_PUBLIC_API_URL` not set
- Provides exact instructions on how to fix it
- Only appears in production, not in development

### Error Display
- **campaigns page**: Shows API error message instead of blank page
- **relays page**: Shows API error message instead of 404
- All error messages include debugging hints

### Middleware for Cache Control
- **New File**: `frontend/middleware.ts`
- Forces all HTML pages to never cache
- Ensures latest code changes are visible immediately

## How to Verify Backend is Running

```bash
# Check if backend is up
curl https://smtp-production-2752.up.railway.app/health

# Should return 200 with JSON, not 404
# Example response:
# {"status": "ok"}
```

## How to Verify Frontend Deployment

### In Vercel Deployments Tab:
- Click latest deployment
- Check "Logs" for build errors
- Status should show ✅ (green)
- Should show "Environment variables" including `NEXT_PUBLIC_API_URL`

### In Browser Console:
1. Open DevTools: **F12**
2. Go to **Console** tab
3. On page load, should show:
   ```
   🔧 API CLIENT DEBUG INFO:
      NEXT_PUBLIC_API_URL: https://smtp-production-2752.up.railway.app
      NODE_ENV: production
   ```
   - If shows "❌ NOT SET", environment variable not deployed

## Common Issues and Fixes

### Issue: Still seeing 404 after deploying environment variable

**Solution**:
1. Hard refresh: **Ctrl+Shift+R**
2. Clear browser cache completely:
   - DevTools → Application → Cache Storage → Clear all
3. Try incognito/private window
4. Wait 5 minutes for Vercel CDN to update

### Issue: Error banner shows but won't go away

**Solution**:
1. Verify environment variable is set in Vercel
2. Verify no typos in the URL value
3. Check that Railway backend is actually running: `curl https://...` from terminal
4. Redeploy frontend from Vercel dashboard

### Issue: Backend returns 404 on `/api/relays`

**Causes to check**:
1. Backend not running on Railway
2. Backend crashed during startup (check Railway logs)
3. Missing environment variables in Railway:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `DATABASE_URL`

**How to fix**:
1. Go to Railway dashboard
2. Check "Logs" for startup errors
3. Go to "Variables" and verify all needed variables are set
4. Click "Deploy" to restart backend

## Understanding the Error Messages

### "HTTP 404: Not Found"
Backend received request but endpoint doesn't exist
- Check: Does backend have the route defined?
- Check: Is backend actually running?
- Check: Is URL correct?

### "Cannot fetch from relative URL"
`NEXT_PUBLIC_API_URL` not set, frontend using relative URLs
- Check: Is environment variable set in Vercel?
- Check: Is deployment showing the variable?
- Check: Have you redone the deployment after adding variable?

### "Connection timeout"
Backend not responding within timeout period
- Check: Is Railway backend running?
- Check: Is there a firewall blocking the connection?
- Check: Is backend URL correct?

## Environment Variables Needed

### In Vercel (Frontend)
```
NEXT_PUBLIC_API_URL=https://smtp-production-2752.up.railway.app
```

### In Railway (Backend)
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
DATABASE_URL=your_database_url
```

## File Structure of Recent Changes

```
frontend/
├── middleware.ts (NEW - global cache control)
├── components/
│   ├── config-check.tsx (NEW - shows environment errors)
│   └── views/
│       └── campaigns-view.tsx (UPDATED - error display)
├── lib/
│   └── api-client.ts (UPDATED - cache busting)
└── app/
    └── layout.tsx (UPDATED - added ConfigCheck)
```

## Testing the Fix Step-by-Step

1. **Set environment variable in Vercel**
   - Vercel → Settings → Environment Variables
   - Add `NEXT_PUBLIC_API_URL=https://smtp-production-2752.up.railway.app`

2. **Trigger redeployment**
   - Vercel → Deployments → Click latest commit
   - Click "Redeploy"
   - Wait for green checkmark

3. **Hard refresh browser**
   - Go to https://smtp-sable.vercel.app
   - Press **Ctrl+Shift+R**
   - Wait for page to load

4. **Verify in console**
   - Open DevTools: **F12**
   - Console tab should show:
     ```
     🔧 API CLIENT DEBUG INFO:
        NEXT_PUBLIC_API_URL: https://smtp-production-2752.up.railway.app
     ```

5. **Check relays page**
   - Go to Relays menu
   - Should NOT show 404
   - Should show "No relays configured" or empty list (depending on data)

6. **Test API call**
   - Try creating a relay
   - Should allow submit without 404 error
   - Will fail on SMTP handshake with credentials (expected)

## Still Having Issues?

1. Check Railway logs for backend startup errors
2. Test backend health: `curl https://smtp-production-2752.up.railway.app/health`
3. Check Vercel deployment logs for build errors
4. Verify all environment variables are set in both platforms
5. Restart from scratch:
   - Clear all browser caches
   - Hard refresh multiple times
   - Check in incognito window

## Code Changes Summary

**api-client.ts**:
- Added cache-busting headers to all fetch calls
- Added timestamp parameter to URLs
- Improved error message display

**middleware.ts** (NEW):
- Forces `Cache-Control: no-cache` on all HTML pages
- Prevents browser from caching page responses

**config-check.tsx** (NEW):
- React component that displays environment variable status
- Shows red error banner if `NEXT_PUBLIC_API_URL` not set
- Displays exact fix instructions

**campaigns-view.tsx**:
- Added error state management
- Shows error messages instead of blank page
- Provides debugging hints

**layout.tsx**:
- Added `ConfigCheck` component to root layout
- Ensures environment check happens on every page
