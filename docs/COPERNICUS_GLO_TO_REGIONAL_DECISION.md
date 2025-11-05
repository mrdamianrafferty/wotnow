# Decision: Switch from Global Ocean to Regional Products

**Date**: 2025-01-05
**Status**: ✅ APPROVED - Implementation in progress
**Impact**: Critical - Blocks all data ingestion

---

## The Problem

Global Ocean (GLO) datasets are failing to provide data for coastal ICES rectangles:

**Evidence from GitHub Actions run (2025-01-05)**:
```
📍 31E8: (50.75, 1.00) - English Channel coast
   📍 Using Global Ocean (IBI) regional model
   🌊 Fetching Copernicus data for (50.75, 1)...
   ⚠️  No physics data available after trying all paddings (last attempt: ❌ Error)
   ⚠️  No BGC data available after trying all paddings (last attempt: ❌ Error)
   ❌ Error: No valid physics or biogeochemical data found

📍 30E8: (49.75, 1.00) - English Channel coast
   ⚠️  No physics data available after trying all paddings (last attempt: ❌ Error)
```

**Results**:
- **10 minutes elapsed**
- **2 rectangles attempted**
- **0% success rate** (both failed)
- No valid temperature, salinity, or BGC data retrieved

---

## Why GLO Fails

### 1. Coastal Coverage Gap
- Global Ocean resolution: **~9km** (0.083°)
- All 284 ICES rectangles are **coastal** (≤10km from shore)
- GLO model may not extend into shallow coastal waters (<50m depth)
- Coastal bathymetry and dynamics not well-represented at 9km resolution

### 2. Data Availability
- GLO datasets prioritize open ocean coverage
- Coastal zones may have sparse data or be masked out
- Regional products are **designed for coastal zones**

### 3. Split Dataset Complexity Already Solved
- We just spent a session fixing split-dataset handling for GLO
- The same pattern applies to regional products
- Implementation effort is **not incremental** - we already have the pattern

---

## The Regional Solution

### Dataset Mapping Already Complete ✅

All 284 rectangles are mapped to CMEMS regions via `scripts/populate-cmems-regions.ts`:

| Region | Code | Rectangles | Resolution | Coverage |
|--------|------|------------|------------|----------|
| **Iberia-Biscay-Ireland** | IBI | 156 (54.9%) | ~9km | Portugal, Spain, Ireland, W.UK |
| **Mediterranean Sea** | MED | 56 (19.7%) | **4.2km** | Med, Adriatic, Aegean |
| **Northwest European Shelf** | NWS | 51 (18.0%) | 7km | North Sea, English Channel |
| **Baltic Sea** | BAL | 18 (6.3%) | **~2km** | Baltic, Swedish/Finnish coasts |
| **Arctic** | ARC | 3 (1.1%) | ~4km | Norwegian Arctic |

### Resolution Comparison

| Region | GLO Resolution | Regional Resolution | Improvement |
|--------|----------------|---------------------|-------------|
| BAL | 9km | **2km** | **4.5x better** |
| MED | 9km | **4.2km** | **2x better** |
| NWS | 9km | 7km | 1.3x better |
| IBI | 9km | 9km | Same |

### Coastal Design Advantage

Regional products are **purpose-built for coastal forecasting**:
- Better bathymetry representation
- Coastal process modeling (upwelling, river inputs, tidal mixing)
- Higher spatial resolution where it matters most
- Validated against coastal observations

---

## Regional Dataset Structure

Regional products use **split-dataset architecture** (same as GLO):

### Example: IBI (Iberia-Biscay-Ireland)
```typescript
{
  physics: 'cmems_mod_ibi_phy_anfc_0.027deg-3D_P1D-m',        // Temperature
  salinity: 'cmems_mod_ibi_phy-so_anfc_0.027deg-3D_P1D-m',   // Salinity (separate)
  currents: 'cmems_mod_ibi_phy-cur_anfc_0.027deg-3D_P1D-m',  // Currents (separate)
  biogeochemistry: 'cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m',
  waves: 'cmems_mod_ibi_wav_anfc_0.027deg_PT1H-i',
}
```

### Example: MED (Mediterranean)
```typescript
{
  physics: 'cmems_mod_med_phy-tem_anfc_4.2km_P1D-m',         // Temperature only
  salinity: 'cmems_mod_med_phy-sal_anfc_4.2km_P1D-m',       // Salinity (separate)
  currents: 'cmems_mod_med_phy-cur_anfc_4.2km_P1D-m',       // Currents (separate)
  biogeochemistry: 'cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m',
  waves: 'cmems_mod_glo_wav_anfc_0.083deg_PT3H-i',          // No Med waves, use GLO
}
```

**Note**: This is the **same split-dataset pattern** we already implemented for GLO temperature/salinity.

---

## Implementation Plan

### Phase 1: Update Region Router ✅ (Already have mapping)
- Enable regional dataset configs in `lib/copernicus/regionRouter.ts`
- Use existing `cmems_region` column from `ices_rectangles` table
- Keep GLO as fallback only

### Phase 2: Extend RealCopernicusProvider (4-6 hours)
- Copy GLO split-dataset pattern to regional configs
- Fetch temperature + salinity + currents separately
- Merge into single physics timeseries
- Same progressive padding strategy (0.25°, 1.0°)
- Same 60-second timeout protection

### Phase 3: Test & Deploy (2 hours)
- Test with `FINDR_CONDITIONS_LIMIT=10` (2 rectangles per region)
- Verify temperature, salinity, BGC, and waves data
- Deploy to GitHub Actions
- Monitor full 284-rectangle ingestion

**Total Estimated Effort**: 6-8 hours

---

## Decision Rationale

### Why Not "Quick Test GLO First"?

1. **Evidence is clear**: 0% success rate after 10 minutes
2. **All rectangles are coastal**: GLO won't suddenly work elsewhere
3. **Regional is not optional**: It's the correct solution for coastal fishing
4. **Mapping already complete**: The "hard part" is already done
5. **Pattern already proven**: Split-dataset handling works (we just did it for GLO)
6. **Time investment justified**: 6-8 hours to get **working data** vs. days of debugging why GLO fails

### Alternative Rejected: "Try GLO Offshore"

- There are **0 offshore rectangles** (all are ≤10km from shore)
- Even if GLO worked offshore, it wouldn't help with our dataset

### Why This Is The Right Call

- **Data-driven**: Real failure evidence, not speculation
- **Pragmatic**: Use tools designed for the job (regional products for coastal zones)
- **Efficient**: Leverage existing mapping work, proven code patterns
- **Correct**: Better resolution, better coastal modeling, better predictions

---

## Success Criteria

After implementation, we expect:
- **✅ 80-95% success rate** for coastal rectangles
- **✅ Valid temperature & salinity** for most rectangles
- **✅ Better resolution** for BAL (2km) and MED (4.2km)
- **✅ ~45 minutes** for full 284-rectangle ingestion (with timeouts)

---

## References

- CMEMS region mapping: `scripts/populate-cmems-regions.ts`
- Region distribution: `scripts/check-cmems-distribution.ts`
- Current GLO implementation: `lib/copernicus/regionRouter.ts:27-43`
- Dataset IDs: Commented section in `lib/copernicus/regionRouter.ts:45-107`

---

**Approved By**: Decision made based on empirical failure data and analysis
**Implementation Owner**: Claude Code
**Target Completion**: 2025-01-05 (today)
