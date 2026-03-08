# Email Provider Configuration via Environment Variables

## Overview

Instead of storing credentials in the database, all email provider API keys and SMTP credentials are now loaded from environment variables. This is more secure and makes it easy to manage providers in production (Railway, Vercel, etc.).

## How It Works

1. **Set environment variables** in Railway/production with your email provider credentials
2. **At startup**, the backend loads all configured providers
3. **When creating a relay**, just select which provider to use (dropdown or text field)
4. **Credentials never stored in database** - only the provider selection is saved

## Environment Variable Format

```
PROVIDER_{PROVIDER_TYPE}_{FIELD}=value
```

Example:
```bash
PROVIDER_ZOHO_HOST=smtp.zoho.com
PROVIDER_ZOHO_PORT=587
PROVIDER_ZOHO_USERNAME=your-email@zoho.com
PROVIDER_ZOHO_PASSWORD=your-app-password
PROVIDER_ZOHO_FROM_EMAIL=your-email@zoho.com
```

---

## Configuration by Provider

### Zoho SMTP

```bash
PROVIDER_ZOHO_HOST=smtp.zoho.com
PROVIDER_ZOHO_PORT=587
PROVIDER_ZOHO_USERNAME=your-email@zoho.com
PROVIDER_ZOHO_PASSWORD=your-app-password
PROVIDER_ZOHO_FROM_EMAIL=your-email@zoho.com
PROVIDER_ZOHO_ACCOUNT_ID=12345678   # For API fallback
PROVIDER_ZOHO_API_KEY=your-zoho-oauth-token   # For API fallback (optional)
```

### SendGrid API

```bash
PROVIDER_SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
PROVIDER_SENDGRID_FROM_EMAIL=noreply@yourdomain.com
# Optional: PROVIDER_SENDGRID_BASE_URL=https://api.sendgrid.com/v3/mail/send
```

### Resend API

```bash
PROVIDER_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
PROVIDER_RESEND_FROM_EMAIL=noreply@yourdomain.com
# Optional: PROVIDER_RESEND_BASE_URL=https://api.resend.com/emails
```

### Postmark API

```bash
PROVIDER_POSTMARK_API_KEY=xxxxxxxxxxxxxxxxxxxxx
PROVIDER_POSTMARK_FROM_EMAIL=noreply@yourdomain.com
# Optional: PROVIDER_POSTMARK_BASE_URL=https://api.postmarkapp.com/email
```

### Brevo (Sendinblue) API

```bash
PROVIDER_BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxx
PROVIDER_BREVO_FROM_EMAIL=noreply@yourdomain.com
# Optional: PROVIDER_BREVO_BASE_URL=https://api.brevo.com/v3/smtp/email
```

### Mailgun API

```bash
PROVIDER_MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxx
PROVIDER_MAILGUN_DOMAIN=mail.yourdomain.com
PROVIDER_MAILGUN_FROM_EMAIL=noreply@yourdomain.com
# Optional: PROVIDER_MAILGUN_BASE_URL=https://api.mailgun.net/v3/{domain}/messages
```

---

## Railway Production Setup

### Step 1: Add Environment Variables in Railway

1. Go to: https://railway.app → Your Project → Environment
2. Add each provider's credentials:

```
PROVIDER_ZOHO_HOST=smtp.zoho.com
PROVIDER_ZOHO_USERNAME=your-email@zoho.com
PROVIDER_ZOHO_PASSWORD=your-app-password
PROVIDER_ZOHO_FROM_EMAIL=your-email@zoho.com
PROVIDER_SENDGRID_API_KEY=SG.xxx
PROVIDER_SENDGRID_FROM_EMAIL=noreply@yourdomain.com
PROVIDER_RESEND_API_KEY=re_xxx
PROVIDER_RESEND_FROM_EMAIL=noreply@yourdomain.com
```

3. **Redeploy** your Railway service (will auto-redeploy or click Deploy)

### Step 2: Verify Providers Loaded

Check Railway logs for startup message:

```
📧 Email providers configured from environment: zoho, sendgrid, resend
```

If you don't see this, providers aren't configured - check environment variables.

---

## Creating Relays via API

### New API - List Available Providers

```bash
GET /api/relays/providers/configured
```

Response:
```json
{
  "providers": [
    {
      "key": "zoho",
      "type": "smtp",
      "from_email": "your-email@zoho.com",
      "smtp_host": "smtp.zoho.com",
      "smtp_port": 587
    },
    {
      "key": "sendgrid",
      "type": "sendgrid",
      "from_email": "noreply@yourdomain.com"
    }
  ],
  "available_types": ["smtp", "zoho", "sendgrid", "resend"]
}
```

### Create Relay Using Environment Provider

Using Zoho from environment:

```bash
POST /api/relays
{
  "name": "My Zoho Relay",
  "provider_key": "zoho",
  "fallback_providers": "sendgrid,resend"
}
```

Response:
```json
{
  "id": "uuid",
  "name": "My Zoho Relay",
  "status": "active",
  "host": "env-configured",
  "created_at": "2026-03-08T...",
  "provider_config": {
    "provider_key": "zoho",
    "provider_type": "smtp",
    "from_email": "your-email@zoho.com"
  },
  "fallback_providers": "sendgrid,resend"
}
```

### Create Custom SMTP Relay (not in environment)

If you want to use a different SMTP server not configured in environment:

```bash
POST /api/relays
{
  "name": "Custom Gmail SMTP",
  "provider_key": "smtp",
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "your-email@gmail.com",
  "smtp_password": "your-app-password",
  "use_tls": true,
  "fallback_providers": "sendgrid,resend"
}
```

The system will:
1. Test SMTP connection
2. Save with selected fallback providers
3. Use this relay + fallbacks when sending campaigns

---

## Fallback Chain Logic

When you set `fallback_providers: "sendgrid,resend,postmark"`:

**Sending a campaign:**
```
1. Try: Primary provider (Zoho SMTP)
   ↓ (fails or rate limited)
2. Try: Fallback 1 (SendGrid API)
   ↓ (fails)
3. Try: Fallback 2 (Resend API)
   ↓ (fails)
4. Try: Fallback 3 (Postmark API)
   ↓ (all failed)
5. Error: Email marked as failed
```

**Per recipient:**
- Each recipient is tried with the primary provider first
- If it fails (hard bounce, spam block), tries fallback 1
- If that fails, tries fallback 2
- Continues until one succeeds or all fail
- **User doesn't see errors** unless all providers fail

---

## Advantages of This Approach

| Feature | Before | Now |
|---------|--------|-----|
| Credentials storage | Database (risky) | Environment variables (secure) |
| Adding new provider | Edit relay record | Add env var, restart |
| Sharing credentials | Must share relay ID | Just share env file |
| Rotating credentials | Update relay in DB | Update env var |
| Production security | Stored in DB backups | Never leaves environment |
| Audit trail | No history | Environment variable history |

---

## Troubleshooting

### "Provider 'zoho' not configured"

**Problem:** You tried to create a relay with `provider_key: "zoho"` but it's not in environment variables.

**Solution:** 
1. Set `PROVIDER_ZOHO_*` environment variables
2. Redeploy the backend
3. Check logs for: `📧 Email providers configured from environment: ...`

### "Fallback provider 'sendgrid' not configured"

**Problem:** You set `fallback_providers: "sendgrid"` but SendGrid isn't configured.

**Solution:**
1. Add `PROVIDER_SENDGRID_API_KEY` environment variable
2. Add `PROVIDER_SENDGRID_FROM_EMAIL` environment variable
3. Redeploy
4. Try again

### No providers showing in logs

**Problem:** Backend started but logs don't show any providers.

**Solution:**
1. Check you set `PROVIDER_*` variables in Railway environment
2. Check typos (must be exact: `PROVIDER_ZOHO_HOST`, not `PROVIDER_ZOHO_SMTP_HOST`)
3. Redeploy the service
4. Check logs again

### SMTP test fails

**Problem:** Creating relay with `provider_key: "smtp"` fails connection test.

**Solution:**
1. Verify SMTP host, port, username, password are correct
2. Try connecting from your computer to verify credentials
3. Check firewall isn't blocking port 587
4. Allow less secure apps (Gmail requires this)
5. Or use API instead (SendGrid, Resend) - less firewall issues

---

## Next Steps

1. **Set environment variables** for your email providers in Railway
2. **Redeploy** the backend
3. **Create a relay** using `POST /api/relays` with `provider_key`
4. **Test sending** via frontend campaigns
5. **Monitor logs** for delivery success

**All credentials are now secure in environment variables!** 🔒
