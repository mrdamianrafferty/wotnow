# Platform Audit — February 2026
## All Three Apps (Findr, Go Daisy, Grow Daisy)

Full findings from comprehensive audit conducted 2026-02-26.

---

## BLOCKERS

### B1: Apple IAP Required for In-App Purchases on iOS
- Apps: Findr, Grow Daisy (both have premium tiers)
- Guideline: App Store Review Guideline 3.1.1 — In-App Purchase
- Current state: Stripe Checkout web session used for all premium purchases. `pages/findr/premium.tsx` and `pages/grow/premium.tsx` call `/api/stripe/create-checkout-session` then redirect to Stripe's hosted checkout. No platform detection, no StoreKit/RevenueCat.
- The account page acknowledges `paymentPlatform === 'ios'` path exists but there is no IAP implementation at all (`lib/iap/` directory does not exist).
- Fix: Implement RevenueCat (as documented in `STRIPE_IAP_IMPLEMENTATION_PLAN.md`) for iOS. On iOS, `mustUseIAP()` must return true and redirect to StoreKit sheet. Web Stripe checkout must only be shown on web/Android.

### B2: APN Auth Key Private Key Committed to Git
- Apps: All three (shared key)
- File: `AuthKey_WLS9RZ2P22.p8` is tracked in git (`git ls-files` confirms)
- This is the private key for APNs push notification authentication. If this repo is ever pushed to a remote, the key is compromised.
- Fix: IMMEDIATELY: (1) Revoke `AuthKey_WLS9RZ2P22.p8` in Apple Developer portal, (2) Generate new key, (3) Update push notification configuration, (4) Add `*.p8` to `.gitignore`, (5) Remove from git history with `git filter-repo` or BFG.

### B3: Findr iOS Entitlement has APS Environment = 'development'
- App: Findr only
- File: `ios/App/App/App.entitlements` line 6: `<string>development</string>`
- An App Store binary MUST have `aps-environment = production`. A development entitlement submitted to App Store Connect will fail binary validation or cause silent push notification failures post-approval.
- Fix: Change to `<string>production</string>` in `ios/App/App/App.entitlements`. Go Daisy and Grow Daisy already correctly set to `production`.

---

## HIGH RISK

### H1: Go Daisy Account Deletion is Incomplete
- App: Go Daisy
- Guideline: App Store Review Guideline 5.1.1(v) — Account Deletion
- Current state: `pages/account.tsx` `handleDeleteAccount` function only deletes 3 tables (profiles, user_location_preferences, user_favourites) via the client-side anon key, then calls `supabase.auth.signOut()`. It does NOT call `supabase.auth.admin.deleteUser()` — meaning the auth record persists in Supabase. It also misses many data tables that the full API endpoint deletes (grow_garden_photos, grow_user_plants, findr_catch_entries, user_push_tokens, subscriptions, notification_log, etc.).
- Findr and Grow Daisy both correctly call `DELETE /api/account/delete` which uses the service role client and calls `auth.admin.deleteUser()`.
- Fix: Replace `handleDeleteAccount` in `pages/account.tsx` to call `/api/account/delete` via fetch (same pattern as Findr `pages/findr/settings.tsx` and Grow Daisy `components/grow/SettingsPage.tsx`).

### H2: Background Location Justification is Weak / Not Actually Used
- Apps: All three
- Guideline: App Store Review Guideline 5.1.1 — Data Collection and Storage; Apple HIG Location
- Current state: All three Info.plists declare `NSLocationAlwaysAndWhenInUseUsageDescription`. However, `lib/capacitor/geolocation.ts` only calls `getCurrentPosition()` and `watchPosition()` — both foreground-only patterns. The background modes include `fetch` and `processing` but no background location tracking code exists.
- Apple reviews background location with extreme scrutiny. Declaring it without using it (or using it without demonstrable user benefit) leads to rejection.
- Fix: Either (a) remove `NSLocationAlwaysAndWhenInUseUsageDescription` if background location is not truly needed, or (b) implement and document the specific user benefit for background location access (e.g., "background location used to deliver fishing condition alerts when app is closed").

### H3: `armv7` in UIRequiredDeviceCapabilities — Incorrect
- Apps: All three
- Files: All three Info.plist files, line 37: `<string>armv7</string>`
- armv7 was the 32-bit ARM architecture used in iPhone 3GS through iPhone 5. Apple's current minimum is iPhone 6s (A9 chip, arm64). Declaring `armv7` as a required capability is misleading and may unnecessarily restrict app availability on some older devices that aren't supported anyway, or confuse App Review.
- Fix: Change to `<string>arm64</string>` or remove the `UIRequiredDeviceCapabilities` key entirely (Capacitor's default is fine without it for modern apps). The `armv7` value is almost certainly an artifact from old Capacitor templates.

### H4: NSMotionUsageDescription Declared But Motion Not Used
- Apps: All three
- Files: All three Info.plists
- Purpose strings describe activity/motion detection ("detect whether you are fishing from a boat or shore", "understand if you are stationary or travelling"). However, no code in `lib/capacitor/` or any page uses `CoreMotion`, CMMotionActivityManager, or any equivalent.
- Apple specifically flags unused permission declarations as grounds for rejection under Guideline 5.1.1.
- Fix: Remove `NSMotionUsageDescription` from all three Info.plists until the motion feature is actually implemented.

### H5: Missing Android App Links assetlinks.json
- Apps: All three (Android)
- Guideline: Google Play — App Links
- Current state: All three Android manifests declare `android:autoVerify="true"` for https deep links (godaisy.io, fishfindr.eu, grow.godaisy.io). Android verifies these at install time by fetching `https://[domain]/.well-known/assetlinks.json`. No assetlinks.json file exists in the public directory. This means App Links verification will fail silently — deep links from emails/browsers will fall through to browser rather than opening the app.
- Fix: Create `public/.well-known/assetlinks.json` for each domain, e.g.:
```json
[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"eu.fishfindr.app","sha256_cert_fingerprints":["<CERT_FINGERPRINT>"]}}]
```
Serve it with correct Content-Type from next.config.mjs headers (same as AASA).

### H6: Go Daisy Account Deletion Also Missing from Grow Daisy Reference
- The Grow Daisy `SettingsPage.tsx` calls `/api/account/delete` correctly. However, the shared `pages/account.tsx` (Go Daisy's account page) uses the broken client-side path. This inconsistency means Go Daisy users won't have their auth records deleted — a clear compliance gap.

### H7: Facebook SDK Pods Appear as Transitive Dependency (IDFA Risk)
- App: Findr (ios/ project)
- `FBSDKCoreKit`, `FBSDKLoginKit` appear in the Findr iOS Pods directory. These are transitive dependencies of `@capgo/capacitor-social-login` or `GoogleSignIn`. Even if Facebook Sign-In is not enabled, their presence can trigger App Review questions about IDFA usage (Facebook SDK historically accesses IDFA).
- No `NSUserTrackingUsageDescription` is declared in any Info.plist, which is correct if IDFA is not used. But if the FBSDK attempts to read IDFA at runtime without the ATT prompt, Apple will reject the app.
- Fix: Verify the FBSDK does not access IDFA. If it does, either (a) add `NSUserTrackingUsageDescription` and present the ATT prompt, or (b) configure the Facebook SDK to not use IDFA (via `setAdvertiserTrackingEnabled(false)`), or (c) find an alternative Google Sign-In pod that doesn't pull in FBSDK transitively.

---

## MEDIUM RISK

### M1: Grow Daisy Has No Standalone Privacy Policy
- App: Grow Daisy
- Users are directed to `/privacy` which is a shared policy covering all three apps. There is no `/grow/privacy` page.
- Apple and Google both require an accessible, app-specific privacy policy URL. A generic multi-app policy page is usually acceptable, but for Play Store Data Safety section submission, you need a URL to point to.
- Fix: Ensure the shared `/privacy` policy URL (e.g., `https://grow.godaisy.io/privacy` or `https://godaisy.io/privacy`) is clearly documented in store listings. Consider adding a brief intro line to the shared policy clarifying it applies to Grow Daisy.

### M2: Privacy Policy Missing Stripe as Third-Party Service
- App: All three (but Findr and Grow Daisy have premium tiers that use Stripe)
- The shared privacy policy (`pages/privacy.tsx`) lists Supabase, Google Maps, Copernicus, OpenWeather, and Resend — but NOT Stripe, which processes payment card data.
- Fix: Add Stripe to the third-party services list with a note that it processes payment information under its own privacy policy.

### M3: Terms of Service Not Linked In-App (Grow Daisy)
- App: Grow Daisy specifically
- The Findr app has a footer with links to privacy and terms. Go Daisy has a footer. Grow Daisy's settings page does not appear to link to Terms or Privacy Policy from within the app itself.
- Apple reviewers may look for these links in the settings/account section.
- Fix: Add links to `/privacy` and `/terms` (or the shared equivalents) in Grow Daisy's settings screen.

### M4: `fetch` Background Mode May Require Justification
- Apps: All three
- All three Info.plists declare `fetch` in `UIBackgroundModes`. Apple requires apps to actually implement `application(_:performFetchWithCompletionHandler:)` to use this background mode. In a Capacitor app, background fetch is not natively wired unless explicitly implemented in AppDelegate/native code.
- Apple may ask what background fetch is used for. If the answer is "it's in the template", reviewers may require its removal.
- Fix: Verify whether background fetch is implemented in any native Swift/ObjC code. If not, remove `fetch` from UIBackgroundModes. Keep `remote-notification` (needed for push) and `processing` if BGTaskScheduler is used.

### M5: AASA Only Covers `/auth/callback` Paths — Findr Deep Links Missing
- App: Findr
- The `apple-app-site-association` file only routes `/auth/callback` and `/auth/callback/*` to the Findr app. Any other deep links (e.g., species pages `/findr/species/123`, catch log entries) that might be shared via the app's share feature won't open in the app.
- Fix: Review all shareable content in Findr and add relevant paths to the AASA.

### M6: Google Token Exchange Leaks Error Details to Client
- File: `pages/api/auth/google-token-exchange.ts` line 70
- On failure, `errorData` from the Google token endpoint (which may contain client_secret-related error info) is forwarded directly to the client: `return res.status(tokenResponse.status).json({ error: 'Token exchange failed', details: errorData })`.
- Fix: Log `errorData` server-side but return only a generic error message to the client.

### M7: `NSUserNotificationsUsageDescription` Is Not a Real iOS Key
- Apps: All three
- Files: All three Info.plists have `NSUserNotificationsUsageDescription`. This key does not exist in Apple's InfoPlist key catalog. It has no effect. The correct key (for UNUserNotificationCenter) is `NSUserNotificationUsageDescription` (without the 's') but even that is not an official key since iOS 10 — push notification permissions are requested via UNUserNotificationCenter.requestAuthorization() in code and do not require an Info.plist key.
- This is harmless but indicates the template was from an older source. It won't cause rejection but is dead configuration.

---

## RECOMMENDATIONS

### R1: Implement GDPR Consent Management Platform (CMP) for EU Advertising
- Both stores require apps targeting EU users to show a proper consent management UI if using analytics/advertising SDKs. The current cookie consent banner is localStorage-only and does not use a TCF-compliant CMP.
- If any analytics (Sentry, etc.) are enabled, consider integrating a lightweight CMP.

### R2: Add `NSUserTrackingUsageDescription` Proactively
- Even without current IDFA usage, the Facebook SDK transitive dependency and future analytics additions make this worth declaring now. Declare the key and present the ATT prompt at an appropriate moment if analytics are added.

### R3: Android Manifest Missing `tools:` Namespace in `android-godaisy` and `android-growdaisy`
- `android/app/src/main/AndroidManifest.xml` (shared) has `xmlns:tools` and uses `tools:node="remove"` to strip advertising permissions. The `android-godaisy` and `android-growdaisy` manifests lack this namespace and do not strip these permissions.
- Depending on which manifest is used for each flavor build, the advertising ID permission might sneak in.

### R4: Accessibility — Color Contrast and Dynamic Type
- Apple HIG and Google Material both recommend minimum 4.5:1 contrast ratio for normal text. Apps using DaisyUI dark themes should be audited with a tool like axe-core or Lighthouse accessibility audit.
- For iOS, verify VoiceOver works on key interactive elements (fish cards, prediction scores, premium upgrade CTAs).

### R5: Store Listing Screenshots Should Show Native UI
- Capacitor apps showing a WebView should have screenshots that demonstrate the value proposition clearly. Apple reviewers will scrutinize whether the app provides meaningful native functionality beyond a browser experience.
- Ensure screenshots show the app's unique features: fishing predictions, garden planning, activity windows — not just generic web UI.
