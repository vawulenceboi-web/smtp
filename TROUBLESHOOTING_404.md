# TROUBLESHOOTING: HTTP 404 on API Requests

## Quick Diagnosis

Open your browser's Developer Tools (F12) and go to the **Console** tab. You'll see logs like:

```
🔧 API CLIENT DEBUG INFO:
   NEXT_PUBLIC_API_URL: ❌ NOT SET
   NODE_ENV: production
   Current URL: https://your-frontend.vercel.app/...
```

**If you see `❌ NOT SET`:** Jump to **Fix #1** below

## Fix #1: Environment Variable Not Set in Vercel ⚡ MOST COMMON

### Problem
```
NEXT_PUBLIC_API_URL is not configured in Vercel environment variables
```

### Solution
1. Open Vercel Dashboard
2. Select your project → **Settings** → **Environment Variables**
3. Click **Add Environment Variable**
4. Name: `NEXT_PUBLIC_API_URL`
5. Value: `https://your-backend.railway.app` (no trailing slash)
6. Select: Development, Preview, Production checkboxes
7. Click **Save**
8. Go to **Deployments** and click **Redeploy** (or push to git)
9. Wait 3-5 minutes for deployment
10. Hard refresh browser: **Ctrl+Shift+R** (or Cmd+Shift+R on Mac)
11. Check `/debug-env` page - should show green ✅

### Verification
- [ ] Environment variable appears in Vercel Settings
- [ ] Deployment shows "Building" then "Ready"
- [ ] `/debug-env` page shows your backend URL (green)
- [ ] Console shows: `✅ API URL: https://your-backend...`

---

## Fix #2: Backend URL is Wrong ⚠️

### Problem
```
Environment variable is set but has wrong/incomplete URL
Example: https://your-backend.railway.app/ (has trailing slash)
Example: your-backend.railway.app (missing https://)
Example: staging-backend.railway.app (wrong environment)
```

### Solution
1. Get correct backend URL:
   - Go to Railway Dashboard
   - Select backend project
   - Copy **Public URL** from project settings
   - Should look like: `https://smtp-backend-abc123xyz.railway.app`
2. Update in Vercel:
   - Settings → Environment Variables
   - Click the variable and edit
   - Paste exact URL (no trailing slash)
   - Save and Redeploy

### Verification
- [ ] Backend URL starts with `https://`
- [ ] No trailing slash `/` at the end
- [ ] Console shows correct URL in debug info
- [ ] Visiting `https://[your-url]/health` shows JSON response

---

## Fix #3: Backend is Not Running 🔴

### Problem
```
Backend deployment failed or crashed on Railway
```

### Solution
1. Check Railway Dashboard:
   - Select backend project
   - Click **Deployments** tab
   - Look for red/orange status (failed or crashed)
2. Check logs:
   - Click the failed deployment
   - Scroll to see error messages
   - Common errors:
     - Missing environment variables (DATABASE_URL, API_KEYS)
     - Import errors (missing packages)
     - Database connection failed
3. Fix the issue and redeploy:
   - Push code changes: `git push`
   - Or click **Redeploy latest** in Railway

### Verification
- [ ] Railway shows deployment status: **Ready** (green)
- [ ] Visiting `[backend-url]/health` returns JSON with status: "ok"
- [ ] No error logs in Railway dashboard

---

## Fix #4: Frontend Not Redeployed 🔄

### Problem
```
NEXT_PUBLIC_API_URL added to Vercel but frontend still using old version
```

### Symptoms
- Console shows: `❌ NOT SET` even though Vercel has the variable
- Only happens after adding new environment variable

### Solution
1. Trigger new deployment in Vercel:
   - Option A: Push to git → `git push` (auto-triggers build)
   - Option B: Vercel Dashboard → **Redeploy** button
2. Wait for deployment to complete (shows "Ready")
3. Wait 2-3 minutes for CDN cache clear
4. Hard refresh browser: **Ctrl+Shift+R**
5. Check `/debug-env` page

### Verification
- [ ] Vercel shows deployment status: **Ready**
- [ ] Deployment timestamp is recent (last few minutes)
- [ ] `/debug-env` page shows your backend URL

---

## Fix #5: Wrong API Path 🎯

### Problem
```
Request path is incorrect
Example: Frontend sends to /relays/test-connection
Expected: /api/relays/test-connection
```

### Solution
Check frontend code sending the request:
```typescript
// ❌ WRONG
await apiPost('/relays/test-connection', {...})

// ✅ CORRECT
await apiPost('/api/relays/test-connection', {...})
```

File location: `/frontend/lib/api-client.ts`

### Verification
- [ ] Check browser Network tab (F12 → Network)
- [ ] Click on failed request
- [ ] Check "Request URL" includes `/api/`
- [ ] Path should be: `[backend-url]/api/relays/test-connection`

---

## Fix #6: CORS Issues 🚫

### Problem
```
Request sent correctly but blocked by CORS policy
Browser console shows: "Access to XMLHttpRequest blocked by CORS policy"
```

### Solution
1. Check backend CORS configuration in `backend/main.py`:
   - Should allow requests from your Vercel domain
   - Example: `allow_origins=["https://your-frontend.vercel.app", ...]`
2. If needed, update CORS settings:
   ```python
   # In backend/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-frontend.vercel.app"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
3. Update code and redeploy backend

### Verification
- [ ] Browser console shows request goes through (no CORS warning)
- [ ] Check Network tab → Response headers include: `Access-Control-Allow-Origin`

---

## Fix #7: Intermediate Proxy/CDN Issues 🌐

### Problem
```
Vercel caching old version or proxy rejecting requests
```

### Solution
1. Clear all caches:
   - Browser cache: Ctrl+Shift+Delete
   - Vercel cache: Deployment → Purge all caches
   - CDN cache: Wait 48 hours or use Vercel CLI
2. Try in incognito/private browser window (no cache)
3. Try with different device or network

### Verification
- [ ] Private/incognito window shows correct behavior
- [ ] Response headers show: `Cache-Control: no-cache` or recent date

---

## Complete Diagnostic Checklist

Follow this to identify your exact issue:

### Step 1: Check Browser Console
1. Go to your frontend: `https://your-frontend.vercel.app/`
2. Press F12 (Developer Tools)
3. Go to **Console** tab
4. Look for: `NEXT_PUBLIC_API_URL:`
   - [ ] Shows your backend URL → Go to **Step 3**
   - [ ] Shows `❌ NOT SET` → Go to **Fix #1**

### Step 2: Check Vercel Settings
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Look for `NEXT_PUBLIC_API_URL`
   - [ ] Variable exists → Go to **Step 3**
   - [ ] Variable missing → Go to **Fix #1**

### Step 3: Test Backend Health
1. Visit: `https://[your-backend-url]/health`
   - [ ] Shows JSON response → Go to **Step 4**
   - [ ] Shows error/404 → Go to **Fix #3** or **Fix #2**

### Step 4: Check Network Request
1. Go to Frontend: `https://your-frontend.vercel.app/campaigns`
2. Press F12 → Network tab
3. Click "Test Connection" button
4. Look for request to `/api/relays/test-connection`
   - [ ] Status 200 or 400 (received response) → Success! ✅
   - [ ] Status 404 → Go to **Fix #4** (redeploy)
   - [ ] Status 0 or blocked → Go to **Fix #6** (CORS)

### Step 5: Debug Page Test
1. Visit: `https://your-frontend.vercel.app/debug-env`
2. Check the status (green ✅ or red ❌)
3. Click **Test /health Endpoint**
   - [ ] Shows response → Everything working! ✅
   - [ ] Shows error → Backend not accessible

---

## Still Stuck? 🆘

### Collect Debug Info
1. Screenshot of `/debug-env` page
2. Browser console logs (F12 → Console → right-click → Save as)
3. Network request details (F12 → Network → right-click request → Copy as cURL)
4. Vercel deployment logs (Settings → Function Logs)
5. Railway backend logs (Deployments → View logs)

### Then:
Submit these when reporting issue:
- What error message do you see?
- What does `/debug-env` page show?
- Can you reach backend directly? (`https://[url]/health`)
- When was frontend last deployed?

---

## Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| 404 for `/api/relays/*` | Backend URL not set | Set `NEXT_PUBLIC_API_URL` in Vercel |
| 404 after adding env var | Frontend not redeployed | Click Redeploy in Vercel |
| Connection refused | Backend offline | Check Railway dashboard |
| CORS error in console | Backend doesn't allow origin | Update CORS in backend/main.py |
| `/debug-env` shows "NOT SET" | Env var not deployed | Hard refresh (Ctrl+Shift+R) |
| Backend URL wrong | Copy-paste error | Get exact URL from Railway |

---

See: [VERCEL_404_FIX.md](./VERCEL_404_FIX.md) for step-by-step visual instructions.
