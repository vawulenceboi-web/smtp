# Production Debug & Monitoring Guide

## Overview

Comprehensive debug logging has been added to both frontend and backend to help diagnose issues in production (Railway) and staging environments.

---

## Backend Logging (Railway)

### What Gets Logged

#### 1. **All HTTP Requests** (Middleware)
```
📥 POST /api/relays/test-connection
📤 POST /api/relays/test-connection -> 200
```

#### 2. **Test Connection Endpoint** (`POST /api/relays/test-connection`)
```
🔍 Testing SMTP connection to smtp.gmail.com:587 (TLS: True)
   Username: user@gmail.com
   SSL Context: created
   Creating SMTP connection...
   SMTP connection established
   Attempting login with username: user@gmail.com
✅ SMTP login successful for user@gmail.com@smtp.gmail.com
```

**Or on failure:**
```
❌ Connection failed: [SMTP error message]
```

#### 3. **Campaign Enqueue** (`POST /campaigns/enqueue`)
```
📨 Campaign enqueue request: campaign_id=campaign_1705123456_abc123
   Recipients: 100, Subject: Important Security Update
   Provider: smtp
   Registering campaign campaign_1705123456_abc123
   Enqueueing campaign batch to Celery
✅ Campaign campaign_1705123456_abc123 queued successfully
```

#### 4. **Template Creation** (`POST /api/templates`)
```
📝 Creating template: Welcome Email (onboarding)
✅ Template created with ID: tmpl_abc123xyz
```

### Viewing Logs in Railway

1. **Go to Railway Dashboard**
   - Your Project → Deployments → [Your Backend Deployment]

2. **Click "Logs" tab**
   - View real-time logs as requests come in

3. **Search logs for debugging**
   - Look for: `🔍 Testing SMTP` for connection test logs
   - Look for: `❌` for errors
   - Look for: `✅` for successful operations

### Example Log Sequence (Test Connection Success)

```
2026-03-07T09:25:00.123Z [inf] 📥 POST /api/relays/test-connection
2026-03-07T09:25:00.124Z [inf] 📨 POST /api/relays/test-connection endpoint called
2026-03-07T09:25:00.125Z [inf]    Request body: host=smtp.gmail.com, port=587, username=user@gmail.com, use_tls=True
2026-03-07T09:25:00.126Z [inf] 🔍 Testing SMTP connection to smtp.gmail.com:587 (TLS: True)
2026-03-07T09:25:00.127Z [inf]    Username: user@gmail.com
2026-03-07T09:25:00.128Z [inf]    SSL Context: created
2026-03-07T09:25:00.129Z [inf]    Creating SMTP connection...
2026-03-07T09:25:01.234Z [inf]    SMTP connection established
2026-03-07T09:25:01.235Z [inf]    Attempting login with username: user@gmail.com
2026-03-07T09:25:01.456Z [inf] ✅ SMTP login successful for user@gmail.com@smtp.gmail.com
2026-03-07T09:25:01.457Z [inf]    Test result: {'success': True, 'message': 'SMTP connection successful'}
2026-03-07T09:25:01.458Z [inf]    Returning success response
2026-03-07T09:25:01.500Z [inf] 📤 POST /api/relays/test-connection -> 200
```

### Example Log Sequence (Test Connection Failure)

```
2026-03-07T09:25:05.123Z [inf] 📥 POST /api/relays/test-connection
2026-03-07T09:25:05.124Z [inf] 📨 POST /api/relays/test-connection endpoint called
2026-03-07T09:25:05.125Z [inf]    Request body: host=smtp.gmail.com, port=587, username=baduser, use_tls=True
2026-03-07T09:25:05.126Z [inf] 🔍 Testing SMTP connection to smtp.gmail.com:587 (TLS: True)
2026-03-07T09:25:05.127Z [inf]    SSL Context: created
2026-03-07T09:25:05.128Z [inf]    Creating SMTP connection...
2026-03-07T09:25:05.234Z [inf]    SMTP connection established
2026-03-07T09:25:05.235Z [inf]    Attempting login with username: baduser
2026-03-07T09:25:06.456Z [err] ❌ Connection failed: (535, b'5.7.8 Username and Password not accepted...')
2026-03-07T09:25:06.457Z [inf]    Test result: {'success': False, 'message': 'Connection failed: (535, b\'5.7.8 Username and Password not accepted...\')'}
2026-03-07T09:25:06.458Z [inf]    Raising HTTPException 400: Connection failed: (535, b'5.7.8 Username and Password not accepted...')
2026-03-07T09:25:06.500Z [inf] 📤 POST /api/relays/test-connection -> 400
```

---

## Frontend Logging (Development Only)

### What Gets Logged (Development Environment Only)

Frontend debug logs are **conditionally enabled** - they only appear in development mode (`process.env.NODE_ENV === 'development'`).

#### Environment Variable Loading
```
✅ API URL: http://localhost:8000/api/relays/test-connection
```

**or on failure:**
```
❌ No baseUrl set. Using relative URL: /api/relays/test-connection
```

#### API Requests (Development Only)
```
📤 POST http://localhost:8000/api/relays/test-connection { host: "smtp.gmail.com", port: 587, ... }
```

### Disabling Frontend Logs for Production

Currently, frontend logs are automatically disabled in production builds. To verify:

```typescript
// In frontend/lib/api-client.ts
if (process.env.NODE_ENV === 'development') {
  console.log('...'); // Only shows in dev
}
```

When deployed to Vercel, `process.env.NODE_ENV` will be `'production'`, so no logs will appear.

---

## Debugging Workflow

### Issue: HTTP 404 on Test Connection

**Step 1: Check Backend Logs (Railway Dashboard)**
- Look for `📥 POST /api/relays/test-connection`
- If NOT present → Frontend URL misconfigured, see "Issue: Cannot reach backend"
- If present → Request reached backend, check response

**Step 2: Check Response Code**
- `📤 ... -> 200` = Success, issue is frontend handling
- `📤 ... -> 400` = SMTP auth failed, check credentials
- `📤 ... -> 404` = Route not found, backend routing issue

**Step 3: Check SMTP Details**
- Look for `🔍 Testing SMTP connection to [host]`
- Check host, port, TLS settings
- Look for error details after `❌`

### Issue: Cannot Reach Backend

**In Production:**
```
❌ Connection failed: Failed to fetch
```

**Diagnosis:**
1. Check `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Verify Railway backend URL is correct
3. Check if both services are running

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Ensure `NEXT_PUBLIC_API_URL=https://your-railway-backend-url`
3. Redeploy frontend

### Issue: Campaign Won't Submit

**Step 1: Check Backend Logs**
- Look for `📨 Campaign enqueue request`
- If not present → Frontend not sending request
- If present → Check for errors in response

**Example Success:**
```
✅ Campaign campaign_1705123456_abc123 queued successfully
```

**Example Failure:**
```
❌ [Error message] in IP reputation check
or
❌ [Error message] when registering campaign
```

---

## Production Troubleshooting Checklist

### SMTP Test Connection Not Working

- [ ] Backend logs show `📥 POST /api/relays/test-connection` ?
  - No → Frontend `NEXT_PUBLIC_API_URL` is wrong
  - Yes → Continue

- [ ] Check logs for `🔍 Testing SMTP connection` ?
  - No → Backend routing issue (check `/api` prefix registration)
  - Yes → Continue

- [ ] Look for `✅ SMTP login successful` ?
  - No → Check error details after `❌`
  - Yes → SMTP works, issue is frontend display logic

### Campaign Won't Enqueue

- [ ] Backend logs show `📨 Campaign enqueue request` ?
  - No → Frontend not calling `/campaigns/enqueue`
  - Yes → Continue

- [ ] Check for `✅ Campaign ... queued successfully` ?
  - No → Check error logs for failure reason
  - Yes → Backend queued it, check Celery/Redis

### High Error Rate

- [ ] Check how many `❌` errors in recent logs
- [ ] Group by error type to find patterns
- [ ] Look for timeouts vs validation errors vs auth failures

---

## HTTP Status Codes in Logs

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | ✅ Everything OK |
| 400 | Bad Request | ❌ Check SMTP credentials or request format |
| 404 | Not Found | ❌ Route not registered or wrong URL |
| 500 | Server Error | ❌ Backend error - check full error message |

---

## Log Timestamps

All logs include RFC3339 timestamps in ISO format:
```
2026-03-07T09:25:01.500Z
```

This makes it easy to:
- Correlate frontend and backend events
- Match with user reports ("I tried at 09:25")
- Track request duration (from first `📥` to final `📤`)

---

## Performance Monitoring

### Request Duration

Calculate from logs:
```
📥 POST /api/relays/test-connection        [09:25:00.123Z]
📤 POST /api/relays/test-connection -> 200 [09:25:01.500Z]

Duration = 1.377 seconds
```

**Typical durations:**
- SMTP test connection: 1-3 seconds
- Template creation: <100ms
- Campaign enqueue: <200ms

If significantly slower, investigate:
- Database latency
- SMTP server response time
- Email service API delays

---

## Cleanup & Privacy

**Do NOT commit to git:**
- `.env.local` (development secrets)
- `.env.*.local` (local override files)

These are already in `.gitignore`.

**What IS safe to commit:**
- Logging code
- Debug pages
- `API_SETUP_DEBUG.md`
- `.env.example` (sanitized template)

---

## Future Improvements

Potential enhancements:
- [ ] Structured logging (JSON format)
- [ ] Log aggregation (Datadog, LogRocket)
- [ ] Alert rules (e.g., >5 errors in 1 minute)
- [ ] Audit logging for campaigns
- [ ] Performance metrics (histogram of request durations)
