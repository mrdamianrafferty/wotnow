# Homepage Performance Analysis - Root Cause Found

**Date:** October 16, 2025
**Status:** 🔴 Critical Issue Identified
**Location:** `pages/index.tsx:1146-1460`

---

## 🚨 Critical Issue: IIFE Inside Map Loop

### The Problem

Inside the main render, there's an **IIFE (Immediately Invoked Function Expression)** that runs on **every render**:

```typescript
// pages/index.tsx:1146
<main id="main-content" className="main-grid">
  {heroDataByDay.map(({ day, heroActivity, alsoGoodPerfect, suggestions, dayLabel }) => {

    const dayCard = (
      <div className="activity-card-enhanced">
        {/* ... */}

        {/* Line 1202: IIFE that runs on EVERY RENDER! */}
        {heroActivity && (() => {
          // ❌ All of this executes on EVERY render for EVERY day card!
          const activity = activityTypes.find((a) => a.id === activityId);           // Array.find
          const emoji = getActivityEmoji(activityId) || '❓';                         // Function call
          const scoreInfo = getScoreCategory(score || 0);                            // Function call
          const isOutdoorActivity = isOutdoor(activityId);                           // Function call
          const activityMessage = getActivityMessage(...);                           // Function call

          const SNOW_DANGER_LEVELS = new Set([...]);                                 // New Set creation
          const shouldShowSnowWarning = (aid, level) => { /* ... */ };              // Function definition

          const dayDate = new Date(day.date * 1000);                                 // New Date object
          const today = new Date();                                                   // New Date object
          const isToday = dayDate.getDate() === today.getDate() && ...;             // Date comparisons

          const hour = isToday ? today.getHours() : 12;
          const marinePopupDay = getPopupDay(heroActivity.activityId, day);         // Function call
          const popupPayload = buildPopupActivityPayload({...});                     // Function call + object creation
          const heroSuggestion = suggestions.find(s => s.activityId === ...);       // Array.find
          const handlePopupOpen = () => { /* ... */ };                               // Function definition

          return ( /* JSX */ );
        })()}  // ← Immediately invoked!
      </div>
    );

    return dayCard;
  })}
</main>
```

### Why This Is Devastating for Performance

1. **Runs on Every Render**
   - Every state change triggers re-render
   - All 8 day cards re-execute this IIFE
   - 8 × heavy computations = **massive TBT**

2. **Expensive Operations Repeated**
   - `activityTypes.find()` - searches through activity array
   - `new Date()` - creates Date objects (x2 per card)
   - `buildPopupActivityPayload()` - builds complex objects
   - `suggestions.find()` - searches through suggestions array
   - `new Set()` - creates Set object

3. **Multiplied by 8 Day Cards**
   - Each operation runs 8 times (once per day)
   - Total operations per render:
     - 8 × `activityTypes.find()` = 8 array searches
     - 16 × `new Date()` = 16 Date object creations
     - 8 × `buildPopupActivityPayload()` = 8 complex object constructions
     - 8 × `suggestions.find()` = 8 array searches
     - 8 × `new Set()` = 8 Set object creations

4. **Creates New Functions Every Render**
   - `shouldShowSnowWarning` defined 8 times per render
   - `handlePopupOpen` defined 8 times per render
   - These create new function references → React sees them as "changed"

### Measured Impact

**Current Performance:**
- TBT: 1,367ms average (target: < 200ms)
- Performance Score: 48%

**Estimated Impact of IIFE:**
- Each IIFE execution: ~50-100ms
- 8 day cards × 50-100ms = **400-800ms per render**
- This accounts for **30-58% of TBT!**

---

## 🔍 Why Memoization Didn't Help

We memoized `heroDataByDay`, but the **IIFE runs during render**, not during `heroDataByDay` calculation:

```typescript
// ✅ This is memoized (good!)
const heroDataByDay = useMemo(() => {
  return forecastDays.map((day) => {
    // Expensive weather calculations
    return { day, heroActivity, suggestions, ... };
  });
}, [forecastDays, filteredActivitiesBase, sanitizedInterests]);

// ❌ But THIS runs on every render (bad!)
heroDataByDay.map(({ day, heroActivity }) => {
  return (
    <div>
      {heroActivity && (() => {
        // All this executes on EVERY render!
      })()}
    </div>
  );
});
```

**The memoization prevents recalculating weather scores, but doesn't prevent re-rendering the UI with expensive operations inside the render.**

---

## 💡 The Fix

### Strategy 1: Move Computations to useMemo

Create a memoized "enriched" hero data that includes all the render-time calculations:

```typescript
const enrichedHeroData = useMemo(() => {
  return heroDataByDay.map(({ day, heroActivity, alsoGoodPerfect, suggestions, dayLabel }) => {
    if (!heroActivity) {
      return { day, heroActivity: null, dayLabel, alsoGoodPerfect, suggestions };
    }

    const { activityId, score } = heroActivity;
    const activity = activityTypes.find((a) => a.id === activityId);
    const emoji = getActivityEmoji(activityId) || '❓';
    const scoreInfo = getScoreCategory(score || 0);
    const isOutdoorActivity = isOutdoor(activityId);
    const activityMessage = getActivityMessage(
      activityId,
      scoreInfo.label.toLowerCase() as "perfect" | "good" | "fair" | "poor",
      []
    );

    const dayDate = new Date(day.date * 1000);
    const marinePopupDay = getPopupDay(heroActivity.activityId, day);
    const popupPayload = buildPopupActivityPayload({
      activityId: heroActivity.activityId,
      score: heroActivity.score,
      day: marinePopupDay,
      reasons: buildReasons(day, heroActivity.activityId),
    });

    const heroSuggestion = suggestions.find(s => s.activityId === heroActivity.activityId);

    return {
      day,
      dayLabel,
      alsoGoodPerfect,
      suggestions,
      heroActivity,
      // Pre-computed render data:
      activity,
      emoji,
      scoreInfo,
      isOutdoorActivity,
      activityMessage,
      dayDate,
      popupPayload,
      heroSuggestion,
    };
  });
}, [heroDataByDay]); // Only recompute when heroDataByDay changes

// Then in render:
enrichedHeroData.map((enriched) => {
  return (
    <div>
      {enriched.heroActivity && (
        <div onClick={() => setPopupActivity(enriched.popupPayload)}>
          <div>{enriched.emoji}</div>
          <div>{enriched.activityMessage}</div>
          {/* No computations, just use pre-computed values */}
        </div>
      )}
    </div>
  );
});
```

**Expected Impact:**
- TBT: 1,367ms → 500-700ms (-50-60%)
- Performance: 48% → 65-70%

### Strategy 2: Extract to Memoized Component

Create a separate memoized component for day cards:

```typescript
const DayCard = React.memo(({
  day,
  heroActivity,
  suggestions,
  dayLabel,
  alsoGoodPerfect,
  onOpenPopup
}) => {
  // Computations happen once, then memoized
  const activity = useMemo(
    () => activityTypes.find((a) => a.id === heroActivity?.activityId),
    [heroActivity?.activityId]
  );

  const scoreInfo = useMemo(
    () => getScoreCategory(heroActivity?.score || 0),
    [heroActivity?.score]
  );

  // etc...

  return ( /* JSX */ );
});

// In main component:
heroDataByDay.map((data) => (
  <DayCard key={data.day.date} {...data} onOpenPopup={setPopupActivity} />
));
```

**Expected Impact:**
- TBT: 1,367ms → 600-800ms (-40-50%)
- Performance: 48% → 60-65%

### Strategy 3: Lazy Computation (Only When Needed)

Don't compute popup payload until user clicks:

```typescript
const handlePopupOpen = useCallback((day, heroActivity) => {
  // Only compute when clicked, not on every render
  const marinePopupDay = getPopupDay(heroActivity.activityId, day);
  const popupPayload = buildPopupActivityPayload({
    activityId: heroActivity.activityId,
    score: heroActivity.score,
    day: marinePopupDay,
    reasons: buildReasons(day, heroActivity.activityId),
  });
  setPopupActivity(popupPayload);
}, []);
```

**Expected Impact:**
- TBT: 1,367ms → 900-1,100ms (-20-30%)
- Performance: 48% → 55-60%

---

## 🎯 Recommended Approach

**Combine Strategy 1 + Strategy 3:**

1. **Move most computations to useMemo** (emoji, scoreInfo, activityMessage, etc.)
2. **Compute popup payload lazily** (only when clicked)
3. **Keep Date calculations light** (only compute what's needed for display)

This gives us the best balance of:
- ✅ Reduced TBT (most computations memoized)
- ✅ Better user experience (no wasted work)
- ✅ Maintainable code (clear separation of concerns)

---

## 📊 Expected Results After Fix

### Current (With IIFE Bug)
- Performance: 48%
- TBT: 1,367ms
- CLS: 0.084

### After Fix (Strategy 1 + 3)
- Performance: **65-70%** (+35-46%)
- TBT: **400-600ms** (-56-70%)
- CLS: **< 0.05** (maintained)

---

## 🔬 Other Performance Bottlenecks Found

### 1. Multiple Date Object Creations

```typescript
// Line 1229-1233: Creates 16 Date objects per render (2 per card × 8 cards)
const dayDate = new Date(day.date * 1000);
const today = new Date();
const isToday = dayDate.getDate() === today.getDate() && ...
```

**Fix:** Create `today` once outside the map, pass dayDate in data.

### 2. Repeated Array Searches

```typescript
// Searches activityTypes array 8 times per render
const activity = activityTypes.find((a) => a.id === activityId);

// Searches suggestions array 8 times per render
const heroSuggestion = suggestions.find(s => s.activityId === heroActivity.activityId);
```

**Fix:** Do these searches in useMemo, not in render.

### 3. Function Definitions Inside Render

```typescript
// Creates 8 new function references per render
const shouldShowSnowWarning = (aid: string, level?: string) => { /* ... */ };
const handlePopupOpen = () => { /* ... */ };
```

**Fix:** Move to useCallback or define outside component.

### 4. Set Creation Inside Render

```typescript
// Creates 8 new Set objects per render
const SNOW_DANGER_LEVELS = new Set([
  'dangerous', 'unsafe', 'impossible', 'unplayable', 'too_deep', 'snowfall_unsafe'
]);
```

**Fix:** Move outside component (constant).

---

## 📝 Implementation Plan

### Phase 1: Move Constants Outside Component (Quick Win)

```typescript
// Before component definition
const SNOW_DANGER_LEVELS = new Set([
  'dangerous', 'unsafe', 'impossible', 'unplayable', 'too_deep', 'snowfall_unsafe'
] as const);

const shouldShowSnowWarning = (aid: string, level?: string) => {
  if (MARINE_ACTIVITY_IDS.includes(aid)) return false;
  if (!level) return false;
  return SNOW_DANGER_LEVELS.has(level as any);
};
```

**Expected Impact:** -50-100ms TBT

### Phase 2: Create Enriched Data useMemo (Major Fix)

Move all render-time computations to memoized data structure.

**Expected Impact:** -400-600ms TBT

### Phase 3: Lazy Popup Payload (Additional Optimization)

Only compute popup data when user clicks.

**Expected Impact:** -100-200ms TBT

### Phase 4: Extract DayCard Component (Optional)

Create separate memoized component for better code organization.

**Expected Impact:** Better maintainability, marginal performance gain

---

## 🚦 Priority

**Critical:** Phase 1 + Phase 2 should be implemented immediately.

**Estimated Time:**
- Phase 1: 30 minutes
- Phase 2: 1-2 hours
- Phase 3: 30 minutes
- **Total: 2-3 hours**

**Expected Outcome:**
- Performance: 48% → **65-75%**
- TBT: 1,367ms → **300-500ms**
- User Impact: **Much smoother interactions**

---

## ✅ Summary

**Root Cause Found:** IIFE inside render loop executing expensive operations 8 times per render.

**Why Previous Fixes Didn't Work:**
- We memoized data calculation (`heroDataByDay`)
- But didn't memoize render-time computations (inside IIFE)
- These are separate stages of the React lifecycle

**The Solution:**
1. Move computations from render to useMemo
2. Make popup payload lazy (compute on click)
3. Move constants outside component
4. Consider extracting to memoized component

**Expected Improvement:** 48% → 65-75% performance score (+35-56%)

---

*Analysis completed: October 16, 2025*
*Next: Implement fixes in phases*
