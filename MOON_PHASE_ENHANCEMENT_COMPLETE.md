# Moon API Enhancement: Phase Stage & Countdown Fields

**Date:** 17 October 2025  
**Status:** ✅ Code Complete - Database Migration Required

## Summary

Successfully added three new fields to the moon data API:
1. **`phase_stage`** - Current stage of moon cycle ("waxing" or "waning")
2. **`days_until_next_full_moon`** - Integer countdown to next full moon
3. **`days_until_next_new_moon`** - Integer countdown to next new moon

## Test Results

```
📊 Moon Phase Data:
────────────────────────────────────────────────────────────
Phase Name:              WANING_CRESCENT
Phase Fraction:          0.8815
Phase Stage:             waning ⭐ NEW
Illumination:            0.0%
Days Until Full Moon:    18 days ⭐ NEW
Days Until New Moon:     3 days ⭐ NEW
────────────────────────────────────────────────────────────

✅ Validation:
────────────────────────────────────────────────────────────
✓ Phase Stage exists
✓ Phase Stage is waxing or waning
✓ Days Until Full Moon is a number
✓ Days Until New Moon is a number
✓ Days Until Full Moon is 0-29
✓ Days Until New Moon is 0-29
────────────────────────────────────────────────────────────

🎉 All validations passed!
```

## Changes Made

### 1. Core Service Layer (`lib/astro/moonService.ts`)

#### New Helper Functions
```typescript
function getMoonPhaseStage(phaseFraction?: number): string | undefined
  // Returns 'waxing' (0-0.5) or 'waning' (0.5-1)

function calculateDaysUntilNextPhase(phaseFraction?: number): {
  daysUntilFullMoon?: number;
  daysUntilNewMoon?: number;
}
  // Calculates countdown based on 29.53-day lunar cycle
```

#### Updated Interfaces
- `MoonSunData` - Added 3 new optional fields
- `MoonCacheRow` - Added 3 new database columns (nullable)
- `IpGeoAstronomyResponse` - Added `moon_illumination_percentage` field

#### Bug Fix
Fixed illumination parsing to use correct API field name:
- ❌ Was: `data.moon_illumination`
- ✅ Now: `data.moon_illumination_percentage ?? data.moon_illumination`

### 2. Type Definitions (`types/weather.ts`)

Updated `MoonInfo` interface:
```typescript
export interface MoonInfo {
  // ... existing fields ...
  phaseStage?: string;              // NEW: 'waxing' or 'waning'
  daysUntilNextFullMoon?: number;   // NEW: 0-29 days
  daysUntilNextNewMoon?: number;    // NEW: 0-29 days
}
```

### 3. API Endpoint (`pages/api/moon.ts`)

Updated moon object in response:
```typescript
moon: {
  // ... existing fields ...
  stage: data.moonPhaseStage ?? getMoonStage(phaseFraction),
  days_until_next_full_moon: data.daysUntilNextFullMoon ?? null,
  days_until_next_new_moon: data.daysUntilNextNewMoon ?? null,
}
```

### 4. UI Component (`components/weather-cards/MoonCard.tsx`)

Added display of new fields in the details section:
- Shows phase stage in card header (e.g., "Waning Crescent Moon (waning)")
- Displays countdown to next full/new moon in the expanded details grid
- Formats: "Today", "Tomorrow", or "X days"

## Database Migration Required

**File:** `supabase/migrations/add_moon_phase_stage_and_countdown.sql`

```sql
ALTER TABLE moon_cache
ADD COLUMN IF NOT EXISTS moon_phase_stage TEXT;

ALTER TABLE moon_cache
ADD COLUMN IF NOT EXISTS days_until_next_full_moon INTEGER;

ALTER TABLE moon_cache
ADD COLUMN IF NOT EXISTS days_until_next_new_moon INTEGER;
```

**Action Required:** Run this migration in Supabase to enable caching of new fields.

## API Source

**Provider:** ipgeolocation.io Astronomy API  
**Endpoint:** `https://api.ipgeolocation.io/astronomy`  
**API Key:** Stored in `MOON_API_KEY` environment variable

### API Response Fields Used
- `moon_phase` → Phase name (e.g., "WANING_CRESCENT")
- `moon_illumination_percentage` → Illumination (e.g., "-13.24")
- `moon_angle` → Used to calculate phase fraction (0-360°)

### Calculated Fields
- **Phase Stage:** Derived from phase fraction (0-0.5 = waxing, 0.5-1 = waning)
- **Days Until Full Moon:** Calculated from phase fraction using lunar cycle (29.53 days)
- **Days Until New Moon:** Calculated from phase fraction using lunar cycle

## Testing

Run test script:
```bash
npx tsx scripts/test-moon-phase-fields.ts
```

## Next Steps

1. ✅ Code implementation complete
2. ⏳ Run database migration in Supabase
3. ⏳ Verify caching works after migration
4. ⏳ Deploy to production

## Files Modified

- `lib/astro/moonService.ts` - Core moon data service
- `types/weather.ts` - TypeScript interfaces
- `pages/api/moon.ts` - API endpoint
- `components/weather-cards/MoonCard.tsx` - UI component
- `supabase/migrations/add_moon_phase_stage_and_countdown.sql` - Database migration (new)
- `scripts/test-moon-phase-fields.ts` - Test script (new)
