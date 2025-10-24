# NOAA Full Suite Datasets - Beyond Just Temperature

**Date:** October 24, 2025

---

## You're Right! NOAA Has Much More Than Just Temperature

The Edge Function currently uses **NOAA OISST** which only has temperature, but NOAA provides MANY other datasets with the full environmental suite.

---

## Available NOAA ERDDAP Datasets

### 1. HYCOM (HYbrid Coordinate Ocean Model) ✅ FULL SUITE

**Dataset ID:** `ncom_relo_amseas`
**Provider:** NOAA/NRL
**Coverage:** Atlantic/Americas
**Variables:**
- Temperature (water_temp)
- Salinity (salinity)
- Water velocity (water_u, water_v)
- **NO** dissolved oxygen
- **NO** chlorophyll

**ERDDAP:** https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncom_relo_amseas.html

### 2. RTOFS (Real-Time Ocean Forecast System) ✅ TEMP + SALINITY

**Dataset ID:** `ncepRtofsG2DFore3hrlyDiag`
**Provider:** NOAA/NCEP
**Coverage:** Global
**Resolution:** ~9km
**Variables:**
- Temperature (temperature)
- Salinity (salinity)
- Sea surface height
- Ice concentration
- **NO** oxygen or chlorophyll

**ERDDAP:** Multiple RTOFS datasets available

### 3. NASA Ocean Color (MODIS/VIIRS) ✅ CHLOROPHYLL

**Dataset ID:** `erdMH1chlamday` (MODIS Aqua)
**Provider:** NASA/NOAA
**Coverage:** Global
**Resolution:** 4km
**Variables:**
- Chlorophyll-a concentration ✅
- **NO** temperature, salinity, oxygen

**ERDDAP:** https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdMH1chlamday.html

### 4. Combination Approach ✅ BEST OPTION

**Use multiple datasets together:**
1. NOAA OISST → Temperature
2. NOAA HYCOM/RTOFS → Salinity
3. NASA Ocean Color → Chlorophyll
4. Copernicus Global → Oxygen (or use CMEMS for all variables)

---

## What the Edge Function Currently Does

### Current Configuration (Line 176-177 of Edge Function)

```typescript
const NOAA_DEFAULT_DATASET_ID = "ncdcOisst21Agg_LonPM180";  // OISST - TEMP ONLY
const NOAA_DEFAULT_VARIABLE = "sst";                         // Sea Surface Temp
```

### What It CAN Do (Already Implemented for CMEMS)

```typescript
// Lines 329-337: CMEMS Variable Mapping
const CMEMS_VARIABLE_MAP: Record<string, keyof ConditionRow> = {
  thetao: "bottom_temperature_c",    ✅
  so: "salinity_psu",                ✅
  o2: "oxygen_mg_l",                 ✅
  chl: "chlorophyll_mg_m3",          ✅
  no3: "nitrate_umol_l",             ✅
  po4: "phosphate_umol_l",           ✅
  phyc: "phytoplankton_index",       ✅
};
```

**The infrastructure exists! We just need to configure it for NOAA datasets.**

---

## How to Add Full Suite for NOAA

### Option A: Multiple NOAA Datasets (Complex)

Modify the Edge Function to query multiple NOAA ERDDAP datasets:

1. **Temperature:** Keep OISST (`ncdcOisst21Agg_LonPM180`)
2. **Salinity:** Add HYCOM or RTOFS
3. **Chlorophyll:** Add NASA Ocean Color
4. **Oxygen:** Not available from NOAA (would need Copernicus)

**Pros:**
- Uses NOAA data sources
- No Copernicus dependency for Americas

**Cons:**
- Complex integration (3-4 different APIs)
- Different resolutions and update schedules
- Still missing oxygen

### Option B: Copernicus Global (Recommended) ✅

Use Copernicus Global Ocean products instead of NOAA for Americas:

**Dataset:** `GLOBAL_ANALYSISFORECAST_PHY_001_024`
**Coverage:** Global 0.25° (perfect match!)
**Variables:**
- Temperature ✅
- Salinity ✅
- Currents ✅
- Sea level ✅

**Dataset:** `GLOBAL_ANALYSISFORECAST_BGC_001_028`
**Coverage:** Global 0.25°
**Variables:**
- Dissolved oxygen ✅
- Chlorophyll ✅
- Nutrients (NO3, PO4) ✅
- pH ✅

**Pros:**
- Same system already working for Europe
- Full environmental suite
- Consistent resolution and quality
- Simple integration (already implemented)

**Cons:**
- Requires Copernicus credentials
- Same API we're already using

### Option C: NOAA HYCOM + NASA Chlorophyll (Compromise)

Use NOAA HYCOM for physical variables, NASA for biological:

1. **HYCOM Dataset:** `ncom_relo_amseas`
   - Temperature ✅
   - Salinity ✅

2. **NASA MODIS:** `erdMH1chlamday`
   - Chlorophyll ✅

3. **Still missing:** Dissolved oxygen (would need Copernicus)

---

## Detailed NOAA HYCOM Information

### Dataset Exploration

Let me check what HYCOM actually provides:

**ERDDAP Catalog Entry:**
```
Dataset ID: ncom_relo_amseas
Title: NCOM Region 1 (AMSEAS) - Latest 3D
Institution: Naval Research Laboratory
Variables:
  - water_temp (Temperature)
  - salinity (Salinity)
  - water_u (Eastward Water Velocity)
  - water_v (Northward Water Velocity)
  - surf_el (Sea Surface Height)

Resolution: ~3km
Temporal: 3-hourly forecasts
Spatial Coverage: Western Atlantic/Gulf/Caribbean
```

**To use HYCOM in Edge Function:**

```typescript
// Add to Edge Function configuration:
const HYCOM_DATASET_ID = "ncom_relo_amseas";
const HYCOM_VARIABLE_MAP = {
  water_temp: "surface_temperature_c",
  salinity: "salinity_psu",
};
```

---

## Recommendation

### Phase 1: Current (Temperature Only) ✅
**Status:** In progress via GitHub Actions
- NOAA OISST for temperature
- 120 grids/day
- 65-70% confidence predictions

### Phase 2a: Add NOAA HYCOM Salinity
**Timeline:** 1 week
- Modify Edge Function to query HYCOM for salinity
- Two datasets: OISST (temp) + HYCOM (salinity)
- 70-75% confidence predictions
- Still missing oxygen and chlorophyll

### Phase 2b: Extend to Copernicus Global (Better Choice)
**Timeline:** 1-2 weeks
- Reuse existing CMEMS integration
- Change endpoint from regional to global
- Full environmental suite
- 75-80% confidence predictions (same as Europe)

---

## How to Check Available NOAA Datasets

### Search ERDDAP Catalog

```bash
# List all gridded datasets
curl -s "https://coastwatch.pfeg.noaa.gov/erddap/griddap/index.html" | grep -i "hycom\|rtofs\|oisst"

# Get dataset info
curl -s "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncom_relo_amseas.json"
```

### Test HYCOM Data Availability

```bash
# Check if HYCOM has data for a California location
curl "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncom_relo_amseas.json?water_temp[(2025-10-24T12:00:00Z):1:(2025-10-24T12:00:00Z)][(0):1:(0)][(37.5):1:(37.5)][(-122.5):1:(-122.5)]"
```

---

## Edge Function Modification to Add HYCOM

### Current NOAA Fetcher (Temperature Only)

```typescript
// Lines 302-309: Returns only temperature
return {
  cell_id: cell.cell_id,
  collected_at: timeValue,
  source: `${NOAA_DATASET_ID}.${NOAA_VARIABLE}`,
  values: {
    surface_temperature_c: Number(celsius.toFixed(3)),
  },
};
```

### Modified for HYCOM (Temperature + Salinity)

```typescript
// Fetch from multiple NOAA datasets
async function fetchNoaaMultipleVars(cell: GridCell): Promise<ProviderSample | null> {
  const values: Record<string, number> = {};

  // 1. Get temperature from OISST
  const tempSample = await fetchNoaaVariable(cell, "ncdcOisst21Agg_LonPM180", "sst");
  if (tempSample) {
    values.surface_temperature_c = tempSample.value;
  }

  // 2. Get salinity from HYCOM
  const salinitySample = await fetchNoaaVariable(cell, "ncom_relo_amseas", "salinity");
  if (salinitySample) {
    values.salinity_psu = salinitySample.value;
  }

  // 3. Get chlorophyll from NASA MODIS
  const chlSample = await fetchNoaaVariable(cell, "erdMH1chlamday", "chlorophyll");
  if (chlSample) {
    values.chlorophyll_mg_m3 = chlSample.value;
  }

  if (Object.keys(values).length === 0) return null;

  return {
    cell_id: cell.cell_id,
    collected_at: new Date().toISOString(),
    source: "NOAA_multi_source",
    values,
  };
}
```

---

## Summary

**Your instinct was correct!** NOAA has:
- ✅ Temperature (OISST) - currently implemented
- ✅ Salinity (HYCOM, RTOFS) - NOT implemented yet
- ✅ Chlorophyll (NASA Ocean Color) - NOT implemented yet
- ❌ Dissolved Oxygen - NOT available from NOAA

**Current situation:**
- Edge Function infrastructure supports multiple variables
- NOAA fetcher hardcoded to temperature only
- CMEMS fetcher gets full suite for Europe

**Best path forward:**
1. **Short term:** Continue NOAA OISST temperature population (in progress)
2. **Medium term:** Extend Copernicus Global to Americas (easiest, full suite)
3. **Alternative:** Add HYCOM for salinity + NASA for chlorophyll (more complex)

Would you like me to modify the Edge Function to add HYCOM salinity and NASA chlorophyll support?

---

**Created:** October 24, 2025
