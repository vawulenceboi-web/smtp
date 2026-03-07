# Complete Diagnostic & Cleanup Guide

## 🔍 Issue Analysis

### Problem Symptoms
1. **No debug logs appearing in Railway backend** → Logging might not be configured for stdout
2. **No frontend logs in Vercel** → Debug statements are dev-only (by design) but this is correct
3. **LocalStorage persisting on Vercel domain** → Browser cache issue, not backend

---

## ⚠️ Critical Configuration Issues Found

### 1. **Backend Port Mismatch**

**Problem:**
- Railway runs backend on **8080** (or random $PORT)
- Frontend `.env.local` configured for **localhost:8000**
- In production: NEXT_PUBLIC_API_URL not set in Vercel

**Fix:**

**For Local Development:**
```bash
# Option A: Run backend on port 8000
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Option B: Update .env.local to match your backend port
# Edit frontend/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**For Production (Vercel):**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend-domain
   ```
3. Get the domain from Railway Dashboard → Your Backend → Domain
4. **Redeploy frontend after setting this**

---

## 🧹 Cleanup Checklist

### 1. Remove Unnecessary/Cached Build Files

```bash
# Frontend cleanup
cd frontend
rm -rf .next
rm -rf node_modules/.cache
rm -rf out

# Backend cleanup (if using Python cache)
cd backend
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete
```

### 2. Clear Browser Cache/LocalStorage

**For Testing:**
- Open DevTools (F12)
- Application → LocalStorage → https://your-domain
- Delete `campaignState` entry
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

**For Production (User-Side):**
- Users can clear browser data or hard refresh
- You can't force this server-side for Vercel

---

## 🔧 Fix Logging to Ensure Output

### Backend: Configure

 Logging for Railway

Edit `backend/main.py` - ensure logging uses print-compatible format:

```python
import logging
import sys

# Configure logging to output to stdout (which Railway captures)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    stream=sys.stdout,  # IMPORTANT: Direct to stdout
    force=True
)
logger = logging.getLogger(__name__)
```

### Why This Matters
- Railway captures `stdout` / `stderr`
- Python's print also goes to stdout
- Setting `stream=sys.stdout` ensures logger output appears in Railway logs
- `force=True` overrides any previous handlers

### Verify Logging is Working

After deploying to Railway:
1. Make a test connection request
2. Go to Railway → Logs
3. You should see:
   ```
   [INFO] __main__: 📥 POST /api/relays/test-connection
   [INFO] backend.api.relays: 🔍 Testing SMTP connection to smtp.gmail.com:587
   ```

---

## 📋 File Structure Audit

### ✅ Correct Structure

```
backend/
  main.py              ← FastAPI app with middleware logging
  api/
    relays.py          ← Routes with logger statements
    templates.py       ← Routes with logger statements
    settings.py
    admins.py
    notifications.py

frontend/
  .env.local           ← Local dev config
  .env.production      ← Template for production
  .env.example         ← Reference
  lib/api-client.ts    ← API calls (no direct logging for production)
  app/
    campaigns/
    relays/
    templates/
    page.tsx           ← No duplicate routes
    (No /api directory - this would conflict)
```

### ❌ Issues to Remove

- ❌ Duplicate `route.ts` files in frontend (none found - GOOD)
- ❌ Multiple `main.py` files (none found - GOOD)
- ❌ Conflicting database configurations (verify backend/database.py)
- ❌ Hardcoded URLs instead of environment variables

---

## 🚀 Complete Reset Procedure

### For Local Development

```bash
# 1. Clean everything
cd /home/ksmo/Downloads/smtp

# Frontend
cd frontend
rm -rf .next
rm -rf node_modules
pnpm install

# Backend
cd ../backend
find . -type d -name __pycache__ -exec rm -r {} +

# 2. Update configurations
# Edit frontend/.env. prod if testing production
# NEXT_PUBLIC_API_URL must match your backend URL

# 3. Start services
#Terminal 1 - Backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend
cd frontend
rm -f localStorage campaignState  # Clear storage
pnpm dev

# Terminal 3 - Test
curl -X GET http://localhost:8000/health
```

### For Production Deployment

```bash
# 1. Vercel (Frontend)
- Set NEXT_PUBLIC_API_URL to your Railway backend domain
- Redeploy: git push (auto-triggers Vercel redeploy)
- Check Vercel Logs tab

# 2. Railway (Backend)
- Backend automatically redeployed on git push
- Check Railway Logs tab for debug output
- Ensure no PORT configuration conflicts
```

---

## 🐛 Debugging: Where Are Logs?

### Local Development

**Backend Logs:**
- Terminal running `uvicorn main:app`
- Look for: `📥`, `📤`, `✅`, `❌`

**Frontend Console Logs:**
- Browser DevTools → Console tab
- Only shows in development mode
- Won't show in production builds

### Production (Railway)

**Backend Logs:**
1. Go to Railway Dashboard
2. Your Project → Your Backend Service → Logs tab
3. Search for: `POST /api/relays/test-connection`
4. Should show full request/response cycle

**Production (Vercel)**

**Frontend Console Logs:**
- Vercel doesn't show browser console logs by default
- Use Vercel Analytics or external monitoring service
- Browser DevTools on actual production domain shows logs

---

## ✅ Verification Checklist

- [ ] Backend runs on correct port (8000 for local, $PORT=8080 for Railway)
- [ ] Frontend `.env.local` points to correct backend URL
- [ ] Vercel environment variable `NEXT_PUBLIC_API_URL` set
- [ ] Logging includes `stream=sys.stdout` in Python
- [ ] No duplicate route files in frontend
- [ ] Backend middleware logging is active
- [ ] LocalStorage cleared before testing
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Change made and deployed (git push)
- [ ] Logs checked in correct location (Railway for backend, Browser for frontend)

---

## 🔗 Quick Reference: Where to Find Logs

| Service | Environment | Log Location |
|---------|-------------|--------------|
| Backend Code | Local | Terminal running uvicorn |
| Backend API | Local | Terminal running uvicorn |
| Frontend JS | Local | Browser Console (F12) |
| Backend Code | Production | Railway → Logs tab |
| Backend API | Production | Railway → Logs tab |
| Frontend JS | Production | Browser Console on domain |

---

## 📞 If Logs Still Don't Appear

### Backend (No logs in Railway)

1. Check backend is actually running:
   ```
   Railway → Logs → Should show "Application startup complete"
   ```

2. Verify logging code exists:
   - Check backend/main.py has `stream=sys.stdout`
   - Check backend/api/relays.py has `logger.info()` statements

3. Make a test request and watch logs in real-time:
   - Railway → Logs tab (auto-refreshing)
   - Make click "Test Connection"
   - Logs should appear instantly

### Frontend (Vercel + Browser)

1. Open production site in browser
2. Open DevTools Console (F12 → Console)
3. Click "Test Connection"
4. Should see browser console logs if in development mode
5. If no logs: This is expected for production builds (by design)

---

## 🎯 Next Steps

1. **Identify which environment you're testing in:**
   - Local: Check terminal logs
   - Production: Check Railway and Vercel dashboards

2. **Ensure backend port matches frontend URL:**
   - Local: Both should use same port
   - Production: frontend NEXT_PUBLIC_API_URL must include full domain

3. **Clear all caches:**
   - Browser cache: Hard refresh (Ctrl+Shift+R)
   - LocalStorage: Open DevTools → Application → LocalStorage → Delete
   - Build cache: `rm -rf .next` for frontend

4. **Make test request and check logs immediately:**
   - Watch real-time to correlate request with logs
   - If no logs after 10 seconds: URL is wrong or service not running
