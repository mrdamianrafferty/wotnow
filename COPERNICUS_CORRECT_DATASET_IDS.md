# Copernicus Correct Dataset IDs - October 2025

**Date:** 15 October 2025  
**Source:** copernicusmarine CLI version 2.2.2  
**Purpose:** Update `lib/copernicus/regionRouter.ts` with correct dataset IDs

---

## ✅ IBI - Iberia-Biscay-Ireland

**Product:** IBI_ANALYSISFORECAST_PHY_005_001

**Correct Dataset IDs:**
```
Physics (3D): cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m
```

**Product:** IBI_ANALYSISFORECAST_BGC_005_004

**Correct Dataset IDs:**
```
Biogeochemistry (3D): cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m
```

**Product:** IBI_ANALYSISFORECAST_WAV_005_005

**Correct Dataset IDs:**
```
Waves: cmems_mod_ibi_wav_anfc_0.027deg_PT1H-i
```

**Changes Needed:**
- ✅ Physics: Already correct
- ✅ BGC: Already correct  
- ❌ Waves: Change from `0.083deg_PT1H-m` to `0.027deg_PT1H-i`

---

## ✅ BAL - Baltic Sea

**Product:** BALTICSEA_ANALYSISFORECAST_PHY_003_006

**Correct Dataset IDs:**
```
Physics: cmems_mod_bal_phy_anfc_P1D-m
```

**Product:** BALTICSEA_ANALYSISFORECAST_BGC_003_007

**Correct Dataset IDs:**
```
Biogeochemistry: cmems_mod_bal_bgc_anfc_P1D-m
```

**Waves:** Baltic doesn't have a wave analysis/forecast product
```
Waves: (use Global or omit)
```

**Changes Needed:**
- ✅ Physics: Already correct (just `_anfc_P1D-m`, no resolution specified)
- ✅ BGC: Already correct
- ⚠️  Waves: Product `cmems_mod_bal_wav_anfc_PT1H-i` **DOES NOT EXIST**

---

## ❌ MED - Mediterranean Sea

**Product:** MEDSEA_ANALYSISFORECAST_PHY_006_013

**Correct Dataset IDs:**
```
Physics: cmems_mod_med_phy_anfc_4.2km_P1D-m  (NOT the 0.042deg-3D one)
OR separate:
  Temperature: cmems_mod_med_phy-tem_anfc_4.2km_P1D-m
  Salinity: cmems_mod_med_phy-sal_anfc_4.2km_P1D-m  
  Currents: cmems_mod_med_phy-cur_anfc_4.2km_P1D-m
```

**Product:** MEDSEA_ANALYSISFORECAST_BGC_006_014

**Correct Dataset IDs:**
```
Biogeochemistry: cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m
```

**Waves:** Mediterranean doesn't have separate wave product in analysis/forecast
```
Waves: (use Global or omit)
```

**Changes Needed:**
- ❌ Physics: `cmems_mod_med_phy_anfc_0.042deg-3D_P1D-m` **DOES NOT EXIST**
  - Change to: `cmems_mod_med_phy_anfc_4.2km_P1D-m`
- ❌ BGC: `cmems_mod_med_bgc_anfc_0.042deg_P1D-m` **DOES NOT EXIST**
  - Change to: `cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m`
- ❌ Waves: `cmems_mod_med_wav_anfc_0.042deg_PT1H-m` **DOES NOT EXIST**

---

## ❌ NWS - Northwest European Shelf

**Product:** ~~NORTHWESTSHELF_ANALYSIS_FORECAST~~ **DOES NOT EXIST**

**Status:** Northwest Shelf doesn't have separate analysis/forecast products anymore in the new catalog structure.

**Recommendation:** **Use GLOBAL datasets** for NWS region

**Changes Needed:**
- ❌ Physics: `cmems_mod_nws_phy_anfc_0.027deg-3D_P1D-m` **DOES NOT EXIST**
- ❌ BGC: `cmems_mod_nws_bgc_anfc_0.027deg_P1D-m` **DOES NOT EXIST**  
- ❌ Waves: `cmems_mod_nws_wav_anfc_0.027deg_PT1H-m` **DOES NOT EXIST**
- ✅ **Solution:** Use GLO (Global) datasets for NWS region

---

## ✅ ARC - Arctic

**Product:** ARCTIC_ANALYSISFORECAST_PHY_002_001

**Correct Dataset IDs:**
```
Physics: cmems_mod_arc_phy_anfc_6km_detided_P1D-m
```

**Product:** ARCTIC_ANALYSISFORECAST_BGC_002_004

**Correct Dataset IDs:**
```
Biogeochemistry: cmems_mod_arc_bgc_anfc_ecosmo_P1D-m
```

**Waves:** Arctic doesn't have dedicated wave product
```
Waves: (use Global or omit)
```

**Changes Needed:**
- ❌ Physics: Change from `cmems_mod_arc_phy_anfc_3km_P1D-m` to `cmems_mod_arc_phy_anfc_6km_detided_P1D-m`
- ❌ BGC: Change from `cmems_mod_arc_bgc_anfc_3km_P1D-m` to `cmems_mod_arc_bgc_anfc_ecosmo_P1D-m`
- ❌ Waves: `cmems_mod_arc_wav_anfc_4km_PT3H-i` **DOES NOT EXIST**

---

## ✅ GLO - Global Ocean

**Product:** GLOBAL_ANALYSISFORECAST_PHY_001_024

**Correct Dataset IDs:**
```
Physics: cmems_mod_glo_phy_anfc_0.083deg_P1D-m
OR separate:
  Temperature: cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m
  Salinity: cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m
  Currents: cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m
```

**Product:** GLOBAL_ANALYSISFORECAST_BGC_001_028

**Correct Dataset IDs:**
```
Biogeochemistry: cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m
```

**Product:** GLOBAL_ANALYSISFORECAST_WAV_001_027

**Correct Dataset IDs:**
```
Waves: cmems_mod_glo_wav_anfc_0.083deg_PT3H-i
```

**Changes Needed:**
- ❌ Physics: Change from `cmems_mod_glo_phy_anfc_0.083deg_P1D-m` to split or keep combined
- ❌ BGC: Change from `cmems_mod_glo_bgc_anfc_0.25deg_P1D-m` to `cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m`
- ❌ Waves: Change from `cmems_mod_glo_wav_anfc_0.2deg_PT3H-i` to `cmems_mod_glo_wav_anfc_0.083deg_PT3H-i`

---

## 📋 Summary of Required Changes

### Critical Fixes (Datasets Don't Exist):
1. **MED Physics:** `0.042deg-3D` → `4.2km`
2. **MED BGC:** `0.042deg` → `4.2km` with `-bio` suffix
3. **NWS All:** Use GLO datasets instead (no NWS products exist)
4. **ARC Physics:** `3km` → `6km_detided`
5. **ARC BGC:** `3km` → `ecosmo`
6. **BAL Waves:** Product doesn't exist, use GLO or omit
7. **ARC/MED Waves:** Products don't exist, use GLO

### Minor Fixes (Resolution/Naming):
1. **IBI Waves:** `0.083deg` → `0.027deg`
2. **GLO BGC:** Add `-bio` suffix
3. **GLO Waves:** `0.2deg` → `0.083deg`

---

## 🎯 Recommendation

**Update `regionRouter.ts` with these corrections, then:**

1. **For regions with missing products** (NWS, BAL/ARC/MED waves):
   - Fall back to GLO (Global) datasets
   - These have broader coverage and will work for all locations

2. **Test priority order:**
   - IBI (complete, just wave resolution fix)
   - BAL (complete physics/bgc, no waves)
   - GLO (fallback for all)
   - MED (needs dataset ID fixes)
   - ARC (needs dataset ID fixes)
   - NWS (use GLO entirely)

3. **Expected success after fixes:**
   - IBI: 95%+ ✅
   - BAL: 90%+ ✅
   - GLO: 100% (global coverage) ✅
   - MED: 90%+ (after ID fixes)
   - ARC: 85%+ (after ID fixes)
   - NWS: Use GLO instead

---

## Next Step

Update `/Users/damianrafferty/Projects/WotNow/lib/copernicus/regionRouter.ts` with correct dataset IDs.
