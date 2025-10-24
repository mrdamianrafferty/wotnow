# Grid Data Population Status

**Date:** October 24, 2025
**Status:** ⚠️ **NEEDS ATTENTION**

---

## Current Situation

### Global Grid System (NEW)
- **Table**: `grid_conditions_latest`
- **Grid cells**: 65,884 worldwide (0.25° resolution)
- **Cells with data**: **Only 5** (0.008% coverage)
- **Data sources**: NOAA OISST (sea surface temperature only)
- **Coverage**: Test data only - not production ready

### ICES Rectangle System (OLD - European Only)
- **Table**: `findr_conditions_snapshots`
- **Rectangles**: 284 (European waters)
- **Coverage**: **99.7%** (283/284 rectangles)
- **Data sources**: CMEMS (full environmental suite)
- **Ingestion**: `scripts/ingest-copernicus-data.ts` (works well)
- **Automated**: GitHub Actions cron job

---

## Problem

**The new global grid system (`grid_025deg`) has almost no environmental data!**

Current predictions use:
- ✅ **Biogeographic region matching**: Works worldwide (fallback mode)
- ❌ **Environmental matching**: Only 5 grids have data (0.008% coverage)

This means:
- San Francisco: NO environmental data → fallback to base scores
- Florida: NO environmental data → fallback to base scores
- New York: NO environmental data → fallback to base scores
- Europe: NO environmental data in new system (old ICES system has data)

---

## Data Sources Available

### For European Waters
**CMEMS (Copernicus Marine Environment Monitoring Service)**
- Current usage: ICES rectangles (old system)
- Available data:
  - Ocean currents (speed, direction)
  - Water temperature
  - Salinity
  - Water clarity (kd490)
  - Chlorophyll, oxygen
  - Zooplankton, phytoplankton
  - Waves

### For American Waters
**NOAA (National Oceanic and Atmospheric Administration)**
- Current usage: 5 test grids (SST only)
- Available datasets:
  - OISST (sea surface temperature) - partially working
  - NCEI (ocean currents, salinity)
  - ERDDAP servers (comprehensive data)
- Coverage: US East Coast, Gulf of Mexico, US West Coast

### Global Coverage
**NOAA OISST 0.25° Global**
- Resolution: Perfect match for grid_025deg!
- Coverage: Worldwide oceans
- Variables: Sea surface temperature
- Update frequency: Daily
- Current status: Only 5 test grids populated

---

## What Needs to Be Done

### Immediate (High Priority)

**1. Create Global Grid Ingestion Script**
```
scripts/ingest-grid-conditions.ts
```

Should:
- Fetch NOAA OISST for all `grid_025deg` cells
- For European grids: fetch CMEMS data (full suite)
- For American grids: fetch NOAA data
- Populate `grid_conditions_latest` table
- Run on schedule (GitHub Actions cron)

**2. Data Priority**
Essential variables for predictions:
- ✅ **Temperature** (critical - affects all species)
- ✅ **Salinity** (important - coastal vs offshore)
- ✅ **Chlorophyll** (food availability indicator)
- ⚠️ **Water clarity** (kd490) (nice to have)
- ⚠️ **Oxygen** (hypoxia zones)

**3. Region-Specific Data Sources**
```typescript
// Proposed structure
async function ingestGridData(cell: GridCell) {
  const region = getRegionFromGrid(cell);

  if (region === 'europe') {
    // Use CMEMS (comprehensive data)
    return await fetchCMEMSData(cell);
  }

  if (region === 'americas') {
    // Use NOAA (SST + NCEI for currents/salinity)
    return await fetchNOAAData(cell);
  }

  // Global fallback
  return await fetchOISSTData(cell);  // Temperature only
}
```

### Medium Priority

**4. Migrate Existing ICES Data**
- Map ICES rectangles to grid cells (already have `grid_025deg_ices_xref`)
- Copy existing `findr_conditions_snapshots` data to `grid_conditions_latest`
- This gives instant European coverage from existing data

**5. Expand NOAA Integration**
- Add NOAA NCEI datasets (salinity, oxygen, currents)
- Add regional servers (NERACOOS for NE US, SCCOOS for California)

---

## Existing Scripts (ICES System)

1. **`scripts/ingest-copernicus-data.ts`**
   - Ingests CMEMS data for ICES rectangles
   - Populates: `findr_conditions_snapshots`
   - Coverage: 99.7% (283/284 European rectangles)
   - Status: ✅ Working well

2. **`scripts/ingestCopernicusBiogeochemical.ts`**
   - Adds biogeochemical variables (chlorophyll, oxygen, nutrients)
   - Status: ✅ Working

3. **GitHub Actions**: `.github/workflows/findr-copernicus-ingest.yml`
   - Runs daily cron job
   - Keeps ICES data fresh
   - Status: ✅ Automated

**Problem**: None of these scripts populate the new global grid system!

---

## Proposed Migration Path

### Phase 1: Quick Win (European Coverage)
```bash
# Map existing ICES data to grid cells
npm run migrate:ices-to-grid
```
- Use `grid_025deg_ices_xref` to map rectangles → grid cells
- Copy latest conditions from `findr_conditions_snapshots` → `grid_conditions_latest`
- Result: Instant European coverage (260+ grids)

### Phase 2: Global Temperature
```bash
# Ingest NOAA OISST for all grid cells
npm run ingest:global-temperature
```
- Fetch NOAA OISST 0.25° (perfect match for grid!)
- Populate all 65,884 grid cells with temperature
- Result: Worldwide temperature data

### Phase 3: Regional Enhancement
```bash
# Add comprehensive data for priority regions
npm run ingest:regional-data
```
- Europe: Continue CMEMS ingestion (comprehensive)
- US East: NOAA NCEI + NERACOOS
- US West: NOAA NCEI + SCCOOS
- Gulf of Mexico: NOAA NCEI
- Result: Full environmental matching for major fishing areas

---

## Scripts to Create

### 1. `scripts/migrate-ices-to-grid.ts`
Migrate existing ICES data to global grid

### 2. `scripts/ingest-grid-oisst.ts`
Fetch NOAA OISST for all grid cells (temperature only)

### 3. `scripts/ingest-grid-comprehensive.ts`
Main ingestion script:
- Routes to CMEMS for Europe
- Routes to NOAA for Americas
- Populates `grid_conditions_latest`

### 4. Update GitHub Actions
Add cron jobs for new ingestion scripts

---

## Database Schema

### `grid_conditions_latest` Structure
```sql
CREATE TABLE grid_conditions_latest (
  cell_id TEXT PRIMARY KEY,  -- e.g., "G025_N38W122"
  collected_at TIMESTAMPTZ NOT NULL,

  -- Temperature (critical)
  surface_temperature_c DOUBLE PRECISION,
  bottom_temperature_c DOUBLE PRECISION,

  -- Salinity (important)
  salinity_psu DOUBLE PRECISION,

  -- Water chemistry
  oxygen_mg_l DOUBLE PRECISION,
  chlorophyll_mg_m3 DOUBLE PRECISION,
  nitrate_umol_l DOUBLE PRECISION,
  phosphate_umol_l DOUBLE PRECISION,

  -- Biological
  phytoplankton_index DOUBLE PRECISION,

  -- Metadata
  sources TEXT[],  -- e.g., ["NOAA_OISST", "CMEMS_IBI"]
  quality TEXT,    -- 'high', 'medium', 'low'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Next Steps

1. ✅ Create `scripts/migrate-ices-to-grid.ts` (quick win)
2. ✅ Create `scripts/ingest-grid-oisst.ts` (global temperature)
3. ✅ Test with European and American grids
4. ⏳ Update GitHub Actions cron jobs
5. ⏳ Monitor data freshness and coverage

---

**Status:** Grid system works, predictions work, but environmental data is missing
**Impact:** Predictions use biogeographic fallback mode (50% confidence) instead of environmental matching (80%+ confidence)
**Priority:** HIGH - needed for production quality predictions

**Created:** October 24, 2025
