# Hybrid App Conversion Checklist

**If you decide to convert to True Hybrid, follow this checklist.**

**Estimated Time:** 3-4 days
**Difficulty:** Medium
**Risk:** Low (can revert easily)

---

## ✅ **Pre-Flight Checks**

### **Verify Compatibility**

- [ ] **Check for SSR Dependencies**
  ```bash
  # Search for server-side rendering
  grep -r "getServerSideProps" pages/
  grep -r "getInitialProps" pages/

  # If found, these need to be converted to getStaticProps or client-side
  ```

- [ ] **Check for API Route Usage in Pages**
  ```bash
  # Look for relative API calls
  grep -r "fetch('/api/" pages/ components/

  # These will need absolute URLs in hybrid mode
  ```

- [ ] **Check for next/image Usage**
  ```bash
  # next/image won't work in static export
  grep -r "next/image" pages/ components/

  # Need to replace with regular <img> or use different optimization
  ```

- [ ] **Check Current Bundle Size**
  ```bash
  npm run build
  du -sh .next/static

  # Record baseline: __________ MB
  ```

---

## 📝 **Phase 1: Configuration (30 minutes)**

### **1.1 Update Next.js Config**

```javascript
// next.config.mjs
import { withSentryConfig } from '@sentry/nextjs';
import withPWA from 'next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig = {
  // ✅ ADD THIS: Enable static export for hybrid app
  output: 'export',

  // ✅ ADD THIS: Disable features that need server
  images: {
    unoptimized: true,  // Next.js Image optimization requires server
  },

  // ✅ ADD THIS: Trailing slash for static hosting
  trailingSlash: true,

  // Keep existing config
  experimental: {
    forceSwcTransforms: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // ... rest of config
};

export default nextConfig;
```

**Changes Made:**
- [ ] Added `output: 'export'`
- [ ] Added `images: { unoptimized: true }`
- [ ] Added `trailingSlash: true`

---

### **1.2 Update Capacitor Config**

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eu.fishfindr.app',
  appName: 'Findr',

  // ✅ CHANGE THIS: Point to Next.js output directory
  webDir: 'out',  // Changed from '.capacitor-assets'

  // ✅ REMOVE THIS: No longer load from remote server
  // server: {
  //   url: 'https://fishfindr.eu',
  //   cleartext: false,
  // },

  // ⚠️ DEVELOPMENT ONLY: Uncomment for local testing
  // server: {
  //   url: 'http://192.168.1.X:3000',
  //   cleartext: true,
  // },

  plugins: {
    // ... keep existing plugin config
  },
};

export default config;
```

**Changes Made:**
- [ ] Changed `webDir` to `'out'`
- [ ] Removed `server.url` (commented out)
- [ ] Added note about development server

---

### **1.3 Create Environment Variable Config**

```bash
# .env.production
# API base URL for hybrid app (absolute URLs needed)
NEXT_PUBLIC_API_URL=https://fishfindr.eu

# Optional: Different API for development
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

```bash
# .env.example (update)
# Add this section:

# === HYBRID APP CONFIGURATION ===
# Base URL for API calls (required in bundled hybrid app)
NEXT_PUBLIC_API_URL=https://fishfindr.eu
```

**Changes Made:**
- [ ] Created `.env.production` with API URL
- [ ] Updated `.env.example`

---

## 🔧 **Phase 2: Code Updates (2-3 hours)**

### **2.1 Update API Calls**

**Find all API calls:**
```bash
grep -rn "fetch('/api/" pages/ components/ lib/ hooks/
```

**Before (works in thin wrapper):**
```typescript
const response = await fetch('/api/findr/predictions', {
  method: 'POST',
  body: JSON.stringify(params),
});
```

**After (works in hybrid):**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const response = await fetch(`${API_BASE}/api/findr/predictions`, {
  method: 'POST',
  body: JSON.stringify(params),
});
```

**Files to Update:**
- [ ] `hooks/useFishingPredictions.ts`
- [ ] `pages/api/` (if called from client)
- [ ] `components/` (search for fetch calls)
- [ ] `lib/` (API wrappers)

**Helper Utility (create this):**

```typescript
// lib/utils/api-url.ts
/**
 * Get absolute API URL for hybrid app
 */
export function getApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || '';

  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${base}${cleanPath}`;
}

// Usage:
// fetch(getApiUrl('/api/findr/predictions'))
```

**Checklist:**
- [ ] Created `lib/utils/api-url.ts`
- [ ] Updated all `fetch('/api/...)` calls
- [ ] Tested API calls still work

---

### **2.2 Update next/image to Regular img**

**Find all next/image usage:**
```bash
grep -rn "next/image" pages/ components/
grep -rn "<Image" pages/ components/
```

**Before:**
```tsx
import Image from 'next/image';

<Image
  src="/PNGS/bass.png"
  alt="Bass"
  width={300}
  height={200}
  priority
/>
```

**After (Option A - Simple):**
```tsx
<img
  src="/PNGS/bass.png"
  alt="Bass"
  width={300}
  height={200}
  loading="eager"
/>
```

**After (Option B - Optimized):**
```tsx
// Use image optimizer utility
import { useOptimizedImage } from '@/hooks/useOptimizedImage';

function SpeciesCard({ slug }) {
  const imgSrc = useOptimizedImage(`/PNGS/${slug}.png`);

  return <img src={imgSrc} alt={slug} />;
}
```

**Checklist:**
- [ ] Replaced all `<Image>` with `<img>`
- [ ] Updated imports (removed `next/image`)
- [ ] Added `loading="lazy"` for below-fold images
- [ ] Tested images still load

---

### **2.3 Update Absolute Imports**

**Check tsconfig.json paths:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**These work in static export:** ✅

**No changes needed** unless you're using custom module resolution.

---

### **2.4 Handle Dynamic Routes (if any)**

**Check for dynamic routes:**
```bash
find pages -name "\[*\].tsx"
```

**Static export limitations:**
- `pages/[id].tsx` → Needs `getStaticPaths` + `getStaticProps`
- `pages/blog/[slug].tsx` → Same

**Example fix:**
```tsx
// pages/species/[slug].tsx

// Add this to generate static pages at build time
export async function getStaticPaths() {
  const species = await getAllSpecies(); // Fetch from DB or API

  return {
    paths: species.map(s => ({ params: { slug: s.slug } })),
    fallback: 'blocking',  // or false for strict
  };
}

export async function getStaticProps({ params }) {
  const species = await getSpeciesBySlug(params.slug);

  return {
    props: { species },
    revalidate: 3600,  // Revalidate every hour (ISR)
  };
}
```

**Checklist:**
- [ ] Identified dynamic routes
- [ ] Added `getStaticPaths` to each
- [ ] Added `getStaticProps` to each
- [ ] Tested build generates all pages

---

## 🏗️ **Phase 3: Build & Test (1 day)**

### **3.1 Test Static Export Locally**

```bash
# Clean previous builds
rm -rf .next out

# Build for static export
npm run build

# Check output directory
ls -lh out/

# Should see:
# - index.html
# - _next/static/...
# - api/ (empty - API routes aren't exported)
# - Other page HTML files
```

**Expected Output:**
```
Page                                       Size     First Load JS
┌ ○ /                                      5.2 kB          120 kB
├ ○ /findr                                 8.1 kB          130 kB
├ ○ /findr/auth                            3.2 kB          118 kB
└ ○ /404                                   1.8 kB          110 kB

○  (Static)  prerendered as static HTML
```

**Checklist:**
- [ ] Build completes without errors
- [ ] `out/` directory created
- [ ] All pages have HTML files
- [ ] No API routes in `out/` (expected)

---

### **3.2 Update Capacitor Sync**

```bash
# Sync Next.js build to native projects
npx cap sync

# Check what was copied
ls -lh ios/App/App/public/
ls -lh android/app/src/main/assets/public/
```

**Should see:**
- HTML files
- `_next/static/` directory
- Images from `/public`

**Checklist:**
- [ ] `npx cap sync` completed
- [ ] Files copied to iOS project
- [ ] Files copied to Android project

---

### **3.3 Test on iOS Simulator**

```bash
# Open in Xcode
npx cap open ios

# In Xcode:
# 1. Select Simulator (iPhone 14 Pro Max)
# 2. Click Run (Cmd+R)
# 3. Wait for app to launch
```

**Test Checklist:**
- [ ] App launches without internet ✅
- [ ] Home page loads instantly
- [ ] Navigation works (all pages)
- [ ] Can click around UI
- [ ] Enable Airplane Mode → App still works
- [ ] API calls work (predictions load)
- [ ] Offline cache works (toggle WiFi)
- [ ] No console errors

**Common Issues:**
- **White screen:** Check Safari Developer Tools (Develop → Simulator → Findr)
- **API calls fail:** Check `NEXT_PUBLIC_API_URL` is set
- **Images don't load:** Check paths are relative, not absolute

---

### **3.4 Test on Android Emulator**

```bash
# Open in Android Studio
npx cap open android

# In Android Studio:
# 1. Create/Start emulator (Pixel 6 API 34)
# 2. Click Run
# 3. Wait for app to launch
```

**Test Checklist:**
- [ ] App launches without internet ✅
- [ ] Same tests as iOS
- [ ] Back button works
- [ ] App restart works

---

### **3.5 Test Offline Scenarios**

**Scenario 1: Airplane Mode Start**
```
1. Close app completely
2. Enable Airplane Mode
3. Launch app
4. ✅ Should open instantly
5. ✅ Should show UI (even if data is stale)
```

**Scenario 2: Mid-Session Network Loss**
```
1. Open app (online)
2. Load predictions
3. Disable WiFi
4. Navigate to another page
5. ✅ Should still work
6. ✅ Cached predictions still visible
```

**Scenario 3: Background → Foreground**
```
1. Open app
2. Press Home (background app)
3. Wait 1 minute
4. Reopen app
5. ✅ Should resume instantly (no reload)
```

**Scenario 4: Sync Queue**
```
1. Enable Airplane Mode
2. Log a catch with photo
3. ✅ Should save to queue
4. Disable Airplane Mode
5. ✅ Should auto-sync
6. Check backend: catch logged
```

---

### **3.6 Measure Performance**

**App Size:**
```bash
# iOS
ls -lh ios/App/build/App.app
# Target: < 25 MB

# Android
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
# Target: < 30 MB
```

**Launch Time:**
- [ ] Cold start: < 1 second ✅
- [ ] Warm start: < 0.5 seconds ✅
- [ ] Compared to thin wrapper: __________ faster

**Bundle Size:**
```bash
du -sh out/
# Record: __________ MB
# Compared to baseline: __________ MB increase
```

---

## 🚀 **Phase 4: Deployment (ongoing)**

### **4.1 Update Build Scripts**

```json
// package.json
{
  "scripts": {
    // ✅ ADD: Mobile build script
    "build:mobile": "next build && npx cap sync",

    // ✅ ADD: iOS-specific
    "mobile:ios": "npm run build:mobile && npx cap open ios",
    "build:ios": "npm run build:mobile && npx cap run ios",

    // ✅ ADD: Android-specific
    "mobile:android": "npm run build:mobile && npx cap open android",
    "build:android": "npm run build:mobile && npx cap run android",

    // ✅ KEEP: Web build (separate)
    "build": "next build",
    "build:web": "next build",

    // ✅ KEEP: Vercel deployment (for API routes)
    "deploy": "vercel --prod"
  }
}
```

**Checklist:**
- [ ] Added `build:mobile` script
- [ ] Added platform-specific scripts
- [ ] Kept web build separate
- [ ] Documented in README

---

### **4.2 Update CI/CD (if applicable)**

**GitHub Actions Example:**
```yaml
# .github/workflows/mobile-build.yml
name: Build Mobile App

on:
  push:
    branches: [main]
    paths:
      - 'pages/**'
      - 'components/**'
      - 'public/**'

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:mobile
      - run: npx cap sync ios
      # Upload to TestFlight (requires secrets)

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:mobile
      - run: npx cap sync android
      # Build AAB for Play Store
```

**Checklist:**
- [ ] CI builds mobile on every commit
- [ ] Failed builds block merge
- [ ] Automatic TestFlight uploads (optional)

---

### **4.3 Update Documentation**

**README.md additions:**
```markdown
## Mobile Development

### Quick Start
\`\`\`bash
npm install
npm run build:mobile
npx cap open ios      # or android
\`\`\`

### Architecture
Findr uses a **true hybrid** approach:
- UI bundled in native app (works offline)
- API calls to production server (fishfindr.eu)
- Data cached in IndexedDB

### Build for Production
\`\`\`bash
# iOS
npm run build:mobile
npx cap open ios
# In Xcode: Product → Archive

# Android
npm run build:mobile
cd android && ./gradlew bundleRelease
\`\`\`

### Deployment
1. Build Next.js: \`npm run build\`
2. Deploy to Vercel: \`npm run deploy\` (for API routes)
3. Sync to native: \`npx cap sync\`
4. Build native apps (Xcode/Android Studio)
5. Submit to App Store / Play Store
```

**Checklist:**
- [ ] Updated README with mobile instructions
- [ ] Documented build process
- [ ] Explained architecture decision
- [ ] Added troubleshooting section

---

## 🔄 **Rollback Plan (If Things Go Wrong)**

### **Revert to Thin Wrapper:**

```bash
# 1. Revert Next.js config
git checkout HEAD -- next.config.mjs

# 2. Revert Capacitor config
git checkout HEAD -- capacitor.config.ts

# 3. Recreate .capacitor-assets
mkdir -p .capacitor-assets
cat > .capacitor-assets/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Findr</title>
  <style>body { background: #111827; color: white; }</style>
</head>
<body>
  <div>Loading...</div>
  <script>window.location.href = 'https://fishfindr.eu';</script>
</body>
</html>
EOF

# 4. Revert API calls
git checkout HEAD -- hooks/useFishingPredictions.ts
# (and other files with API calls)

# 5. Sync and test
npx cap sync
npx cap run ios
```

**Rollback Time:** 30 minutes

---

## 📊 **Success Criteria**

### **Before Approving Hybrid:**

- [ ] ✅ App launches offline (no internet needed)
- [ ] ✅ All pages work offline
- [ ] ✅ Navigation is instant
- [ ] ✅ API calls work when online
- [ ] ✅ Offline cache works (predictions, catches)
- [ ] ✅ Sync queue works (offline → online)
- [ ] ✅ App size < 25 MB (iOS) / 30 MB (Android)
- [ ] ✅ No console errors
- [ ] ✅ No crashes during 10 min usage
- [ ] ✅ Background/foreground works
- [ ] ✅ Memory usage acceptable (< 100 MB idle)

### **Performance Benchmarks:**

| Metric | Thin Wrapper | True Hybrid | Target |
|--------|-------------|-------------|--------|
| Cold start | 2-3 sec | < 1 sec | ✅ Faster |
| Warm start | 1-2 sec | < 0.5 sec | ✅ Faster |
| Page navigation | 0.5 sec | 0.1 sec | ✅ Faster |
| Offline capable | ⚠️ Partial | ✅ Full | ✅ Improved |
| App size | 5 MB | 15-20 MB | ⚠️ Larger |
| Update speed | Instant | 1-7 days | ❌ Slower |

---

## 🎯 **Final Checks Before Production**

- [ ] Tested on iOS 15, 16, 17
- [ ] Tested on Android 12, 13, 14
- [ ] Tested on physical iPhone
- [ ] Tested on physical Android device
- [ ] Tested all permission flows
- [ ] Tested airplane mode extensively
- [ ] Tested poor/intermittent connection
- [ ] Memory leak test (30 min usage, check profiler)
- [ ] Battery drain test (1 hour usage, should be < 5%)
- [ ] TestFlight beta with 10+ users
- [ ] Internal testing beta with 5+ users
- [ ] All feedback addressed

---

## ✅ **Completion**

**When all checkboxes are complete:**

- [ ] Update `ARCHITECTURE_DECISION_THIN_VS_HYBRID.md` with decision
- [ ] Commit changes with clear message
- [ ] Create tag: `v1.0.0-hybrid`
- [ ] Deploy to TestFlight and Play Console internal testing
- [ ] Collect user feedback for 1 week
- [ ] If successful, submit to App Store and Play Store

**Congratulations! You've converted to a true hybrid app.** 🎉

---

**Time Tracking:**

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1: Configuration | 30 min | _____ | |
| Phase 2: Code Updates | 2-3 hours | _____ | |
| Phase 3: Build & Test | 1 day | _____ | |
| Phase 4: Deployment | 1 day | _____ | |
| **Total** | **3-4 days** | **_____** | |

**Conversion Date:** _________________

**Approved By:** _________________
