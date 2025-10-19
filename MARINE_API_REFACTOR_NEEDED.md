# Marine API Refactor - Data Source Priority

## Current Issue

The `/api/marine` endpoint currently calls **Stormglass API directly** as its only data source. This is causing:
- 402 Payment Required errors (quota/subscription issues)
- Unnecessary API costs
- Test failures when Stormglass is unavailable

## Existing Infrastructure

We already have:
- ✅ **Copernicus marine data** stored in `copernicus_data` table
- ✅ **Findr successfully using this data** via `/api/findr/conditions`
- ✅ Data ingestion pipeline (`ingest-copernicus-data.ts`)
- ✅ Met.no integration for weather data
- ✅ OpenMeteo as fallback weather source

## Required Data Source Hierarchy

Go Daisy's `/api/marine` should follow this priority:

```
1. Copernicus (copernicus_data table)
   ↓ if unavailable/stale
2. Met.no APIs
   ↓ if unavailable
3. OpenMeteo
   ↓ only as last resort
4. Stormglass
```

## Implementation Plan

### 1. Refactor `/api/marine` endpoint

**File:** `pages/api/marine.ts`

**Changes needed:**
- Query `copernicus_data` table first (using lat/lon to find nearest rectangle)
- Fall back to Met.no ocean forecast API
- Fall back to OpenMeteo marine data
- Only use Stormglass as last resort

**Reference implementation:** `/api/findr/conditions` (lines 1-425) shows how to:
- Query Supabase for Copernicus data
- Handle coordinate snapping
- Manage fallback conditions
- Return proper data structure

### 2. Data mapping

Ensure Copernicus data maps to expected marine data structure:
- `sea_temp_c` → `waterTemperature`
- `wave_height_m` → `waveHeight`
- `current_speed_ms` → `currentSpeed`
- `wind_speed_kts` → `windSpeed`
- etc.

### 3. Cache strategy

- Keep existing in-memory cache
- Add database query cache (already have TTL logic)
- Respect model cycle timing (00, 06, 12, 18 UTC)

### 4. Test updates

**Current workaround:** Tests mock the `/api/marine` endpoint to return empty data
**Future:** Update mocks to return realistic Copernicus-style data for better test coverage

## Benefits

- ✅ **Free** - Copernicus is free, Met.no is free, OpenMeteo is free
- ✅ **Reliable** - Multiple fallbacks prevent single point of failure
- ✅ **Faster** - Database query faster than external API
- ✅ **Consistent** - Same data source as findr
- ✅ **Better coverage** - Copernicus has comprehensive European waters data

## Files to Modify

1. `pages/api/marine.ts` - Main endpoint refactor
2. `pages/activities.tsx` - Verify it handles new data structure
3. `e2e/go-daisy-activities.spec.ts` - Update mocks with realistic data (optional)
4. `lib/services/marineService.ts` - If exists, update data fetching logic

## Priority

**Medium** - Tests are now stable with mocks, but this should be done before production deployment to avoid Stormglass costs and errors.

## Related Documentation

- `COPERNICUS_DATA_INGESTION_GUIDE.md` - How Copernicus data is ingested
- `CMEMS_INTEGRATION_STATUS.md` - Integration status
- `pages/api/findr/conditions.ts` - Reference implementation
- `GETTING_STARTED.md` - Data sources overview

## Test Status

- ✅ Tests temporarily mocked to prevent Stormglass errors
- ⏳ Awaiting proper data source hierarchy implementation
- 🎯 Target: Remove mocks once refactor is complete

---

**Created:** 2025-10-19  
**Status:** Documented, implementation pending  
**Impact:** Medium priority - enables free, reliable marine data for Go Daisy
