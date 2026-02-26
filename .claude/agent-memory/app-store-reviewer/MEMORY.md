# App Store Reviewer Agent Memory

## Project: WotNow App Family
Three Capacitor-wrapped Next.js apps from one monorepo:
- **Findr** (eu.fishfindr.app) — fishing predictions, iOS/Android
- **Go Daisy** (io.godaisy.app) — weather activity recommendations, iOS/Android
- **Grow Daisy** (io.growdaisy.app) — smart garden planner, iOS/Android

## Key File Locations
- Capacitor configs: `/capacitor.config.*.ts`
- iOS Info.plist: `/ios/App/App/Info.plist` (Findr), `/ios-godaisy/...`, `/ios-growdaisy/...`
- iOS Entitlements: `/ios*/App/App/App.entitlements`
- Android manifests: `/android/app/src/main/AndroidManifest.xml` (shared), `/android-godaisy/...`, `/android-growdaisy/...`
- Android build.gradle: `/android/app/build.gradle` (shared, with flavors: findr/godaisy/growdaisy)
- Privacy policy: `/pages/privacy.tsx` (shared), `/pages/findr/privacy.tsx`
- Terms: `/pages/TermsAndConditions.tsx`
- Account deletion API: `/pages/api/account/delete.ts`
- Stripe checkout: `/pages/api/stripe/create-checkout-session.ts`
- Push primer: `/components/PushPermissionPrimer.tsx`
- AASA file: `/public/.well-known/apple-app-site-association`

## Critical Known Issues (from Feb 2026 audit)
See `platform-audit-feb2026.md` for full details. Top issues:

1. **BLOCKER - Apple IAP**: Stripe web billing used for premium purchases inside native iOS apps. No StoreKit/RevenueCat implementation. Apple WILL reject. File: `pages/findr/premium.tsx`, `pages/grow/premium.tsx`.

2. **BLOCKER - AuthKey credential in git**: `AuthKey_WLS9RZ2P22.p8` is tracked by git (APN auth key — private key). Revoke and regenerate immediately.

3. **BLOCKER - Findr APS environment = 'development'**: `ios/App/App/App.entitlements` has `aps-environment = development`. Must be `production` for App Store build. (Go Daisy and Grow Daisy correctly set to `production`.)

4. **HIGH - Go Daisy account deletion incomplete**: `pages/account.tsx` only deletes 3 tables client-side via anon key; does NOT call `/api/account/delete` endpoint and does NOT delete the auth user. Findr and Grow correctly use the full API endpoint.

5. **HIGH - Background location justification weak**: `NSLocationAlwaysAndWhenInUseUsageDescription` present in all three Info.plists but actual geolocation code only does foreground requests. Apple will scrutinize this.

6. **HIGH - `armv7` in UIRequiredDeviceCapabilities**: All three Info.plists declare `armv7` as required device capability. Apple has not supported armv7 since A5 chip. Use `arm64` or remove — this blocks devices and may trigger review questions.

7. **MEDIUM - No Android assetlinks.json**: App links declared with `android:autoVerify="true"` but no `/.well-known/assetlinks.json` served. App link verification will fail.

8. **MEDIUM - Grow Daisy no standalone privacy policy**: No `/pages/grow/privacy.tsx`. Grow Daisy users shown `/pages/privacy.tsx` which is shared and less specific.

9. **MEDIUM - NSMotionUsageDescription declared, no motion usage in code**: CMMotion/activity recognition not implemented in any of the three apps.

## Billing Architecture
- All apps use Stripe web checkout for premium features
- `subscription.paymentPlatform` field exists with 'web'/'ios'/'android' values
- iOS IAP path is detected in UI (`paymentPlatform === 'ios'`) but no IAP implementation exists
- Plan documented in `STRIPE_IAP_IMPLEMENTATION_PLAN.md` — RevenueCat is the planned iOS IAP library

## Tech Stack Notes for Reviews
- Capacitor hybrid: server URL points to live Vercel deployment (NOT local web assets)
- This means Apple 4.2 minimum functionality is served from server — reviewer will evaluate live site
- Service worker (next-pwa) provides offline shell capability
- AASA served with correct application/json content-type from next.config.mjs
- targetSdkVersion = 35 (Android 15) — compliant as of early 2026
- Firebase used for FCM push, FBSDKLoginKit is a transitive dep via GoogleSignIn pods (not Facebook login)

## Auth Implementation
- Sign in with Apple: implemented via `@capacitor-community/apple-sign-in`, correctly uses nonce flow
- Google Sign In: native via `@capgo/capacitor-social-login`, server-side token exchange at `/api/auth/google-token-exchange`
- Both stores require Sign in with Apple when any third-party login is offered on iOS — COMPLIANT
