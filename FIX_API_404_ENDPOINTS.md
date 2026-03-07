# Fixing "HTTP 404" on /api/relays/test-connection

## The Issue 🔴

When you try to test SMTP connection, you get:
```
✗ Connection failed: HTTP 404: HTTP 404
```

This means the backend endpoint `/api/relays/test-connection` is not responding.

## Root Causes (In Order of Likelihood)

### 1. Backend Crashed During Deployment ❌

**Most likely cause after `git push` with code changes**

#### How to Check
1. Go to [Railway Dashboard](https://railway.app)
2. Select your backend project
3. Click **Deployments** tab
4. Look at the latest deployment:
   - ✅ Green status = Ready (good)
   - 🟠 Orange status = Building (wait)
   - 🔴 Red status = Failed (bad)

#### If Deployment Failed
1. Click on the failed deployment
2. Scroll to **Build Errors** or **Deployment Logs**
3. Look for error messages like:
   - `ModuleNotFoundError: No module named 'xxx'`
   - `SyntaxError` in Python file
   - `ImportError: cannot import name 'xxx'`
4. Common fixes:
   - **Python imports:** Check `backend/__init__.py` files
   - **Dependencies:** Make sure `requirements.txt` has all packages
   - **Database:** Check `DATABASE_URL` environment variable is set

### 2. Backend Startup Syntax Error 🐛

**Code has syntax error preventing startup**

#### How to Check Locally
```bash
cd backend
source ../.venv/bin/activate
python -m py_compile api/relays.py
python -m py_compile main.py
# Should compile without errors
```

#### If There's a Syntax Error
- Find and fix the error in the Python file
- Commit and push: `git push`
- Wait for Railway to redeploy

### 3. Router Not Registered Properly ⚙️

**The routes exist but aren't being included in the app**

#### How to Verify
In `backend/main.py`, check that routers are registered:
```python
# These lines should exist:
app.include_router(relays.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
# etc...
```

If missing, add them.

### 4. Wrong Endpoint Path 🎯

**Frontend calling wrong path or backend endpoint not defined**

#### Check These Paths Match

**Frontend calling:**
```typescript
// frontend/components/campaign/step1-relay-config.tsx
await apiPost('/api/relays/test-connection', {...})
```

**Backend endpoint:**
```python
# backend/api/relays.py
@router.post("/test-connection", response_model=dict)
async def test_connection(config: RelayTestRequest):
    ...
```

**Router registration:**
```python
# backend/main.py
app.include_router(relays.router, prefix="/api")
# Result: `/api/` + `/relays/` (from prefix) + `/test-connection` = `/api/relays/test-connection` ✅
```

## How to Diagnose

### Step 1: Check Backend Health

Visit in your browser or terminal:
```bash
curl https://[your-backend-railway-url]/health
```

Should return:
```json
{
  "status": "ok",
  "service": "Email Orchestrator API",
  "version": "1.0.0",
  "timestamp": "2026-03-07T..."
}
```

If you get 404, backend isn't running.

### Step 2: Test Debug Endpoint

```bash
curl https://[your-backend-railway-url]/api/relays/debug
```

Should return:
```json
{
  "status": "ok",
  "message": "Relays router is working",
  "endpoint": "/api/relays/test-connection"
}
```

If you get 404, the relays router isn't registered.

### Step 3: Check Railway Logs

1. Railway Dashboard → Your Backend Project
2. Click **Logs** or **Deployments** → select deployment → **View Logs**
3. Look for:
   - ✅ `Listening on port 8080` (good)
   - ❌ `ModuleNotFoundError` (bad)
   - ❌ `SyntaxError` (bad)
   - 📥 `POST /api/relays/test-connection` (shows requests coming in)

### Step 4: Frontend Debug Page

Visit: `https://[your-frontend-vercel].vercel.app/debug-env`

1. Check that API URL shows your backend (green ✅)
2. Click **Test /api/relays Router**
3. Look at the response:
   - ✅ Shows `/api/relays/debug` success first
   - ✅ Then shows `/api/relays/test-connection` response
   - ❌ Shows 404 for either = backend not responding

## Solution Checklist

- [ ] Backend deployment shows **Ready** (green) in Railway
- [ ] `https://[backend-url]/health` returns 200 with JSON
- [ ] `https://[backend-url]/api/relays/debug` returns 200 with JSON
- [ ] `/debug-env` page shows both tests passing
- [ ] Check Railway logs for any errors
- [ ] Latest deployment includes the recent `git push` changes
- [ ] `backend/api/relays.py` has `@router.post("/test-connection")` endpoint
- [ ] `backend/main.py` registers all routers with `app.include_router(relays.router, prefix="/api")`

## Quick Fixes

### If Backend Isn't Running
```bash
# Check Railway deployment
# If status is red, click the deployment and look for error messages in logs
# Look for: "ModuleNotFoundError", "SyntaxError", "ImportError"
```

### If You Just Pushed Code
```bash
# Wait 2-5 minutes for Railway to rebuild and deploy
# Check: Railway Dashboard → Deployments tab → green "Ready" status
```

### If You Modified requirements.txt
```bash
# Railway might not have installed new packages
# Solution: Push a dummy change to trigger rebuild
# Or manually redeploy in Railway dashboard
```

### If Everything Looks OK But Still 404
1. Hard refresh browser: **Ctrl+Shift+R**
2. Check `/debug-env` page again
3. Look at browser Network tab (F12 → Network)
4. Check exact URL being called
5. Compare with Railway logs
6. If request shows in logs but returns 404, backend code issue

## Need More Info?

Run this test script to check all endpoints:
```bash
cd /home/ksmo/Downloads/smtp
chmod +x test-railway-backend.sh
./test-railway-backend.sh
# (Update BACKEND_URL in script with your Railway URL first)
```

This will test:
1. `/health` - basic health check
2. `/api/relays/debug` - router test
3. `/api/relays` - list relays
4. `/api/relays/test-connection` - your SMTP test endpoint
5. `/` - root path

---

**Next Step:** Check your Railway dashboard deployment status and share any error messages you see in the logs.
