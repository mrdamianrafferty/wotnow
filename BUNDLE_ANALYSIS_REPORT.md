# Bundle Analysis Report
**Date**: 2025-10-18
**Tool**: @next/bundle-analyzer
**Target**: Findr pages (LCP optimization)

## Executive Summary

### Key Findings:
1. **Shared bundles are heavy**: 207KB baseline JS on all pages
2. **Main Findr page**: 606KB total JS (207KB shared + 399KB page-specific)
3. **Framer Motion**: ~120KB chunk (945-*.js) - Used for animations
4. **Framework overhead**: 140KB React/Next.js baseline
5. **Good news**: No obvious bloat from unused libraries

---

## Bundle Size Breakdown

### Shared Across All Pages (207KB):
```
framework-b9fd9bcc3ecde907.js    140KB  (React + Next.js)
main-0cb7e5290005abda.js         124KB  (App entry point)
_app-68109f545c004e5d.js          70KB  (App wrapper with contexts)
CSS                               54KB  (Tailwind + DaisyUI)
```

### Findr Main Page Specific (399KB):
```
findr-71348a33c0e97b38.js        131KB  (Page component)
945-63a5414de1ed7bcb.js          117KB  (Framer Motion animations)
3936-ef29371ea26fd0b4.js          17KB  (TanStack Query)
1488-d81d0ddd4b0b72c2.js          16KB  (React Query DevTools?)
7923-fb671393009fdfa2.js          18KB  (Unknown chunk)
984-329f42b0b12eabbf.js           11KB  (Unknown chunk)
9393-a234e175cec23f37.js          10KB  (Unknown chunk)
8695-10af40216ee51262.js           6KB  (Unknown chunk)
4587-a775de1a9b29639a.js          10KB  (Unknown chunk)
8230-50ab02359d650f34.js           6KB  (Supabase client)
```

---

## 🎯 Optimization Opportunities

### HIGH IMPACT (Reduce bundle by ~100KB)

#### 1. **Lazy Load Framer Motion** (Save ~117KB on initial load)
**Current**: Framer Motion loads upfront for swipeable cards
**Improvement**: Only load when user interacts with cards

**Before**:
```tsx
import { motion, AnimatePresence } from 'framer-motion';
```

**After**:
```tsx
import dynamic from 'next/dynamic';

const MotionComponents = dynamic(() =>
  import('framer-motion').then(mod => ({
    motion: mod.motion,
    AnimatePresence: mod.AnimatePresence
  })),
  { ssr: false }
);
```

**Impact**: First paint happens ~117KB lighter, animations load on-demand

#### 2. **Optimize React Query** (Save ~15-20KB)
**Issue**: May be including DevTools or unused features

**Actions**:
- Check if DevTools bundled in production
- Use tree-shakeable imports

**Current**:
```tsx
import { useQuery } from '@tanstack/react-query';
```

**Better**:
```tsx
import { useQuery } from '@tanstack/react-query/build/modern/useQuery';
```

---

### MEDIUM IMPACT (Reduce bundle by ~30-50KB)

#### 3. **Code Split Large Components** (Save ~30KB)
Move heavy components to dynamic imports:

```tsx
// FishSpeciesModal - Only loads when modal opens
const FishSpeciesModal = dynamic(() =>
  import('@/components/findr/FishSpeciesModal'),
  { ssr: false }
);

// FindrModal - Only loads when needed
const FindrModal = dynamic(() =>
  import('@/components/findr/Modal'),
  { ssr: false }
);
```

#### 4. **Optimize Date Libraries** (Save ~10KB)
**Current**: date-fns may not be tree-shaken properly

**Check imports**:
```bash
grep -r "from 'date-fns'" --include="*.ts" --include="*.tsx"
```

**Ensure**:
```tsx
// Good (tree-shakeable)
import { format, addDays } from 'date-fns';

// Bad (imports everything)
import * as dateFns from 'date-fns';
```

#### 5. **Remove xml2js from Client Bundle** (Save ~10KB)
xml2js is only needed server-side (for tide data XML parsing)

**Verify it's not in client bundle**: Check if 25f4ac2a chunk contains xml2js

---

### LOW IMPACT (Polish)

#### 6. **Minify Custom Code Better**
The `findr-*.js` file is 131KB - review for:
- Console.log statements in production
- Unused imports
- Dead code paths

#### 7. **Split Vendor Chunks**
Currently all vendors in one chunk. Consider splitting:
```js
webpack: (config) => {
  config.optimization.splitChunks = {
    cacheGroups: {
      supabase: {
        test: /[\\/]node_modules[\\/]@supabase[\\/]/,
        name: 'supabase',
        chunks: 'all',
      },
      reactQuery: {
        test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
        name: 'react-query',
        chunks: 'all',
      },
    },
  };
  return config;
}
```

---

## 📊 Expected Improvements

| Optimization | Savings | Effort | Priority |
|-------------|---------|--------|----------|
| Lazy load Framer Motion | 117KB | 2h | 🔴 HIGH |
| Optimize React Query | 20KB | 30min | 🔴 HIGH |
| Code split modals | 30KB | 1h | 🟡 MEDIUM |
| Optimize date-fns | 10KB | 30min | 🟡 MEDIUM |
| Remove xml2js from client | 10KB | 30min | 🟡 MEDIUM |

**Total Potential Savings**: ~187KB (31% reduction)

---

## 🚀 Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. Lazy load Framer Motion
2. Optimize React Query imports
3. Verify xml2js not in client bundle

**Expected**: 606KB → 470KB (22% reduction)

### Phase 2: Code Splitting (2-3 hours)
1. Dynamic imports for modals
2. Dynamic imports for heavy components
3. Optimize date-fns imports

**Expected**: 470KB → 420KB (additional 11% reduction)

### Phase 3: Advanced (Optional)
1. Vendor chunk splitting
2. Remove dead code
3. Review all imports for tree-shaking

---

## 🎯 LCP Impact

**Current LCP**: 5.0s
**Bundle contribution to LCP**: ~1.5-2.0s (time to download + parse JS)

**After optimizations**:
- 187KB less JS = ~0.5-0.7s faster on 3G
- Less main-thread blocking = ~0.3-0.4s faster TTI
- **Estimated LCP improvement**: 5.0s → 4.0-4.2s

**Note**: To reach <2.5s target, we'll still need image optimizations + API improvements.

---

## 📝 Next Steps

1. **Implement Phase 1** (lazy load Framer Motion + React Query optimization)
2. **Re-run Lighthouse** to measure improvement
3. **Convert remaining images** to Next.js Image component
4. **Optimize API response time** (caching, indexes)
5. **Final Lighthouse test** - Target: LCP < 2.5s, Performance 85+
