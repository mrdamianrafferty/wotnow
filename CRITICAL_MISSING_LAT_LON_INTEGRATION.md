# 🚨 CRITICAL: GPS Coordinates Not Being Used for Substrate/Depth Scoring

**Status**: ⚠️ **BLOCKING ISSUE**  
**Priority**: 🔴 **HIGHEST**  
**Effort**: 30 minutes  
**Impact**: Unlocks substrate/depth scoring for ALL users

---

## 🔍 Problem

We just deployed lat/lon-based substrate and depth scoring (substrate 0-25pts, depth 0-20pts), but **GPS coordinates are NOT being passed to the predictions API**!

### Current State

✅ **Frontend captures GPS coordinates**
- User clicks "Use my location" button
- Browser geolocation API returns lat/lon
- Coordinates stored in `UnifiedLocationContext`
- Stored format:
  ```typescript
  {
    lat: 50.123,
    lon: -5.456,
    rectangleCode: "31E5",
    source: "gps",
    accuracy: 10
  }
  ```

❌ **BUT coordinates are NOT passed to API**
- `useFishingPredictions` hook only sends:
  ```typescript
  {
    rectangleCode: "31E5",
    predictionDate: "2025-10-16",
    language: "en"
    // ❌ latitude and longitude are MISSING!
  }
  ```

✅ **Backend API accepts lat/lon**
- Endpoint: `POST /api/findr/predictions`
- Expects optional `latitude` and `longitude` fields
- If provided, queries EMODnet for substrate and depth
- Passes to enhanced RPC function for scoring

❌ **Result: Default scores for everyone**
- ALL users get 12pt substrate (hardcoded default)
- ALL users get 12pt depth (hardcoded default)
- **No differentiation based on actual location!**

---

## 🎯 Solution

Wire up the existing GPS coordinates from `UnifiedLocationContext` to the predictions API.

### Files to Modify

#### 1. `hooks/useFishingPredictions.ts`

**Change the interface:**
```typescript
export interface UseFishingPredictionsOptions {
  rectangleCode?: string | null;
  predictionDate?: string | null;
  language?: string;
  enabled?: boolean;
  latitude?: number | null;   // ADD THIS
  longitude?: number | null;  // ADD THIS
}
```

**Update the params memo:**
```typescript
const params = useMemo(() => {
  if (!rectangleCode || !enabled) return null;
  return {
    rectangleCode,
    predictionDate: predictionDate || undefined,
    language,
    latitude: latitude ?? undefined,   // ADD THIS
    longitude: longitude ?? undefined, // ADD THIS
  };
}, [rectangleCode, predictionDate, language, latitude, longitude, enabled]);
```

#### 2. `pages/findr/index.tsx`

**Pass coordinates from UnifiedLocationContext to hook:**

Find this line (around line 639):
```typescript
const predictions = useFishingPredictions({
  rectangleCode: activeRectangle,
  predictionDate: effectiveDate,
  language: currentLanguage,
  enabled: Boolean(activeRectangle),
});
```

Change to:
```typescript
const predictions = useFishingPredictions({
  rectangleCode: activeRectangle,
  predictionDate: effectiveDate,
  language: currentLanguage,
  enabled: Boolean(activeRectangle),
  latitude: location?.lat ?? null,     // ADD THIS
  longitude: location?.lon ?? null,    // ADD THIS
});
```

---

## ✅ Expected Results

### Before (Current)
- User clicks "Use my location" → GPS captured but not used
- Wrasse at rocky reef: 100% confidence (12pt substrate + 12pt depth)
- Wrasse at sandy area: 100% confidence (same default scores)
- **No differentiation!**

### After (With Fix)
- User clicks "Use my location" → GPS passed to API → EMODnet queried
- Wrasse at rocky reef: 100% confidence (25pt substrate + 15pt depth)
- Wrasse at sandy area: 92% confidence (5pt substrate + 15pt depth)
- **8-point confidence drop in wrong habitat!** ✅

### Distribution
- 63 species: High confidence on sand (25pts substrate)
- 16 species: Low confidence on sand (5pts substrate)
- **Real habitat-based differentiation!**

---

## 🧪 Testing

### Test 1: Cornwall Rocky Reef
```typescript
// User location: 50.0719°N, 5.5267°W (Porthcurno)
// Expected: Rock substrate, 8m depth

// Ballan Wrasse (rock specialist):
// Before: 100% (12 + 12)
// After:  100% (25 + 15) ✅

// Red Mullet (sand preference):
// Before: 95% (12 + 12)
// After:  87% (5 + 15) ✅ - confidence drops in wrong habitat
```

### Test 2: North Sea Sandy Area
```typescript
// User location: 54.5°N, 0.5°E
// Expected: Sand substrate, 45m depth

// Plaice (sand specialist):
// Before: 98% (12 + 12)
// After:  100% (25 + 20) ✅ - confidence INCREASES in correct habitat

// Ballan Wrasse (rock specialist):
// Before: 100% (12 + 12)
// After:  92% (5 + 15) ✅ - confidence drops
```

---

## 📊 User Impact

### Who Benefits
- **ALL users who click "Use my location"**
- Estimated: 60-80% of active users
- Impact: More accurate predictions, better catch success

### What Changes
- **Substrate scoring**: 12pts → 5-25pts (dynamic)
- **Depth scoring**: 12pts → 5-20pts (dynamic)
- **Confidence variation**: 37-point spread based on habitat
- **Species differentiation**: Rocky vs sandy specialists clearly separated

### Examples
```
Cornwall Rocky Reef (50.07°N, 5.53°W):
  ✅ Ballan Wrasse:      100% → 100% (perfect habitat)
  ✅ Bass:               98%  → 100% (likes rocks)
  ⬇️ Plaice:             95%  → 85%  (prefers sand)
  ⬇️ Red Mullet:         95%  → 87%  (sand specialist)

North Sea Sandy Area (54.5°N, 0.5°E):
  ✅ Plaice:             98%  → 100% (perfect habitat)
  ✅ Dab:                95%  → 98%  (sand lover)
  ⬇️ Ballan Wrasse:      100% → 92%  (prefers rocks)
  ⬇️ Pollock:            95%  → 88%  (rocky reefs)
```

---

## ⏱️ Implementation Time

**Total**: 30 minutes

1. **Update `useFishingPredictions` interface** - 5 min
2. **Update params memo** - 5 min
3. **Update `pages/findr/index.tsx` call site** - 5 min
4. **Test with real location** - 10 min
5. **Verify in production** - 5 min

---

## 🎯 Next Steps (After This Fix)

Once GPS coordinates are flowing to the API:

1. **Immediate (0 effort)**:
   - Every user with "Use my location" gets habitat scoring ✅
   - No frontend changes needed - it just works!

2. **Short-term (1 hour)**:
   - Add visual indicator when substrate/depth scoring is active
   - Show substrate type and depth in species cards
   - Help users understand WHY confidence varies

3. **Medium-term (4 hours)**:
   - Populate depth data for remaining 59 species
   - FishBase integration for automated depth import

4. **Long-term (2 hours)**:
   - EMODnet caching layer (1000ms → 0ms for cached locations)
   - Pre-compute substrate/depth for popular fishing spots

---

## 📝 Verification Checklist

After deploying this fix:

- [ ] User clicks "Use my location" in Findr
- [ ] GPS coordinates captured successfully
- [ ] API request includes `latitude` and `longitude` fields
- [ ] EMODnet APIs queried (check console logs)
- [ ] Species predictions show varied substrate scores (not all 12pts)
- [ ] Confidence varies based on habitat match
- [ ] Wrasse scores higher on rock than sand
- [ ] Plaice scores higher on sand than rock

---

## 🚀 Why This Is Critical

We just deployed a **sophisticated substrate and depth scoring system** with:
- ✅ Database schema changes (depth columns)
- ✅ Enhanced RPC function (6 parameters)
- ✅ EMODnet API integration (bathymetry + substrate)
- ✅ Species-specific scoring logic (25/15/5 pts)
- ✅ Sample depth data (20 species)
- ✅ Comprehensive testing and documentation

**BUT IT'S NOT BEING USED!** 🤦‍♂️

The frontend already has everything we need (GPS coordinates from user), but we're not passing them to the backend that's ready to use them.

This is a **30-minute fix** that unlocks **all the work we just did** for **60-80% of users**.

---

## 🎉 Expected Outcome

After this fix:
- ✅ Users get **habitat-aware predictions**
- ✅ Rocky reef specialists score **high on rocks, low on sand**
- ✅ Sandy bottom species score **high on sand, low on rocks**
- ✅ Confidence varies **realistically** based on location
- ✅ Users see **why** species are predicted (habitat match)

**This is the missing link between frontend and backend!**

---

*Priority: 🔴 HIGHEST - Do this FIRST before any other optimization work*
