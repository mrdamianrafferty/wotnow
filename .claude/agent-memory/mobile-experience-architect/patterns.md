# Mobile Patterns & Findings

## PWA Configuration
- next-pwa with Workbox, enabled via NEXT_PUBLIC_ENABLE_PWA=true (disabled in dev by NODE_ENV check)
- Findr pages use CacheFirst (7 days), predictions API CacheFirst (6h), good for offline fishing
- Go Daisy and Grow Daisy pages use StaleWhileRevalidate (general fallback) - no dedicated offline cache
- cacheId: '20260103-findr-offline-optimized' - update when making cache strategy changes
- No screenshots directory exists for manifests - /screenshots/findr-mobile.png is a 404

## Viewport & Meta
- Correct: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`
- Set in pages/_app.tsx inside Head, not _document.tsx
- apple-mobile-web-app-status-bar-style is "default" - this is fine for light mode apps
- theme-color is hardcoded #111827 in _app.tsx (dark) regardless of app context - wrong for Grow Daisy (should be #10b981)

## Safe Area Implementation
- Plugin: capacitor-plugin-safe-area v4.0.3
- Initialization: lib/capacitor/safeArea.ts, called in _app.tsx useEffect
- Sets CSS custom properties: --safe-area-inset-top/bottom/left/right
- CSS classes: .safe-area-top, .safe-area-bottom, .safe-bottom (aliases)
- Grow Daisy: GrowExperience.tsx uses `pt-[env(safe-area-inset-top)]` inline - correct
- Go Daisy BottomNav: Uses `safe-area-inset-bottom` CLASS which does NOT exist. Should be `safe-area-bottom`

## Bottom Navigation
### Go Daisy BottomNav.tsx
- Height: h-16 (64px) - adequate
- Touch targets: Each button takes flex-1 of h-16 = ~64px height, width = 25% of screen - OK
- Safe area: BROKEN - uses `safe-area-inset-bottom` class that doesn't exist in CSS
- The nav height itself is h-16 but bottom of nav doesn't pad for home indicator
- Pages need pb-16 or pb-24 to clear the nav

### Grow Daisy GrowBottomNav.tsx
- Uses Link (semantic, correct) vs BottomNav using button+router.push
- min-h-[48px] per item - meets 44px minimum
- safe-area-bottom class - CORRECT
- Scale animation on active: motion-safe:scale-110 - good reduced-motion support
- 5 items in nav - at the maximum for thumb reach

## Touch Targets
- GrowBottomNav: min-h-[48px] min-w-[60px] - PASSES
- BottomNav: h-full flex-1 within h-16 container - effectively 64px height - PASSES width-wise
- PullToRefresh indicator: w-10 h-10 (40px) - technically BELOW 44px minimum
- Homepage task card buttons need audit

## Page Bottom Padding (Content Clearance for BottomNav)
- GrowExperience.tsx main: `pb-24 md:pb-8` - CORRECT (clears 64px nav + safe area)
- Findr pages: pb-16 (64px) - only clears nav height, no safe area buffer
- Go Daisy index.tsx: unclear, needs audit
- Pattern to use: `pb-24 md:pb-0` (or `pb-24 md:pb-8` if desktop footer exists)

## Haptics
- Full haptics system: lib/capacitor/haptics.ts
- Covers: light/medium/heavy impact, success/warning/error notification, selection
- User-controllable via localStorage 'haptics_enabled'
- Web fallback: navigator.vibrate (limited iOS support)
- uiHaptics exported - specific actions defined (buttonPress, favorite, pullToRefresh etc)
- Unclear how widely haptics are actually called in UI components - needs audit

## Fonts
- next/font is DISABLED (commented out, Vercel build issue)
- fontFamily set via style attribute in _app.tsx: 'Roboto, system-ui, -apple-system, Segoe UI, sans-serif'
- This means Roboto is NOT preloaded - relies on system font until Roboto loads from CDN
- Impact: FOUT (Flash of Unstyled Text) on first load, potential CLS
- Fix: Re-enable next/font with display:'swap' and variable assignment

## Image Optimization
- next/image used throughout GardenPage.tsx, index.tsx - good
- Raw <img> found in: GardenPage.tsx (3x - lines ~2271, 2479, 2677), AddPlantDialog.tsx (1113)
- Findr: RecentCatchesWidget.tsx, QuickLogModal.tsx, TrophyPhotoCarousel.tsx use raw img
- next.config.mjs: formats ['image/webp', 'image/avif'] - good
- deviceSizes: 400-3840 with custom small breakpoints - mobile-considerate

## Service Worker / Offline
- Custom worker/index.js handles push notifications
- Offline fallback page: /_offline (referenced but not verified to exist)
- No dedicated go-daisy API caching strategy - uses generic /api/ StaleWhileRevalidate
- No dedicated grow-daisy content/API caching
- Findr has best offline story (CacheFirst pages + predictions)

## Native App Readiness
### iOS
- 3 iOS directories: ios/ (legacy?), ios-godaisy/, ios-growdaisy/
- Info.plist: NSLocation, NSCamera, NSPhotoLibrary, NSUserNotifications, NSMotion all present with good descriptions
- App.entitlements: aps-environment = "development" in BOTH go daisy AND grow daisy
  - MUST change to "production" before App Store submission
- AASA file exists at public/.well-known/apple-app-site-association - covers all 3 apps
- Universal links only cover /auth/callback paths (plus /grow/* for Grow Daisy)
- Google Sign-in: @capgo/capacitor-social-login + lib/auth/googleNative.ts - well implemented
- Apple Sign-in: @capacitor-community/apple-sign-in in package.json

### Android
- 3 Android directories: android/ (likely Findr), android-godaisy/, android-growdaisy/
- Keystores present: findr-upload.keystore, godaisy-upload.keystore, growdaisy-upload.keystore

## Push Notifications
- Web Push: web-push npm package, custom service worker handles push events
- Native: @capacitor/push-notifications + lib/capacitor/notifications.ts
- worker/index.js: vibrate: [200, 100, 200] pattern included - good
- PushNotifications config in capacitor configs: presentationOptions ['badge', 'sound', 'alert']
- LocalNotifications for Grow Daisy garden reminders - configured

## Forms & Input
- AuthPage.tsx: email and password type attributes present
- Missing autocomplete attributes (email="email", current-password/new-password)
- No explicit inputmode attributes found
- Input component from shadcn/ui - likely inherits text-sm which may be 14px - iOS zoom risk

## Manifest Issues
- Findr manifest.json: screenshot /screenshots/findr-mobile.png - file does NOT exist
- All manifests: shortcut icons mostly missing (/icons/shortcut-predictions.png etc - only shortcut-today.png exists)
- `purpose: "any maskable"` on single icon declaration is WRONG - should be separate entries
- Grow Daisy manifest never served - _app.tsx only switches between Findr and Go Daisy manifests
- theme-color in _app.tsx global meta is #111827 (dark) - conflicts with Grow Daisy green theme
