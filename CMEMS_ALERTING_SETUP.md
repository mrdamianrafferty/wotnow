# CMEMS Data Ingestion Alerting Setup

**Purpose:** Never miss a CMEMS ingestion failure with multi-channel alerting

---

## 🚨 Alerting Channels Implemented

### 1. GitHub Issues (Already Active) ✅

**What it does:**
- Automatically creates GitHub issue on failure
- Updates existing issue if already open
- Auto-closes issue on successful run
- Label: `copernicus-ingestion-failure`

**Setup:** No configuration needed - already working!

**View issues:** https://github.com/mrdamianrafferty/wotnow/issues?q=label%3Acopernicus-ingestion-failure

---

### 2. Slack Notifications (Optional) 📱

**What you get:**
- 🚨 Formatted failure alerts with buttons to view logs
- ✅ Success notifications after recovery
- Direct links to health check endpoint

**Setup:**

1. **Create Slack Incoming Webhook:**
   - Go to https://api.slack.com/apps
   - Create new app or select existing
   - Navigate to "Incoming Webhooks"
   - Activate incoming webhooks
   - Click "Add New Webhook to Workspace"
   - Select channel for alerts (e.g., `#alerts` or `#findr-monitoring`)
   - Copy webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)

2. **Add to GitHub Secrets:**
   - Go to https://github.com/mrdamianrafferty/wotnow/settings/secrets/actions
   - Click "New repository secret"
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Paste your webhook URL
   - Click "Add secret"

3. **Test:**
   - Manually trigger workflow: https://github.com/mrdamianrafferty/wotnow/actions/workflows/findr-copernicus-ingest.yml
   - Check your Slack channel for notifications

**Example Slack Message:**
```
🚨 CMEMS Data Ingestion Failed

The scheduled Copernicus data ingestion workflow failed.

Workflow Run: #123
Time: 2025-11-12 15:00:00 UTC

Possible Causes:
• Copernicus API credentials expired
• Network issues
• API rate limiting
• Data validation failure

[View Logs] [Health Check]
```

---

### 3. Email Notifications (Optional) 📧

**What you get:**
- Email alert on every failure
- Detailed error information
- Direct links to logs and health check

**Setup:**

1. **Configure SMTP Server:**

   Option A: Use Gmail
   - Enable 2FA on your Google account
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Use these settings:
     - Server: `smtp.gmail.com`
     - Port: `587`
     - Username: Your Gmail address
     - Password: Generated app password

   Option B: Use SendGrid
   - Sign up at https://sendgrid.com/
   - Create API key
   - Use these settings:
     - Server: `smtp.sendgrid.net`
     - Port: `587`
     - Username: `apikey`
     - Password: Your SendGrid API key

   Option C: Use Mailgun
   - Sign up at https://www.mailgun.com/
   - Get SMTP credentials from dashboard
     - Server: `smtp.mailgun.org`
     - Port: `587`
     - Username: From Mailgun dashboard
     - Password: From Mailgun dashboard

2. **Add to GitHub Secrets:**
   - Go to https://github.com/mrdamianrafferty/wotnow/settings/secrets/actions
   - Add these secrets:
     - `SMTP_SERVER` (e.g., `smtp.gmail.com`)
     - `SMTP_PORT` (e.g., `587`)
     - `SMTP_USERNAME` (your email or API username)
     - `SMTP_PASSWORD` (your password or API key)
     - `ALERT_EMAIL` (where to send alerts, e.g., `you@example.com`)

3. **Test:**
   - Manually trigger workflow
   - Check your email for test notification

**Example Email:**
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
3. Check health status
4. Manually trigger workflow if needed
```

---

### 4. Health Check Endpoint (Active Now) ✅

**What it does:**
- Public API endpoint that returns CMEMS data status
- Returns HTTP 200 if healthy, 503 if unhealthy
- Can be monitored by external services

**Endpoint:** `https://www.fishfindr.eu/api/health/cmems-status`

**Response when healthy (200):**
```json
{
  "healthy": true,
  "timestamp": "2025-11-12T18:00:00.000Z",
  "metrics": {
    "coverage": {
      "percentage": "65.5",
      "rectangles": 186,
      "total": 284
    },
    "dataAge": {
      "hours": "12.5",
      "timestamp": "2025-11-12T05:30:00.000Z",
      "status": "fresh"
    },
    "staleData": {
      "count": 0,
      "percentage": "0"
    },
    "variablesAvailable": {
      "count": 3,
      "expected": 3
    }
  },
  "issues": []
}
```

**Response when unhealthy (503):**
```json
{
  "healthy": false,
  "timestamp": "2025-11-12T18:00:00.000Z",
  "metrics": { ... },
  "issues": [
    "Data is stale: 52.3h old (expected <48h)",
    "34 rectangles have stale data (>18%)"
  ]
}
```

---

## 🔔 Recommended External Monitoring Services

### Option 1: UptimeRobot (Free)

**Setup:**
1. Sign up at https://uptimerobot.com/
2. Create new monitor:
   - Type: HTTP(s)
   - URL: `https://www.fishfindr.eu/api/health/cmems-status`
   - Name: "Findr CMEMS Data Health"
   - Monitoring interval: Every 30 minutes
3. Add alert contacts (email, SMS, Slack, etc.)
4. Save

**Benefit:** Will alert you if health check returns 503 or times out

---

### Option 2: Pingdom (Paid)

**Setup:**
1. Sign up at https://www.pingdom.com/
2. Create uptime check:
   - URL: `https://www.fishfindr.eu/api/health/cmems-status`
   - Check frequency: 10 minutes
3. Set up alerts

**Benefit:** More detailed monitoring with historical graphs

---

### Option 3: Datadog (Enterprise)

**Setup:**
1. Create synthetic test
2. Monitor health endpoint
3. Set up alerting rules

**Benefit:** Full observability with logs, metrics, traces

---

## 📊 Current Alerting Matrix

| Failure Type | GitHub Issue | Slack | Email | Health Endpoint | External Monitor |
|-------------|--------------|-------|-------|-----------------|------------------|
| Workflow fails | ✅ Auto | ⚙️ Optional | ⚙️ Optional | ✅ Returns 503 | ⚙️ Optional |
| Data stale (>48h) | ❌ | ❌ | ❌ | ✅ Returns 503 | ⚙️ Optional |
| Low coverage | ❌ | ❌ | ❌ | ✅ Returns 503 | ⚙️ Optional |
| API issues | ✅ Auto | ⚙️ Optional | ⚙️ Optional | ✅ Returns 503 | ⚙️ Optional |

---

## 🧪 Testing Your Alerts

### Test Slack (after setup):
```bash
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"text": "🧪 Test Alert: CMEMS monitoring is configured!"}'
```

### Test Email (after setup):
Manually trigger the workflow and force a failure to test email notifications.

### Test Health Endpoint:
```bash
curl https://www.fishfindr.eu/api/health/cmems-status | jq
```

---

## 🔧 Configuration Summary

### Required (Already Set):
- ✅ GitHub Actions workflow
- ✅ GitHub Issues creation
- ✅ Health check endpoint

### Optional (Recommended):
- ⚙️ Slack webhook (`SLACK_WEBHOOK_URL`)
- ⚙️ Email SMTP settings (5 secrets)
- ⚙️ External monitoring service (UptimeRobot, etc.)

---

## 📈 Monitoring Best Practices

1. **Set up at least one notification channel**
   - Minimum: Enable Slack OR email
   - Recommended: Slack + external monitor

2. **Monitor the health endpoint**
   - Use UptimeRobot or similar (free tier is fine)
   - Check every 30-60 minutes
   - Alert on 503 status code

3. **Review GitHub Issues regularly**
   - Check for `copernicus-ingestion-failure` label
   - Issues auto-close on success

4. **Test your alerts monthly**
   - Manually trigger workflow
   - Verify you receive notifications
   - Update contact info if needed

---

## 🚀 Quick Setup (5 Minutes)

**Minimal setup for immediate alerting:**

1. **Slack (Easiest):**
   ```bash
   # 1. Get webhook from https://api.slack.com/apps
   # 2. Add to GitHub Secrets as SLACK_WEBHOOK_URL
   # 3. Done! Next workflow run will send Slack alerts
   ```

2. **UptimeRobot (Free external monitoring):**
   ```bash
   # 1. Sign up at uptimerobot.com
   # 2. Add monitor: https://www.fishfindr.eu/api/health/cmems-status
   # 3. Add your email for alerts
   # 4. Done! You'll get alerts if health check fails
   ```

**Total time: 5 minutes**
**Result: Never miss a CMEMS failure again!**

---

## 📝 Example Alert Workflow

```
Ingestion fails at 15:00 UTC
    ↓
Within 1 minute:
  ✅ GitHub Issue created
  ✅ Slack notification sent (if configured)
  ✅ Email notification sent (if configured)
  ✅ Health endpoint returns 503
    ↓
Within 30 minutes:
  ✅ UptimeRobot detects 503 (if configured)
  ✅ UptimeRobot sends alert
    ↓
You investigate and fix
    ↓
Next successful run:
  ✅ GitHub Issue auto-closed
  ✅ Slack success notification
  ✅ Health endpoint returns 200
  ✅ UptimeRobot confirms recovery
```

---

## 📞 Support

**Health Check Endpoint:** https://www.fishfindr.eu/api/health/cmems-status
**Workflow:** https://github.com/mrdamianrafferty/wotnow/actions/workflows/findr-copernicus-ingest.yml
**Issues:** https://github.com/mrdamianrafferty/wotnow/issues?q=label%3Acopernicus-ingestion-failure

---

## ✅ Status

- ✅ Multi-channel alerting implemented
- ✅ Health check endpoint live
- ✅ GitHub Issues active
- ⚙️ Slack/Email awaiting configuration
- ⚙️ External monitoring recommended

**Last Updated:** November 12, 2025
