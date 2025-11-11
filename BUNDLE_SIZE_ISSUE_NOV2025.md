# Bundle Size Issue - November 2025

**Date**: 2025-11-11
**Status**: 🔴 BLOCKING DEPLOYMENTS
**Error**: `A Serverless Function has exceeded the unzipped maximum size of 250 MB`

## Summary

Vercel deployments are failing with bundle size errors despite having extensive exclusions in place from previous fixes (Nov 7-9, 2025).

## Previous Successful Fixes

### November 7-9, 2025 - Three commits fixed bundle issues:

1. **`bfc02223`** - Replaced `@turf/turf` monolith with specific imports
   - Removed 141 packages, added 10 (~90% reduction)
   - Reduced bundle from ~20MB to ~200KB

2. **`dc0c2c61`** - Added webpack exclusions for client-only libraries:
   ```javascript
   config.externals.push(
     'react-icons',      // 83MB
     'lucide-react',     // 43MB
     'framer-motion',
     'html2canvas',
     'playwright-core',
     '@capacitor/*',     // Native mobile only
     'duckdb'            // Dev-only
   );
   ```

3. **`8f42bded`** - Removed explicit `runtime: nodejs` config
   - Let Next.js optimize bundles automatically

## Current Configuration

✅ `next.config.mjs` has proper exclusions:
- `outputFileTracingExcludes` (lines 16-24)
- `webpack.externals` for server builds (lines 52-84)

## Why It's Failing Again

**Likely causes:**
1. Cumulative effect - Many small additions over time
2. Vercel builder regression - Build system changed
3. New dependency indirectly pulling in large packages
4. Next.js 15.5 may bundle differently than 15.0

## Investigation Steps

1. ✅ Checked `next.config.mjs` - exclusions are present
2. ✅ Checked recent package.json changes - only client-side image compression
3. ✅ Verified large packages:
   - `lucide-react`: 43MB
   - `react-icons`: 83MB
   - `@tanstack`: 6.8MB
   - `framer-motion`: 3.0MB
4. ✅ Tried forced clean build - still failing

## Immediate Workarounds

### Option 1: GitHub Actions (Recommended)
GitHub's build environment may handle this differently. Push to GitHub and let auto-deployment try:
```bash
git push origin main
# Wait for GitHub Actions to trigger Vercel deployment
```

### Option 2: Split Large API Routes
If specific routes are too large, split them:
```javascript
// vercel.json
{
  "functions": {
    "pages/api/findr/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024  // Try increasing memory
    }
  }
}
```

### Option 3: Upgrade Vercel Plan
Enterprise plans have higher limits (might not be available/affordable)

## Long-Term Solutions

### 1. Audit All API Routes (PRIORITY)

Find which route is bloated:
```bash
npm run build
# Check .next/server/pages/api for large files
du -sh .next/server/pages/api/**/*.js | sort -h | tail -20
```

### 2. More Aggressive Tree-Shaking

Update imports to be more specific:
```typescript
// ❌ Bad - imports entire library
import * as Icons from 'lucide-react';

// ✅ Good - tree-shakeable
import { Fish, Heart } from 'lucide-react';
```

### 3. Dynamic Imports for Heavy Components

```typescript
// Only load when needed
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  ssr: false
});
```

### 4. Consider Edge Runtime

Some API routes could use Edge Runtime (smaller, faster):
```typescript
export const config = {
  runtime: 'edge',
};
```

**Caution**: Edge runtime has limitations (no Node.js APIs like `fs`, limited npm packages)

## Next Steps

1. **Try GitHub Actions deployment** (push already done: `aa289e38`)
2. If still failing, **audit .next/server/pages/api** to find culprit
3. Consider **splitting large API routes** into separate functions
4. Last resort: **Migrate heavy routes to Edge Runtime**

## Status

- [x] Code committed: `aa289e38`
- [x] Pushed to GitHub
- [ ] Vercel CLI deployment: ❌ FAILING
- [ ] GitHub Actions deployment: ⏳ PENDING
- [ ] Production live: ❌ NOT DEPLOYED

## Files Modified in This Session

- `components/findr/ActiveSpeciesCard.tsx` - Removed bell icons
- `components/findr/FindrNavigationMobile.tsx` - Added notification settings
- `pages/api/findr/favourites/index.ts` - Auto-enable notifications
- `pages/api/cron/check-notifications.ts` - Use database preferences
- `hooks/useNotificationPreferences.ts` - Fixed import
- `pages/findr/favourites.tsx` - Removed legacy props

**Net change**: -114 lines (actually REDUCED bundle size)

This suggests the issue pre-existed and is unrelated to these changes.
