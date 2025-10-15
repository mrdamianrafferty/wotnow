# Frontend Bio Indicators - Data Availability Status

**Date:** October 15, 2025  
**Purpose:** Match verified Copernicus data to frontend bio indicator cards

---

## 🎨 Frontend Bio Indicators (from UI)

### ✅ Already Have Data Sources

| Indicator | Frontend Display | Database Column | Copernicus Source | Status |
|-----------|------------------|-----------------|-------------------|--------|
| **Chlorophyll** | 2.4 mg/m³ | `chlorophyll_mg_m3` | Satellite OC (MED/ATL/BAL) | ✅ VERIFIED |
| **Dissolved Oxygen** | 8.2 mg/L | `dissolved_oxygen_mg_l` | Model BGC (MED/IBI/BAL) | ✅ VERIFIED |
| **Water Temperature** | 16.5 °C | `sea_temp_c` | MET Norway + Open-Meteo | ✅ LIVE |
| **Salinity** | 35.1 PSU | `salinity_psu` | Model PHY (MED/IBI/BAL) | 🟡 NEEDS VERIFICATION |

### 🟡 Need to Verify Data Sources

| Indicator | Frontend Display | Database Column | Copernicus Source | Status |
|-----------|------------------|-----------------|-------------------|--------|
| **Nitrate** | 4.8 µmol/L | `nitrate_umol_l` | Model BGC-NUT (MED/IBI/BAL) | 🟡 IDENTIFIED |
| **Phosphate** | 0.8 µmol/L | `phosphate_umol_l` | Model BGC-NUT (MED/IBI/BAL) | 🟡 IDENTIFIED |
| **Phytoplankton** | 2.1 mg/m³ | ❓ Unknown | Model BGC-PFT or same as CHL? | ❓ UNCLEAR |

### 🎯 Composite Indicators

| Indicator | Frontend Display | Components | Status |
|-----------|------------------|------------|--------|
| **Stealth** | 6.0 % light (Very Low) | Water Clarity KD490 + Daylight/Time | ✅ KD490 VERIFIED, needs calculation |

**Note:** "Stealth" = fishing detectability (lower % = harder for fish to see angler/boat)
- Water clarity component: KD490 verified ✅
- Daylight component: Calculate from sun position/time ✅ (can calculate)

---

## 📊 Verified Dataset IDs (Ready to Use)

### 1. Chlorophyll ✅
```
MED: cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D
ATL: cmems_obs-oc_atl_bgc-plankton_my_l4-gapfree-multi-1km_P1D
BAL: cmems_obs-oc_bal_bgc-plankton_nrt_l3-olci-300m_P1D
```
**Variable:** `CHL` (mg/m³)  
**Frontend:** Shows as "Chlorophyll 2.4 mg/m³"

### 2. Dissolved Oxygen ✅
```
MED: cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m
IBI: cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m
BAL: cmems_mod_bal_bgc_anfc_P1D-m
```
**Variable:** `o2` (mmol/m³, convert to mg/L × 0.032)  
**Frontend:** Shows as "Dissolved Oxygen 8.2 mg/L"

### 3. Water Clarity (for Stealth) ✅
```
MED: cmems_obs-oc_med_bgc-transp_my_l3-multi-1km_P1D
ATL: cmems_obs-oc_atl_bgc-transp_my_l3-multi-1km_P1D
BAL: cmems_obs-oc_bal_bgc-transp_nrt_l3-olci-300m_P1D
```
**Variable:** `KD490` (m⁻¹)  
**Frontend:** Part of "Stealth 6.0 % light" calculation

### 4. Water Temperature ✅
**Current Source:** MET Norway + Open-Meteo  
**Frontend:** Shows as "Water Temperature 16.5 °C"  
**Status:** Already ingesting ✅

---

## 🔍 Need to Verify (Quick Tests)

### Nutrients (Nitrate + Phosphate)
**Identified Datasets:**
```
MED: cmems_mod_med_bgc-nut_anfc_4.2km_P1D-m
IBI: cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m (has no3, po4)
BAL: cmems_mod_bal_bgc_anfc_P1D-m (has no3, po4)
```
**Variables:** `no3` (nitrate), `po4` (phosphate) in mmol/m³  
**Frontend:** Shows as "Nitrate 4.8 µmol/L", "Phosphate 0.8 µmol/L"  
**Action:** Quick test download to confirm

### Salinity
**Identified Datasets:**
```
MED: cmems_mod_med_phy-sal_anfc_4.2km_P1D-m (dedicated salinity product)
IBI: cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m (has so - salinity)
BAL: cmems_mod_bal_phy_anfc_P1D-m (has so - salinity)
```
**Variable:** `so` (salinity in PSU)  
**Frontend:** Shows as "Salinity 35.1 PSU"  
**Action:** Quick test download to confirm

### Phytoplankton
**Question:** Is this the same as Chlorophyll or different?
**Possible Datasets:**
```
cmems_mod_*_bgc-pft_anfc_*  (Phytoplankton Functional Types)
Variable: phyc (phytoplankton carbon biomass)
```
**Frontend:** Shows as "Phytoplankton 2.1 mg/m³"  
**Action:** Clarify if this is:
- Same as chlorophyll (CHL) ✅
- Or phytoplankton carbon (phyc) ❓
- Or derived metric?

---

## 🚀 Recommended Testing Order

### Priority 1: Complete the "Big 3" (Already Verified ✅)
1. ✅ Chlorophyll - DONE
2. ✅ Dissolved Oxygen - DONE
3. ✅ Water Clarity (KD490) - DONE

### Priority 2: Test Nutrients (5 minutes)
Quick test to verify nitrate + phosphate from same BGC models:
```bash
# Test MED nutrients
copernicusmarine subset \
  --dataset-id cmems_mod_med_bgc-nut_anfc_4.2km_P1D-m \
  --variable no3 --variable po4 \
  --start-datetime 2025-10-01T00:00:00 \
  --end-datetime 2025-10-01T23:59:59 \
  --minimum-longitude 2 --maximum-longitude 3 \
  --minimum-latitude 39 --maximum-latitude 40 \
  --output-filename /tmp/test_nutrients.nc
```

### Priority 3: Test Salinity (5 minutes)
Quick test from physics models:
```bash
# Test MED salinity
copernicusmarine subset \
  --dataset-id cmems_mod_med_phy-sal_anfc_4.2km_P1D-m \
  --variable so \
  --start-datetime 2025-10-01T00:00:00 \
  --end-datetime 2025-10-01T23:59:59 \
  --minimum-longitude 2 --maximum-longitude 3 \
  --minimum-latitude 39 --maximum-latitude 40 \
  --output-filename /tmp/test_salinity.nc
```

### Priority 4: Clarify Phytoplankton
Check if frontend expects:
- Same value as chlorophyll (easiest)
- Separate phytoplankton carbon metric
- Calculated from chlorophyll

---

## 📋 Database Columns Status

| Frontend Indicator | Database Column | Exists? | Copernicus Variable |
|-------------------|-----------------|---------|---------------------|
| Chlorophyll | `chlorophyll_mg_m3` | ✅ Yes | `CHL` |
| Dissolved Oxygen | `dissolved_oxygen_mg_l` | ✅ Yes | `o2` (convert) |
| Water Temp | `sea_temp_c` | ✅ Yes | (MET Norway) |
| Salinity | `salinity_psu` | ✅ Yes | `so` |
| Nitrate | `nitrate_umol_l` | ✅ Yes | `no3` (convert) |
| Phosphate | `phosphate_umol_l` | ✅ Yes | `po4` (convert) |
| Water Clarity | `water_clarity_kd490` | ❌ No | `KD490` |
| Phytoplankton | ❓ | ❓ | ❓ |

**Action Needed:** Add `water_clarity_kd490` column

---

## 🎯 Frontend Coverage Summary

| Status | Count | Indicators |
|--------|-------|------------|
| ✅ Verified Ready | 4 | Chlorophyll, Dissolved O2, Water Clarity, Water Temp |
| 🟡 Need Quick Test | 2 | Nitrate, Phosphate, Salinity |
| ❓ Need Clarification | 1 | Phytoplankton |
| 🎨 Composite (Calculated) | 1 | Stealth (clarity + daylight) |

**Total:** 8 bio indicators in frontend  
**Ready to Deploy:** 4 (50%)  
**Can Verify in 15 mins:** +3 (87.5%)

---

## 💡 Quick Win Strategy

1. **Test nutrients & salinity now** (15 minutes total)
2. **Clarify phytoplankton** with frontend team
3. **Deploy RPC function** to unblock frontend
4. **Implement "Big 3"** ingestion (chlorophyll, oxygen, clarity)
5. **Add nutrients + salinity** once tested
6. **Calculate stealth composite** from clarity + time
7. **Handle phytoplankton** based on clarification

**Expected Result:** 87.5% of bio indicators working with real data! 🎉

---

## 🔗 Related Documentation

- [COPERNICUS_COMPLETE_BIOGEOCHEMICAL_COVERAGE.md](./COPERNICUS_COMPLETE_BIOGEOCHEMICAL_COVERAGE.md) - Full verification
- [COPERNICUS_DATASET_IDS_QUICK_REFERENCE.md](./COPERNICUS_DATASET_IDS_QUICK_REFERENCE.md) - Dataset lookup
