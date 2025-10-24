# Copernicus Global - Next Steps

**Date:** October 24, 2025
**Status:** Ready to implement, pending URL verification

---

## Summary

We have a comprehensive plan to extend Copernicus CMEMS to Americas using Global products. The existing Edge Function already has full CMEMS integration - we just need to add Global dataset URLs alongside the European regional ones.

---

## What We Know

### ✅ Existing CMEMS Integration Works
- European IBI regional dataset: `IBI_ANALYSISFORECAST_BGC_005_004`
- Full variable suite: temp, salinity, oxygen, chlorophyll, nutrients
- 222 European grids populated successfully
- Edge Function has all the infrastructure

### ⏳ Need to Find Global Dataset URLs

**Target Products:**
1. `GLOBAL_ANALYSISFORECAST_PHY_001_024` - Physics (temp, salinity)
2. `GLOBAL_ANALYSISFORECAST_BGC_001_028` - Biogeochemistry (oxygen, chlorophyll)

**Known URL Pattern (from IBI):**
```
https://nrt.cmems-du.eu/thredds/ncss/[PRODUCT_ID]/[FILENAME].nc
```

**Possible Global URLs (to verify):**
```
# Global PHY (physics)
https://nrt.cmems-du.eu/thredds/ncss/GLOBAL_ANALYSISFORECAST_PHY_001_024/cmems_mod_glo_phy_anfc_0.083deg_P1D-m.nc

# Global BGC (biogeochemistry)
https://nrt.cmems-du.eu/thredds/ncss/GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc_anfc_0.25deg_P1D-m.nc
```

---

## Recommended Approach

### Option 1: Use Copernicus Data Store Browser (Easiest)

1. **Log into Copernicus Marine Data Store**
   - Go to: https://data.marine.copernicus.eu
   - Login with your credentials

2. **Find Global Products**
   - Search for "GLOBAL_ANALYSISFORECAST_PHY_001_024"
   - Click on product
   - Look for "Data Access" section
   - Find THREDDS/OPeNDAP URL

3. **Copy exact NCSS endpoint**
   - Should look like: `https://nrt.cmems-du.eu/thredds/ncss/...`

4. **Test in browser or with curl**
   ```bash
   curl -u "username:password" "[NCSS_URL]?var=thetao&latitude=37.5&longitude=-122.5&time=2025-10-23T00:00:00Z&accept=csv&point=true"
   ```

### Option 2: Test via Edge Function (Recommended)

The Edge Function already has CMEMS credentials configured. We can:

1. **Modify Edge Function temporarily**
   - Add Global URLs as env vars
   - Deploy to Supabase
   - Test with California coordinates

2. **Run test ingestion**
   ```bash
   npx tsx scripts/call-ingest-function.ts \
     --california \
     --limit=1 \
     --providers=CMEMS \
     --vars=surface_temperature_c,salinity_psu,oxygen_mg_l,chlorophyll_mg_m3
   ```

3. **Check if data returns**
   - If yes → URLs are correct, proceed with full implementation
   - If no → adjust URLs and retry

### Option 3: Use Copernicus API Directly

Copernicus provides a REST API to query available datasets:

```bash
# List all products
curl -u "username:password" \
  "https://my.cmems-du.eu/motu-web/Motu?action=listServices"

# Get product details
curl -u "username:password" \
  "https://my.cmems-du.eu/motu-web/Motu?action=describeProduct&service=GLOBAL_ANALYSISFORECAST_PHY_001_024-TDS"
```

---

## Implementation Steps

### Step 1: Verify Global Product URLs ⏳

**Goal:** Find exact THREDDS NCSS endpoints for Global products

**Methods:**
- [ ] Check Copernicus Data Store web interface
- [ ] Test sample URLs via curl
- [ ] Verify variable names match (thetao, so, o2, chl)
- [ ] Confirm 0.25° resolution for BGC, 0.083° for PHY

**Expected Output:**
```
Global PHY URL: https://nrt.cmems-du.eu/thredds/ncss/[exact_path]
Global BGC URL: https://nrt.cmems-du.eu/thredds/ncss/[exact_path]
```

### Step 2: Modify Edge Function ⏳

**File:** `supabase/functions/ingest-conditions/index.ts`

**Changes:**
1. Replace single `CMEMS_NCSS_BASE_URL` with dataset map
2. Add region detection (Europe vs Americas)
3. Query appropriate dataset based on coordinates
4. Merge results from PHY + BGC datasets
5. Add oxygen unit conversion (mmol/m³ → mg/L)

**Estimated time:** 2-3 hours

### Step 3: Test with California Sample ⏳

```bash
# Test single grid cell
npx tsx scripts/call-ingest-function.ts \
  --california \
  --limit=1 \
  --providers=CMEMS

# Expected result:
{
  "upserted": 1,
  "diagnostics": {
    "cmems": {
      "sampledCells": 1,
      "successes": 1,
      "attempted": 1
    }
  }
}
```

**Verify in database:**
```sql
SELECT *
FROM grid_conditions_latest
WHERE cell_id = 'G025_N38W122'  -- California cell
  AND sources @> ARRAY['cmems_mod_glo_phy_anfc_0.083deg_P1D-m.thetao'];
```

**Expected data:**
- ✅ surface_temperature_c: ~15-18°C
- ✅ salinity_psu: ~33-34 PSU
- ✅ oxygen_mg_l: ~7-9 mg/L
- ✅ chlorophyll_mg_m3: ~0.5-2.0 mg/m³

### Step 4: Update GitHub Actions Workflow ⏳

**Change providers from NOAA to CMEMS:**

```yaml
- name: Ingest California (20 grids)
  run: |
    echo "🌊 Ingesting California coastal grids..."
    npx tsx scripts/call-ingest-function.ts \
      --california \
      --limit=20 \
      --providers=CMEMS  # Changed from default
```

### Step 5: Populate American Waters ⏳

**Timeline:** 1-2 weeks automated via GitHub Actions

**Regions:**
- California: ~50 grids
- Florida: ~40 grids
- New York: ~30 grids
- Gulf of Mexico: ~60 grids
- Pacific Northwest: ~40 grids
- Hawaii: ~30 grids

**Total:** ~250 American coastal grids with full environmental suite

### Step 6: Verification & Cleanup ⏳

1. **Compare quality:**
   - CMEMS Global vs NOAA OISST temperature (should be similar)
   - Check if salinity, oxygen, chlorophyll values are reasonable

2. **Remove NOAA-only data:**
   ```sql
   DELETE FROM grid_conditions_latest
   WHERE sources @> ARRAY['ncdcOisst21Agg_LonPM180.sst']
     AND NOT sources @> ARRAY['cmems_mod_glo_phy_anfc_0.083deg_P1D-m.thetao'];
   ```

3. **Update documentation:**
   - Mark American waters as "Production Ready"
   - Update confidence scores to 75-80%

---

## Current Status

### Completed ✅
- [x] Analyzed existing CMEMS integration
- [x] Identified Copernicus Global products
- [x] Created implementation plan
- [x] Documented variable mappings and conversions

### In Progress ⏳
- [ ] Verify Global product THREDDS NCSS URLs
- [ ] Test access with existing credentials
- [ ] Modify Edge Function for multi-dataset support

### Blocked 🔴
- **Need:** Exact THREDDS NCSS URLs for Global products
- **Action:** Use Copernicus Data Store web interface to find URLs
- **ETA:** 1 hour of research

---

## Alternative: Keep NOAA for Now, Add CMEMS Later

If finding the Global URLs proves difficult, we can:

**Phase 1:** Continue NOAA OISST temperature population (currently working)
- 120 grids/day via GitHub Actions
- Temperature-only predictions (65-70% confidence)
- Ready in 1-2 weeks

**Phase 2:** Add Copernicus Global when URLs confirmed
- Full environmental suite
- Upgrade predictions to 75-80% confidence
- Replace NOAA temperature with CMEMS

**This approach:**
- Doesn't block current progress
- Gets American predictions working ASAP
- Allows time to properly research Copernicus Global URLs

---

## Recommendation

1. **Continue NOAA temperature population via GitHub Actions**
   - Already working with chunks of 20
   - Will give us functional predictions in 1-2 weeks

2. **Research Copernicus Global URLs in parallel**
   - Use Data Store web interface
   - Test via Edge Function
   - Document exact endpoints

3. **Once URLs confirmed, switch to CMEMS Global**
   - Modify Edge Function
   - Re-populate American grids with full suite
   - Remove NOAA-only data

**This gets us:**
- Functional predictions ASAP (NOAA temp)
- Best quality eventually (CMEMS full suite)
- No delays waiting for URL research

---

## Questions to Answer

1. **What are the exact THREDDS NCSS URLs for:**
   - `GLOBAL_ANALYSISFORECAST_PHY_001_024`
   - `GLOBAL_ANALYSISFORECAST_BGC_001_028`

2. **Do variable names match European regional?**
   - PHY: `thetao`, `so` (temperature, salinity)
   - BGC: `o2`, `chl`, `no3`, `po4`, `phyc`

3. **Is 0.25° BGC resolution acceptable?**
   - Matches our grid exactly
   - Coarser than NOAA OISST (0.25° vs 0.25°, actually same!)
   - Should be fine for open ocean predictions

4. **Do we need separate Surface vs Bottom temperature?**
   - Global PHY has depth levels
   - Can query surface (0m) and bottom (varies by depth)
   - Current system uses `thetao` (potential temperature at depth)

---

**Status:** Implementation plan complete. Next step: Find exact Global product URLs via Copernicus Data Store.

**Timeline:**
- URL research: 1-2 hours
- Edge Function modification: 2-3 hours
- Testing: 1 hour
- Deployment: 1 hour
- **Total:** 1 day of focused work

**Alternative:** Continue NOAA while researching CMEMS Global in parallel (no blocking).

**Created:** October 24, 2025
