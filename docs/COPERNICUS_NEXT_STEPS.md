# Copernicus Marine Data Integration - Next Steps

**Status:** Core temperature/salinity integration complete (Commit: a87846af)
**Date:** 2025-11-05
**Current State:** Using Global Ocean datasets at 9km resolution

## Executive Summary

The Copernicus data ingestion is now **functional** with correct temperature and salinity data. This document outlines enhancements to improve data quality, resolution, and coverage.

## Current Implementation (✅ Working)

### What We Have
- **Temperature (thetao)**: 3D profiles, 50 depth levels (0-5500m), 9km resolution
- **Salinity (so)**: 3D profiles, 50 depth levels, 9km resolution
- **Biogeochemistry (chl, nutrients, O2)**: 25km resolution from global BGC model
- **Wave Data**: Significant wave height, period, direction (9km resolution)

### Datasets Used
```
Physics (Temperature): cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m
Physics (Salinity):    cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m
Biogeochemistry:       cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m
Waves:                 cmems_mod_glo_wav_anfc_0.083deg_PT3H-i
```

### Performance
- Optimized to ~5 API calls per rectangle (down from 10)
- 60-second timeout protection
- Expected completion: ~45 minutes for 224 rectangles
- Reduced from 90+ minutes (previous hanging behavior)

## Priority Enhancements

### 🔴 HIGH Priority: Add Ocean Currents

**Why It Matters:**
- Currents affect fish behavior, feeding patterns, and location
- Critical for pelagic species (mackerel, tuna, sardines)
- Impacts bait dispersal and plankton distribution

**Implementation:**
1. Add currents dataset to `lib/copernicus/regionRouter.ts`:
```typescript
export interface CopernicusDatasetConfig {
  physics: string;         // Temperature
  salinity?: string;       // Salinity
  currents?: string;       // ← ADD THIS
  biogeochemistry: string;
  waves: string;
  region: string;
  coverage: string;
}

// In getDatasetForCmemsRegion():
return {
  physics: 'cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m',
  salinity: 'cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m',
  currents: 'cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i', // ← ADD THIS
  biogeochemistry: 'cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m',
  waves: 'cmems_mod_glo_wav_anfc_0.083deg_PT3H-i',
  region: `Global Ocean (${region})`,
  coverage: 'GLOBAL_ANALYSIS_FORECAST',
};
```

2. Update `lib/copernicus/realClient.ts` to fetch currents (similar to salinity fetch)
3. Merge current variables (uo, vo) into physics timeseries

**Variables to Extract:**
- `uo`: Eastward velocity (m/s)
- `vo`: Northward velocity (m/s)

**Estimated Effort:** 2-3 hours (similar to salinity integration)

**Impact:** Better predictions for pelagic species, especially in tidal/current-rich areas

---

### 🟡 MEDIUM Priority: Upgrade to Regional Products

**Why It Matters:**
- **3-5x better resolution** than global datasets
- More accurate coastal predictions (most ICES rectangles are coastal)
- Better representation of local phenomena (upwelling, fronts, eddies)

**Regional Coverage for European Waters:**

| Region | Current (Global) | With Regional | Product ID |
|--------|------------------|---------------|------------|
| Iberia-Biscay-Ireland (IBI) | 9km | ~3km | `IBI_ANALYSISFORECAST_PHY_005_001` |
| North-West Shelf (NWS) | 9km | ~1.5km | `NWSHELF_ANALYSISFORECAST_PHY_004_013` |
| Mediterranean (MED) | 9km | ~4km | `MEDSEA_ANALYSISFORECAST_PHY_006_013` |
| Baltic Sea (BAL) | 9km | ~2km | `BALTICSEA_ANALYSISFORECAST_PHY_003_006` |

**Implementation Approach:**

**Option A: Hybrid (Recommended)**
- Use regional products for mapped ICES rectangles
- Fall back to global for unmapped regions or API failures
- Maintains 100% coverage with best-available resolution

**Option B: Regional-Only**
- Only use regional products
- May have gaps where regional products don't cover
- Simpler but less robust

**Implementation Steps:**

1. **Map ICES rectangles to regions** (already partially done in `regionRouter.ts`):
```typescript
// In lib/findr/rectangle.ts or new mapping file
const RECTANGLE_TO_CMEMS_REGION: Record<string, string> = {
  // IBI region (Iberia-Biscay-Ireland): 27°-62°N, 20°W-14°E
  '27E5': 'IBI', '28E5': 'IBI', '29E5': 'IBI', // Bay of Biscay
  '30E6': 'IBI', '31E6': 'IBI', '32E6': 'IBI', // English Channel
  // ... map all 224 rectangles

  // NWS region (North-West Shelf): 48°-62°N, 12°W-13°E
  '33F0': 'NWS', '34F0': 'NWS', // North Sea
  // ...

  // MED region (Mediterranean): 30°-46°N, 6°W-37°E
  '37G0': 'MED', '38G0': 'MED', // Western Med
  // ...
};
```

2. **Uncomment regional routing** in `regionRouter.ts` (lines 40-101)

3. **Update dataset IDs** using new Copernicus Toolbox conventions:
   - Old: dataset IDs like `cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m`
   - New: Use product IDs with `--dataset-id auto` flag
   - Example: `IBI_ANALYSISFORECAST_PHY_005_001`

4. **Handle split datasets** (some regions split temp/sal like Global):
   - Mediterranean splits physics into multiple variables
   - May need separate fetches per region

5. **Implement fallback logic**:
```typescript
try {
  // Try regional dataset
  data = await fetchRegionalData(region, coords);
} catch (error) {
  console.warn(`Regional fetch failed for ${region}, falling back to global`);
  data = await fetchGlobalData(coords);
}
```

**Estimated Effort:** 1-2 days (mapping + testing + fallback logic)

**Impact:** Significantly better coastal predictions, especially NWS and IBI

---

### 🟡 MEDIUM Priority: Add High-Res Ocean Color (Satellite Chlorophyll)

**Why It Matters:**
- **Much better surface chlorophyll** than model estimates
- Gap-filled products reduce cloud-related data loss
- Higher resolution (1-4km) for satellite L3/L4 products
- More accurate for surface-feeding fish and plankton-dependent species

**Products to Add:**

**For Surface Conditions (L3 - Daily NRT):**
- IBI: `OCEANCOLOUR_IBI_BGC_HR_L3_NRT_009_204` (~1km resolution)
- MED: `OCEANCOLOUR_MED_BGC_HR_L3_NRT_009_205` (~1km resolution)
- NWS: Use Atlantic product or global

**For Monthly Averages (L4 - Gap-Filled):**
- IBI: `OCEANCOLOUR_IBI_BGC_HR_L4_NRT_009_210` (~1km, monthly composites)
- MED: Similar L4 product available

**Implementation:**

1. Add ocean color as separate optional dataset in `CopernicusDatasetConfig`:
```typescript
export interface CopernicusDatasetConfig {
  physics: string;
  salinity?: string;
  currents?: string;
  biogeochemistry: string;
  oceanColor?: string;      // ← ADD for satellite chlorophyll
  oceanColorMonthly?: string; // ← ADD for gap-filled monthly
  waves: string;
  region: string;
  coverage: string;
}
```

2. Fetch ocean color separately (surface-only, no depth dimension)

3. Use in preference to model chlorophyll for surface layers (0-10m)

4. Fall back to model BGC chlorophyll for:
   - Depth profiles (> 10m)
   - Regions without ocean color coverage
   - Cloud-heavy periods (even with L4 gap-filling)

**Estimated Effort:** 4-6 hours (separate fetch path, merging logic)

**Impact:** Better surface predictions for species feeding on plankton blooms

---

### 🟢 LOW Priority: Add Mixed Layer Depth (MLD)

**Why It Matters:**
- Indicates thermocline depth (boundary between warm surface and cold deep water)
- Affects fish vertical distribution
- Important for species like tuna that hunt at thermocline boundaries

**Implementation:**
- Available in multi-variable physics datasets
- Can be extracted from regional products (already includes MLD)
- Global: May need separate fetch from `cmems_mod_glo_phy_anfc_0.083deg_P1D-m`

**Estimated Effort:** 2-3 hours

**Impact:** Marginal improvement for deep-water species predictions

---

### 🟢 LOW Priority: Add Sea Surface Height (SSH) / Dynamic Topography

**Why It Matters:**
- Eddies and fronts concentrate nutrients and fish
- SSH anomalies indicate mesoscale features
- Useful for offshore/pelagic fishing

**Implementation:**
- Already in global physics dataset (`zos` variable)
- Just needs to be extracted and stored

**Estimated Effort:** 1-2 hours

**Impact:** Useful for advanced users, not critical for coastal fishing

---

## Technical Considerations

### Using Product IDs vs Dataset IDs

**Current Approach (Dataset IDs):**
```bash
copernicusmarine subset \
  --dataset-id cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m \
  --minimum-longitude 0.75 --maximum-longitude 1.25 \
  # ...
```

**Recommended Approach (Product IDs with auto dataset):**
```bash
copernicusmarine get \
  --product-id IBI_ANALYSISFORECAST_PHY_005_001 \
  --dataset-id auto \
  --variables thetao so uo vo \
  --start-datetime 2025-10-01T00:00:00Z \
  --end-datetime 2025-10-07T23:59:59Z \
  --bbox -12,34,4,47 \
  --depth-min 0 --depth-max 100 \
  --output-directory ./cmems/ibi/phy
```

**Advantages:**
- Toolbox automatically selects best available dataset
- Handles dataset versioning/updates automatically
- Cleaner API (fewer hardcoded dataset IDs)
- Can fetch multiple variables in one call

**Migration Path:**
1. Keep current dataset ID approach working
2. Add product ID support as new feature
3. Test with single region (e.g., IBI)
4. Gradually migrate to product IDs
5. Keep dataset IDs as fallback

---

## Data Quality & Validation

### Recommended Validation Steps

1. **After adding currents:**
   - Check current magnitude is reasonable (0-2 m/s typical, >3 m/s rare)
   - Verify direction aligns with known tidal/oceanic patterns
   - Compare with local tide tables for coastal areas

2. **After adding regional products:**
   - Compare regional vs global data for same location
   - Verify resolution improvement is visible in data
   - Check edge cases where regional boundaries meet
   - Monitor API failure rates (regional services may be less stable)

3. **After adding ocean color:**
   - Compare satellite vs model chlorophyll
   - Check cloud coverage impact (% missing data)
   - Validate against known bloom events

### Quality Flags & Handling

Ocean color products include quality flags:
- Use flags to filter bad pixels (clouds, sun glint, etc.)
- L4 products are pre-filtered and gap-filled
- Model BGC data doesn't need flags (always available)

---

## Performance & Cost Optimization

### Current Cost: ~5 API calls per rectangle
- Temperature: 2 padding attempts (0.25°, 1.0°)
- Salinity: 1 call (reuses successful temperature padding)
- Biogeochemistry: 2 padding attempts
- Waves: 1 padding attempt (optional)

### With All Enhancements: ~7-8 API calls per rectangle
- Temperature: 2 calls
- Salinity: 1 call
- Currents: 1 call (reuse successful padding)
- Biogeochemistry: 2 calls
- Ocean color: 1 call (surface-only, less data)
- Waves: 1 call

**Estimated Total Time:** Still < 60 minutes for 224 rectangles (faster regional APIs)

### Optimization Strategies

1. **Batch requests where possible:**
   - Combine variables in single fetch if same dataset
   - Example: `--variables thetao so uo vo` in one call

2. **Parallel fetches:**
   - Fetch physics and BGC concurrently
   - Fetch ocean color separately (different temporal resolution)

3. **Smart caching:**
   - Cache successful padding values per region
   - Skip smaller paddings if larger ones always succeed

4. **Regional failover:**
   - If regional API is slow/failing, skip to global immediately
   - Track regional API health over time

---

## Migration Strategy

### Phase 1: Add Currents (Immediate)
**Effort:** 2-3 hours
**Risk:** Low (same pattern as salinity)
**Benefit:** High (completes core oceanographic variables)

**Steps:**
1. Add currents dataset to config
2. Implement fetch (copy salinity pattern)
3. Test with 5 rectangles
4. Deploy and monitor

---

### Phase 2: Regional Products (1-2 weeks)
**Effort:** 1-2 days development + testing
**Risk:** Medium (need fallback logic, edge cases)
**Benefit:** Very High (3-5x better resolution)

**Steps:**
1. Map all 224 ICES rectangles to CMEMS regions
2. Implement region routing with fallback
3. Test each region individually (IBI, NWS, MED, BAL)
4. Test boundary cases (rectangles between regions)
5. Monitor failure rates in production
6. Gradual rollout (enable per region)

---

### Phase 3: Ocean Color (Optional)
**Effort:** 4-6 hours
**Risk:** Low (separate data stream)
**Benefit:** Medium (surface-only improvement)

**Steps:**
1. Add L3 daily ocean color for IBI/MED
2. Implement surface layer preference logic
3. Add L4 monthly for long-term averages
4. Compare with model BGC chlorophyll

---

## Testing & Validation Plan

### Test Locations (Representative Rectangles)

**Coastal (shallow, strong currents):**
- 31E8 (Dover Strait) - Strong tides, English Channel
- 36F1 (Thames Estuary) - Very shallow, turbid

**Offshore (deeper, oceanic):**
- 27E5 (Bay of Biscay) - Deeper shelf edge
- 30D0 (Celtic Sea) - Open ocean conditions

**Regional Boundaries:**
- 33F0 (Southern North Sea) - NWS/IBI boundary
- 37G0 (Western Med entrance) - Med/Atlantic boundary

### Validation Metrics

1. **Data Completeness:**
   - % rectangles with valid data
   - % variables successfully fetched
   - Time to complete ingestion

2. **Data Quality:**
   - Temperature range sanity checks (0-30°C for surface)
   - Salinity range checks (30-40 PSU typical)
   - Current magnitude checks (< 3 m/s typical)
   - Chlorophyll range (0.01-50 mg/m³)

3. **Prediction Impact:**
   - Compare predictions before/after enhancements
   - Validate against catch logs (if available)
   - User feedback on prediction quality

---

## Reference Documentation

### Copernicus Marine Data Store
- Main portal: https://data.marine.copernicus.eu/
- Toolbox docs: https://help.marine.copernicus.eu/en/collections/4060068-copernicus-marine-toolbox
- Product catalog: Browse by sea basin → Analysis/Forecast

### Key Product Pages
- **IBI Physics:** https://data.marine.copernicus.eu/product/IBI_ANALYSISFORECAST_PHY_005_001
- **NWS Physics:** https://data.marine.copernicus.eu/product/NWSHELF_ANALYSISFORECAST_PHY_004_013
- **MED Physics:** https://data.marine.copernicus.eu/product/MEDSEA_ANALYSISFORECAST_PHY_006_013
- **Global Physics:** https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_PHY_001_024

### Variable Naming Reference

| Variable | Name | Units | Notes |
|----------|------|-------|-------|
| thetao | Potential temperature | °C | Use for fish preferences |
| so | Salinity | PSU (1e-3) | Practical Salinity Units |
| uo | Eastward velocity | m/s | Positive = eastward |
| vo | Northward velocity | m/s | Positive = northward |
| chl | Chlorophyll-a | mg/m³ | Model or satellite |
| mlotst | Mixed layer depth | m | Thermocline indicator |
| zos | Sea surface height | m | Above geoid |

---

## Decision Log

### Why Global Ocean First?
**Decision:** Start with global datasets, add regional later
**Rationale:**
- Simpler implementation (single dataset structure)
- 100% coverage guaranteed
- Faster time to working solution
- Regional can be added incrementally

**Trade-off:** Lower resolution (9km vs 1.5-4km regional)

### Why Split Temperature/Salinity Fetches?
**Decision:** Fetch temperature and salinity separately
**Rationale:**
- Global Ocean has split datasets for these variables
- Following Copernicus data organization
- Allows independent timeout/retry logic

**Trade-off:** 1 extra API call per rectangle

### Why Not Use Product IDs Yet?
**Decision:** Use dataset IDs for initial implementation
**Rationale:**
- More explicit control over exact dataset
- Easier debugging (know exactly what's being fetched)
- Fewer unknowns during critical bug fix

**Future:** Migrate to product IDs for regional products

---

## Success Metrics

### Current State (Post-Fix)
- ✅ Ingestion completes successfully
- ✅ Temperature and salinity data valid
- ✅ Predictions have environmental data
- ⏱️ ~45 minute completion time

### Target State (All Enhancements)
- ✅ Ocean currents available
- ✅ 3-5x better resolution (regional products)
- ✅ High-quality surface chlorophyll (satellite)
- ✅ < 60 minute completion time
- ✅ > 95% data availability
- ✅ Fallback to global if regional fails

---

## Contact & Resources

**Current Implementation:**
- Commit: a87846af
- Files: `lib/copernicus/realClient.ts`, `lib/copernicus/regionRouter.ts`
- Test script: `scripts/ingest-copernicus-data.ts`

**Copernicus Support:**
- User forum: https://marine.copernicus.eu/forum/
- Service desk: https://marine.copernicus.eu/services-portfolio/contact-us

**Related Docs:**
- `COPERNICUS_DATA_INGESTION_GUIDE.md` - Current ingestion process
- `PHASE_10_COMPLETE_SUMMARY.md` - CMEMS integration history
- `CMEMS_INTEGRATION_STATUS.md` - Integration status overview

---

**Last Updated:** 2025-11-05
**Next Review:** After Phase 1 (Currents) completion
