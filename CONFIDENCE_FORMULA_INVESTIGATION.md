# Confidence Formula Investigation - November 16, 2025

## Summary

Investigated why confidence scores are maxing out at 26% across all of Europe. Found that the bio_band_score formula was fundamentally changed on November 12, resulting in much lower scores.

## Root Cause Analysis

### Current Behavior (Observed)
- **Max confidence**: 26% across all European rectangles
- **bio_band_score**: 26.3 (typical maximum)
- **Formula discrepancy**: Actual results don't match November 12 migration file

### Test Results (Rectangle 28E5, CUT species - cephalopod):
```
Actual bio_band_score: 26.3
Actual confidence_percent: 26

Factor scores:
  temp_score: 2 (weight: 0.2)
  light_score: 3.5 (weight: 0.35)
  tide_score: 1 (weight: 0.2)
  lunar_score: 0.8 (weight: 0.1)

JSONB factors include:
  salinity: 10 (calculated but not used in bio_band_score)
  chlorophyll: 5 (calculated but not used in bio_band_score)
  oxygen: 0 (calculated but not used in bio_band_score)
  temperature: 2 (actual: 14.5°C)
```

## Formula Evolution

### OLD System (October 17, 2025)
**Migration**: `20251017001_add_bio_to_predictions.sql`

**Formula**:
```sql
bio_band_score = chlorophyll_score + oxygen_score + salinity_score
-- Max: 30 points (each parameter can score 0-10)

confidence = bio_band_score (0-30) +
             temp_score (0-25) +
             substrate_score (0-20) +
             freshness_score (0-20) +
             completeness_score (0-15)
-- Max: 110 (capped at 100)
```

**Typical scores**: 60-80% confidence with good environmental conditions

### NEW System (November 12, 2025)
**Migration**: `20251112210000_add_region_mapping_to_rpc.sql`

**Formula**:
```sql
bio_band_score = GREATEST(
  temp_score * guild_weight,
  light_score * guild_weight,
  lunar_score * guild_weight,
  tide_score * guild_weight
) * 10

-- For cephalopods:
GREATEST(
  temp_score * 0.35,   -- max ~3.5
  light_score * 0.3,   -- max ~3.0
  lunar_score * 0.2,   -- max ~2.0
  tide_score * 0.15    -- max ~1.5
) * 10
-- Theoretical max: ~35
-- Practical max: ~15-25 with real data

confidence_percent = bio_band_score + habitat_bonus
-- Max: ~30 with current environmental conditions
```

## Key Differences

| Aspect | OLD (Oct 17) | NEW (Nov 12) |
|--------|--------------|--------------|
| **Scoring basis** | Bio parameters (chlorophyll, oxygen, salinity) | Environmental factors (temp, light, lunar, tide) |
| **Aggregation** | SUM of 3 bio parameters | GREATEST (max) of 4 weighted factors |
| **Theoretical max** | 100 (capped) | 100 (capped) |
| **Practical max** | 60-80% | 15-30% |
| **Guild weighting** | No | Yes (different weights per species guild) |

## Why Scores Are Low

1. **GREATEST vs SUM**: The new formula uses the MAXIMUM of weighted factors, not their sum
   - OLD: `10 + 5 + 10 = 25` points from bio params
   - NEW: `max(0.7, 1.05, 0.16, 0.15) * 10 = 10.5` points

2. **Missing bio parameters**: Chlorophyll (5 pts) and salinity (10 pts) are calculated but no longer contribute to bio_band_score
   - These appear in the JSONB `factors` field but aren't added to the score
   - Lost potential: ~15 points

3. **Current test data** (28E5):
   ```
   Expected (GREATEST formula): max(0.7, 1.05, 0.16, 0.15) * 10 = 10.5
   Actual result: 26.3

   Discrepancy: The deployed function is NOT using the November 12 formula
   ```

## Migration Mismatch

The November 12 migration file shows:
```sql
bio_band_scores AS (
  SELECT
    be.species_id,
    (CASE
      WHEN be.guild = 'cephalopod' THEN
        GREATEST(
          COALESCE(tm.temp_score, 0.0) * 0.35,
          COALESCE(lm.light_score, 0.0) * 0.3,
          COALESCE(lum.lunar_score, 0.0) * 0.2,
          COALESCE(tim.tide_score, 0.0) * 0.15
        )
      ...
    END * 10.0)::NUMERIC AS bio_band_score
```

But actual results show:
- bio_band_score: 26.3 (not 10.5 as expected from GREATEST formula)
- JSONB factors include salinity: 10, chlorophyll: 5 (these are still being calculated)

**Conclusion**: The deployed RPC function does NOT match the November 12 migration file. There appears to be an older version still in production that:
1. Calculates bio parameters (chlorophyll, oxygen, salinity)
2. Uses a different aggregation formula
3. Results in ~26% max scores

## Hypothesis

The November 12 migration may not have been applied to production, OR it was applied but subsequently rolled back or overwritten by another migration. The system is currently using an intermediate formula between the old (Oct 17) and new (Nov 12) versions.

## Actual Deployed Formula (Reverse Engineered)

Based on test results showing multipliers of 11-14x:
```
weighted_sum = (temp_score * temp_weight) +
               (light_score * light_weight) +
               (tide_score * tide_weight) +
               (lunar_score * lunar_weight)

bio_band_score = weighted_sum * ~13
```

For CUT (cephalopod):
```
weighted_sum = (2 * 0.2) + (3.5 * 0.35) + (1 * 0.2) + (0.8 * 0.1)
             = 0.4 + 1.225 + 0.2 + 0.08
             = 1.905

bio_band_score = 1.905 * 13.81 = 26.3
```

This doesn't match EITHER the old OR the new formula from the migrations!

## Next Steps

1. **Verify deployed RPC function**: Check the actual deployed SQL for `get_environmental_predictions_enhanced`
2. **Check migration status**: Verify which migrations have been applied to production
3. **Decide on intended formula**:
   - Option A: Restore old formula (bio parameters, max ~80%)
   - Option B: Fix new formula (GREATEST with higher multiplier)
   - Option C: Hybrid (combine bio parameters + environmental factors)

4. **Test expected scores**: Determine what a "good" confidence score should be:
   - Current: 26% max feels too low
   - Old system: 60-80% may have been too high
   - Target: 40-60%?

## Files Examined

- `scripts/reverse-engineer-formula.ts` (created)
- `scripts/analyze-bio-band-calculation.ts` (existing)
- `supabase/migrations/20251112210000_add_region_mapping_to_rpc.sql` (Nov 12 - new formula)
- `supabase/migrations/20251017001_add_bio_to_predictions.sql` (Oct 17 - old formula with bio params)
- `supabase/migrations/20251029000004_add_bio_band_score_calculation.sql` (Oct 29 - bio-band matching)
