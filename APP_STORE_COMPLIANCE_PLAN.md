# Plan: App Store & Play Store Compliance Fixes

## Context

A comprehensive app-store-reviewer audit identified 3 blockers, 6 high-risk, and 6 medium-risk issues across all three apps (Go Daisy, Findr, Grow Daisy) that would cause Apple App Store rejection or Google Play policy violations. This plan addresses every finding that can be fixed in code — organized by priority so blockers are resolved first.

**Out of scope (requires external action, not code):**
- BLOCKER 1 (Stripe → Apple IAP): Requires RevenueCat account setup, App Store Connect product configuration, and significant new feature work. Tracked separately.
- R2-R5 recommendations: Best practices, not rejection risks.

---

## Phase 1: BLOCKER Fixes (3 items)

### 1.1 Remove APNs Auth Key from git + gitignore it

**Why:** Private key `AuthKey_WLS9RZ2P22.p8` is tracked in git — anyone with repo access can impersonate push notifications.

**Steps:**
1. Add to `.gitignore`:
   ```
   # Apple APNs auth keys
   *.p8
   ```
2. Remove from git tracking: `git rm --cached AuthKey_WLS9RZ2P22.p8`
3. **Manual follow-up (not automatable):** Revoke the key in Apple Developer Portal → Keys, generate a new one, update Firebase/CI with the new key.

### 1.2 Fix Findr iOS APS environment → production

**File:** `ios/App/App/App.entitlements` (line 6)

**Change:** `<string>development</string>` → `<string>production</string>`

Note: Go Daisy and Grow Daisy entitlements were already fixed to `production` in the mobile recommendations work.

### 1.3 Add platform detection for Stripe checkout (interim gate)

**Why:** Full IAP integration is out of scope, but we can prevent the Stripe checkout from loading on iOS native — showing a message instead. This avoids the automatic Apple rejection for Guideline 3.1.1.

**Files:**
- `pages/findr/premium.tsx` — Add platform check before Stripe redirect
- `pages/grow/premium.tsx` — Same pattern (if it exists; check first)

**Pattern:**
```tsx
import { Capacitor } from '@capacitor/core';

// Before rendering Stripe checkout button:
if (Capacitor.getPlatform() === 'ios') {
  // Show message: "Subscription management coming soon to the iOS app.
  // Visit fishfindr.eu in your browser to subscribe."
  return <IAPComingSoonMessage />;
}
```

This is a temporary gate — the full RevenueCat integration is a separate project.

---

## Phase 2: HIGH-RISK Fixes (6 items)

### 2.1 Fix Go Daisy account deletion to use API endpoint

**File:** `pages/account.tsx` (lines 155–175)

**Problem:** `handleDeleteAccount` deletes only 3 tables via client-side Supabase and calls `signOut()` — but never deletes the auth user record from `auth.users`. Both Findr and Grow correctly call `DELETE /api/account/delete`.

**Fix:** Replace the function body to call the proper API endpoint:
```typescript
const handleDeleteAccount = async () => {
  if (deleteConfirmText !== 'DELETE') return;
  setDeleting(true);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to delete account');
    }

    localStorage.clear();
    window.location.href = '/';
  } catch (err) {
    console.error('Error deleting account:', err);
    alert('Failed to delete account. Please contact support.');
  } finally {
    setDeleting(false);
  }
};
```

### 2.2 Remove unused permission declarations from all Info.plist files

**Files (3):**
- `ios/App/App/Info.plist`
- `ios-godaisy/App/App/Info.plist`
- `ios-growdaisy/App/App/Info.plist`

**Remove `NSMotionUsageDescription`** — No CoreMotion or motion plugin usage exists in the codebase. Apple rejects apps that declare unused permissions (Guideline 5.1.1).

**Remove `NSLocationAlwaysAndWhenInUseUsageDescription`** — No background location tracking is implemented. Keep only `NSLocationWhenInUseUsageDescription`. Apple's review team tests background location claims and will reject if the behavior doesn't match.

**Remove `fetch` from `UIBackgroundModes`** — Keep `remote-notification` and `processing` only. No `application(_:performFetchWithCompletionHandler:)` is implemented in the native code.

### 2.3 Fix UIRequiredDeviceCapabilities: armv7 → arm64

**Files (3):** Same three Info.plist files as 2.2

**Change:**
```xml
<string>armv7</string>
```
→
```xml
<string>arm64</string>
```

### 2.4 Create Android assetlinks.json

**New file:** `public/.well-known/assetlinks.json`

**Content (template — cert fingerprints need to be filled in):**
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "eu.fishfindr.app",
      "sha256_cert_fingerprints": ["TODO:FINDR_CERT_SHA256"]
    }
  },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "io.godaisy.app",
      "sha256_cert_fingerprints": ["TODO:GODAISY_CERT_SHA256"]
    }
  },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "io.growdaisy.app",
      "sha256_cert_fingerprints": ["TODO:GROWDAISY_CERT_SHA256"]
    }
  }
]
```

**Also add** Content-Type header in `next.config.mjs` headers section:
```js
{
  source: '/.well-known/assetlinks.json',
  headers: [{ key: 'Content-Type', value: 'application/json' }],
},
```

### 2.5 Audit Facebook SDK dependency in Findr iOS

**Investigation:** Check `ios/App/Podfile` and `ios/App/Podfile.lock` for FBSDKCoreKit/FBSDKLoginKit. If Facebook login is not a Findr feature, the FBSDK may be a transitive dependency from `@capgo/capacitor-social-login`.

**Action:** If FBSDK is present and unused:
- Check if `@capgo/capacitor-social-login` can be configured to exclude Facebook
- Or add `NSUserTrackingUsageDescription` to Info.plist as a safety net (but only if FBSDK cannot be removed)

**Note:** This is investigative — may require no code changes if FBSDK doesn't call IDFA in current versions.

---

## Phase 3: MEDIUM-RISK Fixes (6 items)

### 3.1 Add Stripe to privacy policy third-party services

**File:** `pages/privacy.tsx` (after line ~87, in the third-party services `<ul>`)

**Add:**
```tsx
<li><strong>Stripe</strong> - Payment processing for premium subscriptions (Findr, Grow Daisy)</li>
```

### 3.2 Create Grow Daisy privacy policy page

**New file:** `pages/grow/privacy.tsx`

Model on `pages/findr/privacy.tsx` but with Grow Daisy-specific data practices:
- Plant data and garden photos
- Weather data for garden recommendations
- Soil conditions and planting calendar data
- Push notification tokens for garden reminders
- Link back to shared privacy policy for common sections

### 3.3 Add privacy/terms links to Grow Daisy settings

**File:** `components/grow/SettingsPage.tsx`

**Add** a "Legal" section with links to:
- Privacy Policy → `/grow/privacy` (or `/privacy`)
- Terms of Service → `/terms`

Place after the existing "Delete Account" section but before the dialog.

### 3.4 Fix Google token exchange error leak

**File:** `pages/api/auth/google-token-exchange.ts` (lines 67-70)

**Change:**
```typescript
return res.status(tokenResponse.status).json({
  error: 'Token exchange failed',
  details: errorData
});
```
→
```typescript
return res.status(tokenResponse.status).json({
  error: 'Authentication failed. Please try again.'
});
```
Keep the `console.error` on line 66 for server-side debugging.

### 3.5 Expand AASA to cover Findr content paths

**File:** `public/.well-known/apple-app-site-association`

**Add** Findr content paths to the applinks section for `eu.fishfindr.app`:
```json
"/findr",
"/findr/*"
```

### 3.6 Remove `fetch` from UIBackgroundModes

Already covered in 2.2 above (combined for efficiency).

---

## Phase 4: IAP Implementation (Tracked Separately)

**BLOCKER 1** requires RevenueCat integration. This is a multi-day project:

1. Set up RevenueCat account + connect to App Store Connect / Google Play Console
2. Create `lib/iap/revenuecat.ts` — product fetch, purchase, restore
3. Add IAP UI to premium pages (iOS only)
4. Add "Restore Purchases" button (Apple requirement)
5. Server-side webhook for RevenueCat → Supabase subscription sync
6. Test sandbox purchases on TestFlight

**This phase is not included in the implementation scope of this plan.** It should be a dedicated PR/project.

---

## Files Summary

**Delete from git tracking (1):**
- `AuthKey_WLS9RZ2P22.p8` — `git rm --cached`

**Edit (14 files):**
- `.gitignore` — add `*.p8`
- `ios/App/App/App.entitlements` — aps-environment → production
- `ios/App/App/Info.plist` — remove NSMotionUsageDescription, NSLocationAlwaysAndWhenInUse, armv7→arm64, remove fetch from UIBackgroundModes
- `ios-godaisy/App/App/Info.plist` — same as above
- `ios-growdaisy/App/App/Info.plist` — same as above
- `pages/account.tsx` — fix handleDeleteAccount to call API
- `pages/privacy.tsx` — add Stripe to third-party services
- `components/grow/SettingsPage.tsx` — add privacy/terms links
- `pages/api/auth/google-token-exchange.ts` — remove error details leak
- `pages/findr/premium.tsx` — add iOS platform gate
- `next.config.mjs` — add assetlinks.json Content-Type header
- `public/.well-known/apple-app-site-association` — expand Findr paths

**Create (3 files):**
- `public/.well-known/assetlinks.json` — Android App Links verification
- `pages/grow/privacy.tsx` — Grow Daisy privacy policy
- `pages/grow/premium.tsx` check / iOS gate (if exists)

---

## Verification

```bash
# 1. Confirm auth key removed from tracking
git ls-files AuthKey*  # should return empty

# 2. TypeScript check
npx tsc --noEmit

# 3. Lint
npm run lint:ci

# 4. Tests
npm test -- --ci --passWithNoTests

# 5. Verify entitlements
grep "production" ios/App/App/App.entitlements        # should match
grep "production" ios-godaisy/App/App/App.entitlements # should match
grep "production" ios-growdaisy/App/App/App.entitlements # should match

# 6. Verify Info.plist cleanup
grep "NSMotionUsageDescription" ios/App/App/Info.plist  # should NOT match
grep "armv7" ios/App/App/Info.plist                     # should NOT match
grep "arm64" ios/App/App/Info.plist                     # should match

# 7. Verify assetlinks exists
ls public/.well-known/assetlinks.json

# 8. Manual: test account deletion on Go Daisy
#    - Sign up, go to /account, delete account
#    - Verify auth.users record is deleted (check Supabase dashboard)

# 9. Manual: verify Stripe checkout blocked on iOS
#    - Open Findr in iOS Simulator
#    - Navigate to premium page
#    - Should see "coming soon" message, NOT Stripe checkout
```
