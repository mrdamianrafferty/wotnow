# Mobile Experience Architect - Memory

## Project: WotNow (Go Daisy + Grow Daisy + Findr)

### Architecture
- Next.js 15.5 Pages Router, Tailwind 4 + DaisyUI 5, Framer Motion
- Three apps: Go Daisy (/), Grow Daisy (/grow), Findr (/findr)
- Capacitor 7.x wrapping strategy for native iOS/Android
- PWA via next-pwa (Workbox), service worker at /public/sw.js
- Safe area: capacitor-plugin-safe-area + CSS custom props + env() fallback

### Key Mobile Files
- `pages/_app.tsx` - Viewport meta, manifest injection, safe area init, PullToRefresh wrapper
- `pages/_document.tsx` - Preconnect hints, apple-touch-icon, apple-mobile-web-app-* meta
- `components/BottomNav.tsx` - Go Daisy bottom nav (md:hidden, h-16, safe-area-inset-bottom class - BROKEN class name)
- `components/grow/GrowBottomNav.tsx` - Grow Daisy bottom nav (min-h-[48px] items, safe-area-bottom class - CORRECT)
- `lib/capacitor/` - Platform, haptics, geolocation, notifications, safeArea, camera wrappers
- `styles/index.css` lines 2039-2065 - Safe area CSS classes
- `next.config.mjs` - PWA config (CacheFirst for /findr, StaleWhileRevalidate general)
- `worker/index.js` - Custom push notification service worker

### Manifests
- `public/manifest.json` - Findr (scope: /findr)
- `public/manifest-godaisy.json` - Go Daisy (scope: /)
- `public/manifest-growdaisy.json` - Grow Daisy (scope: /grow)
- Manifest served dynamically in _app.tsx based on isFindr flag. **MISSING**: Grow Daisy never gets manifest-growdaisy.json served

### Capacitor Configs
- `capacitor.config.ts` - Go Daisy (appId: io.godaisy.app, server: godaisy.io)
- `capacitor.config.growdaisy.ts` - Grow Daisy (appId: io.growdaisy.app, server: grow.godaisy.io)
- `capacitor.config.findr.ts` - Findr (appId: eu.fishfindr.app, server: fishfindr.eu/findr)
- All three in repo, active config is capacitor.config.ts

### Critical Issues Found (2026-02-26)
- BottomNav.tsx uses `safe-area-inset-bottom` class which is NOT defined in CSS (defined: `safe-area-bottom`)
- _app.tsx only switches manifest between Findr and Go Daisy - Grow Daisy /grow routes never get manifest-growdaisy.json
- Go Daisy BottomNav.tsx `h-16` bar has no safe-area padding on bottom (iOS home indicator overlaps)
- iOS entitlements use `aps-environment: development` in both Go Daisy and Grow Daisy - must change to `production` before App Store
- Screenshot assets referenced in manifest.json (/screenshots/findr-mobile.png) do not exist
- Shortcut icons referenced in manifests (/icons/shortcut-predictions.png etc) mostly missing (only shortcut-today.png exists)
- next/font disabled (commented out) - Roboto loaded via fontFamily string in _app.tsx instead
- Go Daisy `pages/index.tsx` has no `pb-24 md:pb-0` bottom padding pattern for BottomNav clearance
- Raw `<img>` tags used in GardenPage.tsx (3 instances), AddPlantDialog.tsx, multiple Findr components
- Form autocomplete attributes missing in AuthPage.tsx inputs

### Safe Area Pattern (Correct)
```css
/* styles/index.css */
.safe-area-bottom { padding-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)); }
.safe-area-top { padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px)); }
```
Use `safe-area-bottom` (not `safe-area-inset-bottom`) in JSX className

### Bottom Nav Bottom Padding Pattern (Correct - GrowExperience.tsx)
`<main className="container mx-auto px-4 py-8 pb-24 md:pb-8">`

See `patterns.md` for detailed findings.
