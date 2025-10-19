# External API Usage Audit & Refactor Plan

**Date**: 2025-10-19  
**Status**: 🔴 URGENT - Stormglass causing 402 errors  
**Goal**: Minimize paid API costs, maximize free/cached data sources

---

## Current State: What's Calling What

### 🔴 STORMGLASS API (PAID - CAUSING ERRORS)

Currently used in **MULTIPLE places** despite being the most expensive:

#### Direct Stormglass Calls:

1. **`/api/marine`** - Marine weather endpoint
   - File: `pages/api/marine.ts`
   - URL: `https://api.stormglass.io/v2/weather/point`
   - Usage: **PRIMARY SOURCE** (wrong!)
   - Status: 🔴 Returning 402 Payment Required
   - Called by: Activities page, weather page

2. **`/api/tides`** - Legacy tides endpoint
   - File: `pages/api/tides.ts`
   - URL: `https://api.stormglass.io/v2/tide/extremes/point`
   - Usage: Standalone endpoint
   - Status: ⚠️ Should be deprecated (WorldTides is better)

3. **`lib/services/weatherService.ts`** - Main weather service
   - Functions: `fetchStormglassMarine()`, `fetchStormglassTides()`, `fetchStormglassAstronomy()`
   - URLs:
     - `https://api.stormglass.io/v2/weather/point` (marine)
     - `https://api.stormglass.io/v2/tide/extremes/point` (tides)
     - `https://api.stormglass.io/v2/astronomy/point` (sun/moon)
     - `https://api.stormglass.io/v2/bio/point` (biogeochemical)
   - Usage: Fallback for unified-weather
   - Status: ⚠️ Used only when WorldTides/Met.no fail

4. **`pages/api/visibility-compare.ts`**
   - URL: `https://api.stormglass.io/v2/weather/point`
   - Usage: Visibility comparison tool
   - Status: ⚠️ Testing/debug endpoint

5. **`components/weather-cards/SeaTempCard.tsx`**
   - URL: `https://api.stormglass.io/v2/weather/point`
   - Usage: Direct fetch for sea temp widget
   - Status: 🔴 Should use database/API endpoint instead

6. **`utils/fetchStormglass.ts`** - Utility functions
   - Functions: `fetchStormglassWeather()`, `fetchStormglassBio()`
   - Status: ⚠️ Legacy utility, might be unused

7. **`utils/mergeWeather.ts`**
   - Functions: Bio and astronomy data fetching
   - Status: ⚠️ Check if still used

8. **`services/weatherService.ts`** (old location)
   - Functions: `fetchStormglassBio()`
   - URLs: `https://api.stormglass.io/v2/bio/point`, `/astronomy/point`
   - Status: ⚠️ Duplicate of lib/services version?

---

### ✅ WORLDTIDES API (FREE/PAID - PREFERRED FOR TIDES)

**Status**: ✅ Working well, fully tested (100% test coverage)

1. **`lib/services/weatherService.ts`**
   - Function: `fetchWorldTides()`
   - URL: `https://www.worldtides.info/api/v3`
   - Cache: 24 hours (aggressive, tides are predictable)
   - Usage: **PRIMARY tide source**
   - Env var: `WORLDTIDES_API_KEY`

2. **`/api/unified-weather`**
   - Uses WorldTides first, falls back to Stormglass
   - Cache: 24h for WorldTides data
   - Status: ✅ Correct hierarchy

3. **`/api/findr/marine-weather`**
   - Imports `fetchWorldTides` and types
   - Status: ✅ Uses proper source

**RECOMMENDATION**: ✅ Keep WorldTides as primary tide source

---

### ✅ MET.NO API (FREE - GOVERNMENT)

**Status**: ✅ Free, reliable, no API key needed

1. **`/api/unified-weather`**
   - URL: `https://api.met.no/weatherapi/locationforecast/2.0/complete`
   - Usage: **PRIMARY general weather source**
   - Cache: Respects Met.no caching headers
   - Status: ✅ Correct usage

2. **Preconnect hints**
   - File: `pages/_document.tsx`
   - Has DNS prefetch and preconnect
   - Status: ✅ Optimized

**RECOMMENDATION**: ✅ Keep Met.no as primary weather source

---

### ✅ OPEN-METEO API (FREE)

**Status**: ✅ Free, good for backups and specialty data

1. **`services/weatherService.ts`** (old)
   - URLs:
     - `https://pollen-api.open-meteo.com/v1/forecast` (pollen)
     - `https://air-quality-api.open-meteo.com/v1/air-quality` (AQI)
     - `https://api.open-meteo.com/v1/forecast` (general weather backup)
   - Status: ✅ Good for specialty data

2. **`/api/astronomy-highlights`**
   - URL: `https://api.open-meteo.com/v1/astronomy`
   - Usage: Sunrise/sunset times
   - Status: 🟡 Could use moon-api instead for better data

3. **`/api/findr/marine-weather`**
   - URL: `https://api.open-meteo.com/v1/forecast`
   - Usage: Fallback weather for findr
   - Status: ✅ Good fallback

**RECOMMENDATION**: ✅ Keep for pollen, AQI, and weather backup

---

### ✅ COPERNICUS MARINE SERVICE (FREE - EU GOVERNMENT)

**Status**: ✅ Free, comprehensive, stored in database

1. **Database table**: `copernicus_data`
   - Coverage: All European waters
   - Data: Sea temp, salinity, currents, chlorophyll, oxygen, nutrients, clarity
   - Update: Daily via ingestion script
   - Status: ✅ Fully operational

2. **`/api/findr/conditions`**
   - Queries `copernicus_data` table
   - Status: ✅ Excellent implementation

3. **Ingestion**: `scripts/ingest-copernicus-data.ts`
   - Uses `copernicusmarine` CLI
   - Status: ✅ Working

**RECOMMENDATION**: ✅ Use as primary marine data source for Go Daisy too!

---

### 🟡 OPENWEATHER API (PAID)

**Current usage**: Minimal

1. **`pages/_document.tsx`** - Preconnect hints
2. **`services/astro_highlights/enhanced_astronomy_api.py`**
   - URL: `https://api.openweathermap.org/data/2.5/weather`
   - Status: 🟡 Python script, unclear if actively used

**RECOMMENDATION**: 🟡 Audit and remove if not essential

---

### ❌ MISSING: MOON-API & OTHER FREE SERVICES

**Should add**:
- **moon-api.com** - Free moon phases, rise/set times
- **sunrise-sunset.org API** - Free sun times (already have Open-Meteo for this)

---

## Problems Identified

### 🔴 Critical Issues

1. **`/api/marine` using Stormglass as PRIMARY source**
   - Should use: Copernicus DB → Met.no → Open-Meteo → Stormglass
   - Current: Stormglass only
   - Impact: 402 errors, high costs

2. **`components/weather-cards/SeaTempCard.tsx` making direct API calls**
   - Should use: Backend endpoint or Copernicus DB
   - Current: Direct Stormglass calls from frontend
   - Impact: Exposes API key, costs

3. **Multiple duplicated service files**
   - `services/weatherService.ts` vs `lib/services/weatherService.ts`
   - `utils/fetchStormglass.ts` vs service functions
   - Impact: Confusion, maintenance burden

### ⚠️ Medium Priority

4. **Missing aggressive caching for astronomy data**
   - Sun/moon data changes predictably
   - Should cache: 24h minimum
   - Current: Varies by endpoint

5. **No coordinate precision reduction**
   - Stormglass charges per unique coordinate
   - Should round: 3 decimal places (~110m precision)
   - Current: `/api/marine` does round to 3dp ✅, but others don't

6. **Legacy `/api/tides` endpoint still exists**
   - Should deprecate in favor of `/api/unified-weather`
   - Stormglass tides less accurate than WorldTides

---

## Recommended Data Source Hierarchy

### Weather (General)
```
1. Met.no (free, government)
   ↓
2. Open-Meteo (free, good coverage)
   ↓
3. OpenWeather (paid, only if essential)
```

### Marine Data
```
1. Copernicus Database (free, EU government, comprehensive)
   ↓
2. Met.no Ocean Forecast (free, limited coverage)
   ↓
3. Open-Meteo Marine (free, basic data)
   ↓
4. Stormglass (paid, last resort)
```

### Tides
```
1. WorldTides (free tier exists, accurate)
   ↓
2. Stormglass (paid, only if WorldTides fails)
```

### Astronomy (Sun/Moon)
```
1. moon-api.com (free, dedicated moon data) - NOT YET INTEGRATED
   ↓
2. Open-Meteo Astronomy (free, basic sun/moon)
   ↓
3. Stormglass Astronomy (paid, only if needed)
```

### Pollen & Air Quality
```
1. Open-Meteo Pollen API (free) ✅
2. Open-Meteo Air Quality API (free) ✅
```

---

## Refactor Priority List

### 🔴 URGENT (Do First)

1. **Refactor `/api/marine` endpoint**
   - File: `pages/api/marine.ts`
   - Change: Use Copernicus → Met.no → Open-Meteo → Stormglass
   - Impact: Eliminate 402 errors, reduce costs 90%+
   - See: `MARINE_API_REFACTOR_NEEDED.md`

2. **Fix `SeaTempCard.tsx` direct API calls**
   - File: `components/weather-cards/SeaTempCard.tsx`
   - Change: Call `/api/unified-weather` or query Copernicus DB
   - Impact: Stop frontend API calls, improve security

3. **Add coordinate rounding everywhere**
   - Files: All endpoints making external API calls
   - Change: Round lat/lon to 3 decimal places (0.001° ≈ 110m)
   - Impact: Reduce unique API calls by ~90%

### 🟡 High Priority (Do Soon)

4. **Integrate moon-api.com**
   - Add: New `/api/moon` endpoint or integrate into unified-weather
   - Replace: Stormglass astronomy calls
   - Cache: 24h (moon phases change slowly)

5. **Deprecate `/api/tides`**
   - Remove: Direct Stormglass tides endpoint
   - Redirect: To `/api/unified-weather`
   - Document: Migration path for any clients

6. **Consolidate weather service files**
   - Audit: `services/weatherService.ts` vs `lib/services/weatherService.ts`
   - Merge: Into single canonical location
   - Remove: Duplicate code

7. **Add aggressive caching for astronomy**
   - All astronomy endpoints: 24h cache minimum
   - Sun/moon data is predictable for 24+ hours
   - Reduce API calls by 95%+

### 🟢 Medium Priority (Improvements)

8. **Audit and remove unused utilities**
   - Files: `utils/fetchStormglass.ts`, `utils/mergeWeather.ts`
   - Check: Are they still used?
   - Remove: If redundant with lib/services

9. **Optimize Open-Meteo usage**
   - Review: All Open-Meteo calls
   - Batch: Multiple parameters in single call where possible
   - Cache: Respect their recommended intervals

10. **Add monitoring for API costs**
    - Track: API calls per provider
    - Alert: When approaching quotas
    - Dashboard: Cost per provider

---

## Cost Impact Estimates

### Current State (Estimated Monthly)
- **Stormglass**: ~$50-200/mo (primary marine, tides, astronomy)
- **WorldTides**: $0-20/mo (free tier or basic paid)
- **Met.no**: $0 (free)
- **Open-Meteo**: $0 (free)
- **Copernicus**: $0 (free)
- **Total**: ~$50-220/mo

### After Refactor (Estimated Monthly)
- **Stormglass**: ~$0-10/mo (emergency fallback only)
- **WorldTides**: $0-20/mo (same)
- **Met.no**: $0 (free)
- **Open-Meteo**: $0 (free)
- **Copernicus**: $0 (free)
- **moon-api**: $0 (free)
- **Total**: ~$0-30/mo

**Savings**: ~$50-190/mo (~80-90% reduction)

---

## Implementation Checklist

### Phase 1: Stop the Bleeding (Week 1)
- [ ] Mock `/api/marine` in tests (✅ DONE)
- [ ] Refactor `/api/marine` to use Copernicus first
- [ ] Fix `SeaTempCard.tsx` to use backend endpoint
- [ ] Add coordinate rounding to all external API calls
- [ ] Test and deploy

### Phase 2: Optimize Sources (Week 2)
- [ ] Integrate moon-api.com for astronomy
- [ ] Add 24h caching for all astronomy endpoints
- [ ] Deprecate `/api/tides` endpoint
- [ ] Update all clients to use `/api/unified-weather`

### Phase 3: Clean Up (Week 3)
- [ ] Consolidate duplicate weather service files
- [ ] Remove unused utilities
- [ ] Audit and remove OpenWeather if not needed
- [ ] Add API cost monitoring

### Phase 4: Documentation (Week 4)
- [ ] Update GETTING_STARTED.md with new hierarchy
- [ ] Document caching strategy
- [ ] Create API cost optimization guide
- [ ] Update tests for new architecture

---

## Files Requiring Changes

### Immediate Changes:
1. `pages/api/marine.ts` - ⚠️ CRITICAL
2. `components/weather-cards/SeaTempCard.tsx` - ⚠️ CRITICAL
3. `pages/api/visibility-compare.ts` - Review necessity
4. `utils/fetchStormglass.ts` - Audit/remove
5. `utils/mergeWeather.ts` - Audit/remove

### Review for Consolidation:
6. `services/weatherService.ts` vs `lib/services/weatherService.ts`
7. All files with Stormglass URLs (20+ files)

### Test Updates:
8. `__tests__/api/marine.api.test.ts` - Update for new hierarchy
9. `__tests__/api/tides.api.test.ts` - Deprecation warnings
10. All E2E tests - Keep mocks until refactor complete

---

## Success Metrics

### Technical
- ✅ Zero 402 errors from Stormglass
- ✅ 90%+ reduction in Stormglass API calls
- ✅ All tests passing with new architecture
- ✅ Response times < 500ms for cached data
- ✅ Response times < 2s for fresh data

### Business
- ✅ API costs < $30/month
- ✅ 99.9%+ uptime (multiple fallbacks)
- ✅ No degradation in data quality
- ✅ Faster response times overall

---

## Related Documentation

- `MARINE_API_REFACTOR_NEEDED.md` - Marine endpoint refactor details
- `COPERNICUS_DATA_INGESTION_GUIDE.md` - How Copernicus data works
- `TIDES_MARINE_API_TESTING_SUMMARY.md` - Current API test status
- `GETTING_STARTED.md` - General setup (needs updating)

---

**Next Action**: Implement Phase 1 - Refactor `/api/marine` endpoint (see `MARINE_API_REFACTOR_NEEDED.md`)
