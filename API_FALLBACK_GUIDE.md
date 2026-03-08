# Email Delivery with API Fallbacks

## Overview

The SMTP relay system now supports automatic fallback to email delivery APIs. If your primary SMTP relay fails, the system will automatically try alternative providers before showing an error.

## Key Features

✅ **STARTTLS on Port 587** - More compatible than port 465  
✅ **7-second SMTP timeout** - Fast failure detection  
✅ **Automatic API Fallback** - If SMTP fails, tries APIs over HTTPS 443  
✅ **Supported API Providers:**
- SendGrid
- Resend
- Postmark
- Brevo
- Mailgun
- Zoho

## How It Works

### 1. Primary SMTP Relay Attempt
```
User creates relay with:
- SMTP host: smtp.zoho.com
- Port: 587 (STARTTLS)
- Username & Password
- Timeout: 7 seconds
```

What happens:
1. System tests connection using STARTTLS
2. If successful → relay saved ✅
3. If fails → tries fallback APIs before showing error ❌

### 2. Automatic Fallback Sequence

When sending a campaign and SMTP fails:

```
Primary: Zoho SMTP:587 (STARTTLS)
  ↓ (fails)
Fallback 1: SendGrid API (HTTPS 443)
  ↓ (fails)
Fallback 2: Resend API (HTTPS 443)
  ↓ (fails)
Fallback 3: Postmark API (HTTPS 443)
  ↓ (all failed)
Error: "All providers failed. Email not sent."
```

**Important:** APIs use HTTPS port 443, which is never blocked by ISPs.

---

## Setup Examples

### Example 1: Zoho SMTP with SendGrid Fallback

**Step 1:** Create relay with Zoho SMTP
```bash
POST /api/relays
{
  "name": "Zoho with SendGrid Fallback",
  "host": "smtp.zoho.com",
  "port": 587,
  "username": "your-email@zoho.com",
  "password": "your-app-password",
  "use_tls": true,
  "provider_type": "sendgrid",
  "api_key": "SG.xxxxxxxxxxxxxxxxxxxxx"
}
```

**What happens:**
1. Tests Zoho SMTP connection using STARTTLS on port 587
2. If refused → saves the relay anyway with SendGrid configured as fallback
3. When sending campaigns:
   - Tries Zoho SMTP first
   - If Zoho fails → automatically uses SendGrid API
   - No error shown to user unless both fail

---

### Example 2: Multiple API Fallbacks

If you want to configure multiple fallback APIs (advanced):

```bash
POST /api/relays
{
  "name": "Zoho Multi-Fallback",
  "host": "smtp.zoho.com",
  "port": 587,
  "username": "your-email@zoho.com",
  "password": "your-app-password",
  "use_tls": true,
  "fallback_providers": "[
    {\"provider_type\": \"sendgrid\", \"api_key\": \"SG.xxx\"},
    {\"provider_type\": \"resend\", \"api_key\": \"re_xxx\"},
    {\"provider_type\": \"postmark\", \"api_key\": \"xxx\"}
  ]"
}
```

---

## Supported Email APIs

### SendGrid
```
API Endpoint: https://api.sendgrid.com/v3/mail/send
API Key: Get from https://app.sendgrid.com/settings/api_keys
Format: "SG_xxxxxxxxxxxxxxxxxxxxx"
Port: 443 (HTTPS)
```

### Resend
```
API Endpoint: https://api.resend.com/emails
API Key: Get from https://resend.com/api-keys
Format: "re_xxxxxxxxxxxxxxxxxxxxx"
Port: 443 (HTTPS)
```

### Postmark
```
API Endpoint: https://api.postmarkapp.com/email
API Key: Get from https://account.postmarkapp.com/servers
Format: "xxxxxxxxxxxxxxxxxxxxx" (Server Token)
Port: 443 (HTTPS)
```

### Brevo (Sendinblue)
```
API Endpoint: https://api.brevo.com/v3/smtp/email
API Key: Get from https://app.brevo.com/settings/keys/api
Format: "xkeysib-xxxxxxxxxxxxxxxxxxxxx"
Port: 443 (HTTPS)
```

### Mailgun
```
API Endpoint: https://api.mailgun.net/v3/{your-domain}/messages
API Key: Get from https://app.mailgun.com/app/account/security/api_keys
Domain: Your Mailgun domain
Port: 443 (HTTPS)
```

### Zoho Mail
```
SMTP: smtp.zoho.com:587 with STARTTLS
API Endpoint: https://mail.zoho.com/api/accounts/{account_id}/messages
OAuth Token: Required for API
Port: 587 (SMTP) or 443 (API)
```

---

## Why STARTTLS on Port 587?

| Feature | Port 465 (TLS) | Port 587 (STARTTLS) |
|---------|---|---|
| Initial connection | TLS encrypted | Plain, then STARTTLS |
| Firewall friendly | ❌ Often blocked | ✅ Usually allowed |
| ISP compatibility | ❌ Limited | ✅ Excellent |
| Modern support | ⚠️ Deprecated | ✅ Standard |
| Our system | ❌ Not used | ✅ Default |

**Why we use 587:** Better compatibility across networks, ISPs, and corporate firewalls.

---

## Error Handling

### "SMTP Connection Failed"
- Port 587 refused
- Credentials invalid
- Firewall blocking port 587
- **Solution:** Add API fallback with valid credentials

### "All providers failed"
- Both SMTP and all API fallbacks failed
- Check provider credentials
- Check API key validity
- Verify from_email is allowed by provider

### "API Key Invalid"
- SendGrid, Resend, or Postmark API key format wrong
- Key has insufficient permissions
- **Solution:** Regenerate API key and verify format

---

## Testing API Fallback

### Test SMTP only (without fallback):
```bash
curl -X POST http://localhost:8080/api/relays/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.zoho.com",
    "port": 587,
    "username": "your-email@zoho.com",
    "password": "your-app-password",
    "use_tls": true
  }'
```

Response if successful:
```json
{"success": true, "message": "SMTP connection successful"}
```

Response if failed but fallback configured:
```json
{"success": false, "message": "SMTP connection failed: [Errno 111] Connection refused"}
```

Then the system will try configured API providers when sending.

---

## Best Practices

1. **Always set up a fallback provider**
   - SMTP can be fragile due to firewalls
   - APIs work over standard HTTPS 443
   - Combination ensures maximum deliverability

2. **Test before production**
   - Use test campaign with 1-2 recipients
   - Verify both primary and fallback work
   - Check email arrives

3. **Monitor provider status**
   - Keep API credentials valid
   - Rotate API keys periodically
   - Monitor sending logs for patterns

4. **Use same "from" email**
   - SendGrid, Resend, Postmark require verified domain
   - Verify your sender email in each provider
   - Don't mix verified emails

---

## Configuration Flow Diagram

```
Create Relay
    ↓
Test SMTP Connection (port 587, STARTTLS, 7-second timeout)
    ↓
    ├─ ✅ Success → Save as active relay
    │
    └─ ❌ Failed → Ask user to add API fallback
            ↓
         Configure SendGrid/Resend/Postmark API key
            ↓
         Save relay with both SMTP (as primary) 
         and API (as fallback)
            ↓
         When campaign sent:
         Try SMTP → If fails → Try API
```

---

## Migration from Port 465

If you were using port 465 (implicit TLS):

**Before:**
```
Port: 465
use_tls: true
```

**After:**
```
Port: 587
use_tls: true
(System automatically uses STARTTLS)
```

Just update your relay configuration - no code changes needed!

---

## Support

See `backend/providers.py` for full implementation details.

Supported provider types: `smtp`, `sendgrid`, `resend`, `postmark`, `brevo`, `mailgun`, `zoho`
