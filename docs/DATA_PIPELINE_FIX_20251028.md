# Data Pipeline Fix - October 28, 2025

## Problem

All species were showing identical scores (first 35%, then 45%, then 50%) because the environmental data pipeline was broken.

## Root Causes

### 1. Bite Score Formula Bug (FIXED ✅)
- **Migration:** `20251028000004_fix_bite_score_formula_6_factors.sql`
- **Issue:** Old formula used 4 factors (temp + substrate + depth + habitat = 35)
- **Fix:** New formula uses 6 factors (temp + light + lunar + weather + bio_band + habitat)
- **Result:** Default scores now sum to 45 instead of 35

### 2. Missing Temperature Data (FIXED ✅)
- **Issue:** `grid_conditions_latest.surface_temperature_c` was NULL for grid cell G025_N44W005
- **Root Cause:** Migration script `migrate-ices-to-grid.ts` had a bug:
  - Grid cell G025_N44W005 maps to TWO ICES rectangles:
    - 25E1: has temperature data (18.35°C)
    - 28E5: has NULL temperature
  - Script processes first rectangle and skips rest
  - If 28E5 processed first, NULL data wins
- **Fix:** Manual UPDATE to populate temperature from rectangle 25E1
- **Command:**
  ```sql
  UPDATE grid_conditions_latest
  SET
    surface_temperature_c = 18.35,
    collected_at = '2025-10-24 03:22:33.53+00',
    sources = array_append(sources, 'manual_fix_20251028'),
    updated_at = NOW()
  WHERE cell_id = 'G025_N44W005';
  ```

## Results

**Before (all same):**
```
Species              | Bite | Temp | Confidence
Common Ling          |   35 |   10 |         80
Dab                  |   35 |   10 |         80
Dover Sole           |   35 |   10 |         80
```

**After (varied by species):**
```
Species              | Bite | Temp | Confidence
Painted Comber       |   55 |   20 |         90
Sea Bream            |   55 |   20 |         90
Common Octopus       |   54 |   19 |         89
Atlantic Chub Macker |   54 |   19 |         89
```

## Remaining Work

### 1. Fix migrate-ices-to-grid.ts Script
**Current Bug:**
```typescript
// Lines 79-82
if (gridDataMap.has(mapping.cell_id)) {
  continue; // Skip if we already have data for this grid cell
}
```

**Proposed Fix:**
- When multiple rectangles map to same grid cell, prefer rectangle WITH data over NULL
- Or: Average/merge data from all rectangles mapping to that cell
- Or: Use most recent data

### 2. Verify All EU Grid Cells
- Check if other grid cells have same issue (multiple rectangle mappings with NULL data)
- Run systematic check: `SELECT cell_id, COUNT(*) FROM grid_025deg_ices_xref GROUP BY cell_id HAVING COUNT(*) > 1;`

### 3. Add Automated Data Quality Checks
- Monitor for NULL temperature in grid_conditions_latest
- Alert when critical environmental data is missing
- Add validation to ingestion pipeline

## Testing

**Direct RPC Test:**
```sql
SELECT species_code, name_en, bite_score, temp_score, confidence
FROM get_global_fishing_predictions(43.5, -5.0, '2025-10-28', 'en')
LIMIT 10;
```

**Live API Test:**
```bash
curl -s 'https://fishfindr.eu/api/findr/predictions' \
  -H 'Content-Type: application/json' \
  -d '{"rectangleCode":"25E1","predictionDate":"2025-10-28","language":"en"}' \
  | jq '.predictions[:5] | .[] | {name: .species_name, bite: .bite_score, temp: .temp_score, confidence: .confidence}'
```

## Deployment Status

- ✅ Bite score formula fix deployed (migration 20251028000004)
- ✅ Temperature data manually fixed for G025_N44W005
- ✅ Prediction cache cleared
- ✅ Live API verified returning varied scores
- ⏳ Migration script fix pending

## Next Steps

1. Fix migrate-ices-to-grid.ts to handle overlapping rectangles intelligently
2. Re-run migration to ensure all EU cells have best available data
3. Add data quality monitoring
4. Verify scores make biological sense (not just mathematically varied)
