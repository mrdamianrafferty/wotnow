# UptimeRobot Monitoring Setup for CMEMS Data Health

**Time:** 5 minutes
**Cost:** Free (50 monitors on free tier)
**Benefits:**
- External monitoring (works even if GitHub is down)
- Email, SMS, Slack, webhook alerts
- Historical uptime tracking
- Public status page (optional)

---

## Why UptimeRobot?

✅ **Advantages:**
- Independent of GitHub Actions
- Monitors the actual health endpoint
- Catches issues GitHub Actions might miss
- 5-minute check intervals (free tier)
- Multiple alert channels in one place
- Simple setup, no coding required

✅ **What it monitors:**
- Health endpoint: `https://www.fishfindr.eu/api/health/cmems-status`
- Alerts when endpoint returns 503 (unhealthy)
- Alerts when endpoint times out
- Tracks uptime percentage

---

## Step-by-Step Setup

### 1. Create Account

1. Go to https://uptimerobot.com/
2. Click "Sign Up Free"
3. Enter email and create password
4. Verify email (check inbox/spam)
5. Log in to dashboard

**Free tier includes:**
- 50 monitors
- 5-minute check intervals
- Email/SMS/Slack alerts
- 2-month monitoring logs

---

### 2. Add Monitor

Once logged in:

1. Click **"+ Add New Monitor"** button

2. **Fill in monitor details:**

   **Monitor Type:** `HTTP(s)`

   **Friendly Name:** `Findr CMEMS Data Health`

   **URL (or IP):** `https://www.fishfindr.eu/api/health/cmems-status`

   **Monitoring Interval:** `Every 5 minutes` (free tier)

   **Monitor Timeout:** `30 seconds`

3. **Advanced Settings** (click to expand):

   **HTTP Method:** `GET`

   **HTTP Auth Type:** `None`

   **HTTP Status Code:** Select **"Custom"** and enter: `200`

   ⚠️ **Important:** We want to be alerted when status is NOT 200 (i.e., when it's 503)

4. Click **"Create Monitor"**

---

### 3. Set Up Alert Contacts

By default, you'll get email alerts. To add more:

1. Click **"My Settings"** → **"Alert Contacts"**

2. **Add email** (if not already added):
   - Click "+ Add Alert Contact"
   - Type: "E-mail"
   - Friendly Name: "Primary Email"
   - Email: Your email address
   - Check "Send alerts for this contact"

3. **Optional: Add SMS** (limited on free tier):
   - Click "+ Add Alert Contact"
   - Type: "SMS"
   - Enter phone number with country code
   - Verify via SMS

4. **Optional: Add Slack:**
   - Click "+ Add Alert Contact"
   - Type: "Slack"
   - Click "Authorize" and follow Slack integration
   - Select channel for alerts

5. **Optional: Add webhook** (for custom integrations):
   - Click "+ Add Alert Contact"
   - Type: "Webhook"
   - Enter webhook URL
   - Useful for Discord, Microsoft Teams, etc.

---

### 4. Configure Alert Settings

1. Go back to your monitor (click "Findr CMEMS Data Health")

2. Click **"Edit Monitor"**

3. Scroll to **"Alert Contacts To Notify"**

4. Select which contacts should receive alerts for this monitor

5. **Notification Settings:**
   - ✅ Check "Get notifications when down"
   - ✅ Check "Get notifications when up" (to know when it recovers)
   - Set "Send notifications after X down alerts": `2` (to avoid false positives)

6. Click **"Save Changes"**

---

### 5. Test Your Setup

UptimeRobot will start monitoring immediately. To test:

**Option A: Check Dashboard**
- Monitor should show "Up" with green checkmark
- Wait 5 minutes and refresh to see first check

**Option B: View Monitor Details**
- Click on monitor name
- View recent response times
- Check uptime percentage (should be 100% initially)

**Option C: Test Alerts** (optional)
- Temporarily break the health endpoint (not recommended)
- OR wait for actual failure to see alerts in action

---

## What You'll Receive

### When CMEMS Data Becomes Unhealthy

**Email Alert:**
```
Subject: [Down] Findr CMEMS Data Health

Monitor: Findr CMEMS Data Health
URL: https://www.fishfindr.eu/api/health/cmems-status
Status: DOWN
Time: 2025-11-12 15:32:15 UTC
Reason: Status code is 503 (expected 200)

This is an automated alert from UptimeRobot.
```

**SMS Alert:**
```
[DOWN] Findr CMEMS Data Health is down.
Status: 503
https://uptimerobot.com/m123456789
```

**Slack Alert:**
```
🔴 Monitor Down
Findr CMEMS Data Health is DOWN
Status code: 503 (expected 200)
View monitor →
```

### When It Recovers

**Email Alert:**
```
Subject: [Up] Findr CMEMS Data Health

Monitor: Findr CMEMS Data Health
URL: https://www.fishfindr.eu/api/health/cmems-status
Status: UP
Time: 2025-11-12 16:45:30 UTC
Downtime: 1 hour 13 minutes

This is an automated alert from UptimeRobot.
```

---

## Dashboard Features

### Monitor Dashboard

Shows for each monitor:
- Current status (Up/Down)
- Response time (ms)
- Uptime percentage (last 24h, 7d, 30d)
- Recent events

### Response Time Graphs

- Hourly response times
- Identify slow periods
- Spot trends

### Uptime Reports

- Daily/weekly/monthly uptime %
- Downtime duration
- Incident history

### Public Status Page (Optional)

Create public page showing system status:
1. Go to "Public Status Pages"
2. Create new page
3. Add CMEMS monitor
4. Share URL with team/users

---

## Advanced Configuration

### Custom HTTP Headers

If needed, add headers:
```
Content-Type: application/json
Authorization: Bearer your-token
```

### Keyword Monitoring

Alert if response contains/doesn't contain specific text:
1. Edit monitor
2. Enable "Keyword"
3. Type: "Keyword exists" or "Keyword not exists"
4. Enter keyword: `"healthy":true`

### SSL Certificate Monitoring

UptimeRobot also monitors SSL expiry:
- Automatically checks certificate
- Alerts before expiration
- Useful for production sites

---

## Comparison: UptimeRobot vs Others

| Feature | UptimeRobot | Pingdom | StatusCake |
|---------|-------------|---------|------------|
| **Free tier** | ✅ 50 monitors | ❌ Paid only | ✅ 10 monitors |
| **Check interval** | 5 minutes | 1 minute (paid) | 5 minutes |
| **Alerts** | Email, SMS, Slack, webhook | Email (paid) | Email |
| **Uptime logs** | 2 months | Unlimited (paid) | 1 month |
| **Public status page** | ✅ Yes | ✅ Yes (paid) | ✅ Yes |
| **API access** | ✅ Yes | ✅ Yes (paid) | ✅ Yes |
| **Recommendation** | ✅ **Best for free tier** | ⭐ Best paid option | Good alternative |

---

## Best Practices

### 1. Set Appropriate Check Interval

Free tier: 5 minutes is perfect
- CMEMS updates twice daily (03:00, 15:00 UTC)
- 5-minute checks = 12 checks/hour
- Will catch failures within ~10 minutes

### 2. Configure Down Sensitivity

Set "Send alert after X down checks": `2`
- Avoids false positives from network blips
- Still alerts within 10 minutes
- Reduces notification fatigue

### 3. Use Multiple Alert Channels

Recommended setup:
- ✅ Email (primary - always reliable)
- ✅ SMS (critical alerts only)
- ✅ Slack (team visibility)

### 4. Monitor Response Time

Set up alert for slow responses:
- Edit monitor → "Advanced"
- Enable "Alert when response time >"
- Set threshold: 5000ms (5 seconds)

### 5. Create Multiple Monitors

Consider monitoring:
- ✅ CMEMS health: `/api/health/cmems-status`
- ✅ Main app: `https://www.fishfindr.eu/`
- ✅ API endpoints: `/api/findr/predictions`
- ✅ Database: Custom endpoint returning DB status

---

## Integration with GitHub Actions

UptimeRobot complements GitHub Actions alerts:

| Alert Source | When It Alerts | Delay |
|-------------|----------------|-------|
| **GitHub Actions** | Workflow fails | Immediate (during run) |
| **UptimeRobot** | Health endpoint returns 503 | Within 10 minutes |

**Combined benefit:**
- GitHub Actions: Alerts during ingestion failures
- UptimeRobot: Alerts when data becomes stale/unhealthy
- Redundancy: If one fails, the other still works

---

## Troubleshooting

### Monitor Shows "Down" but endpoint works

1. Check if endpoint is actually returning 200:
   ```bash
   curl -I https://www.fishfindr.eu/api/health/cmems-status
   ```

2. Check UptimeRobot status page:
   - https://status.uptimerobot.com/
   - Verify service is operational

3. Check firewall/CDN:
   - Ensure UptimeRobot IPs aren't blocked
   - Check Vercel/Cloudflare settings

### Not Receiving Alerts

1. **Check alert contact verification**:
   - My Settings → Alert Contacts
   - Ensure email/SMS is verified

2. **Check monitor alert settings**:
   - Edit monitor
   - Verify alert contacts are selected

3. **Check spam folder**:
   - First alert might go to spam
   - Add uptimerobot.com to contacts

4. **Check notification settings**:
   - "Get notifications when down" is checked
   - Down sensitivity is set appropriately

### False Positives

Increase down sensitivity:
- Edit monitor
- Set "Send alert after X down checks" to `3` or `4`
- This means 3-4 consecutive failures before alerting

---

## Quick Reference Card

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UPTIMEROBOT MONITOR SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Monitor Type: HTTP(s)
Name: Findr CMEMS Data Health
URL: https://www.fishfindr.eu/api/health/cmems-status
Interval: Every 5 minutes
Expected Status: 200
Alert on: Status ≠ 200 (or timeout)
Down sensitivity: 2 checks

Alert Contacts:
☑ Email (primary)
☐ SMS (optional)
☐ Slack (optional)

Setup time: 5 minutes
Cost: Free
Benefit: Never miss a failure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Next Steps

After setup:

1. ✅ Monitor shows "Up" status
2. ✅ Verify alert contacts configured
3. ✅ Wait 5 minutes and check dashboard
4. ✅ Review uptime history tomorrow
5. ✅ Consider adding more monitors (main app, API)

---

## Resources

- **Sign up:** https://uptimerobot.com/
- **Dashboard:** https://uptimerobot.com/dashboard
- **Documentation:** https://uptimerobot.com/api/
- **Health Endpoint:** https://www.fishfindr.eu/api/health/cmems-status
- **Support:** https://uptimerobot.com/support/

**Last Updated:** November 12, 2025
