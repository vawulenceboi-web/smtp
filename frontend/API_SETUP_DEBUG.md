# API Integration Debugging Guide

## Issue Diagnosis

**Symptom:** HTTP 404 on test connection click, even before entering SMTP details

**Root Cause:** Frontend environment variable `NEXT_PUBLIC_API_URL` not being loaded by Next.js runtime

**Evidence from logs:**
- Request method: `GET` (should be `POST`)
- Request path: `/` (should be `/api/relays/test-connection`)
- Response: `404` immediately (no SMTP connection attempted)

---

## Debug Checklist

### 1. **Restart Next.js Dev Server**
The dev server must be restarted after creating/modifying `.env.local`:

```bash
# Kill any running Next.js process
pkill -f "next dev"

# Clear Next.js cache
cd frontend
rm -rf .next

# Restart dev server
pnpm dev
```

### 2. **Verify Environment Variable is Loaded**

Open browser DevTools → Console and look for these logs:
- ✅ `✅ API URL: http://localhost:8000/api/relays/test-connection` = Variable loaded correctly
- ❌ `❌ No baseUrl set. Using relative URL: /api/relays/test-connection` = Variable NOT loaded

### 3. **Check Frontend Environment Files**

Verify these files exist:

```bash
# Local development config
ls -la frontend/.env.local
cat frontend/.env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:8000

# Example for documentation
ls -la frontend/.env.example
```

### 4. **Clear Browser Cache & LocalStorage**

The application caches campaign state in localStorage:

```javascript
// Open DevTools Console and run:
localStorage.removeItem('campaignState');
location.reload();
```

Or use the reset button in the UI (if available).

### 5. **Test in Fresh Browser Tab**

Open an incognito/private window to avoid any caching.

---

## Local Development Setup

### Prerequisites
- Frontend running on `http://localhost:3000`
- Backend running on `http://localhost:8000`
- `.env.local` file in `frontend/` directory

### Step-by-Step

1. **Ensure backend is running:**
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start frontend dev server:**
   ```bash
   cd frontend
   pnpm dev
   ```

3. **Verify API calls:**
   - Open `http://localhost:3000` in browser
   - Open DevTools Console (F12)
   - Fill in SMTP details in Step 1
   - Click "Test Connection"
   - You should see logs like:
     ```
     ✅ API URL: http://localhost:8000/api/relays/test-connection
     📤 POST http://localhost:8000/api/relays/test-connection
     ```

---

## Production Deployment (Railway + Vercel)

### Frontend (Vercel)

1. In Vercel dashboard → Settings → Environment Variables
2. Add:
   ```
   NEXT_PUBLIC_API_URL=https://smtp-backend-abc123.up.railway.app
   ```
   (Replace with your actual Railway backend URL)

3. Redeploy frontend

### Backend (Railway)

Ensure backend is accessible at: `https://your-backend-id.up.railway.app`

You can find this URL in Railway dashboard: Your Project → Deployments → Domain

---

## Troubleshooting

### "404 on root path /"
- [ ] Frontend environment variable not set
- [ ] Next.js dev server not restarted
- [ ] NEXT_PUBLIC_API_URL not prefixed correctly
- [ ] For production: Vercel environment variable not configured

### "Connection refused" or "ERR_CONNECTION_REFUSED"
- [ ] Backend not running (check port 8000)
- [ ] Backend URL incorrect in NEXT_PUBLIC_API_URL
- [ ] For production: Railway backend service is down

### "Old data keeps loading"
- [ ] Clear localStorage: `localStorage.removeItem('campaignState')`
- [ ] Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- [ ] Check .next cache: `rm -rf frontend/.next`

### "API returns 404 on production"
- [ ] Check Railway backend logs for route errors
- [ ] Verify `NEXT_PUBLIC_API_URL` is set in Vercel
- [ ] Confirm production backend URL is correct
- [ ] Ensure backend routes are registered with `/api` prefix

---

## API Flow Diagram

```
Frontend (localhost:3000)
    ↓ (click "Test Connection")
API Client (lib/api-client.ts)
    ↓ (reads NEXT_PUBLIC_API_URL)
Builds Full URL: http://localhost:8000/api/relays/test-connection
    ↓ (POST request)
Fetch API → HTTP Request
    ↓ 
Backend (localhost:8000)
    ↓ (router processes /api/relays/test-connection)
Response: {success: true/false}
    ↓ (returned to frontend)
Display Result
```

---

## Environment Variable Loading Timeline

```
1. Create .env.local file
2. Kill Next.js server (pkill -f "next dev")
3. Restart: pnpm dev
4. Next.js loads .env.local
5. NEXT_PUBLIC_API_URL embedded into front-end bundle
6. Browser loads page
7. JavaScript can access: process.env.NEXT_PUBLIC_API_URL
```

If any step is skipped, the variable won't be available.
