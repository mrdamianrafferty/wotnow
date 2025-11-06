# Mobile App Environment Variables

This document describes environment variables specific to the mobile app (iOS/Android builds via Capacitor).

**Note:** All mobile-specific variables are **OPTIONAL**. The app will work without them, but some features will be disabled.

---

## Quick Start

For a basic mobile build with minimal configuration, you **only need**:

```bash
# .env.local (or Vercel environment variables)
NEXT_PUBLIC_SENTRY_DSN=  # Leave empty or omit if you don't want error tracking
```

Everything else has sensible defaults and graceful fallbacks.

---

## Error Tracking

### `NEXT_PUBLIC_SENTRY_DSN`

**Purpose:** Error tracking and crash reporting via Sentry.io

**Required:** No (but **strongly recommended** for production)

**How to get it:**
1. Sign up at [sentry.io](https://sentry.io)
2. Create a new project (select "React Native" or "JavaScript")
3. Copy the DSN from the project settings

**Example:**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7890123
```

**What happens if not set:**
- Errors are logged to console only (via logger utility)
- No remote error tracking
- No crash reports
- Warning appears: "Sentry not configured (NEXT_PUBLIC_SENTRY_DSN not set)"

**Used in:**
- `lib/capacitor/error-tracking.ts`

---

## Analytics (Future Implementation)

These variables are **commented out** in `.env.example` because they're not yet implemented. Uncomment and configure when adding analytics support.

### Firebase Analytics / Google Analytics 4

```bash
# NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Purpose:** Track user behavior, screen views, events

**How to get it:**
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add iOS and Android apps to the project
3. Copy the config values from the Firebase console

**What happens if not set:**
- No analytics tracking
- App works normally

**Used in:**
- `lib/capacitor/analytics.ts` (when implemented)

---

## Push Notifications (Future Implementation)

```bash
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
# NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:android:abc123
```

**Purpose:** Push notifications from backend services

**How to get it:**
1. Same Firebase project as analytics
2. Enable Cloud Messaging in Firebase console
3. Copy Sender ID and App ID from project settings

**What happens if not set:**
- Push notifications won't work
- Local notifications still work (scheduled reminders)

**Used in:**
- `lib/capacitor/notifications.ts` (push notification registration)

---

## Feature Flags (Future Implementation)

```bash
# NEXT_PUBLIC_FEATURE_FLAGS_ENDPOINT=https://api.yourapp.com/feature-flags
```

**Purpose:** Remote configuration and A/B testing

**How to set it:**
1. Implement feature flags backend endpoint
2. Set the URL to your API

**What happens if not set:**
- All features enabled by default
- No remote configuration

**Used in:**
- `lib/capacitor/feature-flags.ts` (when implemented)

---

## App Version Configuration

These are **NOT environment variables** - they're set in code files:

### Version and Build Number

**Set in:**
1. `package.json`: `"version": "1.0.0"`
2. `capacitor.config.ts`: Comment at top
3. `ios/App/App.xcodeproj/project.pbxproj`: `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`
4. `android/app/build.gradle`: `versionName` and `versionCode`

**Keep these in sync!**

### App ID

**Set in:**
1. `capacitor.config.ts`: `appId: 'eu.fishfindr.app'`
2. `ios/App/App.xcodeproj/project.pbxproj`: `PRODUCT_BUNDLE_IDENTIFIER`
3. `android/app/build.gradle`: `applicationId`

**Do NOT change** after publishing to stores (will be treated as new app).

---

## Development vs. Production

### Development (Local Testing)

```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_SENTRY_DSN=  # Optional, can leave empty for dev
```

**Behavior:**
- All logs output to console (logger.debug, logger.info, etc.)
- Sentry disabled if DSN not set
- Offline storage shows debug indicator

### Production (App Store / Play Store)

```bash
# Vercel environment variables (or .env.production)
NODE_ENV=production
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456
```

**Behavior:**
- Only errors and warnings logged to console
- Sentry captures all errors automatically
- No debug indicators shown

---

## Testing Without Environment Variables

You can build and test the mobile app **without any environment variables**:

```bash
# Empty .env.local (or no file at all)
```

**What works:**
✅ Camera and photo library
✅ Geolocation
✅ Local notifications
✅ Offline storage
✅ Haptic feedback
✅ Share functionality
✅ All core features

**What doesn't work:**
❌ Error tracking (logs to console only)
❌ Push notifications (local notifications still work)
❌ Analytics
❌ Remote feature flags

---

## How to Set Environment Variables

### For Local Development

Create `.env.local` in project root:

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456
```

**Important:** Do NOT commit `.env.local` to git (it's in `.gitignore`)

### For Vercel Deployment

1. Go to Vercel Dashboard > Project > Settings > Environment Variables
2. Add each variable
3. Set scope: Production, Preview, or Development
4. Redeploy app for changes to take effect

### For Native Builds

Environment variables are baked into the JavaScript bundle at build time:

```bash
# 1. Set environment variables
export NEXT_PUBLIC_SENTRY_DSN=https://...

# 2. Build the app
npm run build

# 3. Sync to native projects
npx cap sync

# 4. Build native apps
npx cap open ios  # Then archive in Xcode
npx cap open android  # Then build AAB in Android Studio
```

**Note:** Changing environment variables requires rebuilding the JS bundle and resyncing to native projects.

---

## Troubleshooting

### "Sentry not configured" warning

**Cause:** `NEXT_PUBLIC_SENTRY_DSN` is not set

**Fix:**
- **For production:** Add the DSN from sentry.io
- **For development:** Ignore the warning (errors log to console)

### Environment variable not working

**Check:**
1. Variable name starts with `NEXT_PUBLIC_` (required for client-side access)
2. No typos in variable name
3. Restart dev server after adding variable
4. For native builds: Did you rebuild and resync?

### Different values in dev vs. prod

**Solution:** Use `.env.local` for local dev, Vercel dashboard for production:

```bash
# .env.local (development)
NEXT_PUBLIC_SENTRY_DSN=https://dev-project@sentry.io/123

# Vercel (production)
NEXT_PUBLIC_SENTRY_DSN=https://prod-project@sentry.io/456
```

---

## Summary

**Minimum viable mobile app:**
```bash
# No environment variables required!
```

**Recommended for production:**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456
```

**Full featured (future):**
```bash
# Error tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456

# Analytics
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_GA_MEASUREMENT_ID=...

# Push notifications
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Feature flags
NEXT_PUBLIC_FEATURE_FLAGS_ENDPOINT=https://api.yourapp.com/feature-flags
```

All mobile features gracefully degrade when environment variables are missing.
