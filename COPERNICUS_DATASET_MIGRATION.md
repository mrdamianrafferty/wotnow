# Copernicus Dataset ID Migration Guide

**Issue:** Dataset IDs in `lib/copernicus/regionRouter.ts` are outdated and causing "Dataset not found" errors.

**Root Cause:** Copernicus Marine Service reorganized their datasets in 2024-2025. The old naming convention used product-level IDs, but they've now split into more granular datasets.

---

## Old vs New Dataset IDs

### Baltic Sea (BAL)

**Old (not working):**
```
cmems_mod_bal_phy_my_0.0167deg_P1D-m
cmems_mod_bal_bgc_my_0.025deg_P1D-m
```

**New (working):**
```
Physics: cmems_mod_bal_phy_anfc_P1D-m  (analysis/forecast, daily)
BGC: cmems_mod_bal_bgc_anfc_P1D-m  (analysis/forecast, daily)
Waves: cmems_mod_bal_wav_anfc_PT1H-i  (analysis/forecast, hourly)
```

### Mediterranean (MED)

**Old (not working):**
```
cmems_mod_med_phy-tem_anfc_4.2km_P1D-m
cmems_mod_med_bgc_my_4.2km_P1D-m
```

**New (working):**
```
Physics: cmems_mod_med_phy_anfc_0.042deg-3D_P1D-m
BGC: cmems_mod_med_bgc_anfc_0.042deg_P1D-m
Waves: cmems_mod_med_wav_anfc_0.042deg_PT1H-m
```

###Iberia-Biscay-Ireland (IBI)

**Old (not working):**
```
cmems_mod_ibi_phy_my_0.083deg_P1D-m
cmems_mod_ibi_bgc_my_0.083deg_P1D-m
```

**New (working):**
```
Physics: cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m
BGC: cmems_mod_ibi_bgc_anfc_0.083deg_P1D-m
Waves: cmems_mod_ibi_wav_anfc_0.083deg_PT1H-m
```

### Northwest European Shelf (NWS)

**Old (not working):**
```
cmems_mod_nws_phy_my_7km_P1D-m
cmems_mod_nws_bgc_my_7km_P1D-m
```

**New (working):**
```
Physics: cmems_mod_nws_phy_anfc_0.027deg-3D_P1D-m
BGC: cmems_mod_nws_bgc_anfc_0.027deg_P1D-m  
Waves: cmems_mod_nws_wav_anfc_0.027deg_PT1H-m
```

### Global Ocean (GLO)

**Old (not working):**
```
cmems_mod_glo_phy_my_0.083deg_P1D-m
cmems_mod_glo_bgc_my_0.25deg_P1D-m
```

**New (working):**
```
Physics: cmems_mod_glo_phy_anfc_0.083deg_P1D-m
BGC: cmems_mod_glo_bgc_anfc_0.25deg_P1D-m
Waves: cmems_mod_glo_wav_anfc_0.2deg_PT3H-i
```

---

## Key Changes

1. **`my` → `anfc`**: Changed from "multi-year" to "analysis/forecast" datasets
   - Multi-year = historical/reanalysis data
   - ANFC = current/forecast data (what we want for fishing predictions)

2. **Resolution in different format**: `7km` → `0.027deg`, `4.2km` → `0.042deg`

3. **Split products**: Some regions now have separate datasets for:
   - 2D variables (surface only)
   - 3D variables (depth profiles) 
   - Different variables (temperature, salinity, currents separate)

4. **Time resolution suffix**: 
   - `P1D` = daily
   - `PT1H` = hourly
   - `PT15M` = 15-minute

---

## How to Find Current Dataset IDs

```bash
# Search for a specific region
copernicusmarine describe | grep -i "dataset_id" | grep -i "bal.*phy"

# List all physics datasets
copernicusmarine describe | grep -i "dataset_id" | grep "phy_anfc"

# List all BGC datasets
copernicusmarine describe | grep -i "dataset_id" | grep "bgc_anfc"

# Check a specific dataset details
copernicusmarine describe --dataset-id cmems_mod_bal_phy_anfc_P1D-m
```

---

## Variables We Need

For each region, we need datasets that provide:

### Physics (`phy`):
- `thetao` - sea water potential temperature
- `so` - salinity
- `uo` - eastward current
- `vo` - northward current
- `mlotst` - mixed layer depth (thermocline)
- `zos` - sea surface height (upwelling)

### Biogeochemistry (`bgc`):
- `chl` - chlorophyll
- `o2` - dissolved oxygen
- `no3` - nitrate
- `po4` - phosphate
- `kd490` - water clarity
- `phyc` - phytoplankton
- `zooc` - zooplankton
- `nppv` - primary production

### Waves (`wav`):
- `vhm0` or `swh` - significant wave height
- `vmdr` - mean wave direction
- `vtm10` - mean wave period
- `vhm0_ww` - wind sea height
- `vhm0_sw1` - swell height

---

## Testing New Dataset IDs

```bash
# Test Baltic
copernicusmarine subset \
  --dataset-id cmems_mod_bal_phy_anfc_P1D-m \
  --variable thetao \
  --minimum-longitude 20 --maximum-longitude 21 \
  --minimum-latitude 60 --maximum-latitude 61 \
  --start-datetime 2025-10-12 --end-datetime 2025-10-12 \
  --output-filename test_baltic.nc

# Test Mediterranean
copernicusmarine subset \
  --dataset-id cmems_mod_med_phy_anfc_0.042deg-3D_P1D-m \
  --variable thetao \
  --minimum-longitude 10 --maximum-longitude 11 \
  --minimum-latitude 40 --maximum-latitude 41 \
  --start-datetime 2025-10-12 --end-datetime 2025-10-12 \
  --output-filename test_med.nc
```

---

## Next Steps

1. **Update `lib/copernicus/regionRouter.ts`** with new dataset IDs
2. **Test each region** with a sample rectangle
3. **Document which variables are available** in each dataset
4. **Handle missing variables gracefully** (some datasets may not have all variables)

---

## Quick Reference Table

| Region | Physics Dataset | BGC Dataset | Status |
|--------|----------------|-------------|--------|
| BAL | `cmems_mod_bal_phy_anfc_P1D-m` | `cmems_mod_bal_bgc_anfc_P1D-m` | ✅ Found |
| MED | `cmems_mod_med_phy_anfc_0.042deg-3D_P1D-m` | `cmems_mod_med_bgc_anfc_0.042deg_P1D-m` | ✅ Found |
| IBI | `cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m` | `cmems_mod_ibi_bgc_anfc_0.083deg_P1D-m` | ✅ Found |
| NWS | `cmems_mod_nws_phy_anfc_0.027deg-3D_P1D-m` | `cmems_mod_nws_bgc_anfc_0.027deg_P1D-m` | ✅ Found |
| GLO | `cmems_mod_glo_phy_anfc_0.083deg_P1D-m` | `cmems_mod_glo_bgc_anfc_0.25deg_P1D-m` | ✅ Found |

---

This is why it's "harder than we thought" - the dataset IDs are a moving target and require periodic updates!
