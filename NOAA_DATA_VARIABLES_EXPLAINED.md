# NOAA Data Variables - What We're Getting

**Date:** October 24, 2025

---

## Current NOAA OISST Integration

### What We're Ingesting ✅

**NOAA OISST (Optimum Interpolation Sea Surface Temperature)**
- **Variable:** Sea Surface Temperature (SST)
- **Units:** Celsius (converted from Kelvin)
- **Resolution:** 0.25° (perfect match for our grid!)
- **Coverage:** Global ocean
- **Update frequency:** Daily
- **Quality:** High (blended satellite + in-situ observations)

**Database fields populated:**
```sql
surface_temperature_c: 12.5  -- POPULATED ✅
bottom_temperature_c: NULL   -- Not available from OISST
salinity_psu: NULL           -- Not available from OISST
oxygen_mg_l: NULL            -- Not available from OISST
chlorophyll_mg_m3: NULL      -- Not available from OISST
```

**Source tag:**
```
sources: ['ncdcOisst21Agg_LonPM180.sst']
```

---

## Why Only Temperature?

**NOAA OISST is a specialized dataset:**
- Focuses exclusively on sea surface temperature
- Uses satellite infrared and microwave sensors
- Blends multiple data sources for optimal accuracy
- Does NOT include salinity, oxygen, chlorophyll, etc.

**This is different from European CMEMS data:**
- CMEMS provides full biogeochemical suite
- European grids have: temperature, salinity, oxygen, chlorophyll, nutrients
- American grids (NOAA OISST): temperature only

---

## Impact on Predictions

### Environmental Matching with Temperature Only

**What still works:**
- Temperature matching (most important factor for fish)
- Biogeographic region filtering
- Guild-specific scoring
- Confidence scores

**Example prediction scoring:**
```javascript
// With full environmental data (European grids):
temperature_score: 85  ✅
salinity_score: 75     ✅
oxygen_score: 80       ✅
chlorophyll_score: 70  ✅
→ Overall confidence: 78%

// With temperature only (American NOAA grids):
temperature_score: 85  ✅
salinity_score: NULL   ❌ (uses defaults)
oxygen_score: NULL     ❌ (uses defaults)
chlorophyll_score: NULL ❌ (uses defaults)
→ Overall confidence: 65-70% (still good!)
```

**Why this is acceptable:**
1. Temperature is the PRIMARY environmental driver for fish distribution
2. Biogeographic region ensures correct species pool
3. Better than mock data or no data (50% confidence fallback)
4. American predictions will still be significantly improved

---

## Data Source Comparison

| Variable | European (CMEMS) | American (NOAA OISST) | Global (Future) |
|----------|-----------------|----------------------|-----------------|
| **Surface Temperature** | ✅ Real | ✅ Real | ✅ NOAA OISST |
| **Bottom Temperature** | ✅ Real | ❌ None | ⏳ Copernicus Global |
| **Salinity** | ✅ Real | ❌ None | ⏳ HYCOM / Copernicus |
| **Dissolved Oxygen** | ✅ Real | ❌ None | ⏳ Copernicus Global |
| **Chlorophyll** | ✅ Real | ❌ None | ⏳ NASA Ocean Color |
| **Nutrients** | ✅ Real | ❌ None | ⏳ Regional models |

---

## Future Enhancements for American Waters

### Option 1: NOAA NCEI Regional Models
**Add more variables for US coastal waters:**
- Salinity from NOAA Coastal Ocean Models
- Chlorophyll from NASA MODIS/VIIRS satellite
- Oxygen from biogeochemical models
- Bottom temperature from in-situ buoys

**Coverage:** US coastal zones only
**Complexity:** Medium (multiple APIs)
**Timeline:** 2-3 months

### Option 2: Copernicus Global Ocean
**Use CMEMS global products for Americas:**
- Same data source as Europe
- Full biogeochemical suite
- Global 0.25° resolution

**API:** https://data.marine.copernicus.eu/products
**Products:**
- `GLOBAL_ANALYSISFORECAST_PHY_001_024` (temperature, salinity, currents)
- `GLOBAL_ANALYSISFORECAST_BGC_001_028` (oxygen, chlorophyll, nutrients)

**Coverage:** Global ocean
**Complexity:** Low (already integrated for Europe)
**Timeline:** 1-2 weeks

### Option 3: Regional High-Resolution Sources
**Use US regional data servers:**
- **NERACOOS** (Northeast): Full suite, high resolution
- **SCCOOS** (California): Full suite, high resolution
- **GCOOS** (Gulf of Mexico): Full suite, high resolution
- **PacIOOS** (Hawaii): Full suite, high resolution

**Coverage:** US coastal zones, very high resolution
**Complexity:** High (multiple APIs, different formats)
**Timeline:** 3-4 months

---

## Recommended Approach

### Phase 1: Current (Temperature Only) ✅
**Status:** In progress via GitHub Actions workflow
- NOAA OISST sea surface temperature
- Covers all American coastal waters
- Rate: 120 grids/day
- Timeline: 1-2 weeks to replace all mock data

**Prediction quality:**
- Temperature matching: ✅ Accurate
- Other variables: Uses species defaults
- Overall confidence: 65-70% (vs 78% for European grids)
- Still much better than 50% fallback mode

### Phase 2: Add Copernicus Global (Recommended)
**Timeline:** After Phase 1 complete
- Extend existing CMEMS integration to Americas
- Use `GLOBAL_ANALYSISFORECAST_PHY_001_024` dataset
- Provides salinity, currents, bottom temperature
- Brings American grids to parity with European grids (78% confidence)

**Implementation:**
1. Modify existing `copernicus/realClient.ts` to support global products
2. Update `ingest-conditions` Edge Function to query global API
3. Populate American grids with full environmental suite
4. Remove NOAA OISST-only data, replace with Copernicus

### Phase 3: Add NASA Chlorophyll
**Timeline:** 2-3 months
- NASA Ocean Color Web (OCW) API
- MODIS Aqua or VIIRS sensor data
- Chlorophyll-a concentration
- Complements Copernicus physical/chemical data

### Phase 4: Regional High-Resolution (Optional)
**Timeline:** 3-6 months
- Add NERACOOS, SCCOOS, GCOOS, PacIOOS
- Very high resolution coastal data
- Complements global Copernicus coverage
- Provides near-shore predictions

---

## Current Grid Data Status

### European Waters (Production Ready)
```
Source: CMEMS Regional
Variables: temperature, salinity, oxygen, chlorophyll, nutrients
Grids: 222
Confidence: 75-80%
Quality: High
```

### American Waters (In Progress)
```
Source: NOAA OISST
Variables: temperature ONLY
Grids: 10 real + 492 mock (being replaced)
Confidence: 65-70% (temperature-based)
Quality: High (for temperature)
```

### Future American Waters (Recommended)
```
Source: Copernicus Global
Variables: temperature, salinity, oxygen, chlorophyll, nutrients
Grids: All American coastal
Confidence: 75-80%
Quality: High
```

---

## CLI Commands to Check Data

### Count grids by variable coverage
```bash
# Grids with temperature only (NOAA OISST)
npx tsx -e "(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { count } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .not('surface_temperature_c', 'is', null)
    .is('salinity_psu', null);
  console.log('Grids with temperature only:', count);
})();"

# Grids with full environmental suite (CMEMS)
npx tsx -e "(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { count } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .not('surface_temperature_c', 'is', null)
    .not('salinity_psu', 'is', null)
    .not('oxygen_mg_l', 'is', null);
  console.log('Grids with full suite:', count);
})();"
```

### View a sample American grid
```bash
npx tsx -e "(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data } = await supabase
    .from('grid_conditions_latest')
    .select('*')
    .contains('sources', ['ncdcOisst21Agg_LonPM180.sst'])
    .limit(1)
    .single();
  console.log('Sample NOAA grid:', JSON.stringify(data, null, 2));
})();"
```

---

## Summary

**Current integration:** NOAA OISST provides temperature only
- ✅ Temperature is the most important variable for fish
- ✅ Still much better than mock data or fallback mode
- ✅ Enables 65-70% confidence predictions (vs 50% fallback)
- ⚠️ Missing salinity, oxygen, chlorophyll reduces confidence slightly

**Recommended next step:** Extend Copernicus Global to Americas
- Would bring American grids to parity with European grids
- Full environmental suite (temperature, salinity, oxygen, chlorophyll)
- 75-80% confidence predictions
- Estimated timeline: 1-2 weeks after current NOAA population complete

**Current priority:** Complete NOAA OISST population
- Automated via GitHub Actions (120 grids/day)
- Replaces all 492 mock data grids with real temperature
- Ready in 1-2 weeks

---

**Created:** October 24, 2025
