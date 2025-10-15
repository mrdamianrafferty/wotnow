# Copernicus Data Ingestion - Option B Deep Dive

**Date:** 14 October 2025  
**Context:** Detailed explanation of challenges with regional Copernicus datasets

---

## What We've Tried So Far

### 1. **Initial Dataset IDs** (Old, from 2024 or earlier)
```typescript
// Example for Baltic:
physics: 'cmems_mod_bal_phy_my_0.0167deg_P1D-m'  // ❌ Doesn't exist
```
**Result:** "Dataset not found" errors

### 2. **Updated to ANFC (Analysis/Forecast)** 
Changed from `_my_` (multi-year) to `_anfc_` (current/forecast):
```typescript
// Example for Baltic:
physics: 'cmems_mod_bal_phy_anfc_P1D-m'  // ✅ This exists!
```
**Result:** Dataset was found, but **no valid data returned**

This is the key issue - the dataset exists, but returns no data for those locations.

### 3. **Why "No Valid Data"?**
When we tested Baltic rectangles (31Q6, 30Q6, 29Q6):
```
📍 31Q6: (62.75, 28.50) - Finnish Gulf
📍 30Q6: (62.25, 27.50) - Finnish Gulf  
📍 29Q6: (61.75, 26.50) - Finnish Gulf
```

All returned: `⚠️ No valid data - location may be too close to shore or outside model domain`

**Two possible reasons:**
1. **Coastal coverage gaps** - Baltic model may not cover these near-shore areas
2. **Model domain boundaries** - These coordinates might be outside the Baltic model's geographic extent

---

## The Specific Challenges with Option B

### Challenge 1: **Variable-Split Datasets**

Copernicus has split datasets by **variable**, not just by region. For example:

**Mediterranean:**
```typescript
// We need SEPARATE datasets for each variable:
temperature: 'cmems_mod_med_phy-tem_anfc_4.2km_P1D-m'
salinity: 'cmems_mod_med_phy-sal_anfc_4.2km_P1D-m'  
currents: 'cmems_mod_med_phy-cur_anfc_4.2km_P1D-m'
```

**Global Ocean:**
```typescript
temperature: 'cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m'
salinity: 'cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m'
currents: 'cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m'
```

### Challenge 2: **Our Code Assumes One Physics Dataset**

Look at `lib/copernicus/realClient.ts` - it fetches ONE physics dataset expecting all variables:
```typescript
const physicsDataset = this.datasetConfig?.physics || 'cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m';

// Tries to fetch: thetao, so, uo, vo, mlotst, zos ALL from this one dataset
// But the dataset ONLY has 'thetao' (temperature)!
```

**To fix this, we'd need to:**
1. Change the data structure from `physics: string` to:
   ```typescript
   physics: { 
     temperature: string, 
     salinity: string, 
     currents: string,
     mixedLayer?: string,
     seaSurfaceHeight?: string
   }
   ```
2. Make 3+ separate API calls per rectangle for physics alone
3. Merge the results from multiple NetCDF files
4. Handle cases where some variables are missing

### Challenge 3: **Unknown Dataset Patterns Per Region**

We don't know yet if **all** regions split their datasets the same way:

| Region | Split Pattern | Status |
|--------|--------------|--------|
| Global | ✅ Confirmed split (tem, sal, cur separate) | Documented |
| Mediterranean | ✅ Confirmed split (tem, sal, cur separate) | Documented |
| Baltic | ❓ Unknown - need to test | **Need to investigate** |
| IBI | ❓ Unknown - need to test | **Need to investigate** |
| NWS | ❓ Unknown - need to test | **Need to investigate** |
| Black Sea | ❓ Unknown - need to test | **Need to investigate** |
| Arctic | ❓ Unknown - need to test | **Need to investigate** |

### Challenge 4: **Testing Each Region Takes Time**

To properly test Baltic, we would need to:

1. Find which variables are in which datasets:
   ```bash
   copernicusmarine describe --dataset-id cmems_mod_bal_phy_anfc_P1D-m
   ```
2. Check what variables are actually available
3. Test if the dataset covers those coordinates
4. Try different coordinates within Baltic region
5. Repeat for BGC, waves, etc.

**Estimated time per region:** ~10-15 minutes of searching + testing  
**7 regions total:** ~2 hours minimum  
**Plus debugging time:** Could be 4-6 hours total

### Challenge 5: **Geographic Coverage Varies**

Even with correct dataset IDs, coverage varies by location:

| Region | Test Rectangles | Result |
|--------|----------------|--------|
| **Baltic** | 31Q6, 30Q6, 29Q6 (Finnish Gulf) | ❌ No data returned |
| **Mediterranean** | 37W9, 37W8 (Cyprus area) | ❌ Dataset ID incorrect |
| **IBI** | Not tested yet | ⏳ Unknown |
| **NWS** | Not tested yet | ⏳ Unknown |

**Key Question:** Are our ICES rectangles in areas where the models provide data?

Some rectangles might be:
- Too close to shore for the model resolution
- Outside the model boundaries
- In areas with sparse/no data coverage

---

## What Would Success with Option B Look Like?

We'd need to:

### 1. **Map All Dataset IDs for Each Region**

Create a proper data structure:
```typescript
export interface CopernicusDatasetConfig {
  region: string;
  coverage: string;
  physics: {
    temperature: string;      // e.g., 'cmems_mod_ibi_phy-tem_anfc_...'
    salinity: string;          // e.g., 'cmems_mod_ibi_phy-sal_anfc_...'
    currents: string;          // e.g., 'cmems_mod_ibi_phy-cur_anfc_...'
    mixedLayer?: string;       // Optional - not all regions have this
    seaSurfaceHeight?: string; // Optional
  };
  biogeochemistry: {
    chlorophyll: string;       // e.g., 'cmems_mod_ibi_bgc-chl_anfc_...'
    nutrients?: string;        // Optional - split into separate datasets
    plankton?: string;         // Optional
    optics?: string;          // Optional - water clarity (kd490)
  };
  waves: string;              // Usually one dataset for all wave variables
}
```

### 2. **Rewrite the Fetching Logic**

Update `lib/copernicus/realClient.ts` to:
- Make **5-8 API calls per rectangle** (one per variable group)
- Download multiple NetCDF files
- Merge results from all files
- Handle missing variables gracefully (some regions may not have all data)

Example:
```typescript
// Instead of 1 call:
const physicsData = await fetchDataset(physicsDatasetId);

// Would need 3+ calls:
const tempData = await fetchDataset(config.physics.temperature);
const salData = await fetchDataset(config.physics.salinity);
const currData = await fetchDataset(config.physics.currents);

// Then merge:
const merged = mergeNetCDFData([tempData, salData, currData]);
```

### 3. **Test Each Region Thoroughly**

For each of the 7 regions:
- ✅ Find correct dataset IDs for all variables
- ✅ Test with coordinates that actually work
- ✅ Document which variables are available
- ✅ Document coverage gaps
- ✅ Find good test rectangles

### 4. **Maintain It Ongoing**

- Dataset IDs change periodically (every few months)
- Need to re-validate dataset IDs quarterly
- Monitor for Copernicus API changes
- Update when new variables become available

**Maintenance burden:** ~1 day every 3-6 months

---

## The Core Question

**Can the regional models actually provide data for our ICES rectangles?**

Potential issues:
1. **Rectangles too coastal** - Models have minimum distance from shore
2. **Outside model boundaries** - Not all areas are covered
3. **Data availability** - Some areas have sparse data

**This might explain why Option A (Global only) showed "very few rectangles covered":**
- If rectangles are too coastal, even regional models won't help
- Global model might have better coverage for offshore areas
- Need to verify if the issue is dataset IDs vs. rectangle locations

---

## API Call Math

If we implement Option B with split datasets:

**Per rectangle:**
- 1 call for temperature
- 1 call for salinity
- 1 call for currents
- 1 call for mixed layer depth (if available)
- 1 call for BGC (chlorophyll, nutrients)
- 1 call for optics (water clarity)
- 1 call for waves
- **= 7 API calls per rectangle**

**For all rectangles:**
- 325 rectangles × 7 calls = **2,275 API calls**
- At 1-2 seconds per call = **~1 hour total**
- With 500ms delay = **~20 minutes total**

Compare to current approach:
- 325 rectangles × 1-3 calls = 325-975 API calls
- **Option B is 3-7x slower**

---

## Recommended Next Step

**Test ONE well-offshore rectangle manually to prove the concept:**

### Test Case: Portuguese Atlantic (Well Offshore)
```bash
# IBI region - should have excellent coverage
# Coordinates: 39.5°N, 9.4°W (well offshore, open Atlantic)

copernicusmarine subset \
  --dataset-id cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m \
  --variable thetao \
  --minimum-longitude -9.5 --maximum-longitude -9.3 \
  --minimum-latitude 39.4 --maximum-latitude 39.6 \
  --start-datetime 2025-10-12 --end-datetime 2025-10-12 \
  --output-filename test_ibi_offshore.nc
```

### What This Tells Us

**If this succeeds:**
1. ✅ Dataset IDs are correct for IBI
2. ✅ The pipeline can work
3. ✅ Issue is rectangle selection/coverage
4. → Focus on finding which rectangles have data
5. → Can proceed with Option B

**If this fails:**
1. ❌ Dataset IDs still incorrect
2. ❌ Need to dig deeper into structure
3. ❌ Copernicus may have changed more than we thought
4. → Consider Option C (mock data) or hybrid approach

---

## Alternative: Hybrid Approach

If Option B proves too complex:

**Phase 1: Get SOMETHING working**
- Use Global Ocean for all rectangles
- Just get temperature + chlorophyll
- Prove the bite score logic works

**Phase 2: Add regional models gradually**
- Start with IBI (Portugal/Spain/Ireland)
- Add one region at a time
- Test thoroughly before moving to next

**Phase 3: Optimize**
- Add more variables as needed
- Fine-tune regional coverage
- Handle edge cases

This spreads the work over time instead of trying to solve everything at once.

---

## Summary

**Option B is viable BUT requires:**
- Significant refactoring of data structures
- 5-8 API calls per rectangle instead of 1-3
- Thorough testing of each region
- Ongoing maintenance burden
- 4-6 hours initial setup + testing

**Before committing to Option B, we should:**
1. Test ONE offshore rectangle manually ← **DO THIS FIRST**
2. Verify we can get data at all
3. Then decide if the complexity is worth it

**Next step:** Test the Portuguese Atlantic rectangle to see if Option B can work.

---

## ✅ TEST RESULTS - Option B CONFIRMED WORKING!

**Test Date:** 14 October 2025

### Successful Test: IBI (Portuguese Atlantic)
```bash
# Location: 39.5°N, 9.4°W (well offshore)
# Dataset: cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m
# Variable: thetao (temperature)
# Date: 2025-10-12 (2 days old - perfect for fishing predictions)
```

**Results:**
- ✅ Downloaded successfully in 10 seconds
- ✅ File size: 18.3 KB (23 chunks transferred)
- ✅ Surface temperature: **18.22°C** (realistic for Portuguese Atlantic in October)
- ✅ Data quality: Full 3D data with 50 depth levels, 7×8 lat/lon grid
- ✅ Dataset version: 202411 (November 2024 - very recent)

**Conclusion:** Option B works! The regional models DO provide real data for offshore locations.

---

## 🎯 EXPERT ADVICE INTEGRATION (Post-Test)

### Key Insights from Copernicus Expert Review

#### 1. **Why "No Valid Data" Occurred**

**Problem:** Near-shore requests get masked to land
- Baltic rectangles (Finnish Gulf) were too coastal - grid cells masked as land
- Small bboxes can be entirely land-masked
- 3D fields have more aggressive masking than 2D surface fields

**Solutions that work:**
1. ✅ **Pad the bbox by 0.1–0.2° on each side** so at least one wet cell intersects
2. ✅ **Request surface-only** with `minimum_depth=0, maximum_depth=1` for 3D variables
3. ✅ **Fallback: use `get` instead of `subset`** to download full tiles and clip locally (bypasses server-side masking)

#### 2. **Variable-Split Subdatasets Are the Norm**

Confirmed: Regional products split into subdatasets per variable family:
- **MED:** separate subdatasets for ssh, cur, tem, sal
- **BAL:** separate subdatasets for cur (detided/raw), tem, sal
- **IBI:** separate subdatasets for tem, sal, cur, ssh

**Product Pages for Reference:**
- IBI: `IBI_ANALYSISFORECAST_PHY_005_001`
- MED: `MEDSEA_ANALYSISFORECAST_PHY_006_013`
- BAL: `BALTICSEA_ANALYSISFORECAST_PHY_003_006`
- NWS: Look up NWS product on marine.copernicus.eu

#### 3. **Correct Config Structure (Validated)**

```typescript
type PhysicsConfig = {
  temperature?: string;      // e.g., cmems_mod_med_phy-tem_anfc_4.2km_P1D-m
  salinity?: string;         // e.g., cmems_mod_med_phy-sal_anfc_4.2km_P1D-m
  currents?: string;         // e.g., cmems_mod_bal_phy-cur_anfc_P1D-m
  seaSurfaceHeight?: string; // e.g., ...phy-ssh...
  mixedLayerDepth?: string;  // mlotst often under PHY
};

type BiogeoConfig = {
  chlorophyll?: string;      // e.g., ...bgc-chl...
  oxygen?: string;           // ...bgc-o2...
  nutrients?: string[];      // no3/po4/si split
  optics?: string;           // kd490 or backscatter
};

type RegionConfig = {
  physics: PhysicsConfig;
  biogeochemistry?: BiogeoConfig;
  waves?: string;            // wave products bundle vars
};
```

#### 4. **"No Valid Data" Hardening Checklist**

Implement these in `lib/copernicus/realClient.ts`:

1. ✅ **Describe first, subset second**
   - Run `copernicusmarine describe -i <PRODUCT_ID>` at startup
   - Cache subdataset IDs and variable names
   - Build mapping programmatically

2. ✅ **Pad bbox for coastal rectangles**
   - Add ±0.15° padding (configurable)
   - If still empty, grow to ±0.25°
   - Baltic cells especially need this

3. ✅ **Set depth explicitly for 3D**
   - For SST/surface: `minimum_depth=0, maximum_depth=1`
   - Avoids depth slicing issues

4. ✅ **Fallback to local clip**
   - If `subset` returns empty after 2 padding attempts
   - Call `get` to download original file(s)
   - Clip locally with xarray/rioxarray
   - Bypasses server-side masking quirks

5. ✅ **Use valid variable names**
   - Temperature: `thetao` (not `sst`)
   - Currents: `uo`/`vo` or vector in cur subdatasets
   - SSH: `zos`
   - Confirm on subdataset page

6. ✅ **Time cadence awareness**
   - MED has 15-min SSH (PT15M-i) as separate subdataset
   - Daily means (P1D-m) exist for tem/sal
   - Choose cadence you need

7. ✅ **Retry policy & logging**
   - Exponential back-off for network hiccups
   - Log: subdataset ID, bbox, time, depth, bytes
   - Helps reproduce support tickets

#### 5. **Fast Validation Plan (15 minutes)**

Test one offshore location per basin:
- ✅ **IBI:** Off Portugal (39.5°N, -9.4°W) - **CONFIRMED WORKING**
- ⏳ **NWS:** Central North Sea (55°N, 2°E)
- ⏳ **BAL:** Central Baltic (57°N, 19°E) - avoid Finnish Gulf
- ⏳ **MED:** South of Balearics (38°N, 2°E)

For each:
1. Copy subdataset ID from product page
2. Try `thetao` first
3. Use 0.2° bbox + surface depth
4. Single day
5. Inspect NetCDF for non-empty arrays
6. Try near-shore with padding

#### 6. **ANFC vs MULTIYEAR**

- **ANFC** (Analysis/Forecast): Current + near-term (what we need for fishing)
- **MULTIYEAR** (Reanalysis): Historical data for trends
- Keep separate in config - don't mix IDs
- Both use same variable-split pattern

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Refactor Data Structures (1-2 hours)
- [ ] Update `CopernicusDatasetConfig` interface with split physics/BGC
- [ ] Create per-variable subdataset mappings for all 7 regions
- [ ] Use product pages to copy exact IDs

### Phase 2: Update Fetching Logic (2-3 hours)
- [ ] Modify `realClient.ts` to make multiple API calls per rectangle
- [ ] Implement NetCDF merging logic (xarray-style)
- [ ] Add bbox padding for coastal rectangles (±0.15°, ±0.25° fallback)
- [ ] Add `minimum_depth=0, maximum_depth=1` for surface requests
- [ ] Implement `get`-then-clip fallback for stubborn coastal cells

### Phase 3: Auto-Discovery & Caching (1-2 hours)
- [ ] Add startup script that runs `describe` on each product
- [ ] Cache subdataset IDs in JSON (filesystem or Supabase)
- [ ] Build variable mapping programmatically
- [ ] Log cache refresh date for maintenance

### Phase 4: Validation Tests (2-3 hours)
- [ ] Test offshore location for each basin (IBI ✅, NWS, BAL, MED, BLK, ARC)
- [ ] Test coastal location with padding for each basin
- [ ] Verify all variables (temp, salinity, currents, chl, etc.)
- [ ] Document which rectangles have coverage

### Phase 5: Production Integration (1-2 hours)
- [ ] Update `ingest-copernicus-data.ts` to use new structure
- [ ] Add retry policy with exponential back-off
- [ ] Implement comprehensive logging (subdataset, bbox, time, depth, bytes)
- [ ] Run full ingestion test on 10-20 rectangles
- [ ] Monitor for "no valid data" edge cases

**Total estimated time:** 8-12 hours (spread over 2-3 work sessions)

---

## 🚀 RECOMMENDED NEXT STEPS

1. **Immediate:** Test 3 more offshore locations (NWS, BAL central, MED) to validate pattern
2. **Short-term:** Implement Phase 1 (data structure refactor) using validated IDs
3. **Medium-term:** Add bbox padding and depth constraints for coastal handling
4. **Long-term:** Build auto-discovery system for dataset ID maintenance

**Priority:** Option B is now proven viable. The expert advice gives us a clear roadmap to make it production-ready.
