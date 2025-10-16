# Go Daisy Performance Analysis

**Date:** October 16, 2025
**Status:** Optimization recommendations based on codebase analysis

---

## Summary

This document analyzes potential performance bottlenecks in the Go Daisy app and provides manual optimization recommendations based on code review.

---

## Current Optimizations ✅

Already implemented:
- ✅ **PWA with Service Worker** - API responses cached for 1 hour
- ✅ **Skeleton loaders** - Better perceived performance
- ✅ **SEO meta tags** - All key pages optimized
- ✅ **Sitemap generation** - Automatic on build
- ✅ **Next.js Image component** - Used throughout
- ✅ **robots.txt** - Search engine directives
- ✅ **SWC compiler** - Faster than Babel
- ✅ **Code splitting** - Next.js automatic
- ✅ **WebP images** - Optimized backgrounds

---

## Identified Bottlenecks

### 1. Homepage (pages/index.tsx) - HIGH IMPACT

**Issue:** Heavy computation on every render for weather calculations

**Problem areas:**
```typescript
// Line 863-1040: This runs on every render
const heroDataByDay = forecastDays.map((day, idx) => {
  const filteredActivities = filteredActivitiesBase;
  let suggestionsData = getSuggestionsByDay({
    forecast: [{ ...day }],
    activityTypes: filteredActivities,
    // ... complex calculations
  });
  // More expensive operations...
});
```

**Impact:**
- Runs complex weather scoring algorithms on every state change
- Processes 8 days × N activities on every render
- Could cause lag when user changes location or interests

**Recommendation:**
```typescript
// Wrap in useMemo to prevent recalculation
const heroDataByDay = useMemo(() => {
  return forecastDays.map((day, idx) => {
    // ... expensive calculations
  });
}, [forecastDays, sanitizedInterests, activityTypes]);
```

**Estimated improvement:** 50-70% faster re-renders

---

### 2. Activity Card Re-renders - MEDIUM IMPACT

**Issue:** Activity cards re-render when parent state changes

**Problem:**
- Each activity card in the grid re-renders unnecessarily
- Happens when any part of homepage state changes (location, interests, etc.)

**Recommendation:**
Create memoized ActivityCard component:

```typescript
// components/ActivityCard.tsx
import { memo } from 'react';

interface ActivityCardProps {
  activity: ActivitySuggestion;
  day: WeatherForecastDay;
  onShare: (activity: ActivitySuggestion) => void;
}

export const ActivityCard = memo(function ActivityCard({
  activity,
  day,
  onShare
}: ActivityCardProps) {
  // ... existing card JSX
  return <div className="card">...</div>;
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.activity.activityId === nextProps.activity.activityId &&
    prevProps.activity.score === nextProps.activity.score &&
    prevProps.day.date === nextProps.day.date
  );
});
```

**Usage in index.tsx:**
```typescript
{alsoGoodPerfect.map((suggestion) => (
  <ActivityCard
    key={suggestion.activityId}
    activity={suggestion}
    day={day}
    onShare={handleShareActivity}
  />
))}
```

**Estimated improvement:** 30-40% fewer renders

---

### 3. Activities Page Expensive Computations - MEDIUM IMPACT

**Issue:** Similar to homepage - complex calculations on every render

**File:** `pages/activities.tsx`

**Problem areas:**
- Lines 137-260: `useFetchForecastData` custom hook runs heavy calculations
- Weather/marine data processing for all days
- Activity scoring algorithms

**Recommendation:**
Add memoization to the hook's return values:

```typescript
// In useFetchForecastData hook
return useMemo(() => ({
  forecastByDay,
  loading,
  error,
  marineHours,
  weatherData,
  marineError
}), [forecastByDay, loading, error, marineHours, weatherData, marineError]);
```

**Estimated improvement:** 20-30% faster

---

### 4. Findr Index Card Animations - LOW IMPACT

**Issue:** Framer Motion animations on card stack could be heavy

**File:** `pages/findr/index.tsx`

**Problem:**
- Swipe animations with physics
- Multiple cards rendering simultaneously
- AnimatePresence calculations

**Current state:** Likely not a bottleneck, but monitor

**If needed:**
```typescript
// Reduce motion for low-end devices
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<motion.div
  animate={prefersReducedMotion ? {} : { x, rotate, opacity }}
  transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring' }}
>
```

---

### 5. Google Maps Loading - MEDIUM IMPACT

**Issue:** Google Maps API blocks initial render

**File:** `pages/_document.tsx` (lines 32-63)

**Problem:**
- Loaded synchronously in document head
- Blocks rendering until Maps SDK loads
- Can add 500ms-1s to initial page load

**Recommendation:**
Move to lazy loading in components that need it:

```typescript
// lib/googleMaps.ts
let googleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

export function loadGoogleMapsLazy(): Promise<void> {
  if (googleMapsLoaded) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

// Usage in CoastalLocationDialog
useEffect(() => {
  if (open) {
    loadGoogleMapsLazy().then(() => {
      // Initialize map
    });
  }
}, [open]);
```

**Estimated improvement:** 500ms-1s faster initial load

---

## How to Profile

### Using React DevTools Profiler

1. **Install React DevTools**
   ```bash
   # Chrome: https://chrome.google.com/webstore (search "React Developer Tools")
   ```

2. **Start Dev Server**
   ```bash
   npm run dev
   ```

3. **Open DevTools → Profiler Tab**
   - Click "Record" button (red circle)
   - Interact with app (change location, select activities, etc.)
   - Click "Stop" button

4. **Analyze Flamegraph**
   - Look for yellow/red bars (slow renders)
   - Check "Ranked" view for slowest components
   - Look for components that render often unnecessarily

5. **Key metrics to watch:**
   - **Render duration** > 16ms (causes dropped frames at 60fps)
   - **Render count** - same component rendering multiple times
   - **Commit duration** - total time to update DOM

### Using Chrome DevTools Performance Tab

1. **Open DevTools → Performance Tab**
2. **Click Record + Reload page**
3. **Stop after page loads**
4. **Analyze:**
   - **Scripting** (yellow) - JS execution time
   - **Rendering** (purple) - layout/paint time
   - **Loading** (blue) - network requests

**Target metrics:**
- **First Contentful Paint (FCP):** < 1.8s (currently: likely 2-3s)
- **Largest Contentful Paint (LCP):** < 2.5s (currently: likely 3-4s)
- **Time to Interactive (TTI):** < 3.8s (currently: likely 4-5s)

---

## Recommended Optimization Priority

### Phase 1: Quick Wins (2 hours)
1. Add `useMemo` to `heroDataByDay` calculation
2. Add `useMemo` to `filteredActivitiesBase`
3. Memoize activity scoring results

**Files to change:**
- `pages/index.tsx` (lines 840-1040)
- `pages/activities.tsx` (lines 137-260)

### Phase 2: Component Optimization (3 hours)
1. Create memoized `ActivityCard` component
2. Move hero card to separate component with `React.memo()`
3. Memoize weather data list items

**Files to create/change:**
- Create `components/ActivityCard.tsx`
- Create `components/HeroActivityCard.tsx`
- Update `pages/index.tsx` to use new components

### Phase 3: Loading Optimization (2 hours)
1. Lazy load Google Maps
2. Add resource hints (preconnect to weather APIs)
3. Defer non-critical scripts

**Files to change:**
- `pages/_document.tsx`
- Create `lib/googleMapsLazy.ts`
- `components/CoastalLocationDialog.tsx`

---

## Expected Results After Optimization

| Metric | Current (Estimated) | After Optimization | Improvement |
|--------|---------------------|-------------------|-------------|
| Initial Load | 3.5s | 2.5s | 30% faster |
| Re-render Time | 150ms | 50ms | 70% faster |
| Activity Filtering | 200ms | 50ms | 75% faster |
| Memory Usage | 45MB | 35MB | 22% less |

---

## Performance Testing Checklist

After applying optimizations, test:

- [ ] Homepage loads under 2.5s on 3G
- [ ] Changing location is smooth (< 100ms)
- [ ] Selecting interests updates instantly (< 50ms)
- [ ] Activity cards don't flicker during re-renders
- [ ] Scrolling is smooth (60fps)
- [ ] No layout shifts (CLS < 0.1)
- [ ] Memory usage stays stable (no leaks)

---

## Tools for Monitoring

1. **Lighthouse** (built into Chrome)
   - Run audit: DevTools → Lighthouse → Analyze page load
   - Target score: > 90

2. **WebPageTest**
   - https://www.webpagetest.org
   - Test from multiple locations/devices

3. **Vercel Analytics** (if enabled)
   - Real user monitoring
   - Core Web Vitals tracking

---

## Conclusion

The app is already well-optimized with PWA, skeleton loaders, and modern Next.js features. The main bottleneck is expensive weather calculations running on every render. Adding `useMemo` hooks and component memoization will provide significant performance improvements.

**Next Steps:**
1. Apply Phase 1 optimizations (highest ROI)
2. Profile with React DevTools to verify improvements
3. Apply Phase 2 if needed based on profiling results

---

*Last updated: October 16, 2025*
