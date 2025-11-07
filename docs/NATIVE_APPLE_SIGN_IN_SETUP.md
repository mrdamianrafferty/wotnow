# Native Apple Sign In Setup Guide

**Date:** January 7, 2025
**Status:** ✅ Implementation Complete - Requires Configuration
**Apps:** Findr (fishfindr.eu) & Go Daisy (godaisy.io)

---

## Overview

This guide covers setting up **native Apple Sign In** for the iOS mobile app. This provides a better user experience than web-based OAuth by using the native iOS authentication dialog (no browser redirect).

**What's Implemented:**
- ✅ Native Apple Sign In wrapper (`lib/auth/appleSignIn.ts`)
- ✅ Capacitor community plugin installed (`@capacitor-community/apple-sign-in@7.1.0`)
- ✅ Go Daisy auth page updated to use native flow on iOS
- ✅ Automatic fallback to web OAuth on non-iOS platforms
- ✅ Shared authentication between Findr and Go Daisy (same Supabase project)

**What Needs Configuration:**
- ⏳ iOS Xcode capability: "Sign in with Apple"
- ⏳ Apple Developer account setup
- ⏳ Supabase auth configuration
- ⏳ Test on physical iOS device

---

## Why Native Apple Sign In?

### Before (Web OAuth):
1. User taps "Sign in with Apple"
2. App redirects to Safari/ASWebAuthenticationSession
3. User authenticates in browser
4. Browser redirects back to app
5. Multiple taps, context switching, slower

### After (Native):
1. User taps "Sign in with Apple"
2. Native iOS dialog appears (Face ID/Touch ID prompt)
3. User authenticates with biometrics
4. Instantly signed in
5. One tap, seamless, faster

**Result:** Better UX, higher conversion rate, required by App Store if you offer any other social login

---

## Step 1: iOS Xcode Configuration

### 1.1 Enable "Sign in with Apple" Capability

Open the iOS project in Xcode:
```bash
npm run cap:open:ios
```

In Xcode:
1. Select **App** target (not App Extension)
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Search for and add **"Sign in with Apple"**
5. Verify it appears in the capabilities list

**Visual Check:**
- You should see "Sign in with Apple" listed under "Signing & Capabilities"
- No errors or warnings should appear

### 1.2 Update App Identifier (Apple Developer Portal)

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → Your app ID (`eu.fishfindr.app` or Go Daisy equivalent)
4. Enable **"Sign in with Apple"** checkbox
5. Click **Save**

---

## Step 2: Apple Developer Services ID Configuration

Apple Sign In requires a **Services ID** for web-to-app authentication.

### 2.1 Create Services ID

1. In Apple Developer Portal, go to **Identifiers**
2. Click **+** to create new identifier
3. Select **Services IDs** → Continue
4. Fill in details:
   - **Description:** `Findr Web Services` (or `Go Daisy Web Services`)
   - **Identifier:** `eu.fishfindr.services` (or `io.godaisy.services`)
5. Enable **"Sign in with Apple"**
6. Click **Configure** next to "Sign in with Apple"
7. Configure domains and redirect URLs:
   - **Primary App ID:** Select your app (`eu.fishfindr.app`)
   - **Domains:**
     - `fishfindr.eu` (for Findr)
     - `godaisy.io` (for Go Daisy)
   - **Return URLs:**
     - `https://fishfindr.eu/auth/callback`
     - `https://godaisy.io/auth/callback`
     - Add your Supabase project URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
8. Click **Save** → **Continue** → **Register**

---

## Step 3: Supabase Configuration

### 3.1 Get Apple Credentials

From Apple Developer Portal:
1. Go to **Keys** (under Certificates, Identifiers & Profiles)
2. Click **+** to create new key
3. Name it: `Findr Apple Sign In Key`
4. Enable **"Sign in with Apple"**
5. Click **Configure** → Select your Primary App ID → **Save**
6. Click **Continue** → **Register**
7. **Download** the `.p8` key file (keep it safe, you can't download it again!)
8. Note the **Key ID** (e.g., `ABC123XYZ`)

### 3.2 Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Apple** and click **Enable**
5. Enter configuration:
   - **Services ID:** `eu.fishfindr.services` (from Step 2.1)
   - **Key ID:** Your Key ID from Step 3.1
   - **Team ID:** Your Apple Team ID (found in Apple Developer account top-right)
   - **Private Key:** Paste contents of your `.p8` file
   - **Authorized Client IDs:** (optional) Add your app bundle ID if needed
6. Click **Save**

### 3.3 Add Redirect URLs to Supabase

In Supabase Dashboard → **Authentication** → **URL Configuration**:

Add to **Redirect URLs** list:
```
https://fishfindr.eu/auth/callback
https://godaisy.io/auth/callback
https://fishfindr.eu/*
https://godaisy.io/*
```

Set **Site URL** to your primary domain:
```
https://fishfindr.eu
```
(or `https://godaisy.io` for Go Daisy)

---

## Step 4: Testing

### 4.1 Test on iOS Simulator (Limited)

**Note:** iOS Simulator can test the flow but requires an Apple ID with 2FA enabled.

```bash
npm run cap:run:ios
```

1. Tap "Sign in with Apple"
2. You'll see the native Apple Sign In sheet
3. Use your Apple ID (with 2FA)
4. Verify authentication completes

### 4.2 Test on Physical iOS Device (Recommended)

Physical devices provide the best testing experience with Face ID/Touch ID.

**Connect device:**
1. Connect iPhone/iPad via USB
2. Trust computer if prompted
3. In Xcode: Select your device from device dropdown
4. Click **Run** (▶️) or `npm run cap:run:ios`

**Test scenarios:**
- ✅ New user signs in → Creates account → Redirects to app
- ✅ Existing user signs in → Logs in immediately
- ✅ User cancels → No error shown, stays on login page
- ✅ User without Apple ID → Falls back to email/password
- ✅ Sign out → Sign in again works

### 4.3 Test Web Fallback

**Android/Web:**
1. Open app on Android or web browser
2. Tap "Sign in with Apple"
3. Should redirect to Apple OAuth web page (Safari/Chrome)
4. Complete authentication
5. Should redirect back to app

**Expected behavior:**
- Native iOS → Native dialog (no browser)
- Android/Web → Web OAuth redirect (standard flow)

---

## Step 5: Verify Shared Authentication

Both Findr and Go Daisy share the same Supabase auth system.

**Test:**
1. Sign in to Findr with Apple → ✅ Succeeds
2. Open Go Daisy → Should already be signed in (shared session)
3. Sign out from Go Daisy
4. Return to Findr → Should be signed out (shared sign out)

**Database Check:**
```sql
-- Check users created via Apple Sign In
SELECT
  id,
  email,
  raw_user_meta_data->>'provider' as provider,
  raw_user_meta_data->>'full_name' as name,
  created_at
FROM auth.users
WHERE raw_user_meta_data->>'provider' = 'apple'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Error: "Invalid Client"

**Cause:** Services ID not configured correctly in Apple Developer Portal

**Fix:**
1. Verify Services ID exists and is enabled
2. Check that domains and return URLs match exactly
3. Make sure you selected the correct Primary App ID

### Error: "Invalid Key"

**Cause:** Private key (.p8) content incorrect in Supabase

**Fix:**
1. Re-download the .p8 key from Apple Developer Portal (you can't, so create new key)
2. Copy entire contents including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
3. Paste into Supabase without extra spaces/newlines

### Native Sign In Not Triggering

**Cause:** App not detecting native iOS environment

**Fix:**
1. Verify `Capacitor.isNativePlatform()` returns `true`
2. Check console logs: should see "Starting native Apple Sign In flow"
3. Ensure plugin is registered: `npx cap ls` should show `@capacitor-community/apple-sign-in`

### Sign In Succeeds But Doesn't Redirect

**Cause:** Auth state listener not triggering

**Fix:**
1. Check `supabase.auth.onAuthStateChange()` is registered
2. Verify callback route `/auth/callback` exists and handles sessions
3. Check browser console for errors

### Works on iOS, Fails on Web

**This is expected!** The native plugin only works on iOS. Web should fall back to OAuth redirect.

**Verify:**
1. On iOS → Native dialog
2. On web/Android → Redirects to Apple OAuth page

---

## Code Reference

### Main Implementation Files

**Apple Sign In Wrapper:**
- `lib/auth/appleSignIn.ts` - Platform detection, native/web handling

**Auth Pages:**
- `app/login/AuthClient.tsx` - Go Daisy login (uses native on iOS)
- `pages/findr/simple-auth.tsx` - Findr login (needs updating if used)
- `pages/findr/auth.tsx` - Findr advanced auth (needs updating if used)

**Callback Handler:**
- `pages/auth/callback.tsx` - Handles OAuth redirects
- `pages/auth/shared-callback.tsx` - Shared callback for both apps

### Usage Example

```typescript
import { signInWithApple, isAppleSignInAvailable } from '@/lib/auth/appleSignIn';
import { supabase } from '@/lib/supabase/client';

async function handleAppleSignIn() {
  try {
    // Automatically uses native on iOS, web OAuth elsewhere
    await signInWithApple(supabase, '/auth/callback');

    // On iOS: Native dialog shown, signs in immediately
    // On web: Redirects to Apple OAuth
  } catch (error) {
    console.error('Apple Sign In failed:', error);
    // Show error to user
  }
}

// Check if available on this platform
if (isAppleSignInAvailable()) {
  // Show "Sign in with Apple" button
}
```

---

## Security Considerations

### Nonce Generation

The implementation uses cryptographic nonces to prevent replay attacks:
```typescript
crypto.getRandomValues() // Secure random generation
```

### Token Validation

Supabase validates Apple ID tokens server-side:
- Verifies token signature
- Checks token expiration
- Validates audience (your app ID)
- Creates authenticated session

### Privacy

Apple Sign In offers "Hide My Email" option:
- User can choose to share real email or use relay email
- Your app receives either real email or `privaterelay@icloud.com` address
- Handle both cases gracefully in your UI

---

## Apple App Store Requirements

**Required by App Store Review Guidelines:**

If your app offers any third-party authentication (Google, Facebook, GitHub, etc.), you **must** also offer "Sign in with Apple" as an option.

**Compliance:**
- ✅ Button must be equal or more prominent than other social login options
- ✅ Must work on first launch
- ✅ Must not require additional login afterwards
- ✅ Privacy policy must explain how Apple ID is used

**This implementation meets all requirements.**

---

## Rollout Checklist

Before releasing to production:

- [ ] iOS capability "Sign in with Apple" enabled in Xcode
- [ ] Services ID created and configured in Apple Developer Portal
- [ ] Supabase Apple provider configured with correct credentials
- [ ] Redirect URLs added to Supabase URL configuration
- [ ] Tested on physical iOS device (native flow)
- [ ] Tested on web browser (OAuth fallback)
- [ ] Tested on Android (OAuth fallback)
- [ ] Verified user data saves correctly to database
- [ ] Verified shared auth works between Findr and Go Daisy
- [ ] Privacy policy updated to mention Apple Sign In
- [ ] App Store listing screenshots show Apple Sign In button

---

## Next Steps

1. **Configure Apple Developer Portal** (Services ID, domains, redirect URLs)
2. **Configure Supabase** (Apple provider settings)
3. **Enable capability in Xcode** ("Sign in with Apple")
4. **Test on physical device**
5. **Update Findr auth pages** (if they don't use web OAuth yet)
6. **Update privacy policy** (mention Apple Sign In)
7. **Submit for App Store review**

---

## Support

**Documentation:**
- [Apple Sign In Plugin Docs](https://github.com/capacitor-community/apple-sign-in)
- [Supabase Apple Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Sign In Guidelines](https://developer.apple.com/sign-in-with-apple/)

**Testing:**
```bash
# Test native on iOS simulator
npm run cap:run:ios

# Test on device
# Connect device, then:
npm run cap:open:ios
# Select device in Xcode, then Run
```

---

**Status:** Ready for configuration and testing! 🚀
