# Quick Setup: Email Alerts for CMEMS Ingestion

**Time:** 5 minutes
**Result:** Get emails whenever CMEMS ingestion fails

---

## Option 1: Gmail (Easiest - Recommended)

### Step 1: Generate App Password

1. **Enable 2-Factor Authentication** (if not already enabled):
   - Go to https://myaccount.google.com/security
   - Under "How you sign in to Google" → "2-Step Verification"
   - Follow the prompts to enable

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Enter "GitHub Actions"
   - Click "Generate"
   - **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)
   - ⚠️ Save this password - you won't be able to see it again!

### Step 2: Add to GitHub Secrets

Go to: https://github.com/mrdamianrafferty/wotnow/settings/secrets/actions

Click "New repository secret" for each:

| Secret Name | Value | Example |
|------------|-------|---------|
| `SMTP_SERVER` | `smtp.gmail.com` | smtp.gmail.com |
| `SMTP_PORT` | `587` | 587 |
| `SMTP_USERNAME` | Your Gmail address | you@gmail.com |
| `SMTP_PASSWORD` | App password from Step 1 | abcdefghijklmnop (no spaces) |
| `ALERT_EMAIL` | Where to send alerts | you@gmail.com (same or different) |

**Important:**
- Remove spaces from app password when adding to GitHub
- `SMTP_USERNAME` = your full Gmail address
- `ALERT_EMAIL` = where you want to receive alerts (can be the same email)

### Step 3: Test

**Option A: Wait for next workflow run** (tomorrow at 03:00 or 15:00 UTC)

**Option B: Manual test** (immediate):
1. Go to: https://github.com/mrdamianrafferty/wotnow/actions/workflows/findr-copernicus-ingest.yml
2. Click "Run workflow" → "Run workflow"
3. Wait ~5 minutes for completion
4. Check your email for success notification

**You're done!** ✅

---

## Option 2: SendGrid (Alternative)

### Step 1: Sign Up

1. Go to https://sendgrid.com/
2. Sign up for free account (100 emails/day free tier)
3. Verify your email

### Step 2: Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name: "GitHub Actions Alerts"
4. Permissions: "Mail Send" (Full Access)
5. Click "Create & View"
6. **Copy the API key** (starts with `SG.`)
7. ⚠️ Save this - you won't see it again!

### Step 3: Add to GitHub Secrets

| Secret Name | Value |
|------------|-------|
| `SMTP_SERVER` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | `apikey` (literally the word "apikey") |
| `SMTP_PASSWORD` | Your API key from Step 2 |
| `ALERT_EMAIL` | Your email address |

---

## Option 3: Outlook/Hotmail

### Step 1: Enable App Password

1. Go to https://account.microsoft.com/security
2. Click "Advanced security options"
3. Under "App passwords" → "Create a new app password"
4. Copy the password

### Step 2: Add to GitHub Secrets

| Secret Name | Value |
|------------|-------|
| `SMTP_SERVER` | `smtp.office365.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | Your Outlook email |
| `SMTP_PASSWORD` | App password from Step 1 |
| `ALERT_EMAIL` | Your email address |

---

## Verification

### Check Your Setup

Run this after adding secrets:

```bash
# Check if secrets are set (from GitHub Actions page)
# Settings → Secrets → Actions
# You should see:
# - SMTP_SERVER
# - SMTP_PORT
# - SMTP_USERNAME
# - SMTP_PASSWORD
# - ALERT_EMAIL
```

### What You'll Receive

**On Failure:**
```
Subject: 🚨 CMEMS Data Ingestion Failed - Findr

CMEMS Data Ingestion Failed

The scheduled Copernicus Marine data ingestion workflow has failed.

Workflow Run: https://github.com/.../actions/runs/123
Time: 2025-11-12 15:00:00 UTC

Possible Causes:
- Copernicus API credentials expired
- Network issues
- API rate limiting
- Data validation failure

Impact:
- Predictions will have reduced accuracy
- Environmental data may be stale
- System may fall back to mock data

Actions Required:
1. Check workflow logs
2. Verify Copernicus credentials
3. Check health status: https://www.fishfindr.eu/api/health/cmems-status
4. Manually trigger workflow if needed
```

---

## Troubleshooting

### Not Receiving Emails?

1. **Check spam folder** - First alert might go to spam
2. **Verify secrets are set**:
   - Go to https://github.com/mrdamianrafferty/wotnow/settings/secrets/actions
   - You should see 5 secrets listed
3. **Check GitHub Actions logs**:
   - Go to https://github.com/mrdamianrafferty/wotnow/actions
   - Click latest workflow run
   - Look for "Send email notification" step
   - Check for error messages
4. **Test email credentials manually**:
   ```bash
   # For Gmail:
   curl --url 'smtps://smtp.gmail.com:465' \
     --ssl-reqd \
     --mail-from 'your@gmail.com' \
     --mail-rcpt 'recipient@example.com' \
     --user 'your@gmail.com:your-app-password' \
     --upload-file - << EOF
   Subject: Test Email

   This is a test.
   EOF
   ```

### Common Issues

**"Authentication failed" error:**
- Gmail: Make sure 2FA is enabled and you're using an App Password (not your regular password)
- Remove any spaces from the app password
- Use your full email address as username

**"Connection refused" error:**
- Check SMTP_PORT is `587` (not 465 or 25)
- Check SMTP_SERVER is correct

**No error but no email:**
- Check spam folder
- Wait a few minutes (some servers delay)
- Try a different email address for ALERT_EMAIL

---

## Quick Reference

### Gmail Settings
```
SMTP_SERVER: smtp.gmail.com
SMTP_PORT: 587
SMTP_USERNAME: your@gmail.com
SMTP_PASSWORD: (16-char app password, no spaces)
ALERT_EMAIL: your@gmail.com
```

### SendGrid Settings
```
SMTP_SERVER: smtp.sendgrid.net
SMTP_PORT: 587
SMTP_USERNAME: apikey
SMTP_PASSWORD: SG.xxxxx...
ALERT_EMAIL: your@example.com
```

### Outlook Settings
```
SMTP_SERVER: smtp.office365.com
SMTP_PORT: 587
SMTP_USERNAME: your@outlook.com
SMTP_PASSWORD: (app password)
ALERT_EMAIL: your@outlook.com
```

---

## Next Steps

After setup:

1. ✅ Add all 5 secrets to GitHub
2. ✅ Wait for next workflow run OR manually trigger
3. ✅ Check your email
4. ✅ Add to contacts to prevent spam filtering
5. ✅ Set up email filters/rules if desired

---

## Support

- GitHub Secrets: https://github.com/mrdamianrafferty/wotnow/settings/secrets/actions
- Workflow: https://github.com/mrdamianrafferty/wotnow/actions/workflows/findr-copernicus-ingest.yml
- Health Check: https://www.fishfindr.eu/api/health/cmems-status

**Last Updated:** November 12, 2025
