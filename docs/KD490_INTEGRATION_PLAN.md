# KD490 Integration Plan

**Date:** November 5, 2025
**Status:** 📋 **PLANNED** - Collect data for 1 week, then evaluate
**Context:** Using chlorophyll proxy for stealth now, collect real KD490 in parallel

---

## Current State

✅ **Working Now:**
- Stealth card uses chlorophyll proxy for water clarity
- Formula: `clarity = (1 - min(chl, 3.0) / 3.0) * 100`
- Integrated in `components/findr/ConditionsDashboard.tsx:529-539`
- Database column `kd490` exists but currently null

❌ **Not Yet Implemented:**
- KD490 fetching from Copernicus optical datasets
- KD490 storage in database
- Real kd490-based stealth calculation

---

## Product Selection (Based on User Research)

### Primary: Global L4 NRT (Gap-Free, Cloud-Filled)
**Dataset ID:** `OCEANCOLOUR_GLO_BGC_L4_NRT_009_102`

**Characteristics:**
- Level-4 (interpolated, gap-filled)
- Daily resolution, 4km spatial resolution
- Variables: `KD490`, `ZSD` (Secchi depth)
- Latency: 1-3 days (vs <24h for physics models)
- Quality: Satellite observation + interpolation
- Coverage: Global, continuous (fills clouds)

**Why This One:**
- No missing pixels (cloud-filled using ML/interpolation)
- Robust for operational pipelines
- Good balance of quality vs availability

### Regional Upgrades (Optional)

**Atlantic (NWS/IBI):** `OCEANCOLOUR_ATL_BGC_L3_NRT_009_111`
- 1km resolution (vs 4km global)
- Level-3 (sensor-native, higher fidelity)
- Has cloud gaps, needs handling

**Mediterranean:** `OCEANCOLOUR_MED_BGC_L3_NRT_009_141`
- Similar 1km regional quality

**Use When:** Need higher resolution for specific regions

---

## Latency & Reliability Expectations

### Data Freshness
- **NRT L4**: Same day to 1-3 days latency
- **Cloud impact**: Persistent clouds can push usable data to 3+ days
- **Winter/high latitudes**: Longer delays (low light, frequent clouds)

### Success Rate by Region
- **Offshore/clear skies**: 90-95% daily availability
- **Coastal**: 80-90% (cloud/adjacency effects)
- **Baltic/CDOM-rich**: 70-85% (algorithm struggles with turbid water)
- **Winter ARC/high-lat**: 50-70% (low light season)

### Robustness Strategy

**Rolling Window Fallback:**
```typescript
// Try D-1, then D-2, then D-3 until we get valid data
async function fetchKD490WithFallback(lat, lon, maxDaysBack = 3) {
  for (let daysAgo = 1; daysAgo <= maxDaysBack; daysAgo++) {
    const date = getDateDaysAgo(daysAgo);
    const kd490 = await fetchKD490(lat, lon, date);
    if (kd490 !== null) {
      return {
        value: kd490,
        daysOld: daysAgo,
        captureDate: date,
        productId: 'OCEANCOLOUR_GLO_BGC_L4_NRT_009_102'
      };
    }
  }
  return null; // Fallback to chlorophyll proxy
}
```

---

## Integration Architecture

### Data Flow

```
┌─────────────────────┐
│ Physics Fetch       │ ← Temp, salinity, currents (MET Norway / CMEMS PHY)
│ (Current: Working)  │   Latency: <24h, Success: 100%
└─────────────────────┘
         ↓
┌─────────────────────┐
│ BGC Model Fetch     │ ← Chlorophyll, O2, nutrients (CMEMS BGC models)
│ (Current: Working)  │   Latency: <24h, Success: 85-90%
└─────────────────────┘
         ↓
┌─────────────────────┐
│ KD490 Satellite Fetch│ ← Water clarity (CMEMS OC satellite)
│ (PLANNED)           │   Latency: 1-3 days, Success: 70-95%
└─────────────────────┘
         ↓
┌─────────────────────┐
│ findr_conditions_   │
│    snapshots        │
└─────────────────────┘
```

### Database Schema (Already Exists)

Column `kd490` in `findr_conditions_snapshots`:
- Type: `NUMERIC(6,4)`
- Unit: 1/m (inverse meters)
- Range: 0.01 (crystal clear) to 1.0+ (very turbid)
- Current: NULL (not yet populated)

### Additional Tracking Fields (Consider Adding)

```sql
ALTER TABLE findr_conditions_snapshots
ADD COLUMN kd490_capture_date TIMESTAMPTZ,  -- When satellite observed it
ADD COLUMN kd490_days_old INT,              -- Days between capture and use
ADD COLUMN kd490_product_id TEXT,           -- Which dataset it came from
ADD COLUMN kd490_quality_flag TEXT;         -- 'L4_interpolated', 'L3_direct', etc.
```

**Why Track This:**
- KD490 has different latency than physics/BGC
- Helps diagnose coverage gaps
- Allows A/B testing of L3 vs L4 products
- QC flagging for coastal/CDOM issues

---

## Implementation Checklist

### Phase 1: Data Collection (This Week)
- [ ] Add KD490 fetching to `scripts/ingest-copernicus-data.ts`
- [ ] Implement D-1/D-2/D-3 rolling fallback
- [ ] Store in `findr_conditions_snapshots.kd490`
- [ ] Add tracking fields (capture date, days old, product ID)
- [ ] Log coverage statistics per rectangle
- [ ] Keep chlorophyll proxy active for stealth

### Phase 2: Evaluation (Week of Nov 12)
- [ ] Analyze KD490 coverage by region (SELECT kd490 IS NOT NULL rate)
- [ ] Check latency distribution (histogram of kd490_days_old)
- [ ] Compare chlorophyll proxy vs real KD490:
  - Correlation analysis
  - Spot-check clear vs murky rectangles
  - Stealth score differences
- [ ] Identify problem rectangles (Baltic, estuaries)
- [ ] Decide: Switch to KD490, keep proxy, or hybrid approach

### Phase 3: Integration (If Validated)
- [ ] Update stealth calculation to use KD490
- [ ] Keep chlorophyll as fallback when KD490 unavailable
- [ ] Add QC masking for coastal pixels (>5km from shore)
- [ ] Document known regional biases
- [ ] Update `STEALTH_INDICATOR_IMPLEMENTATION.md`

---

## Regional Considerations (From User Research)

### Known Issues by Region

**Baltic / CDOM-Rich Waters:**
- KD490 algorithms biased high (overestimates turbidity)
- Adjacency effects near land and river plumes
- **Mitigation:** Prefer L4 to fill gaps, mask <5km from shore

**Winter High Latitudes (ARC, N Atlantic):**
- Low light + frequent cloud/ice = sparse L3 coverage
- L4 fills gaps but inherits seasonal uncertainty
- **Mitigation:** Accept longer D-3 fallback, flag low confidence

**Mediterranean:**
- Strong regional NRT chain, L4 MED well-behaved
- Watch for sunglint/adjacency artifacts near coast
- **Mitigation:** Use regional product if available

**Shelf Seas (NWS, IBI):**
- Estuaries and suspended matter elevate KD490
- **Mitigation:** Cross-check with ZSD, validate against Secchi if available

---

## Copy-Paste Commands for Testing

### Test Global L4 NRT (Primary)

```bash
# Fetch yesterday's KD490 for English Channel (31E8 center)
START=$(date -u -d "yesterday" +"%Y-%m-%dT00:00:00Z")
END=$(date -u -d "yesterday" +"%Y-%m-%dT23:59:59Z")

copernicusmarine subset \
  --dataset-id OCEANCOLOUR_GLO_BGC_L4_NRT_009_102 \
  --variable KD490 \
  --start-datetime "$START" --end-datetime "$END" \
  --point "1.00,51.00" \
  --format NetCDF4 --output /tmp/kd490_31E8_test.nc

# Check if we got data
python3 -c "
import xarray as xr
ds = xr.open_dataset('/tmp/kd490_31E8_test.nc')
print('KD490 value:', float(ds.KD490.values[0]))
print('Capture date:', str(ds.time.values[0]))
"
```

### Test Regional L3 NRT (Alternative)

```bash
# Atlantic 1km for same location
copernicusmarine subset \
  --dataset-id OCEANCOLOUR_ATL_BGC_L3_NRT_009_111 \
  --variable KD490 \
  --start-datetime "$START" --end-datetime "$END" \
  --point "1.00,51.00" \
  --format NetCDF4 --output /tmp/kd490_atl_1km_test.nc
```

### Test Rolling Fallback

```bash
# Try last 3 days for a cloudy rectangle
for DAYS_AGO in 1 2 3; do
  DATE=$(date -u -d "$DAYS_AGO days ago" +"%Y-%m-%d")
  echo "Trying $DATE..."

  copernicusmarine subset \
    --dataset-id OCEANCOLOUR_GLO_BGC_L4_NRT_009_102 \
    --variable KD490 \
    --start-datetime "${DATE}T00:00:00Z" \
    --end-datetime "${DATE}T23:59:59Z" \
    --point "1.00,51.00" \
    --format NetCDF4 --output "/tmp/kd490_d${DAYS_AGO}.nc" 2>&1 | grep -i "error"

  if [ -f "/tmp/kd490_d${DAYS_AGO}.nc" ]; then
    echo "✅ Got data from D-${DAYS_AGO}"
    break
  fi
done
```

---

## Success Metrics for Week 1

After 7 days of KD490 ingestion (Nov 12, 2025):

**Coverage Goals:**
- [ ] ≥ 80% of rectangles have at least one KD490 value
- [ ] ≥ 60% of rectangles have fresh KD490 (≤2 days old)
- [ ] < 10% complete failures (no KD490 after D-3 fallback)

**Regional Breakdown:**
- [ ] Offshore (>20km): ≥ 90% coverage
- [ ] Coastal (10-20km): ≥ 75% coverage
- [ ] Nearshore (<10km): ≥ 60% coverage (accept lower)

**Latency Distribution:**
- [ ] Median D-1 (yesterday's data)
- [ ] 75th percentile ≤ D-2
- [ ] 95th percentile ≤ D-3

**Quality Checks:**
- [ ] No KD490 > 2.0 (sanity check for algorithm failures)
- [ ] Chlorophyll vs KD490 correlation > 0.5 (they should relate)
- [ ] No systematic bias by region (spot-check known clear/murky areas)

---

## Decision Matrix (Week 2)

| Metric | Threshold | Action if Met | Action if Missed |
|--------|-----------|---------------|------------------|
| Coverage ≥ 80% | Pass | ✅ Use KD490 | ⏸️ Keep chlorophyll proxy |
| Fresh data ≥ 60% | Pass | ✅ Use KD490 | 🔄 Hybrid: KD490 if fresh, else chl |
| Chl/KD490 correlation > 0.5 | Pass | ✅ Trust relationship | ⚠️ Investigate regional biases |
| Coastal coverage ≥ 60% | Pass | ✅ Full rollout | 🔍 Mask coastal pixels |

**Hybrid Approach (Likely Outcome):**
```typescript
// Use real KD490 if available and fresh, else chlorophyll proxy
const waterClarityIndex =
  (kd490 != null && kd490DaysOld <= 2)
    ? Math.round((1 - Math.min(kd490, 0.4) / 0.4) * 100)  // Real KD490
    : (chlorophyll != null)
      ? Math.round((1 - Math.min(chlorophyll, 3.0) / 3.0) * 100)  // Proxy
      : null;
```

---

## Files to Modify

**When implementing Phase 1:**

1. `scripts/ingest-copernicus-data.ts`
   - Add KD490 fetch after BGC fetch
   - Implement D-1/D-2/D-3 rolling fallback
   - Store kd490 + capture metadata

2. `lib/copernicus/realClient.ts`
   - Add `fetchKD490()` method
   - Handle OCEANCOLOUR_GLO_BGC_L4_NRT_009_102 dataset

3. `lib/copernicus/regionRouterV2.ts`
   - Verify clarity products defined (already exists)
   - Add global L4 NRT to fallback chain

4. `supabase/migrations/YYYYMMDDHHMMSS_add_kd490_tracking.sql`
   - Add `kd490_capture_date`, `kd490_days_old`, `kd490_product_id` columns

**When switching to KD490 (Phase 3, if validated):**

5. `components/findr/ConditionsDashboard.tsx:529-539`
   - Replace chlorophyll proxy with KD490
   - Keep chlorophyll as fallback

---

## Next Steps (This Week)

1. **Finish current BGC ingestion** (~15 min remaining)
2. **Let automated twice-daily runs populate production** (3 AM/3 PM UTC)
3. **Monitor species diversity** (should see Bass, Cod, Plaice, not just mullet)
4. **Document KD490 integration plan** ✅ (this file)
5. **Decide Monday Nov 11**: Implement KD490 or wait until current system stable?

---

## References

- User-provided KD490 guide (Nov 5, 2025 conversation)
- Product pages: OCEANCOLOUR_GLO_BGC_L4_NRT_009_102
- Copernicus Marine Toolbox docs
- `lib/copernicus/regionRouterV2.ts` - Clarity product definitions
- `WATER_CLARITY_IMPLEMENTATION_GUIDE.md` - Original clarity integration plan
- `STEALTH_INDICATOR_IMPLEMENTATION.md` - Stealth card documentation

---

## Key Insight

**Satellite optical data (KD490) has fundamentally different characteristics than model data:**
- **Observation** vs **Simulation**
- **Daylight required** vs **24/7 availability**
- **Cloud-dependent** vs **Gap-free**
- **1-3 day latency** vs **<24h latency**

This is why we treat it as a **third data source** rather than bundling it with BGC models.
