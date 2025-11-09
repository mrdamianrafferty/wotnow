# Notification System Deployment Guide

**Branch:** `claude/review-favourites-page-011CUvQYSwuym5yE33SR76F8`

This guide covers deploying the automated fishing notification system (Priority 1 & 2).

---

## 📋 Overview

The notification system allows users to set up automatic alerts when their favorite species cross confidence thresholds. The system includes:

- ✅ Database schema for notification preferences and logs
- ✅ UI buttons and modal for configuration
- ✅ Backend cron service that checks predictions hourly
- ✅ API endpoints for managing preferences
- ⏳ Push notification sending (stubbed, needs implementation)

---

## 🔀 Step 1: Merge the Branch

### Option A: Merge to Main via Pull Request (Recommended)

```bash
# 1. Push latest changes (already done)
git push -u origin claude/review-favourites-page-011CUvQYSwuym5yE33SR76F8

# 2. Create PR on GitHub
# Go to: https://github.com/mrdamianrafferty/wotnow/compare
# Base: main
# Compare: claude/review-favourites-page-011CUvQYSwuym5yE33SR76F8

# 3. Review changes and merge via GitHub UI
```

### Option B: Direct Merge to Main (Quick)

```bash
# 1. Switch to main
git checkout main

# 2. Pull latest
git pull origin main

# 3. Merge the notification branch
git merge claude/review-favourites-page-011CUvQYSwuym5yE33SR76F8

# 4. Push to main
git push origin main
```

---

## 🗄️ Step 2: Run Database Migration

The notification system requires a new `notification_log` table.

### Via Supabase CLI (Recommended)

```bash
# 1. Sync .env.local credentials
npm run env:sync

# 2. Push migration to Supabase
supabase db push

# Output should show:
# ✓ Applied migration 20251109001_create_notification_log.sql
```

### Via Supabase Dashboard (Alternative)

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Open: `supabase/migrations/20251109001_create_notification_log.sql`
3. Copy contents
4. Paste into SQL Editor
5. Click "Run"

### Verify Migration

```bash
# Check if table exists
supabase db diff

# Or query directly
psql $DATABASE_URL -c "\d notification_log"
```

Expected output:
```
Table "public.notification_log"
Column              | Type         | Nullable
--------------------|--------------|----------
id                  | uuid         | not null
user_id             | uuid         | not null
species_id          | text         | not null
notification_type   | text         | not null
channel             | text         | not null
confidence_at_send  | integer      | not null
threshold_value     | integer      | not null
sent_at             | timestamptz  | not null
notification_data   | jsonb        |
created_at          | timestamptz  |
```

---

## 🔐 Step 3: Set Environment Variables

### Required Variables

Add these to Vercel (or your deployment platform):

```bash
# 1. Generate a secure random string for cron authentication
CRON_SECRET="your-random-secret-here-min-32-chars"
```

To generate a secure CRON_SECRET:
```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Add to Vercel

```bash
# Via CLI
vercel env add CRON_SECRET

# Or via Dashboard:
# 1. Go to: https://vercel.com/mrdamianrafferty/wotnow/settings/environment-variables
# 2. Add CRON_SECRET
# 3. Select all environments (Production, Preview, Development)
# 4. Save
```

### Verify Environment Variables

```bash
# Check Vercel env vars
vercel env ls

# Should see:
# CRON_SECRET (Production, Preview, Development)
```

---

## 🚀 Step 4: Deploy to Vercel

```bash
# 1. Deploy (if not auto-deployed)
npm run deploy

# Or via Vercel CLI
vercel --prod

# 2. Verify deployment
# Check: https://fishfindr.eu
```

### Verify Cron Job Registered

After deployment, check Vercel dashboard:

1. Go to: https://vercel.com/mrdamianrafferty/wotnow/deployments
2. Click latest deployment
3. Go to "Cron" tab
4. Should see: `/api/cron/check-notifications` scheduled for "0 * * * *" (every hour)

---

## ✅ Step 5: Test the System

### 5.1 Test UI Buttons

1. Go to: https://fishfindr.eu/findr/favourites
2. Sign in (if not already)
3. Find a favorite species card
4. Click the **BellPlus (🔔+)** button
5. Modal should open with:
   - Threshold slider (50-100%)
   - Push notification toggle
   - Quiet hours (optional)
   - Max per day (optional)
6. Configure and save
7. Button should change to **BellOff (🔔✓)** with primary color

### 5.2 Test API Endpoints

```bash
# Test notifications API (requires auth)
curl -X PATCH https://fishfindr.eu/api/findr/favourites/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{
    "speciesId": "cod",
    "preferences": {
      "enabled": true,
      "threshold": 85,
      "channels": {"push": true, "email": false, "sms": false}
    }
  }'

# Should return: {"success": true}
```

### 5.3 Test Cron Job (Manual Trigger)

Since cron runs hourly, you can manually trigger it:

```bash
# Trigger cron endpoint manually
curl -X GET https://fishfindr.eu/api/cron/check-notifications \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Expected response:
# {
#   "success": true,
#   "message": "Notifications checked and sent",
#   "processed": 5,
#   "notificationsSent": 2
# }
```

### 5.4 Check Logs

**Vercel Logs:**
```bash
vercel logs --follow

# Look for:
# [Cron] Starting notification check...
# [Cron] Found 15 favourites with notifications enabled
# [Cron] Processing 5 users
# [Cron] Would send push notification: {...}
# [Cron] Notification check complete. Sent 2 notifications
```

**Database Logs:**
```sql
-- Check notification_log table
SELECT * FROM notification_log
ORDER BY sent_at DESC
LIMIT 10;

-- Should see entries when notifications are "sent" (logged)
```

---

## 🔧 Step 6: Implement Push Notifications (Required for Full Functionality)

Currently the system **logs** push notifications but doesn't send them. Here's how to complete the implementation:

### 6.1 Set Up Firebase Cloud Messaging (FCM)

1. **Create Firebase Project:**
   - Go to: https://console.firebase.google.com
   - Create new project: "Findr Notifications"
   - Enable Cloud Messaging

2. **Get Server Key:**
   - Go to: Project Settings > Cloud Messaging
   - Copy "Server key"

3. **Add to Vercel Environment:**
   ```bash
   vercel env add FCM_SERVER_KEY
   # Paste the server key when prompted
   ```

### 6.2 Create Push Token Table

Add migration: `supabase/migrations/20251109002_create_push_tokens.sql`

```sql
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'web', 'ios', 'android'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, token)
);

CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
```

Run migration:
```bash
supabase db push
```

### 6.3 Update Cron Service

Edit: `pages/api/cron/check-notifications.ts`

Replace the `sendPushNotification` function:

```typescript
async function sendPushNotification(notification: NotificationToSend): Promise<boolean> {
  try {
    // 1. Get user's push token(s) from database
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', notification.userId);

    if (error || !tokens || tokens.length === 0) {
      console.log('[Cron] No push tokens for user', notification.userId);
      return false;
    }

    // 2. Send via Firebase Cloud Messaging
    const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
    if (!FCM_SERVER_KEY) {
      console.error('[Cron] FCM_SERVER_KEY not configured');
      return false;
    }

    let sent = false;
    for (const tokenData of tokens) {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: tokenData.token,
          notification: {
            title: `🎣 ${notification.speciesName} Alert`,
            body: `${notification.confidence}% confidence at your spot! Tap to view details.`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
          },
          data: {
            speciesId: notification.speciesId,
            speciesCode: notification.speciesCode,
            confidence: notification.confidence.toString(),
            rectangleCode: notification.rectangleCode,
            url: '/findr/favourites',
          },
        }),
      });

      if (response.ok) {
        console.log('[Cron] Push notification sent to', tokenData.platform);
        sent = true;
      } else {
        const error = await response.text();
        console.error('[Cron] FCM error:', error);
      }
    }

    return sent;
  } catch (error) {
    console.error('[Cron] Exception sending push notification:', error);
    return false;
  }
}
```

### 6.4 Register Push Tokens (Frontend)

Add to `pages/_app.tsx` or create `lib/push-notifications.ts`:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase/client';

export async function registerPushNotifications() {
  try {
    // Request permission
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive === 'granted') {
      // Register with FCM
      await PushNotifications.register();

      // Listen for registration
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push token:', token.value);

        // Save to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_push_tokens').upsert({
            user_id: user.id,
            token: token.value,
            platform: 'web',
          });
        }
      });

      // Listen for errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      // Listen for received notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received:', notification);
      });

      // Listen for notification taps
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push action:', action);
        // Navigate to /findr/favourites
        window.location.href = '/findr/favourites';
      });
    }
  } catch (error) {
    console.error('Error setting up push notifications:', error);
  }
}
```

Call in `_app.tsx`:
```typescript
useEffect(() => {
  if (user) {
    registerPushNotifications();
  }
}, [user]);
```

---

## 📊 Monitoring & Debugging

### Check Notification Activity

```sql
-- Recent notifications sent
SELECT
  nl.user_id,
  nl.species_id,
  nl.confidence_at_send,
  nl.threshold_value,
  nl.channel,
  nl.sent_at,
  nl.notification_data
FROM notification_log nl
ORDER BY nl.sent_at DESC
LIMIT 50;

-- Notifications per user
SELECT
  user_id,
  COUNT(*) as total_notifications,
  MAX(sent_at) as last_notification
FROM notification_log
GROUP BY user_id
ORDER BY total_notifications DESC;

-- Spam prevention check (6-hour cooldown)
SELECT
  user_id,
  species_id,
  COUNT(*) as notifications_sent,
  MAX(sent_at) as last_sent,
  NOW() - MAX(sent_at) as time_since_last
FROM notification_log
WHERE sent_at > NOW() - INTERVAL '6 hours'
GROUP BY user_id, species_id;
```

### Check User Preferences

```sql
-- Users with notifications enabled
SELECT
  uf.user_id,
  uf.species_id,
  uf.notification_threshold,
  uf.notification_channels,
  uf.added_at
FROM user_favourites uf
WHERE uf.notifications_enabled = true
ORDER BY uf.added_at DESC;

-- Popular notification thresholds
SELECT
  notification_threshold,
  COUNT(*) as users
FROM user_favourites
WHERE notifications_enabled = true
GROUP BY notification_threshold
ORDER BY users DESC;
```

### Vercel Cron Monitoring

```bash
# Check cron execution logs
vercel logs --since=1h | grep "check-notifications"

# Check for errors
vercel logs --since=24h | grep "ERROR"

# Check cron status in dashboard
# https://vercel.com/mrdamianrafferty/wotnow/crons
```

---

## 🐛 Troubleshooting

### Issue: Cron not running

**Check:**
1. Verify `CRON_SECRET` is set in Vercel
2. Check cron is registered: Vercel Dashboard > Crons tab
3. Look for errors in Vercel logs
4. Ensure `vercel.json` is deployed

**Fix:**
```bash
# Redeploy to register cron
vercel --prod

# Check cron configuration
cat vercel.json | grep -A 5 "crons"
```

### Issue: Notifications not being sent

**Check:**
1. User has notifications enabled: `SELECT * FROM user_favourites WHERE notifications_enabled = true`
2. User has location set: `SELECT * FROM user_location_preferences`
3. Predictions available: Test `/api/findr/predictions?rectangleCode=31F2`
4. 6-hour cooldown hasn't blocked: Check `notification_log`

**Debug:**
```bash
# Manually trigger cron with logging
curl -X GET https://fishfindr.eu/api/cron/check-notifications \
  -H "Authorization: Bearer $CRON_SECRET" \
  -v

# Check Vercel logs for detailed output
vercel logs --follow
```

### Issue: Modal not opening

**Check:**
1. Browser console for errors
2. `NotificationSetupModal` loaded: Check Network tab
3. Handler passed to card: Check React DevTools props

**Fix:**
```bash
# Rebuild frontend
npm run build
vercel --prod
```

### Issue: Database permission errors

**Check:**
1. RLS policies are applied
2. User is authenticated
3. `user_id` matches auth.uid()

**Fix:**
```sql
-- Verify RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'notification_log';

-- Grant permissions
GRANT SELECT, INSERT ON notification_log TO authenticated;
```

---

## 📈 Performance Considerations

### Cron Execution Time

The cron job should complete within Vercel's timeout limits:

- **Current:** ~2-5 seconds for 100 users
- **Max safe:** <30 seconds (Vercel function limit)

**Optimization if needed:**
- Batch user processing (100 at a time)
- Cache prediction results
- Use database indexes (already added)

### Database Load

**Current queries per cron run:**
- 1 query: Fetch favourites with notifications enabled
- N queries: Fetch locations (N = number of users)
- N queries: Fetch predictions (N = number of users)
- M queries: Check notification log (M = notifications to send)
- M queries: Insert notification logs

**Optimization if needed:**
- Parallelize prediction fetches
- Batch insert notification logs
- Add database connection pooling

---

## 🎯 Success Metrics

Once deployed, monitor these metrics:

1. **Adoption Rate:**
   ```sql
   -- Percentage of users with notifications enabled
   SELECT
     COUNT(DISTINCT CASE WHEN notifications_enabled THEN user_id END) * 100.0 /
     COUNT(DISTINCT user_id) as adoption_rate_percent
   FROM user_favourites;
   ```

2. **Notification Volume:**
   ```sql
   -- Notifications sent per day
   SELECT
     DATE(sent_at) as date,
     COUNT(*) as notifications_sent
   FROM notification_log
   WHERE sent_at > NOW() - INTERVAL '30 days'
   GROUP BY DATE(sent_at)
   ORDER BY date DESC;
   ```

3. **Popular Thresholds:**
   ```sql
   -- What thresholds are users setting?
   SELECT
     notification_threshold,
     COUNT(*) as users,
     COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
   FROM user_favourites
   WHERE notifications_enabled = true
   GROUP BY notification_threshold
   ORDER BY users DESC;
   ```

4. **Spam Prevention:**
   ```sql
   -- How often are we blocking duplicate notifications?
   -- (This would require additional logging)
   ```

---

## 📝 Summary Checklist

- [ ] Merge branch to main
- [ ] Run database migration (`supabase db push`)
- [ ] Set `CRON_SECRET` in Vercel
- [ ] Deploy to Vercel
- [ ] Verify cron registered in Vercel dashboard
- [ ] Test UI buttons and modal
- [ ] Test API endpoints
- [ ] Manually trigger cron and check logs
- [ ] Verify notification_log entries created
- [ ] **LATER:** Set up FCM for actual push sending
- [ ] **LATER:** Create user_push_tokens table
- [ ] **LATER:** Update cron service with FCM code
- [ ] **LATER:** Register push tokens on frontend

---

## 🚧 Current Status

**What's Working:**
- ✅ UI buttons on all species cards
- ✅ Modal for configuring preferences
- ✅ API endpoints for saving preferences
- ✅ Database storage of preferences
- ✅ Cron service checking predictions
- ✅ Threshold comparison logic
- ✅ Spam prevention (6-hour cooldown)
- ✅ Notification logging to database

**What's Stubbed (needs implementation):**
- ⏳ Push notification sending (logs to console)
- ⏳ Email sending (logs to console)
- ⏳ SMS sending (not implemented)
- ⏳ User push token storage
- ⏳ FCM integration

**Estimated Time to Complete:**
- Push notifications: 2-3 hours
- Email notifications: 2-3 hours (if needed in future)

---

## 🔗 Related Documentation

- `FAVOURITES_GUIDE.md` - User favorites system
- `PHASE_4_NOTIFICATIONS_COMPLETE.md` - Original notification work
- `PHASE_5_GEOLOCATION_AND_NOTIFICATION_MGMT_COMPLETE.md` - Location integration
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- Vercel Cron: https://vercel.com/docs/cron-jobs

---

**Last Updated:** 2025-11-09
**Status:** Ready for deployment (push sending needs implementation)
**Branch:** `claude/review-favourites-page-011CUvQYSwuym5yE33SR76F8`
