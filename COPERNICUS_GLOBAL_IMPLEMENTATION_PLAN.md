# Copernicus Global Implementation Plan

**Date:** October 24, 2025
**Goal:** Extend CMEMS integration to Americas using Global products

---

## Current vs Target State

### Current (European Regional)

**Dataset:** `IBI_ANALYSISFORECAST_BGC_005_004`
- Coverage: Iberian-Biscay-Ireland region only
- Resolution: 0.027° (~3km)
- Variables: Full suite (temp, salinity, oxygen, chlorophyll, nutrients)
- Status: ✅ Working for 222 European grids

### Target (Global Products)

**Physical Dataset:** `GLOBAL_ANALYSISFORECAST_PHY_001_024`
- Coverage: Global ocean
- Resolution: 0.083° (~9km)
- Variables: Temperature, salinity, currents, sea level
- URL: https://nrt.cmems-du.eu/thredds/dodsC/global-analysis-forecast-phy-001-024

**Biogeochemical Dataset:** `GLOBAL_ANALYSISFORECAST_BGC_001_028`
- Coverage: Global ocean
- Resolution: 0.25° (~28km) - **PERFECT MATCH FOR OUR GRID!**
- Variables: Oxygen, chlorophyll, nitrate, phosphate, phytoplankton, pH
- URL: https://nrt.cmems-du.eu/thredds/dodsC/global-analysis-forecast-bio-001-028-daily

---

## Copernicus Global Product Details

### Global Physical (PHY) - 001-024

**Full Product ID:** `GLOBAL_ANALYSISFORECAST_PHY_001_024`

**THREDDS NCSS Endpoints:**
```
# Daily mean
https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_phy_anfc_0.083deg_P1D-m

# Real-time hourly
https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_phy_anfc_0.083deg_PT1H-m
```

**Variables:**
- `thetao` - Sea water potential temperature (°C)
- `so` - Sea water salinity (PSU)
- `uo` - Eastward sea water velocity (m/s)
- `vo` - Northward sea water velocity (m/s)
- `zos` - Sea surface height above geoid (m)

**Depth levels:** Surface to 5000m

### Global Biogeochemical (BGC) - 001-028

**Full Product ID:** `GLOBAL_ANALYSISFORECAST_BGC_001_028`

**THREDDS NCSS Endpoint:**
```
https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_bgc_anfc_0.25deg_P1D-m
```

**Variables:**
- `o2` - Dissolved oxygen (mmol/m³) → convert to mg/L
- `chl` - Mass concentration of chlorophyll-a (mg/m³)
- `no3` - Mole concentration of nitrate (mmol/m³)
- `po4` - Mole concentration of phosphate (mmol/m³)
- `phyc` - Phytoplankton carbon biomass (mmol/m³)
- `ph` - pH

**Depth levels:** Surface to 5000m

---

## Implementation Strategy

### Approach: Multi-Dataset CMEMS Fetcher

Instead of one hardcoded URL, create a smart router:

1. **Determine region from coordinates**
   - European waters (35-70°N, 25°W-42°E) → Use IBI regional (higher resolution)
   - All other waters → Use Global products

2. **Query appropriate datasets**
   - Physical variables (temp, salinity) → Global PHY or IBI
   - Biogeochemical variables (oxygen, chlorophyll) → Global BGC or IBI BGC

3. **Merge results**
   - Combine data from multiple datasets into single grid cell record

---

## Edge Function Modifications

### Current Single-Dataset Approach (Line 321-323)

```typescript
const CMEMS_NCSS_BASE_URL =
  env.CMEMS_NCSS_BASE_URL ??
  "https://nrt.cmems-du.eu/thredds/ncss/IBI_ANALYSISFORECAST_BGC_005_004/cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m.nc";
```

### New Multi-Dataset Approach

```typescript
// Dataset configuration
const CMEMS_DATASETS = {
  // European regional (high resolution)
  IBI_PHY: "https://nrt.cmems-du.eu/thredds/ncss/IBI_ANALYSISFORECAST_PHY_005_001/cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m.nc",
  IBI_BGC: "https://nrt.cmems-du.eu/thredds/ncss/IBI_ANALYSISFORECAST_BGC_005_004/cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m.nc",

  // Global (Americas, Asia, etc.)
  GLOBAL_PHY: "https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_phy_anfc_0.083deg_P1D-m.nc",
  GLOBAL_BGC: "https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_bgc_anfc_0.25deg_P1D-m.nc",
};

// Variable routing
const PHY_VARS = ["thetao", "so"];  // temp, salinity
const BGC_VARS = ["o2", "chl", "no3", "po4", "phyc"];  // oxygen, chlorophyll, nutrients

function selectDatasetForCell(cell: GridCell, vars: string[]): string[] {
  const isEurope = cell.lat >= 35 && cell.lat <= 70 && cell.lon >= -25 && cell.lon <= 42;

  const datasets: string[] = [];
  const needsPhy = vars.some(v => PHY_VARS.includes(v));
  const needsBgc = vars.some(v => BGC_VARS.includes(v));

  if (isEurope) {
    if (needsPhy) datasets.push(CMEMS_DATASETS.IBI_PHY);
    if (needsBgc) datasets.push(CMEMS_DATASETS.IBI_BGC);
  } else {
    if (needsPhy) datasets.push(CMEMS_DATASETS.GLOBAL_PHY);
    if (needsBgc) datasets.push(CMEMS_DATASETS.GLOBAL_BGC);
  }

  return datasets;
}
```

---

## Conversion Formulas

### Oxygen: mmol/m³ → mg/L

```typescript
// CMEMS provides oxygen in mmol/m³
// We store as mg/L (dissolved oxygen)
// Conversion: mg/L = (mmol/m³) * 32 / 1000
// (Molecular weight of O2 = 32 g/mol)

function convertOxygen(mmol_m3: number): number {
  return (mmol_m3 * 32) / 1000;
}

// Example:
// CMEMS: 250 mmol/m³
// Our DB: 8.0 mg/L
```

### Temperature: Already in Celsius ✅

```typescript
// CMEMS provides thetao in °C (no conversion needed)
```

### Salinity: Already in PSU ✅

```typescript
// CMEMS provides so in PSU (Practical Salinity Units)
```

### Chlorophyll: Already in mg/m³ ✅

```typescript
// CMEMS provides chl in mg/m³
```

---

## Testing Strategy

### Phase 1: Test Global Dataset Access

```bash
# Test if we can access Global PHY
curl -u "USERNAME:PASSWORD" \
  "https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_phy_anfc_0.083deg_P1D-m.nc?var=thetao&var=so&latitude=37.5&longitude=-122.5&time=2025-10-24T00:00:00Z&accept=csv"

# Test if we can access Global BGC
curl -u "USERNAME:PASSWORD" \
  "https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_bgc_anfc_0.25deg_P1D-m.nc?var=o2&var=chl&latitude=37.5&longitude=-122.5&time=2025-10-24T00:00:00Z&accept=csv"
```

### Phase 2: Modify Edge Function

1. Add dataset routing logic
2. Support querying multiple datasets per cell
3. Merge results from PHY + BGC datasets
4. Add oxygen unit conversion

### Phase 3: Update Scripts

```bash
# California with CMEMS Global (instead of NOAA)
npx tsx scripts/call-ingest-function.ts --california --limit=10 --providers=CMEMS

# Should populate:
# - surface_temperature_c (from Global PHY)
# - salinity_psu (from Global PHY)
# - oxygen_mg_l (from Global BGC, converted)
# - chlorophyll_mg_m3 (from Global BGC)
```

### Phase 4: Verify Data Quality

```sql
-- Check California grid with CMEMS data
SELECT
  cell_id,
  surface_temperature_c,
  salinity_psu,
  oxygen_mg_l,
  chlorophyll_mg_m3,
  sources
FROM grid_conditions_latest
WHERE cell_id LIKE 'G025_N37W122%'
  AND sources @> ARRAY['cmems_mod_glo_phy_anfc_0.083deg_P1D-m.thetao'];
```

---

## Timeline

### Week 1: Research & Testing
- ✅ Identify Copernicus Global product IDs
- ⏳ Test THREDDS NCSS access with credentials
- ⏳ Verify variable availability and formats
- ⏳ Test conversion formulas

### Week 2: Edge Function Modification
- ⏳ Add multi-dataset support
- ⏳ Implement region-based routing
- ⏳ Add oxygen unit conversion
- ⏳ Deploy to Supabase

### Week 3: Data Population
- ⏳ Update GitHub Actions workflow to use CMEMS for Americas
- ⏳ Populate California grids (test region)
- ⏳ Verify data quality
- ⏳ Expand to all American coastal waters

### Week 4: Validation & Cleanup
- ⏳ Compare CMEMS vs NOAA temperature data
- ⏳ Remove NOAA-only grids, replace with CMEMS
- ⏳ Production deployment

---

## Benefits

### Data Quality Improvement

**Before (NOAA OISST only):**
- Temperature: ✅ Real
- Salinity: ❌ None
- Oxygen: ❌ None
- Chlorophyll: ❌ None
- Confidence: 65-70%

**After (Copernicus Global):**
- Temperature: ✅ Real
- Salinity: ✅ Real
- Oxygen: ✅ Real
- Chlorophyll: ✅ Real
- Nutrients: ✅ Real
- Confidence: 75-80% (same as Europe!)

### Consistency

- Same data source for all regions
- Consistent variable definitions
- Same quality standards
- Easier maintenance

### Future-Proof

- Global coverage enables expansion to Asia, Australia, etc.
- Single integration point
- Copernicus is well-funded and stable

---

## Risks & Mitigations

### Risk 1: Lower Resolution

**Issue:** Global BGC is 0.25° vs European 0.027° (9x coarser)

**Mitigation:**
- 0.25° matches our grid exactly (perfect alignment)
- For coastal predictions, regional variation within 25km is acceptable
- Can add regional high-res sources later (NERACOOS, SCCOOS)

### Risk 2: API Performance

**Issue:** Querying 2 datasets per cell (PHY + BGC) = 2x API calls

**Mitigation:**
- Still faster than NOAA ERDDAP (which tries 8 time offsets)
- Can cache aggressively (data updates daily)
- Batch requests where possible

### Risk 3: Data Availability

**Issue:** Global products might have gaps or delays

**Mitigation:**
- Copernicus has 99%+ uptime SLA
- Fall back to NOAA temperature if CMEMS unavailable
- Keep biogeographic fallback (never empty results)

---

## Next Steps

1. **Verify Copernicus credentials work for Global products**
   - Test Global PHY endpoint
   - Test Global BGC endpoint
   - Confirm variable names and formats

2. **Modify Edge Function**
   - Add multi-dataset routing
   - Implement oxygen conversion
   - Test locally with sample cells

3. **Update workflow**
   - Change from `--providers=NOAA` to `--providers=CMEMS`
   - Test with 10 California grids
   - Verify full variable suite populated

4. **Deploy and monitor**
   - Push Edge Function changes
   - Run GitHub Actions workflow
   - Monitor data quality and coverage

---

**Status:** Ready to implement. Need to verify Copernicus Global access first.

**Created:** October 24, 2025
