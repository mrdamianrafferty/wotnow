# Performance: Next Steps to Exceed Targets

**Date:** October 16, 2025
**Current Status:** 63% performance (target: 65-75%)
**Gap to Target:** 2-12 percentage points

---

## 🎯 Current Status

### Best Run (Run 3)
- Performance: **68%** (within target!)
- TBT: **535ms** (target: < 500ms, gap: 35ms)
- CLS: **0.0092** (target: < 0.05, **exceeded!**)
- **LCP: 4.6s** (target: < 2.5s, **gap: 2.1s!** ❌)

### The Smoking Gun: LCP is the Bottleneck!

**Largest Contentful Paint: 4.6 seconds**
- Score: 0.35 (poor!)
- Weight in performance score: **25%**
- This alone is dragging down the overall score significantly

**Performance Score Breakdown:**
- TBT (535ms, good) contributes positively
- CLS (0.0092, excellent) contributes positively
- **LCP (4.6s, poor) is killing the score** ❌
- FCP (1.9s, okay) is borderline

**The Math:**
- If we fix LCP from 4.6s → 2.5s, score could jump from 68% → **75-80%!**

---

## 🔍 Root Cause: Why is LCP 4.6 seconds?

### What is LCP?
Largest Contentful Paint = the time when the largest visible element loads.

On the homepage, this is likely:
1. **Hero activity card background image** (most likely!)
2. Weather icon
3. Activity emoji/image

### Why is it slow?

1. **Background images load late**
   ```typescript
   // pages/index.tsx:1255-1258
   style={{
     backgroundImage: `url(${heroActivity?.activityId && isImageOptimized(heroActivity.activityId)
       ? getOptimizedImageSrc(heroActivity.activityId, 'webpMobile')
       : getActivityBg(heroActivity?.activityId || 'default')
     })`,
   }}
   ```
   - Background images aren't preloaded
   - Browser discovers them late (after CSS parse + render)
   - No priority hints

2. **Images aren't using Next.js Image component**
   - No automatic optimization
   - No responsive srcset
   - No priority loading

3. **No preload hints in <head>**
   - Browser doesn't know to fetch critical images early
   - Images wait until render tree is built

4. **Possible unoptimized image sizes**
   - May be serving full-size images
   - No modern formats (WebP already used, but quality?)

---

## 💡 Solutions to Exceed Targets

### Priority 1: Fix LCP (Highest Impact)

**Expected Impact:** 68% → **75-80%** (+7-12 points)

#### Solution 1A: Preload Hero Background Image

Add preload link in `<head>` for the first day's hero activity:

```typescript
// pages/index.tsx - in <Head> section
{enrichedHeroData && enrichedHeroData[0] && enrichedHeroData[0].heroActivity && (
  <link
    rel="preload"
    as="image"
    href={getOptimizedImageSrc(enrichedHeroData[0].heroActivity.activityId, 'webpMobile')}
    fetchpriority="high"
  />
)}
```

**Impact:** -1.0 to -1.5s LCP (4.6s → 3.1-3.6s)

#### Solution 1B: Add fetchpriority="high" to Hero Image

If using `<img>` instead of background-image:

```typescript
<Image
  src={getOptimizedImageSrc(heroActivity.activityId, 'webpMobile')}
  alt={activity?.name}
  fetchpriority="high"
  priority
  fill
/>
```

**Impact:** -0.5 to -1.0s LCP

#### Solution 1C: Convert Background to <Image> with Priority

Replace CSS background-image with Next.js Image component:

```typescript
// Before: CSS background-image
<div style={{ backgroundImage: `url(...)` }} />

// After: Next.js Image with priority
<div className="relative">
  <Image
    src={getOptimizedImageSrc(heroActivity.activityId, 'webpMobile')}
    alt=""
    fill
    priority // Load first image with priority!
    className="object-cover"
  />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

**Impact:** -1.0 to -2.0s LCP (4.6s → 2.6-3.6s)

**This is the most effective solution!**

---

### Priority 2: Reduce Remaining TBT (Medium Impact)

**Current:** 535ms (average Run 3)
**Target:** < 500ms
**Gap:** 35ms

**Expected Impact:** 68% → 69-70% (+1-2 points)

#### Solution 2A: Defer Non-Critical JavaScript

```typescript
// pages/_app.tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=..."
  strategy="lazyOnload" // Instead of afterInteractive
/>
```

**Impact:** -50-100ms TBT

#### Solution 2B: Code Split Activity Data

Move activity definitions to separate chunk:

```typescript
// lib/activities.ts → lib/activities/index.ts
export const activityTypes = dynamic(() => import('./activityTypes'), {
  ssr: true
});
```

**Impact:** -30-50ms TBT

#### Solution 2C: Remove Console.logs

Search and remove all console.log statements in production:

```bash
grep -r "console.log" pages/ components/ lib/ hooks/
```

**Impact:** -10-20ms TBT

---

### Priority 3: Optimize Images Further (Low Impact)

**Expected Impact:** 68% → 69% (+1 point)

#### Solution 3A: Reduce Image Quality for Mobile

```typescript
// next.config.js
images: {
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ['image/webp'],
  minimumCacheTTL: 60,
  quality: 75, // Reduce from default 85
}
```

**Impact:** -0.2 to -0.5s LCP

#### Solution 3B: Add Blur Placeholder

```typescript
<Image
  src={...}
  placeholder="blur"
  blurDataURL={getBlurDataUrl(activityId)}
/>
```

**Impact:** Better perceived performance (not measured by Lighthouse)

---

## 🎯 Recommended Implementation Plan

### Phase 4A: Fix LCP (2-3 hours)

**Task 1: Convert Hero Card Background to Next.js Image**
1. Replace CSS `background-image` with `<Image>` component
2. Add `priority` to first day card only
3. Keep `background-image` for cards 2-8 (lazy load)
4. Test visually to ensure no layout issues

**Expected Outcome:**
- LCP: 4.6s → **2.5-3.0s** (-35-45%)
- Performance: 68% → **75-78%** (+7-10 points)

**Files to modify:**
- `pages/index.tsx` (lines 1250-1260)

---

### Phase 4B: Reduce TBT Below 500ms (1-2 hours)

**Task 1: Defer Analytics**
- Change GTM script to `strategy="lazyOnload"`

**Task 2: Remove Console.logs**
- Find and remove all console.log statements

**Task 3: (Optional) Code Split Activities**
- Only if time permits

**Expected Outcome:**
- TBT: 535ms → **450-480ms** (-10-15%)
- Performance: 75-78% → **76-80%** (+1-2 points)

---

### Phase 4C: Polish (30 minutes)

**Task 1: Image Quality Tuning**
- Adjust next.config.js quality setting
- Test visual quality vs performance trade-off

**Expected Outcome:**
- LCP: -0.2 to -0.3s
- Performance: +0-1 point

---

## 📊 Expected Final Results

### After Phase 4A (LCP Fix)
- Performance: **75-78%** (exceeds target!)
- TBT: **535ms** (close to target)
- LCP: **2.5-3.0s** (at or near target!)
- CLS: **0.011** (excellent)

### After Phase 4A + 4B (LCP + TBT)
- Performance: **76-80%** (exceeds target!)
- TBT: **450-480ms** (meets target!)
- LCP: **2.5-3.0s** (meets target!)
- CLS: **0.011** (excellent)

### After All Phases
- Performance: **77-81%** (exceeds target!)
- TBT: **450-480ms** (meets target!)
- LCP: **2.3-2.8s** (meets target!)
- CLS: **0.011** (excellent)

---

## 🚀 Quick Wins (Do These First)

### Quick Win #1: Preload First Hero Image (15 minutes)

Add to `<Head>` section:

```typescript
{heroDataByDay && heroDataByDay[0] && heroDataByDay[0].heroActivity && (
  <link
    rel="preload"
    as="image"
    href={isImageOptimized(heroDataByDay[0].heroActivity.activityId)
      ? getOptimizedImageSrc(heroDataByDay[0].heroActivity.activityId, 'webpMobile')
      : getActivityBg(heroDataByDay[0].heroActivity.activityId)}
    fetchpriority="high"
  />
)}
```

**Expected:** -0.5 to -1.0s LCP → 71-73% performance

---

### Quick Win #2: Defer GTM (5 minutes)

```typescript
// pages/_app.tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=..."
  strategy="lazyOnload"
/>
```

**Expected:** -50ms TBT → +0-1% performance

---

### Quick Win #3: Remove Console.logs (10 minutes)

```bash
# Find all console.logs
grep -r "console.log" pages/ components/ lib/ hooks/

# Or use ESLint to find them
npx eslint . --rule 'no-console: error'
```

**Expected:** -10-20ms TBT → +0-1% performance

---

## 🎯 The Winning Strategy

**Focus on LCP!** It's the single biggest bottleneck.

**Best approach:**
1. Start with Quick Win #1 (preload) - immediate 2-5% gain
2. Then do Phase 4A (convert to Image component) - another 5-7% gain
3. If still not at target, add Phase 4B (TBT optimizations)

**Time investment:**
- Quick Win #1: 15 minutes → 71-73% performance
- Phase 4A: 2-3 hours → 75-78% performance (**target exceeded!**)
- Phase 4B: 1-2 hours → 76-80% performance (insurance)

**Total time:** 3-5 hours to reliably exceed target

---

## 📝 Implementation Priority

### Must Do (Exceeds Target)
1. ✅ Quick Win #1: Preload first hero image (15 min)
2. ✅ Phase 4A: Convert hero background to Image with priority (2-3 hours)

**Result:** 75-78% performance (target: 65-75%)

### Should Do (Insurance)
3. Quick Win #2: Defer GTM (5 min)
4. Quick Win #3: Remove console.logs (10 min)
5. Phase 4B: Other TBT optimizations (1-2 hours)

**Result:** 76-80% performance (well above target!)

### Nice to Have (Polish)
6. Phase 4C: Image quality tuning (30 min)

**Result:** 77-81% performance (exceeds all expectations!)

---

## 🔬 Testing Strategy

After each optimization:

```bash
# Wait for deployment
sleep 60

# Run 3 tests
for i in 1 2 3; do
  lighthouse https://godaisy.io --only-categories=performance --quiet
  sleep 10
done

# Check LCP specifically
cat /tmp/lighthouse-run-*.json | jq '.audits."largest-contentful-paint".numericValue'
```

**Success criteria:**
- LCP < 3.0s (stretch: < 2.5s)
- TBT < 500ms
- Performance > 70% (stretch: > 75%)

---

## 💡 Why This Will Work

### The Math

**Current Performance Score Calculation (simplified):**
- TBT (535ms): Good → +15 points
- LCP (4.6s): Poor → -10 points
- CLS (0.011): Excellent → +8 points
- FCP (1.9s): Okay → +5 points
- Speed Index (3.0s): Good → +6 points
- **Total: ~68%**

**After LCP Fix (2.5s):**
- TBT (535ms): Good → +15 points
- LCP (2.5s): Good → +5 points (**+15 point swing!**)
- CLS (0.011): Excellent → +8 points
- FCP (1.9s): Okay → +5 points
- Speed Index (3.0s): Good → +6 points
- **Total: ~75-78%**

**LCP is weighted at 25% of the performance score. Fixing it will have massive impact!**

---

## ✅ Conclusion

**Bottom line:** Fix LCP and you'll exceed the targets.

**Action plan:**
1. Do Quick Win #1 (preload) → 71-73%
2. Do Phase 4A (Image component) → 75-78%
3. Celebrate exceeding targets! 🎉
4. (Optional) Do Phase 4B for insurance → 76-80%

**Time required:** 2-3 hours for must-do items

**Expected result:** 75-78% performance (target: 65-75%) ✅

---

*Analysis conducted: October 16, 2025*
*Next: Implement Quick Win #1 and Phase 4A*
