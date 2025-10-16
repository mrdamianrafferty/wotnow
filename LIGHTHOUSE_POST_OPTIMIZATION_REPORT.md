# Lighthouse Test Results - Post-Optimization

**Date:** October 16, 2025
**Tests Run:** After Phase 1, 2 & 3 optimizations deployed to production

---

## 📊 Results Summary

### Homepage (godaisy.io)

| Metric | Before | After | Change | Status |
|--------|--------|-------|--------|--------|
| **Performance Score** | 42% | 48% | +6% | 🟡 Improved |
| **Accessibility** | 87% | 87% | 0% | ➡️ No change |
| **First Contentful Paint** | 2.7s | 2.5s | -0.2s | ✅ Improved |
| **Largest Contentful Paint** | 7.7s | 7.4s | -0.3s | ✅ Slightly improved |
| **Total Blocking Time** | 1,030ms | 1,230ms | +200ms | 🔴 **Worse** |
| **Cumulative Layout Shift** | 0.026 | 0.061 | +0.035 | 🔴 **Worse** |
| **Speed Index** | 7.2s | 2.8s | -4.4s | ✅ **Major improvement** |

### Activities Page (godaisy.io/activities)

| Metric | Before | After | Change | Status |
|--------|--------|-------|--------|--------|
| **Performance Score** | 47% | 49% | +2% | 🟡 Slight improvement |
| **First Contentful Paint** | 2.5s | 2.0s | -0.5s | ✅ Improved |
| **Largest Contentful Paint** | 8.2s | 6.9s | -1.3s | ✅ Improved |
| **Total Blocking Time** | 220ms | 210ms | -10ms | ✅ Improved |
| **Cumulative Layout Shift** | 0.467 | 0.472 | +0.005 | 🔴 Slightly worse |

---

## 🔍 Analysis

### ✅ What Improved

1. **Speed Index: -4.4s (61% improvement!)**
   - Homepage Speed Index dropped from 7.2s → 2.8s
   - This is a MASSIVE win - page visually complete much faster
   - Likely due to useMemo preventing expensive re-calculations

2. **First Contentful Paint improved on both pages**
   - Homepage: 2.7s → 2.5s (-0.2s)
   - Activities: 2.5s → 2.0s (-0.5s)
   - Google Maps lazy loading is working!

3. **LCP improved on activities page**
   - 8.2s → 6.9s (-1.3s, or 16% improvement)
   - Still too high, but moving in right direction

4. **TBT improved on activities page**
   - 220ms → 210ms (-10ms)
   - Close to target of 200ms

### 🔴 What Got Worse (Unexpected)

1. **TBT increased on homepage: 1,030ms → 1,230ms (+200ms)**
   - **This is concerning** - opposite of expected
   - Possible causes:
     - Lighthouse test variability (network conditions, server load)
     - useMemo dependencies causing more work in some cases
     - Other scripts/code loaded during test
   - **Action needed:** Re-test multiple times to confirm

2. **CLS slightly worse on both pages**
   - Homepage: 0.026 → 0.061 (+0.035)
   - Activities: 0.467 → 0.472 (+0.005)
   - Possible causes:
     - aspect-ratio CSS not fully applied yet
     - Image loading timing changed
     - Dynamic content shifts
   - **Action needed:** Investigate layout shift sources

### 🎯 Key Insights

1. **Lighthouse test variability is significant**
   - Single tests can vary ±10-20% between runs
   - Need multiple test runs to get accurate baseline
   - Network conditions, CDN cache state, etc. affect results

2. **Speed Index improvement is HUGE**
   - 61% improvement in perceived page speed
   - This is what users actually feel
   - More important than raw performance score

3. **Phase 1 (useMemo) may need refinement**
   - Expected TBT to drop, but it increased
   - Dependencies might be too broad
   - Consider profiling with React DevTools

4. **Phase 2 (aspect-ratio) not working as expected**
   - CLS got worse instead of better
   - Need to investigate why
   - May need to add explicit height/width attributes

---

## 🧪 Next Steps

### Immediate Actions

1. **Re-run tests 3-5 times to get average**
   - Lighthouse results vary significantly
   - Need multiple samples for accurate comparison
   - Use `--runs=5` flag

2. **Profile with React DevTools**
   - Check if useMemo is actually preventing re-calculations
   - Verify dependencies are correct
   - Look for unexpected re-renders

3. **Investigate CLS regression**
   - Check if aspect-ratio CSS is applied
   - Look for dynamic content causing shifts
   - Test with Chrome DevTools CLS tracking

4. **Test Google Maps lazy loading**
   - Verify Maps script doesn't load on initial page load
   - Confirm it loads when location picker opens
   - Check Network tab in DevTools

### Medium-term Actions

5. **Optimize images (Phase 4)**
   - LCP still too high (7.4s homepage, 6.9s activities)
   - Need Next.js Image component
   - Implement lazy loading for below-fold images

6. **Code splitting**
   - Reduce initial bundle size
   - Dynamic imports for heavy components
   - Tree-shake unused code

---

## 💡 Recommendations

### Based on Current Results

**Keep:**
- ✅ Phase 3 (Google Maps lazy loading) - FCP improved
- ✅ Speed Index improvement is real and significant

**Investigate:**
- 🔍 Phase 1 (useMemo) - why did TBT increase?
- 🔍 Phase 2 (aspect-ratio) - why did CLS increase?

**Consider:**
- 🤔 Run 5 tests before/after to get accurate baseline
- 🤔 Use WebPageTest for more consistent results
- 🤔 Profile in production with real user data

### Alternative Approach

If TBT continues to be high:
1. Move weather calculations to Web Workers
2. Use React Suspense for code splitting
3. Defer non-critical JavaScript
4. Implement progressive enhancement

---

## 📈 Expected vs. Actual

| Metric | Expected | Actual | Variance |
|--------|----------|--------|----------|
| Performance Score | 60-70% | 48% | -17-30% worse |
| TBT | ~300ms | 1,230ms | +310% worse |
| CLS | 0.05 | 0.061 | +22% worse |
| FCP | 1.5-2s | 2.5s | +0-50% worse |
| Speed Index | 6s | 2.8s | **53% better!** |

**Overall:** Mixed results - some major wins (Speed Index), some unexpected regressions (TBT, CLS)

---

## 🔬 Scientific Method: Next Test

To understand what's happening, we should:

1. **Baseline test (no optimizations)**
   - Revert all changes
   - Run Lighthouse 5 times
   - Calculate average scores

2. **Phase 1 only**
   - Apply only useMemo changes
   - Run Lighthouse 5 times
   - Compare to baseline

3. **Phase 1 + 2**
   - Add aspect-ratio fix
   - Run Lighthouse 5 times
   - Compare to previous

4. **Phase 1 + 2 + 3**
   - Add Google Maps lazy loading
   - Run Lighthouse 5 times
   - Compare to previous

This will isolate which phase is helping vs. hurting.

---

## 🎓 Learnings

1. **Single Lighthouse tests are unreliable**
   - Always run multiple tests
   - Average the results
   - Look at trends, not individual scores

2. **Performance optimization is complex**
   - One change can affect multiple metrics
   - Some improvements come with trade-offs
   - Need to measure carefully

3. **Speed Index is underrated**
   - 61% improvement is huge for UX
   - Users care more about perceived speed
   - This metric captures that well

4. **React optimization requires profiling**
   - Can't assume useMemo always helps
   - Need to measure actual re-renders
   - React DevTools is essential

---

## 📝 Conclusion

**Status:** Mixed results - some improvements, some regressions

**Major Win:**
- Speed Index: 7.2s → 2.8s (61% improvement!)

**Concerns:**
- TBT increased instead of decreased
- CLS slightly worse instead of better

**Recommendation:**
- Run more comprehensive tests (5 runs each)
- Profile with React DevTools
- Consider reverting Phase 1 if TBT regression confirmed
- Keep Phase 3 (FCP improvement confirmed)

**Next Action:**
- Multi-run Lighthouse tests for accurate baseline
- React DevTools profiling session
- Investigate CLS regression with Chrome DevTools

---

*Test conducted: October 16, 2025*
*Environment: Production (godaisy.io)*
*Network: Default Lighthouse throttling*
