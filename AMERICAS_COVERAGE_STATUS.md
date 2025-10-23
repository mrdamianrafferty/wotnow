# Americas Coverage Status

**Date:** October 23, 2025
**Issue:** North American fishing predictions not working
**Status:** Partially Implemented - Data Ready, Grid Missing

---

## Current State

### ✅ What Exists

**1. American Species Data (180 total species)**
- NW_Atlantic: 60 species (Black Drum, Silver Hake, Spotted Seatrout...)
- Gulf_of_Mexico: 52 species
- NE_Pacific: 56 species (California Corbina, Steelhead...)
- Caribbean: 29 species
- US_Atlantic: 18 species
- Hawaii: 16 species
- Gulf_of_Alaska: 11 species
- Sea_of_Cortez: 2 species

**2. API Fallback Logic**
The API (`pages/api/findr/predictions.ts`) already has v2 function fallback:
```typescript
{
  name: 'get_fishing_predictions_v2',
  params: {
    p_region_code: regionCode,  // Caribbean, Gulf_of_Mexico, etc.
    target_rectangle: rectangleCode,
    target_date: predictionDate,
    p_lang: language,
  }
}
```

**3. Region-Based Filtering**
Species already have `biogeographic_regions` array field ready to match against user location.

### ❌ What's Missing

**1. American Grid System**
- Database currently has **284 rectangles, all European**
- No grid codes for American waters
- Fallback data (`lib/findr/fallbackRectangles.ts`) only contains 111 European rectangles

**2. `get_fishing_predictions_v2` RPC Function**
- Function referenced in API but **doesn't exist in database**
- Would need similar structure to `get_environmental_predictions_enhanced`
- Must use region codes directly instead of rectangle mapping

**3. Location → Region Mapping**
- Need system to map coordinates to biogeographic regions for American waters
- European system uses ICES rectangles → region mapping
- American system likely needs lat/lon → region direct mapping

---

## Architecture Design (Inferred)

### European Approach (Current, Working)
```
User Location (51.5°N, 1.5°E)
  ↓
ICES Rectangle (31F1)
  ↓
Rectangle → Region Mapping (31F1 → "NE_Atlantic")
  ↓
Species Filter (biogeographic_regions contains "NE_Atlantic")
  ↓
Environmental Matching + Scoring
  ↓
Predictions
```

### American Approach (Planned, Not Implemented)
```
User Location (25°N, -80°W)
  ↓
Grid Code (???) OR Direct Region Mapping
  ↓
Region Code (e.g., "Caribbean", "Gulf_of_Mexico")
  ↓
Species Filter (biogeographic_regions contains region)
  ↓
Environmental Matching + Scoring
  ↓
Predictions
```

---

## What Needs to Be Done

### Option A: Create American Grid System (More Work)

**1. Define Grid Codes for American Waters**
- Create rectangle codes for NW Atlantic, Caribbean, Gulf of Mexico, NE Pacific, etc.
- Similar format to ICES (e.g., "51A3" for Gulf of Mexico grid)
- Store in `lib/findr/fallbackRectangles.ts` or separate file

**2. Seed Database**
```bash
npm run seed:findr:rectangles  # Would need to include American grids
```

**3. Create/Update v2 Function**
- Map American grid codes → biogeographic regions
- Same varchar→text fixes as enhanced function

### Option B: Direct Region Mapping (Simpler, Faster)

**1. Create Region Boundary Definitions**
```typescript
// lib/findr/americanRegions.ts
export function getRegionFromCoordinates(lat: number, lon: number): string | null {
  // Caribbean: 10°N-25°N, -85°W to -60°W
  if (lat >= 10 && lat <= 25 && lon >= -85 && lon <= -60) {
    return 'Caribbean';
  }

  // Gulf of Mexico: 18°N-30°N, -98°W to -80°W
  if (lat >= 18 && lat <= 30 && lon >= -98 && lon <= -80) {
    return 'Gulf_of_Mexico';
  }

  // NW Atlantic: 25°N-45°N, -80°W to -60°W
  if (lat >= 25 && lat <= 45 && lon >= -80 && lon <= -60) {
    return 'NW_Atlantic';
  }

  // ... etc for other regions

  return null;
}
```

**2. Create Simpler v2 Function**
```sql
CREATE OR REPLACE FUNCTION get_fishing_predictions_v2(
  p_region_code text,
  target_date date,
  p_lang text DEFAULT 'en'
)
RETURNS TABLE (...)
AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM species s
  WHERE (
    s.biogeographic_regions IS NULL
    OR p_region_code = ANY(s.biogeographic_regions)
  )
  ...
END;
$$;
```

**3. Update API to Use Region Directly**
- If no rectangle code, use lat/lon → region mapping
- Pass region code to v2 function
- Skip rectangle/grid lookup for American waters

---

## Recommended Path Forward

**Option B (Direct Region Mapping)** is faster and simpler:

1. ✅ Species data already exists
2. ✅ API already tries v2 function
3. ⏳ Create region boundary definitions
4. ⏳ Create `get_fishing_predictions_v2` function (with varchar→text fixes)
5. ⏳ Update API to map coordinates → region for American waters

This avoids needing to create thousands of grid codes for American waters and can be implemented quickly.

**Later**, if fine-grained resolution is needed, can add American grid system similar to ICES rectangles.

---

## Next Steps

1. **Decide on approach** (Option A or B)
2. **Create region boundary definitions** if using Option B
3. **Create `get_fishing_predictions_v2` function** with:
   - Same varchar→text fixes as enhanced function
   - Direct region code matching (no rectangle mapping)
   - Language support for localized names
4. **Test with American coordinates** (e.g., Florida: 25.7°N, -80.2°W should return Caribbean species)
5. **Add environmental data source** for American waters (NOAA? CMEMS has some US coverage?)

---

## Files to Create/Modify

### New Files:
- `lib/findr/americanRegions.ts` - Region boundary definitions
- `supabase/migrations/[timestamp]_create_fishing_predictions_v2.sql` - v2 function

### Modify:
- `pages/api/findr/predictions.ts` - Add region mapping logic for American waters
- `lib/findr/rectangle.ts` - Add `getRegionFromCoordinates()` helper

---

**Status:** Ready to implement once approach is confirmed.
