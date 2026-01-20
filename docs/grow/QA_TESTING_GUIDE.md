# Grow Daisy QA Testing Guide

This document provides comprehensive test cases for QA testing of Grow Daisy features across all phases. Use this guide to verify functionality after deployments.

---

## Phase 1: Subscription & Monetization

### 1.1 Pricing Page
**URL:** `https://grow.godaisy.io/grow/premium`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Page loads | Navigate to /grow/premium | Pricing page displays with 4 tiers |
| Tier comparison | Review tier cards | Seed (Free), Sprout (€3.99/mo), Bloom (€6.99/mo), Harvest (€11.99/mo) visible |
| Annual pricing | Click "Annual" toggle | Prices update to annual rates with savings badge |
| Lifetime pricing | Click "Lifetime" toggle | One-time prices displayed |
| Upgrade CTA | Click "Upgrade" on any paid tier | Redirects to Stripe checkout (test mode) |
| Feature list | Review features per tier | Features clearly listed with tier badges |

### 1.2 Stripe Checkout Flow
**Prerequisite:** Be logged in

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Checkout initiation | Click upgrade button | Stripe checkout page loads |
| Test card payment | Use card 4242 4242 4242 4242 | Payment succeeds |
| Success redirect | Complete payment | Redirects to success page |
| Subscription active | Return to app | User tier updated in UI |

### 1.3 Feature Gating

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Soil temperature (Free) | View weather page as Free user | Soil temp shows upgrade prompt |
| Soil temperature (Bloom+) | View weather page as Bloom user | Soil temp data visible |
| Plant limit (Free) | Try to add 26th plant | Upgrade prompt shown |
| AI ID limit | Use 6th plant ID in a month | Usage limit warning shown |

### 1.4 Subscription Hook

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Tier detection | Log in with paid subscription | `useGrowSubscription` returns correct tier |
| Usage tracking | Use AI features | Usage counters update |
| Cache persistence | Refresh page | Tier persists from cache |

---

## Phase 2: Push Notifications

### 2.1 Notification Permission & Subscription
**URL:** `https://grow.godaisy.io/grow/settings`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Settings page | Navigate to Settings | Notification card visible |
| Permission prompt | Click "Enable Notifications" | Browser permission prompt appears |
| Grant permission | Allow notifications | "Active" badge shown, subscription saved |
| Deny permission | Deny notifications | "Permission denied" message shown |
| Disable notifications | Click "Disable" | Subscription removed, button changes |

### 2.2 Notification Preferences
**Prerequisite:** Notifications enabled

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Weather alerts toggle | Toggle "Frost Alerts" | Setting saved to database |
| Bloom+ gating | As Free user, try weather toggles | Shows "BLOOM+" badge, toggle disabled |
| Task reminders toggle | Toggle "Watering Reminders" | Setting saved |
| Quiet hours | Set quiet hours 22:00 - 07:00 | Hours saved, no notifications during that time |

### 2.3 Push Notification Delivery
**Note:** Test in production or with test endpoint

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Test notification | POST to /api/grow/push/send with userId | Notification appears on device |
| Notification click | Click notification | Opens correct page in app |
| Notification dismiss | Swipe away notification | Notification closes |

### 2.4 Weather Alerts (Cron Job)
**Endpoint:** `/api/cron/grow/weather-alerts`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Cron execution | Trigger cron endpoint | Returns success with processed count |
| Frost detection | User with location expecting frost | Frost alert sent |
| Duplicate prevention | Trigger cron twice | Second run doesn't duplicate alerts |
| Quiet hours respect | Trigger during quiet hours | Alerts not sent |

---

## Phase 2: Data Collection (Outcomes)

### 2.5 Harvest Outcome Recording
**Endpoint:** `/api/grow/outcomes/harvest`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Record harvest | POST harvest outcome | 201 response, outcome saved |
| View harvests | GET user's harvests | List of harvest outcomes returned |
| Quality rating | Submit 1-5 star rating | Rating saved correctly |
| Met expectations | Select exceeded/met/below/failed | Selection saved |

### 2.6 Task Feedback
**UI:** Task completion prompt

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Feedback prompt | Complete a task | Feedback prompt appears |
| Quick positive | Click thumbs up | Feedback saved, prompt closes |
| Quick negative | Click thumbs down | Details form shown |
| Detailed feedback | Submit rating + text | Full feedback saved |
| Outcome follow-up | After 3 days, see prompt | Outcome prompt appears |

---

## Database Verification Queries

### Check Push Subscriptions
```sql
SELECT
  user_id,
  endpoint,
  device_name,
  is_active,
  created_at
FROM grow_push_subscriptions
ORDER BY created_at DESC
LIMIT 10;
```

### Check Notification Preferences
```sql
SELECT
  user_id,
  frost_alerts,
  weather_threats,
  watering_reminders,
  quiet_start_hour,
  quiet_end_hour
FROM grow_notification_preferences
LIMIT 10;
```

### Check Notification Log
```sql
SELECT
  notification_type,
  status,
  title,
  created_at
FROM grow_notification_log
ORDER BY created_at DESC
LIMIT 20;
```

### Check Harvest Outcomes
```sql
SELECT
  plant_id,
  harvest_date,
  quality_rating,
  met_expectations
FROM grow_harvest_outcomes
ORDER BY harvest_date DESC
LIMIT 10;
```

### Check Task Feedback
```sql
SELECT
  task_type,
  was_helpful,
  feedback_rating,
  outcome
FROM grow_task_feedback
ORDER BY created_at DESC
LIMIT 10;
```

---

## API Endpoint Testing

### Test Push Subscribe (cURL)
```bash
curl -X POST "https://grow.godaisy.io/api/grow/push/subscribe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/test",
    "keys": {
      "p256dh": "test-key",
      "auth": "test-auth"
    },
    "deviceName": "QA Test Device"
  }'
```

### Test Notification Preferences (cURL)
```bash
# Get preferences
curl "https://grow.godaisy.io/api/grow/push/preferences" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Update preferences
curl -X PUT "https://grow.godaisy.io/api/grow/push/preferences" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"frostAlerts": true, "wateringReminders": false}'
```

### Test Weather Alerts Cron
```bash
curl -X POST "https://grow.godaisy.io/api/cron/grow/weather-alerts" \
  -H "Authorization: Bearer CRON_SECRET"
```

---

## Browser Compatibility

| Browser | Push Notifications | IndexedDB Cache | Service Worker |
|---------|-------------------|-----------------|----------------|
| Chrome Desktop | ✅ | ✅ | ✅ |
| Chrome Android | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari Desktop | ⚠️ Limited | ✅ | ✅ |
| Safari iOS | ⚠️ Limited | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |

**Note:** Safari requires user to add app to home screen for push notifications.

---

## Known Limitations

1. **Push Notifications:**
   - Safari requires PWA install for push
   - Notifications may be delayed if device is in power saving mode

2. **Weather Alerts:**
   - Requires user to have location set in preferences
   - Cron runs every 6 hours, not real-time

3. **Outcome Tracking:**
   - Follow-up prompts appear 3 days after task completion
   - Requires manual trigger (no automatic prompts yet)

---

## Phase 3: Ecosystem (Integrations & Community)

### 3.1 Weather Station Integrations

#### Tempest WeatherFlow
**Settings:** `/grow/settings` (Integrations section)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Connect station | Enter Tempest API token, click Connect | Station appears in connected list |
| Sync data | Click sync button | Latest weather data fetched |
| Disconnect | Click trash icon, confirm | Station removed from list |
| Invalid token | Enter invalid token | "Invalid or expired token" error |

#### Ambient Weather
| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Connect station | Enter Ambient Weather API key | Device appears with soil sensor indicator |
| Soil data sync | Sync station with soil sensors | Soil temp/moisture data retrieved |
| Multiple devices | Account with multiple stations | Shows device selection |

#### Rachio Smart Irrigation
| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Connect controller | Enter Rachio API key | Controller and zones appear |
| Start zone | Select zone, set duration, start | Zone starts watering |
| Stop watering | Click stop on active device | Watering stops |
| Rain delay | Set rain delay for X days | Rain delay activated |

### 3.2 Community Groups

**API Endpoints:** `/api/grow/community/*`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create group | POST to /community/groups | Group created, user is admin |
| Find nearby | GET /community/groups?lat=X&lon=Y | Returns groups within radius |
| Join group | POST to /community/membership | User becomes member |
| Leave group | DELETE /community/membership | User removed from group |
| Admin can't leave alone | Last admin tries to leave | Error: "Transfer admin first" |

### 3.3 Community Alerts

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Post pest alert | POST alert with type=pest | Alert created with 7-day expiry |
| Post weather alert | POST alert with type=weather | Alert created with 3-day expiry |
| View group alerts | GET /community/alerts?groupId=X | Returns alerts for group |
| View all alerts | GET /community/alerts | Returns alerts from all user's groups |
| Confirm alert | POST /community/alerts/confirm | Confirmation count increases |
| Can't self-confirm | Try to confirm own alert | Error returned |

### Database Verification Queries (Phase 3)

#### Check Integrations
```sql
SELECT
  integration_type,
  device_name,
  station_id,
  is_active,
  last_sync_at
FROM grow_user_integrations
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 10;
```

#### Check Weather Station Data
```sql
SELECT
  i.device_name,
  d.temperature_c,
  d.humidity_percent,
  d.wind_speed_mps,
  d.recorded_at
FROM grow_weather_station_data d
JOIN grow_user_integrations i ON d.integration_id = i.id
ORDER BY d.recorded_at DESC
LIMIT 10;
```

#### Check Community Groups
```sql
SELECT
  name,
  member_count,
  latitude,
  longitude,
  radius_km
FROM grow_community_groups
ORDER BY member_count DESC
LIMIT 10;
```

#### Check Community Alerts
```sql
SELECT
  g.name as group_name,
  a.alert_type,
  a.title,
  a.severity,
  a.confirmation_count,
  a.is_active,
  a.created_at
FROM grow_community_alerts a
JOIN grow_community_groups g ON a.group_id = g.id
ORDER BY a.created_at DESC
LIMIT 10;
```

### API Endpoint Testing (Phase 3)

#### Test Connect Tempest (cURL)
```bash
curl -X POST "https://grow.godaisy.io/api/grow/integrations/tempest/connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"token": "YOUR_TEMPEST_TOKEN"}'
```

#### Test Create Community Group (cURL)
```bash
curl -X POST "https://grow.godaisy.io/api/grow/community/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Dublin Gardeners",
    "description": "Local gardening community in Dublin",
    "latitude": 53.3498,
    "longitude": -6.2603,
    "radiusKm": 25
  }'
```

#### Test Post Alert (cURL)
```bash
curl -X POST "https://grow.godaisy.io/api/grow/community/alerts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "groupId": "GROUP_UUID",
    "alertType": "pest",
    "title": "Aphid outbreak on roses",
    "description": "Heavy aphid infestation spotted on rose bushes",
    "severity": "medium",
    "affectedPlants": ["roses", "tomatoes"]
  }'
```

---

## Regression Test Checklist

After any deployment, verify these core flows:

### Core Functionality
- [ ] Login/logout works
- [ ] Subscription tier displays correctly
- [ ] Premium features gated properly for Free users
- [ ] Settings page saves preferences
- [ ] Weather page loads for logged-in user
- [ ] Garden page shows plants

### Push Notifications (Phase 2)
- [ ] Push notification enable/disable works
- [ ] Notification preferences save correctly
- [ ] Task completion triggers feedback prompt

### Integrations (Phase 3)
- [ ] Integrations section visible in Settings
- [ ] Can connect/disconnect weather stations
- [ ] Station data syncs on demand
- [ ] Rachio zones display correctly

### Community (Phase 3)
- [ ] Can create community groups (via API)
- [ ] Can join/leave groups (via API)
- [ ] Can post and view alerts (via API)

---

## Reporting Issues

When reporting bugs, include:
1. Browser/device info
2. User tier (Free/Sprout/Bloom/Harvest)
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshots/video if applicable
6. Console errors (F12 > Console)

File issues at: https://github.com/mrdamianrafferty/wotnow/issues
