# 🔧 COPERNICUS INGESTION FIX PLAN

**Date:** October 15, 2025  
**Status:** Ready to Execute

---

## 🎯 WHAT'S WRONG

The ingestion script has **incorrect dataset routing** in `regionRouterV2.ts`. We know the exact commands that work from earlier tests, but the router isn't returning them.

### Current Failures:
1. ❌ **Chlorophyll from models**: Trying `chl` variable - dataset has `phyc`
2. ❌ **Oxygen**: Trying wrong datasets - should use `cmems_mod_*_bgc_anfc_*` (not bgc-nut or phy-sal)
3. ❌ **Nutrients**: Correct dataset but needs proper routing
4. ❌ **Salinity**: Wrong dataset - using global instead of regional

### What Works:
1. ✅ **Chlorophyll from satellite**: `cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D` with `CHL`
2. ✅ **Water Clarity from satellite**: `cmems_obs-oc_med_bgc-transp_my_l3-multi-1km_P1D` with `KD490`

---

## 📋 VERIFIED DATASET IDS & VARIABLES

### Mediterranean (MED)

| Variable | Dataset ID | Variable Name | Type | Depth |
|----------|-----------|---------------|------|-------|
| **Chlorophyll** | `cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D` | `CHL` | Satellite | Surface |
| **Water Clarity** | `cmems_obs-oc_med_bgc-transp_my_l3-multi-1km_P1D` | `KD490` | Satellite | Surface |
| **Dissolved Oxygen** | `cmems_mod_med_bgc_anfc_0.042deg-3D_P1D-m` | `o2` | Model | 3D (125 layers) |
| **Nitrate** | `cmems_mod_med_bgc_anfc_0.042deg-3D_P1D-m` | `no3` | Model | 3D (125 layers) |
| **Phosphate** | `cmems_mod_med_bgc_anfc_0.042deg-3D_P1D-m` | `po4` | Model | 3D (125 layers) |
| **Salinity** | `cmems_mod_med_phy_anfc_0.042deg-3D_P1D-m` | `so` | Model | 3D (141 layers) |

### Atlantic / IBI (Iberia-Biscay-Ireland)

| Variable | Dataset ID | Variable Name | Type | Depth |
|----------|-----------|---------------|------|-------|
| **Chlorophyll** | `cmems_obs-oc_atl_bgc-plankton_my_l4-gapfree-multi-1km_P1D` | `CHL` | Satellite | Surface |
| **Water Clarity** | `cmems_obs-oc_atl_bgc-transp_my_l3-multi-1km_P1D` | `KD490` | Satellite | Surface |
| **Dissolved Oxygen** | `cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m` | `o2` | Model | 3D (50 layers) |
| **Nitrate** | `cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m` | `no3` | Model | 3D (50 layers) |
| **Phosphate** | `cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m` | `po4` | Model | 3D (50 layers) |
| **Salinity** | `cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m` | `so` | Model | 3D (50 layers) |

### Baltic (BAL)

| Variable | Dataset ID | Variable Name | Type | Depth |
|----------|-----------|---------------|------|-------|
| **Chlorophyll** | `cmems_obs-oc_bal_bgc-plankton_nrt_l3-olci-300m_P1D` | `CHL` | Satellite | Surface |
| **Water Clarity** | `cmems_obs-oc_bal_bgc-transp_nrt_l3-olci-300m_P1D` | `KD490` | Satellite | Surface |
| **Dissolved Oxygen** | `cmems_mod_bal_bgc_anfc_0.025deg-3D_P1D-m` | `o2` | Model | 3D (56 layers) |
| **Nitrate** | `cmems_mod_bal_bgc_anfc_0.025deg-3D_P1D-m` | `no3` | Model | 3D (56 layers) |
| **Phosphate** | `cmems_mod_bal_bgc_anfc_0.025deg-3D_P1D-m` | `po4` | Model | 3D (56 layers) |
| **Salinity** | `cmems_mod_bal_phy_anfc_0.025deg-3D_P1D-m` | `so` | Model | 3D (56 layers) |

---

## 🔨 FIX STRATEGY

### Step 1: Update `lib/copernicus/regionRouterV2.ts`

**Current Problem:** Returns wrong dataset IDs or none at all

**Solution:** Complete the Mediterranean section with proper BGC model routing:

```typescript
case 'MED': {
  switch (type) {
    case 'chlorophyll':
      return [
        {
          datasetId: 'cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D',
          quality: 'satellite' as const,
          priority: 1,
        },
      ];
      
    case 'clarity':
      return [
        {
          datasetId: 'cmems_obs-oc_med_bgc-transp_my_l3-multi-1km_P1D',
          quality: 'satellite' as const,
          priority: 1,
        },
      ];
      
    case 'oxygen':
      return [
        {
          datasetId: 'cmems_mod_med_bgc_anfc_0.042deg-3D_P1D-m',
          quality: 'model' as const,
          priority: 1,
        },
      ];
      
    case 'nutrients':
      return [
        {
          datasetId: 'cmems_mod_med_bgc_anfc_0.042deg-3D_P1D-m',
          quality: 'model' as const,
          priority: 1,
        },
      ];
      
    case 'salinity':
      return [
        {
          datasetId: 'cmems_mod_med_phy_anfc_0.042deg-3D_P1D-m',
          quality: 'model' as const,
          priority: 1,
        },
      ];
  }
}
```

### Step 2: Update Variable Extraction Logic

**File:** `scripts/ingestCopernicusBiogeochemical.ts`

**Problem:** Using satellite variable names (`CHL`, `KD490`) for model products

**Solution:** Check product quality and use correct variable name:

```typescript
async function fetchChlorophyll(
  rectangle: Rectangle,
  date: Date
): Promise<number | null> {
  const products = getRegionalProducts(rectangle.cmems_region, 'chlorophyll');
  
  for (const product of products) {
    try {
      // Satellite uses 'CHL', models don't have chlorophyll (use phyc)
      const variable = product.quality === 'satellite' ? 'CHL' : null;
      
      if (!variable) {
        continue; // Skip model products for chlorophyll (satellite only)
      }
      
      const value = await fetchCopernicusVariable(
        product.datasetId,
        variable,
        rectangle,
        date
      );
      
      if (value !== null) {
        console.log(`    ✓ Chlorophyll: ${value.toFixed(2)} mg/m³`);
        return value;
      }
    } catch (error) {
      console.log(`    ✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      continue;
    }
  }
  
  return null;
}
```

---

## ✅ EXECUTION CHECKLIST

### Phase 1: Fix Mediterranean (30 min)

- [ ] 1. Update `regionRouterV2.ts` MED section
  - [ ] Add `oxygen` case → `cmems_mod_med_bgc_anfc_0.042deg-3D_P1D-m`
  - [ ] Add `nutrients` case → same BGC dataset
  - [ ] Add `salinity` case → `cmems_mod_med_phy_anfc_0.042deg-3D_P1D-m`

- [ ] 2. Test Mediterranean ingestion
  ```bash
  npx tsx scripts/ingestCopernicusBiogeochemical.ts --rectangle=37I0 --date=2025-10-01
  ```
  - [ ] Verify chlorophyll downloads (satellite)
  - [ ] Verify clarity downloads (satellite)
  - [ ] Verify oxygen downloads (model BGC)
  - [ ] Verify nutrients download (model BGC)
  - [ ] Verify salinity downloads (model PHY)

- [ ] 3. Check database storage
  ```sql
  SELECT * FROM findr_conditions_snapshots 
  WHERE rectangle_code = '37I0' 
  ORDER BY captured_at DESC 
  LIMIT 1;
  ```

### Phase 2: Fix Atlantic/IBI (15 min)

- [ ] 4. Update `regionRouterV2.ts` IBI section
  - Copy MED pattern, use IBI dataset IDs

- [ ] 5. Test Atlantic ingestion
  ```bash
  npx tsx scripts/ingestCopernicusBiogeochemical.ts --rectangle=21C6 --date=2025-10-01
  ```

### Phase 3: Fix Baltic (15 min)

- [ ] 6. Update `regionRouterV2.ts` BAL section
  - Copy MED pattern, use BAL dataset IDs
  - Note: Baltic uses NRT products (near-real-time)

- [ ] 7. Test Baltic ingestion
  ```bash
  npx tsx scripts/ingestCopernicusBiogeochemical.ts --rectangle=22L4 --date=2025-10-01
  ```

### Phase 4: Production Deployment (10 min)

- [ ] 8. Commit and deploy
  ```bash
  git add .
  git commit -m "fix: Complete Copernicus biogeochemical ingestion for all regions"
  git push
  npx vercel --prod
  ```

- [ ] 9. Setup daily cron job
  - Create `pages/api/cron/ingest-copernicus.ts`
  - Add to `vercel.json`
  - Run daily at 6am UTC

- [ ] 10. Verify frontend
  - Check 30 species displayed
  - Check all 7 bio indicators show values

---

## 🎯 EXPECTED RESULTS

After fixes:

```
🎯 37I0 (MED)
   39.50°N, 2.50°E
  Fetching chlorophyll from cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D...
    ✓ Chlorophyll: 2.40 mg/m³
  Fetching clarity from cmems_obs-oc_med_bgc-transp_my_l3-multi-1km_P1D...
    ✓ Water Clarity: 0.08 m⁻¹
  Fetching oxygen from cmems_mod_med_bgc_anfc_0.042deg-3D_P1D-m...
    ✓ Dissolved Oxygen: 256.00 mmol/m³ → 8.19 mg/L
  Fetching nutrients from cmems_mod_med_bgc_anfc_0.042deg-3D_P1D-m...
    ✓ Nitrate: 4.80 mmol/m³ → 4.80 µmol/L
    ✓ Phosphate: 0.80 mmol/m³ → 0.80 µmol/L
  Fetching salinity from cmems_mod_med_phy_anfc_0.042deg-3D_P1D-m...
    ✓ Salinity: 35.10 PSU
   ✅ Stored successfully!

============================================================
✅ Success: 1/1
❌ Errors: 0/1

🎉 Ingestion complete!
```

---

## 📝 KEY INSIGHTS

1. **Satellite products = easy**: Just use `CHL` and `KD490` variable names
2. **Model products = tricky**: Need correct dataset ID patterns:
   - BGC (biogeochemistry): `cmems_mod_*_bgc_anfc_*` has `o2`, `no3`, `po4`
   - PHY (physics): `cmems_mod_*_phy_anfc_*` has `so` (salinity)
3. **Regional naming**: `med`, `ibi`, `bal` (lowercase in dataset IDs)
4. **Resolution in dataset ID**: `0.042deg` (MED), `0.027deg` (IBI), `0.025deg` (BAL)
5. **Temporal**: `anfc` = analysis forecast, `my` = multi-year, `nrt` = near-real-time

---

## 🚀 LET'S FIX IT!

**Estimated time: 1 hour total**
- 30 min: Fix MED
- 15 min: Fix IBI
- 15 min: Fix BAL
- 10 min: Test & deploy

Ready to start with Mediterranean? 🏖️
