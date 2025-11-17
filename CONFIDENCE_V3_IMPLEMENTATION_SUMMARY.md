# Confidence V3 with Regional Seasonality - Implementation Summary

**Date:** November 17, 2025
**Status:** ✅ Migration Created, ⏳ Pending Database Application

## What Was Completed

### 1. Migration File Created
**File:** `supabase/migrations/202511170002_create_confidence_v3_with_seasonality.sql`

This migration implements regional seasonality integration into the fishing confidence scoring system.

### 2. Key Features

**Regional Seasonality Join:**
- Joins `species_region_seasonality` table on `(species.id, ices_rectangles.region)`
- Uses `ices_rectangles.region` field (BALT/BIS/IBR/MED/NEA/NSEA/SCA) not `cmems_region`
- Enables 1-to-many mapping: IBI→{BIS,IBR}, NWS→{NEA,NSEA,SCA}

**Seasonal Phase Calculation:**
- `'peak'` - Target month in `srs.peak_months`
- `'good'` - Target month in `srs.good_months`
- `'possible'` - Target month in `srs.possible_months`
- `'off'` - Explicitly out of season
- `'no_data'` - No seasonality row exists for this species/region

**Seasonal Weight Calculation:**
- Peak: Uses `srs.weight_peak` (typically 1.2-1.5)
- Good: Uses `srs.weight_good` (typically 1.0-1.1)
- Possible: Uses `srs.weight_possible` (typically 0.7-0.9)
- Off-season: 0.0 (heavily suppresses confidence)
- No data: 1.0 (neutral, no adjustment)

**Final Confidence Formula:**
```sql
confidence_percent =
  (base_availability + environmental_match * 60/10)
  * seasonal_weight
  * availability_multiplier
```

### 3. New Return Fields

The `get_fishing_confidence_v3` function returns these additional fields:

- `seasonal_phase` (TEXT): Current phase for the species
- `seasonal_weight` (NUMERIC): Multiplier from seasonality (0.0-1.5)
- `availability_multiplier` (NUMERIC): Species availability adjustment (0.5-1.5)
- `seasonality_source` (TEXT): Data source (e.g., 'local_expert', 'scientific_survey')
- `seasonality_source_confidence` (NUMERIC): Confidence in source (0.0-1.0)

### 4. Performance Optimization

Created index for efficient lookups:
```sql
CREATE INDEX IF NOT EXISTS idx_srs_species_region
ON public.species_region_seasonality (species_id, region_code);
```

### 5. Backward Compatibility

- **V2 function remains intact** - No breaking changes
- V3 can be tested alongside V2
- Frontend can switch to V3 when ready

## Next Steps

### Option 1: Apply via Supabase Dashboard (Recommended)
1. Log into Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/202511170002_create_confidence_v3_with_seasonality.sql`
4. Execute the SQL
5. Test with:
   ```sql
   SELECT * FROM get_fishing_confidence_v3('31F2', CURRENT_DATE, 11) LIMIT 5;
   ```

### Option 2: Fix Migration Sync and Use CLI
1. Repair migration history:
   ```bash
   supabase migration repair --status reverted 20251115000000 20251115100000 20251115120000 202511151300000 20251115140000
   ```
2. Pull remote migrations:
   ```bash
   supabase db pull
   ```
3. Apply new migration:
   ```bash
   supabase db push
   ```

### Option 3: Wait for Seasonality Data
If `species_region_seasonality` table is not yet populated:
1. V3 function is ready but will return neutral multipliers (1.0) for all species
2. Populate seasonality data first
3. Then apply this migration
4. Test with species that have regional data

## Testing the V3 Function

Once applied, test with these queries:

### Basic Test
```sql
SELECT
  species_code,
  species_name,
  confidence_percent,
  seasonal_phase,
  seasonal_weight,
  availability_multiplier
FROM get_fishing_confidence_v3('31F2', '2025-11-17', 11)
ORDER BY confidence_percent DESC
LIMIT 10;
```

### Compare V2 vs V3
```sql
-- V2 (no seasonality)
SELECT species_code, confidence_percent as v2_confidence
FROM get_fishing_confidence_v2('31F2', '2025-11-17', 11)
WHERE species_code = 'COD'
LIMIT 1;

-- V3 (with seasonality)
SELECT species_code, confidence_percent as v3_confidence, seasonal_phase, seasonal_weight
FROM get_fishing_confidence_v3('31F2', '2025-11-17', 11)
WHERE species_code = 'COD'
LIMIT 1;
```

### Check Seasonality Impact
```sql
SELECT
  species_code,
  confidence_percent,
  seasonal_phase,
  seasonal_weight,
  availability_multiplier,
  seasonality_source,
  base_availability_score,
  environmental_match_score
FROM get_fishing_confidence_v3('31F2', CURRENT_DATE, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER)
WHERE seasonal_phase != 'no_data'
ORDER BY confidence_percent DESC
LIMIT 20;
```

## Integration with Frontend

When ready to switch frontend to V3:

1. Update RPC call in `lib/findr/predictions.ts` or similar
2. Change from `get_fishing_confidence_v2` to `get_fishing_confidence_v3`
3. Optionally display seasonal info to users:
   - Show "Peak Season" badge when `seasonal_phase = 'peak'`
   - Show "Off Season" warning when `seasonal_phase = 'off'`
   - Display `seasonality_source` in details panel

## Files Modified

- `supabase/migrations/202511170002_create_confidence_v3_with_seasonality.sql` (NEW)
- `scripts/apply-confidence-v3.ts` (NEW - for automated application)

## Related Documentation

- Region mapping: See `ices_rectangles` table schema
- Seasonality data structure: See `species_region_seasonality` table
- V2 implementation: `supabase/migrations/202511170001_fix_confidence_v2_filter.sql`
- Confidence scoring algorithm: `CONFIDENCE_SCORING_ALGORITHM.md`

## Known Limitations

1. **Requires Seasonality Data:** V3 works without data (neutral multipliers) but won't show regional variations until `species_region_seasonality` is populated
2. **Region Granularity:** Uses Findr 7-region system (BALT/BIS/IBR/MED/NEA/NSEA/SCA), not CMEMS 4-region system
3. **Month-Based Only:** Currently uses month number, not week-level granularity

## Future Enhancements

- Week-level seasonality (currently month-only)
- Historical catch data integration for regional validation
- Lunar cycle integration (placeholder exists in V2/V3)
- Weather pattern correlation (storm fronts, water temperature trends)
