# 🚀 SMTP Project - Quick Start Checklist

## ⚠️ Current Issue
- **Frontend**: `smtp-sable.vercel.app` ✅ Deployed
- **Backend**: `smtp-production-2752.up.railway.app` ✅ Deployed  
- **Connection**: ❌ **NOT WORKING** - API returns 404

## 🔧 5-Minute Fix

### Step 1: Add Environment Variable to Vercel
```
1. Go to https://vercel.com/dashboard
2. Select "smtp" project
3. Settings → Environment Variables
4. Click "Add"
5. Key: NEXT_PUBLIC_API_URL
6. Value: https://smtp-production-2752.up.railway.app
7. Select: Production
8. Click "Add"
```

### Step 2: Redeploy Frontend
```
1. Go to Deployments tab
2. Find latest deployment
3. Click "..." → Redeploy
4. Wait for green checkmark (2-3 minutes)
```

### Step 3: Hard Refresh Browser
```
1. Go to https://smtp-sable.vercel.app
2. Press Ctrl+Shift+R (Cmd+Shift+R on Mac)
3. Wait for full page reload
```

## ✅ Verify It's Working

After the fix, you should see:

**Red error banner** → ✅ Disappears  
**Relays page** → ✅ Shows "No relays" instead of 404  
**Console** → ✅ Shows API URL is set  
**API calls** → ✅ Start working (will fail on SMTP later, expected)

## 🧪 Test the Connection

### In Browser Console (F12):
```javascript
// Should return OK
fetch('https://smtp-production-2752.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
```

### In Terminal:
```bash
curl https://smtp-production-2752.up.railway.app/health
# Should return: {"status":"ok"}
```

## 📊 What Each Component Does

| Component | Purpose | Status |
|-----------|---------|--------|
| api-client.ts | Centralized API requests with cache busting | ✅ Updated |
| middleware.ts | Force pages never cache | ✅ New |
| config-check.tsx | Show red error if env var missing | ✅ New |
| campaigns-view.tsx | Display API errors clearly | ✅ Updated |

## 🐛 If It Still Doesn't Work

### Check Backend is Running
```bash
# In terminal, this should return 200 OK
curl -v https://smtp-production-2752.up.railway.app/health
```

### Check Vercel Has Variable
1. Vercel Dashboard → Settings → Environment Variables
2. Should see `NEXT_PUBLIC_API_URL` listed
3. Value should match exactly: `https://smtp-production-2752.up.railway.app`

### Check Deployment Includes Variable
1. Vercel Dashboard → Deployments → Latest
2. Click "Variables" section
3. Should show `NEXT_PUBLIC_API_URL` is set

## 📝 Environment Variables Reference

### Vercel (Frontend) - MUST HAVE
```
NEXT_PUBLIC_API_URL=https://smtp-production-2752.up.railway.app
```

### Railway (Backend) - MUST HAVE
```
SUPABASE_URL=<your supabase url>
SUPABASE_KEY=<your supabase key>  
DATABASE_URL=<your database url>
```

## 💡 Understanding the Error

**Why API returns 404?**
- Frontend doesn't know where backend is (no `NEXT_PUBLIC_API_URL`)
- Makes request to: `https://smtp-sable.vercel.app/api/relays` 
- Gets 404 because Vercel doesn't have this endpoint

**How we fixed it?**
- Set `NEXT_PUBLIC_API_URL` to Railway URL
- Frontend now requests: `https://smtp-production-2752.up.railway.app/api/relays`
- Railway has this endpoint, returns data

## 🎯 Expected Behavior After Fix

| Page | Before Fix | After Fix |
|------|-----------|-----------|
| `/relays` | 404 Not Found | Shows "No relays" list |
| `/campaigns` | 404 Not Found | Shows "No campaigns" list |
| `/templates` | 404 Not Found | Shows "No templates" list |
| `/campaigns/new` | Form works locally | Can submit relay config |
| Console | API URL: NOT SET ❌ | API URL: Set ✅ |

## 🔄 Timeline

1. **Now**: Set environment variable (< 1 min)
2. **Vercel**: Rebuild and redeploy (2-3 min)
3. **Browser**: Hard refresh and clear cache (< 1 min)
4. **Result**: API calls start working (instant)

**Total time: ~5 minutes**

## ⚡ Pro Tips

1. **Clear cache properly**: Ctrl+Shift+R (not just Ctrl+R)
2. **Use incognito**: If still seeing 304 responses
3. **Check browser DevTools**: F12 → Console for debug messages
4. **Wait for deployment**: Green checkmark might take 2-3 minutes
5. **Test other pages too**: Try different pages after fix

## 📞 Still Need Help?

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed guide
2. Verify all environment variables are set
3. Check Railway and Vercel logs for errors
4. Try hard refresh in incognito window
5. Check that backend health endpoint works

---

**Last Updated**: After adding cache busting and configuration check
**Status**: Ready for deployment once environment variable is set
