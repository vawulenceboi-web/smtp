# 404 Errors: Frontend Can't Find Backend - SOLUTION

## The Problem 🔴

You're seeing **HTTP 404** errors when trying to test SMTP connections because:

1. **`NEXT_PUBLIC_API_URL` environment variable is NOT SET in Vercel**
2. Frontend makes **relative requests** like `/api/relays/test-connection`
3. These requests go to **Vercel frontend URL** (wrong!) instead of **Railway backend URL** (correct!)
4. Vercel frontend doesn't have these endpoints → **404 errors**

## Example of What's Happening ❌

```
Frontend URL: https://your-frontend.vercel.app/campaigns/new

When you click "Test Connection":
  Frontend tries to reach: https://your-frontend.vercel.app/api/relays/test-connection
  Expected:                https://your-backend.railway.app/api/relays/test-connection
  
  Result: ❌ 404 - Not Found (Vercel doesn't have this endpoint!)
```

## The Fix ✅

### Step 1: Get Your Backend URL from Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your **Email Orchestrator Backend** project
3. Click **Deployments** or **Settings**
4. Look for the **Public URL** (should look like: `https://smtp-backend-xxxxx.railway.app`)
5. Copy this URL (without trailing slash)

### Step 2: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your **smtp** (or frontend) project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New** or **Add Environment Variable**
5. Fill in:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** Your Railway backend URL (e.g., `https://smtp-backend-xxxxx.railway.app`)
   - **Environments:** Select all (Development, Preview, Production)
6. Click **Save**

### Step 3: Redeploy Frontend

Option A (Automatic):
- Push to git: `git push` (Vercel auto-rebuilds)

Option B (Manual):
- In Vercel Dashboard, click **Redeploy** or **Deployments** → **Redeploy**

### Step 4: Verify It Works

1. Wait for deployment to finish (check Vercel dashboard)
2. Open your frontend: `https://your-frontend.vercel.app`
3. Go to **Debug Dashboard**: `https://your-frontend.vercel.app/debug-env`
4. Check that `NEXT_PUBLIC_API_URL` shows your Railway URL (NOT "NOT SET")
5. Click **Test /health Endpoint** - should show success!

## If It Still Doesn't Work 🔧

### Check 1: Is Vercel environment variable set?
- Go to Vercel Settings → Environment Variables
- Verify `NEXT_PUBLIC_API_URL` exists and has correct value
- Verify it's set for ALL environments (Development, Preview, Production)

### Check 2: Did you redeploy?
- New environment variables require a redeploy
- Full page refresh (Ctrl+Shift+R) won't help - need actual redeploy

### Check 3: Backend is it running?
- Visit `https://your-backend.railway.app/health`
- Should see JSON response: `{"status": "ok", ...}`
- If it shows error, backend deployment failed

### Check 4: Debug in Production
- Open your site in browser
- Press F12 (Developer Tools)
- Go to **Console** tab
- Look for log messages like:
  - `🔧 API CLIENT DEBUG INFO` - shows what API URL is being used
  - `✅ API URL: https://...` or `❌ NO BACKEND URL`
  - Any fetch errors will be logged here

### Check 5: CORS Issues?
If backend is running but you see CORS errors in browser console:
- Backend needs to allow requests from your Vercel domain
- This is configured in `backend/main.py`
- Ensure CORS middleware includes Vercel domain

## Local Testing (Before Production)

To test locally before deploying:

### Terminal 1: Start Backend
```bash
cd backend
source ../.venv/bin/activate
python -m uvicorn main:app --port 8000
```

### Terminal 2: Start Frontend
```bash
cd frontend
# Make sure .env.local has:
# NEXT_PUBLIC_API_URL=http://localhost:8000

pnpm dev
# Or: npm run dev
```

### Terminal 3: Test
Open browser to `http://localhost:3000/debug-env` - should show green ✅ status

## File Locations for Reference

**Frontend debug page:** `/frontend/app/debug-env/page.tsx`
- URL: `https://your-frontend.vercel.app/debug-env`
- Shows exactly what API URL is configured
- Has test buttons to verify connectivity

**Frontend API client:** `/frontend/lib/api-client.ts`
- Handles all API requests
- Reads `NEXT_PUBLIC_API_URL` environment variable
- Logs all requests to browser console

**Backend health endpoint:** `GET /health`
- Returns JSON with status info
- No authentication required
- Quick way to verify backend is running

## Environment Variable Names

⚠️ **MUST start with `NEXT_PUBLIC_`** to be exposed to browser!

✅ Correct: `NEXT_PUBLIC_API_URL`
❌ Wrong: `API_URL` (won't be available in frontend)
❌ Wrong: `NEXT_API_URL` (missing PUBLIC)

## Summary Checklist

- [ ] Backend is running on Railway with public URL
- [ ] `NEXT_PUBLIC_API_URL` environment variable is set in Vercel
- [ ] Environment variable value is your Railway backend URL
- [ ] Frontend has been redeployed since adding env var
- [ ] Debug page (`/debug-env`) shows your backend URL (not "NOT SET")
- [ ] `/health` endpoint test passes
- [ ] SMTP test connection works

Once all checkboxes are ✅, the 404 errors will be fixed!

---

**Need more help?** Check browser console (F12) for detailed debug logs, or visit `/debug-env` page for interactive diagnostics.
