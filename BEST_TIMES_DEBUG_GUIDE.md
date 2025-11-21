# Best Times Debug Guide

## Problem
Best times badges (purple badges showing "Dawn", "Dusk", etc.) are not appearing in the WeeklyPlannerCard expandable sections.

## Testing Results

### Backend Tests ✅
All backend tests PASS - data is flowing correctly through the database and APIs:
- ✅ Database has `best_times` data (e.g., Sea Bass: `["dawn","dusk","night","flooding_tide","ebbing_tide"]`)
- ✅ Predictions API queries include `best_times` column
- ✅ Favourites API queries include `best_times` column
- ✅ Data structure matches component expectations

**Run backend tests:**
```bash
npx tsx scripts/test-best-times-pipeline.ts
```

### Frontend Debugging

Since backend is working, the issue must be in the frontend. I've added comprehensive debug logging at every step:

## Debug Logs Added

### 1. Favourites Page (pages/findr/favourites.tsx:1515-1521)
Logs what data is being prepared for WeeklyPlannerCard:
```javascript
console.log(`[Favourites] Processing ${entry.name}:`, {
  hasCard: !!entry.card,
  cardBestTimes: entry.card?.best_times,
  hasAdvice: !!advice,
  adviceAlternativeTechniques: advice?.alternativeTechniques,
  adviceAlternativeHabitats: advice?.alternativeHabitats
});
```

### 2. Component Data Receipt (WeeklyPlannerCard.tsx:113-123)
Logs what the component receives from props:
```javascript
console.log(`[WeeklyPlanner] ${fav.name}:`, {
  hasCard: !!fav.card,
  cardKeys: fav.card ? Object.keys(fav.card) : [],
  bestTimes: bestTimes,
  bestTimesType: typeof bestTimes,
  bestTimesLength: bestTimes?.length,
  alternativeTechniques: fav.alternativeTechniques,
  alternativeHabitats: fav.alternativeHabitats
});
```

### 3. Expandable Content Check (WeeklyPlannerCard.tsx:305-313)
Logs the expandable content check logic:
```javascript
console.log(`[WeeklyPlanner] Expandable check for ${opp.name}:`, {
  hasBestTimes: !!(opp.bestTimes && opp.bestTimes.length > 0),
  bestTimes: opp.bestTimes,
  hasTechniques: !!(opp.alternativeTechniques && opp.alternativeTechniques.length > 0),
  hasHabitats: !!(opp.alternativeHabitats && opp.alternativeHabitats.length > 0),
  hasExpandableContent
});
```

### 4. Render Confirmation (WeeklyPlannerCard.tsx:410-412)
Confirms if we're actually rendering the badges:
```javascript
console.log(`[WeeklyPlanner] Rendering best_times for ${opp.name}:`, opp.bestTimes);
```

## How to Debug

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to favourites page:**
   - Open http://localhost:3000/findr/favourites
   - Make sure you have favorites added
   - Make sure a location is selected

3. **Open browser console** (F12)

4. **Look for the debug logs** in order:
   - `[Favourites] Processing ...` - Data being prepared
   - `[WeeklyPlanner] Species Name:` - Data received by component
   - `[WeeklyPlanner] Expandable check ...` - Expandable content check
   - `[WeeklyPlanner] Rendering best_times ...` - Actually rendering badges

5. **Identify where data breaks:**

### Expected Flow ✅

```
[Favourites] Processing Sea Bass: {
  hasCard: true,
  cardBestTimes: ["dawn", "dusk", "night", "flooding_tide", "ebbing_tide"],
  hasAdvice: true,
  ...
}

[WeeklyPlanner] Sea Bass: {
  hasCard: true,
  bestTimes: ["dawn", "dusk", "night", "flooding_tide", "ebbing_tide"],
  bestTimesType: "object",
  bestTimesLength: 5,
  ...
}

[WeeklyPlanner] Expandable check for Sea Bass: {
  hasBestTimes: true,
  bestTimes: ["dawn", "dusk", "night", "flooding_tide", "ebbing_tide"],
  hasExpandableContent: true
}

[WeeklyPlanner] Rendering best_times for Sea Bass: ["dawn", "dusk", "night", "flooding_tide", "ebbing_tide"]
```

### Failure Scenarios

#### Scenario A: No card data
```
[Favourites] Processing Sea Bass: {
  hasCard: false,  ❌
  cardBestTimes: undefined,
  ...
}
```
**Fix:** API not returning card data - check favourites API response in Network tab

#### Scenario B: Card exists but no best_times
```
[Favourites] Processing Sea Bass: {
  hasCard: true,
  cardBestTimes: null,  ❌ or undefined
  ...
}
```
**Fix:** Check if species has best_times in database, or predictions API not fetching it

#### Scenario C: Data lost in prop passing
```
[Favourites] Processing Sea Bass: {
  cardBestTimes: ["dawn", "dusk", ...],  ✅
}

[WeeklyPlanner] Sea Bass: {
  bestTimes: undefined,  ❌
}
```
**Fix:** Check favourites.tsx line 1537 - `card: entry.card` must pass through

#### Scenario D: Expandable check fails
```
[WeeklyPlanner] Expandable check for Sea Bass: {
  hasBestTimes: false,  ❌
  bestTimes: undefined or [],
  hasExpandableContent: false
}
```
**Fix:** Data not making it to `opp.bestTimes` - check mapping logic

## Network Tab Check

Also check the actual API responses:

1. **Open Network tab in DevTools**
2. **Filter for:** `favourites?` or `predictions?`
3. **Look for species data in response**
4. **Check if `best_times` field is present**

Example expected response:
```json
{
  "species_code": "BSS",
  "name_en": "Sea Bass",
  "best_times": ["dawn", "dusk", "night", "flooding_tide", "ebbing_tide"],
  ...
}
```

## Cache Issue?

If data looks correct but UI not updating:
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
3. Check if prediction cache needs clearing: `tsx scripts/clear-all-cache-for-date.js`

## Files Modified for Debugging

1. `scripts/test-best-times-pipeline.ts` - Backend test script
2. `pages/findr/favourites.tsx` - Line 1515-1521
3. `components/findr/WeeklyPlannerCard.tsx` - Lines 113-123, 305-313, 410-412

## Next Steps

After identifying the issue:
1. Report which log shows the problem
2. Share the console output for that log
3. We can then apply the specific fix needed

## Cleanup

Once working, remove debug logs by searching for:
- `console.log('[Favourites]`
- `console.log('[WeeklyPlanner]`
