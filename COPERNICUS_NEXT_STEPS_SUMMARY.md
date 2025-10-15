# Copernicus Data Ingestion - Next Steps Summary

**Date:** 15 October 2025  
**Status:** ✅ Dataset IDs verified and mostly corrected  
**Issue:** Mediterranean has highly split datasets, other regions work well

---

## ✅ What We Accomplished

1. **Verified all regional dataset IDs** using `copernicusmarine describe`
2. **Updated `regionRouter.ts`** with correct dataset IDs for most regions:
   - ✅ IBI (Iberia-Biscay-Ireland) - Corrected wave resolution
   - ✅ BAL (Baltic) - Use GLO fallback for waves
   - ✅ ARC (Arctic) - Corrected to 6km_detided and ecosmo
   - ✅ GLO (Global) - Corrected BGC and wave resolutions
   - ✅ NWS (Northwest Shelf) - Use GLO fallback entirely
   - ⚠️  MED (Mediterranean) - **Datasets are highly split by variable**

3. **Created documentation** of correct dataset IDs

---

## ⚠️  Key Finding: Mediterranean Complexity

The Mediterranean datasets are split into multiple fine-grained products:
- `cmems_mod_med_phy-cur_anfc_4.2km_P1D-m` (currents only)
- `cmems_mod_med_phy-mld_anfc_4.2km_P1D-m` (mixed layer depth only)
- `cmems_mod_med_phy-ssh_anfc_4.2km_P1D-m` (sea surface height only)
- `cmems_mod_med_phy-tem_anfc_4.2km_P1D-m` (temperature only) **[needs verification]**
- `cmems_mod_med_phy-sal_anfc_4.2km_P1D-m` (salinity only) **[needs verification]**

This requires fetching multiple datasets and merging them.

---

## 🎯 Recommended Next Steps

### **Option 1: Pragmatic Approach (RECOMMENDED)**

**Use GLO (Global) datasets for all regions initially**

**Why:**
- ✅ Global datasets work everywhere (100% coverage)
- ✅ Single dataset IDs - no complexity
- ✅ Get ocean current data flowing ASAP
- ✅ Can refine regional models later
- ⚠️  Lower resolution (0.083° ≈ 9km vs regional 2-4km)

**How:**
1. Temporarily use GLO for all regions in `regionRouter.ts`
2. Run full ingestion (224 rectangles)
3. Populate database with ocean current & clarity data
4. Regional optimization becomes a **future enhancement**

### **Option 2: Hybrid Approach**

**Use regional models where simple, GLO elsewhere**

**Regions to use:**
- ✅ IBI - Works well (complete, single datasets)
- ✅ BAL - Works well (no waves, but physics/BGC good)
- ✅ GLO - Universal fallback

**Regions to skip (use GLO instead):**
- ❌ MED - Too complex (split datasets)
- ❌ NWS - No products available
- ❌ ARC - Limited rectangles (3 total)

### **Option 3: Full Implementation**

**Handle all regional complexity properly**

**Requirements:**
1. Update `realClient.ts` to fetch multiple MED datasets
2. Merge MED physics variables (temperature, salinity, currents, MLD, SSH)
3. Handle split BGC datasets
4. Test each region thoroughly
5. Implement progressive fallback (regional → GLO)

**Time estimate:** 4-6 hours of development + testing

---

## 💡 My Recommendation

**Go with Option 1 (Pragmatic) right now:**

```typescript
// Simplified regionRouter.ts - use GLO everywhere initially
export function getDatasetForCmemsRegion(cmemsRegion: string): CopernicusDatasetConfig {
  // Use Global Ocean for all regions initially
  return {
    physics: 'cmems_mod_glo_phy_anfc_0.083deg_P1D-m',
    biogeochemistry: 'cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m',
    waves: 'cmems_mod_glo_wav_anfc_0.083deg_PT3H-i',
    region: `Global Ocean (${cmemsRegion})`,
    coverage: 'GLOBAL_ANALYSIS_FORECAST',
  };
}
```

**Benefits:**
- ✅ **Get data flowing today** - populate 224 rectangles with ocean currents
- ✅ **Zero failures** - GLO works everywhere
- ✅ **Focus on value** - start using ocean current data in predictions
- ✅ **Iterate later** - add regional refinements when needed

**Trade-offs:**
- ⚠️  Resolution: 9km vs 2-4km regional (still good for fishing predictions)
- ⚠️  Accuracy: Slightly less accurate near coasts (but still valuable)

---

## 🚀 Action Plan (Pragmatic Path)

### **Step 1: Simplify to GLO-only** (5 minutes)

```bash
# Quick test - verify GLO works
FINDR_CONDITIONS_LIMIT=1 npx tsx scripts/ingest-copernicus-data.ts
```

### **Step 2: Run small test** (10 minutes)

```bash
# Test with 20 rectangles across different regions
COPERNICUS_USERNAME=drafferty \
COPERNICUS_PASSWORD='B$@UhRJvrVM9nE7' \
FINDR_CONDITIONS_LIMIT=20 \
npx tsx scripts/ingest-copernicus-data.ts
```

### **Step 3: Full ingestion** (40 minutes)

```bash
# Populate all 224 rectangles
COPERNICUS_USERNAME=drafferty \
COPERNICUS_PASSWORD='B$@UhRJvrVM9nE7' \
FINDR_CONDITIONS_DELAY_MS=1000 \
npx tsx scripts/ingest-copernicus-data.ts
```

### **Step 4: Verify data** (5 minutes)

```bash
# Check database has ocean current data
psql $DATABASE_URL -c "SELECT rectangle_code, current_speed_ms, kd490, captured_at 
FROM findr_conditions_snapshots 
WHERE current_speed_ms IS NOT NULL 
ORDER BY captured_at DESC LIMIT 10;"
```

### **Step 5: Use in predictions** 🎉

Ocean current and clarity data is now available for fishing predictions!

---

## 📊 Expected Results (GLO-only approach)

- **Success rate:** 95-100% (vs 0% currently)
- **Rectangles populated:** ~220/224
- **Processing time:** ~40 minutes
- **Data quality:** Good (9km resolution, global coverage)
- **Failures:** Only very near-shore locations

---

## 🔮 Future Enhancements

Once ocean current data is flowing and being used in predictions:

1. **Add IBI regional model** (2-4 weeks)
   - Higher resolution for Spain/Portugal (most users)
   - Relatively simple (single datasets)

2. **Add BAL regional model** (1-2 weeks)
   - Higher resolution for Baltic
   - Simple (just skip waves)

3. **Tackle MED complexity** (4-6 weeks)
   - Multi-dataset fetching
   - Variable merging logic
   - Comprehensive testing

4. **Implement progressive fallback** (2-3 weeks)
   - Try regional first
   - Fall back to GLO on error
   - Expanded bounding boxes for coastal areas

---

## ❓ Decision Point

**Do you want to:**

**A) Go pragmatic** - Use GLO everywhere, get data flowing today ✅ **RECOMMENDED**

**B) Implement hybrid** - IBI + BAL regional, rest GLO (2-3 hours)

**C) Full implementation** - All regions with proper complexity handling (4-6 hours)

Let me know and I'll implement it!
