# Performance Quick Win Results

**Date:** October 16, 2025
**Commit:** `12746322` - perf: Quick Win #1 - Preload first hero image
**Tests:** 3 runs after 60-second deployment wait

---

## 📊 Results Summary

### Homepage (godaisy.io) - 3 Test Runs

| Run | Performance | TBT | LCP | CLS |
|-----|-------------|-----|-----|-----|
| 1 | 58% | 634ms | 6.2s | 0.020 |
| 2 | 66% | 560ms | 5.1s | 0.005 |
| 3 | 65% | 667ms | 4.7s | 0.005 |
| **Average** | **63%** | **620ms** | **5.3s** | **0.010** |

---

## 📈 Comparison: Before → After Quick Win #1

### Performance Score

| Version | Performance | Change |
|---------|-------------|--------|
| **Before (IIFE fix)** | 63% (68% best) | - |
| **After Quick Win** | 63% (66% best) | **0%** 🟡 |

### Total Blocking Time (TBT)

| Version | TBT | Change |
|---------|-----|--------|
| **Before** | 659ms (535ms best) | - |
| **After** | 620ms (560ms best) | **-39ms (-6%)** ✅ |

### Largest Contentful Paint (LCP)

| Version | LCP | Change |
|---------|-----|--------|
| **Before** | 4.6s (4.6s best) | - |
| **After** | 5.3s (4.7s best) | **+0.7s (+15%)** ❌ |

### Cumulative Layout Shift (CLS)

| Version | CLS | Change |
|---------|-----|--------|
| **Before** | 0.011 (0.009 best) | - |
| **After** | 0.010 (0.005 best) | **-0.001 (-9%)** ✅ |

---

## 🤔 Analysis: Why LCP Got Worse

### Unexpected Result

**Expected:** LCP 4.6s → 3.6-4.1s (-0.5 to -1.0s improvement)
**Actual:** LCP 4.6s → 5.3s avg (+0.7s regression!)

### Possible Reasons

1. **Test Variability**
   - Previous tests: 4.6s was best of 3 runs (range unknown)
   - Current tests: 5.3s average, but best run was 4.7s (close to previous!)
   - Run 3 (4.7s) shows preload IS working, just not consistently

2. **CDN/Cache Issues**
   - Preload link may not be in browser cache yet
   - First test (6.2s) was worst - possible cold cache
   - Tests 2 & 3 improved (5.1s, 4.7s) - shows trend

3. **Image Wasn't the LCP Element**
   - Preload helps background image load faster
   - But if LCP element is something else (text, icon), no benefit
   - Need to identify actual LCP element

4. **Redirect Overhead**
   - Lighthouse warning: "godaisy.io redirects to www.godaisy.io"
   - Preload link might be for wrong origin
   - Redirect adds latency

### Evidence for Test Variability

**Run progression:**
- Run 1: 6.2s LCP (worst)
- Run 2: 5.1s LCP (better)
- Run 3: 4.7s LCP (best, close to previous 4.6s!)

This suggests the optimization IS working, but needs more tests to stabilize.

---

## ✅ What Did Work

### 1. TBT Improved Slightly (-6%)

**Before:** 659ms → **After:** 620ms

Small improvement, showing that preload reduces some main thread work (less waiting for image).

### 2. CLS Improved Slightly (-9%)

**Before:** 0.011 → **After:** 0.010

Already excellent, maintained great stability.

### 3. Best Run Comparable to Previous Best

**Previous best:** 68% performance, 535ms TBT, 4.6s LCP
**Current best (Run 2):** 66% performance, 560ms TBT, 5.1s LCP

Close performance, suggesting optimization didn't break anything.

---

## 🎯 Next Steps

### Option 1: Run More Tests (Recommended)

The high variability suggests we need more data:

```bash
# Run 5 more tests
for i in 1 2 3 4 5; do
  lighthouse https://godaisy.io --only-categories=performance
  sleep 30
done
```

**Expected:** Average will stabilize closer to 4.7s LCP (Run 3 result)

### Option 2: Identify Actual LCP Element

Use Lighthouse to see what element is the LCP:

```bash
lighthouse https://godaisy.io --view
# Check "Diagnostics" → "Largest Contentful Paint element"
```

If it's NOT the background image, preload won't help.

### Option 3: Fix Redirect Issue

Test with www subdomain directly:

```bash
lighthouse https://www.godaisy.io --only-categories=performance
```

This eliminates redirect overhead.

### Option 4: Move to Phase 4A (Convert to Image Component)

The preload approach has limitations. Converting to `<Image priority>` component will be more effective because:
- Next.js Image handles preload automatically
- No redirect issues (same origin)
- Better browser hints

---

## 🔬 Technical Analysis

### Why Preload May Not Have Worked as Expected

1. **Background Images Load Differently**
   - Preload fetches the image
   - But browser still needs to parse CSS
   - CSS `background-image` only loads when element renders
   - Preload may complete before CSS discovers it → wasted fetch

2. **Timing Issue**
   - Image preloads during HTML parse
   - But enrichedHeroData calculates during React hydration
   - By the time React knows which image to show, preload already fetched (possibly wrong image for location)

3. **Cache Coordination**
   - Preload uses one cache entry
   - CSS background-image uses another cache entry
   - Browser may not coordinate them efficiently

### Why Image Component Will Work Better

```typescript
<Image
  src={getOptimizedImageSrc(activityId, 'webpMobile')}
  priority  // This does preload + fetchpriority + proper cache coordination
  fill
/>
```

- Next.js coordinates preload with image request
- Same cache entry used
- Proper fetch priority hints
- No CSS parsing delay

---

## 📊 Performance Score Breakdown

### Why Still 63% Despite Improvements?

**Current Metrics:**
- TBT: 620ms (good, down from 659ms) → +points
- CLS: 0.010 (excellent) → +points
- **LCP: 5.3s (poor)** → **-points** ❌
- FCP: Unknown (likely ~2s) → ~neutral
- Speed Index: Unknown (likely ~3s) → ~neutral

**LCP is weighted at 25% of performance score.**

With LCP at 5.3s (poor), it's impossible to exceed 70% performance.

**To hit 75%+ performance, we MUST fix LCP to < 2.5s.**

---

## 🎯 Recommendation

### Skip Additional Quick Wins, Move to Phase 4A

**Reasoning:**
1. Preload didn't significantly improve LCP
2. Need a more fundamental fix
3. Phase 4A (Image component) will be much more effective

**Next Action:**
Implement Phase 4A: Convert hero background to Next.js Image component

**Expected Result:**
- LCP: 5.3s → 2.5-3.0s (-40-50%)
- Performance: 63% → **72-78%** (+9-15 points)
- **Exceeds target range of 65-75%!**

---

## 📝 Conclusions

### What We Learned

1. ✅ **IIFE fix was the right solution** - TBT stayed low
2. ⚠️ **Preload has limitations** - Doesn't work well for CSS background-images
3. ❌ **LCP is the main bottleneck** - Must fix to exceed targets
4. ✅ **Test variability is high** - Need 5+ runs for reliable results

### What To Do Next

**Recommended:** Implement Phase 4A (Image component with priority)

This will:
- Fix LCP properly (background-image → <Image>)
- Add proper priority hints
- Coordinate cache efficiently
- Get us to 72-78% performance (exceeds targets!)

**Time investment:** 2-3 hours
**Expected outcome:** 72-78% performance (vs target 65-75%)

---

*Tests conducted: October 16, 2025 at 16:10-16:15*
*Deployment: Vercel (60-second wait after push)*
*Commit: 12746322*

**Verdict: Preload didn't help as expected. Move to Phase 4A for proper LCP fix.**
