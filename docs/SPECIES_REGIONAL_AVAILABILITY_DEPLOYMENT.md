# Species Regional Availability - Deployment Guide

**Date:** 2025-10-31
**Status:** Ready for deployment

---

## What This Solves

**Problem:** Fish identification AI currently relies on recent catch data (90-day lookback) to narrow species candidates. This creates a cold-start problem for new regions and reduces accuracy in areas with sparse data.

**Solution:** Comprehensive species/season/bioregion mapping that:
1. Works immediately with baseline data (no user catches needed)
2. Automatically improves as users log catches
3. Provides confidence scores and data source transparency
4. Supports seasonal filtering for migration patterns

---

## Files Changed

### Database Migrations (3 files)
```
supabase/migrations/
├── 20251031000001_create_species_regional_availability.sql    (Table schema)
├── 20251031000002_populate_baseline_regional_availability.sql (Initial data)
└── 20251031000003_create_catch_learning_function.sql         (Trigger & functions)
```

### API Updates (1 file)
```
pages/api/findr/species/regional.ts  (Updated to use new table)
```

### Documentation (2 files)
```
docs/
├── SPECIES_REGIONAL_AVAILABILITY_SYSTEM.md      (Complete system docs)
└── SPECIES_REGIONAL_AVAILABILITY_DEPLOYMENT.md  (This file)
```

---

## Deployment Steps

### 1. Review Migrations

Check the migration files are present:
```bash
ls -la supabase/migrations/20251031*.sql
```

Expected output:
```
20251031000001_create_species_regional_availability.sql
20251031000002_populate_baseline_regional_availability.sql
20251031000003_create_catch_learning_function.sql
```

### 2. Run Migrations

**Option A: Supabase CLI (recommended)**
```bash
cd /Users/damianrafferty/Projects/WotNow
supabase db push
```

**Option B: Manual SQL execution**
If CLI is not available, run each migration file in order via Supabase dashboard SQL editor.

### 3. Verify Migration Success

Connect to your database and run:

```sql
-- Check table exists
SELECT COUNT(*) FROM species_regional_availability;
-- Expected: 500-2000+ records depending on species/regions

-- Check data sources
SELECT data_source, COUNT(*) FROM species_regional_availability
GROUP BY data_source;
-- Expected:
--   baseline: 400-1500
--   expert: 20-40
--   (catch_data and model will accumulate over time)

-- Check helper functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN (
  'get_regional_species',
  'get_species_seasonal_availability',
  'update_species_availability_from_catch'
);
-- Expected: 3 rows

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'update_availability_from_catch';
-- Expected: 1 row
```

### 4. Test API Endpoint

```bash
# Test with known ICES rectangle (North Sea)
curl "http://localhost:3000/api/findr/species/regional?icesSquare=31F1" | jq

# Expected response:
# {
#   "success": true,
#   "regionId": "31F1",
#   "regionType": "ices",
#   "species": [ ... 40-60 species ... ],
#   "dataSource": "species_regional_availability"
# }
```

### 5. Test Automatic Learning (Optional)

Simulate a catch log to verify the trigger works:

```sql
-- Insert a test catch
INSERT INTO findr_catch_entries (
  user_id,
  species_id,
  rectangle_code,
  caught_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),  -- Use real user ID
  'cod',
  '31F1',
  NOW()
);

-- Check availability was updated
SELECT
  species_code,
  availability_score,
  confidence,
  catch_count,
  data_source
FROM species_regional_availability
WHERE region_id = '31F1' AND species_code = 'cod';

-- Expected: catch_count incremented, score/confidence boosted
```

Clean up test data:
```sql
DELETE FROM findr_catch_entries
WHERE rectangle_code = '31F1' AND species_id = 'cod'
  AND caught_at > NOW() - INTERVAL '5 minutes';
```

---

## Rollback Plan

If issues arise, you can rollback the changes:

### Rollback Migrations

```sql
-- 1. Drop trigger
DROP TRIGGER IF EXISTS update_availability_from_catch ON findr_catch_entries;

-- 2. Drop functions
DROP FUNCTION IF EXISTS update_species_availability_from_catch();
DROP FUNCTION IF EXISTS get_regional_species(text, text, integer, numeric);
DROP FUNCTION IF EXISTS get_species_seasonal_availability(text, text);

-- 3. Drop table
DROP TABLE IF EXISTS species_regional_availability;
```

### Revert API Changes

```bash
git checkout HEAD~1 -- pages/api/findr/species/regional.ts
```

---

## Post-Deployment Monitoring

### Day 1-3: Initial Validation

Check baseline data quality:
```sql
-- Coverage by region type
SELECT
  region_type,
  COUNT(DISTINCT region_id) as regions,
  COUNT(*) as total_records,
  ROUND(AVG(availability_score), 2) as avg_score
FROM species_regional_availability
GROUP BY region_type;

-- Species with broadest coverage
SELECT
  s.name_en,
  COUNT(DISTINCT sra.region_id) as region_count
FROM species_regional_availability sra
JOIN species s ON s.species_code = sra.species_code
GROUP BY s.name_en
ORDER BY region_count DESC
LIMIT 10;
```

### Week 1: Learning Progress

Monitor catch data accumulation:
```sql
-- Catches logged per day
SELECT
  DATE(caught_at) as date,
  COUNT(*) as catches,
  COUNT(DISTINCT species_id) as unique_species,
  COUNT(DISTINCT rectangle_code) as unique_regions
FROM findr_catch_entries
WHERE caught_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(caught_at)
ORDER BY date DESC;

-- Validated species (3+ catches)
SELECT
  species_code,
  COUNT(DISTINCT region_id) as validated_regions,
  SUM(catch_count) as total_catches
FROM species_regional_availability
WHERE data_source = 'catch_data'
GROUP BY species_code
ORDER BY total_catches DESC;
```

### Month 1: Performance Impact

Measure AI identification improvements:
```sql
-- AI usage rate (should decrease as regional filtering improves)
-- This assumes you're logging identification method in a separate table
-- Adjust query to match your logging setup

-- Regional coverage growth
SELECT
  region_id,
  COUNT(*) as species_count,
  SUM(catch_count) as total_catches,
  COUNT(*) FILTER (WHERE data_source = 'catch_data') as validated_count
FROM species_regional_availability
WHERE region_type = 'ices'
GROUP BY region_id
ORDER BY total_catches DESC
LIMIT 20;
```

---

## Known Limitations & Future Work

### Current Limitations

1. **Monthly data not populated yet** - All records have `month = NULL` (year-round)
   - Future: Add seasonal breakdown from historical catch data
   - Impact: Can't filter by season yet

2. **Grid cell coverage limited** - Only migrated from existing `species_availability_by_grid`
   - Future: Generate baseline for Americas/global regions
   - Impact: Non-European regions may have sparse data

3. **No ML predictions** - All scores are baseline or catch-derived
   - Future: Train models to predict availability in under-represented regions
   - Impact: New regions start with conservative scores

### Planned Enhancements

**Phase 6: Seasonal Breakdown (Q1 2026)**
- Populate `month` column with historical catch patterns
- Identify migratory species (e.g., mackerel peaks in summer)
- Add seasonal filtering to predictions API

**Phase 7: Grid Cell Expansion (Q2 2026)**
- Generate baseline data for Americas/Pacific regions
- Use FAO fishing area data for initial scores
- Integrate with existing grid_025deg infrastructure

**Phase 8: ML Models (Q3 2026)**
- Train availability prediction models
- Use environmental data (temp, depth, salinity) as features
- Backfill under-represented regions with model predictions

---

## Success Metrics

### Week 1 Targets
- ✅ Zero errors in production logs
- ✅ API response times < 500ms (with caching)
- ✅ At least 40 species per ICES rectangle (baseline)

### Month 1 Targets
- ✅ 100+ catch logs trigger availability updates
- ✅ Top 10 species have catch_count > 5
- ✅ AI identification cost decreases by 10-15%

### Quarter 1 Targets
- ✅ 80% of ICES rectangles have catch-validated data
- ✅ Seasonal patterns identified for migratory species
- ✅ User-reported identification accuracy improves by 20%

---

## Support & Troubleshooting

### Common Issues

**Issue:** Migration fails with "table already exists"
**Fix:** Check if table was partially created: `DROP TABLE IF EXISTS species_regional_availability CASCADE;` and re-run.

**Issue:** No species returned for a region
**Fix:**
1. Check if ICES rectangle exists: `SELECT * FROM ices_rectangles WHERE rectangle_code = 'YOUR_CODE';`
2. Verify baseline population ran: `SELECT COUNT(*) FROM species_regional_availability WHERE region_id = 'YOUR_CODE';`
3. Check species biogeographic_regions: `SELECT name_en, biogeographic_regions FROM species LIMIT 10;`

**Issue:** Trigger not firing on catch insert
**Fix:**
1. Verify trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'update_availability_from_catch';`
2. Check function exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'update_species_availability_from_catch';`
3. Test manually: `SELECT update_species_availability_from_catch();` (should return null, but no errors)

### Getting Help

- Review system docs: `docs/SPECIES_REGIONAL_AVAILABILITY_SYSTEM.md`
- Check Supabase logs for errors
- Query data quality: See "Post-Deployment Monitoring" section above

---

## Summary

This deployment adds a comprehensive species regional availability system that:

1. ✅ **Solves cold-start problem** - Works immediately without catch data
2. ✅ **Self-improving** - Learns from user catches automatically
3. ✅ **Transparent** - Confidence scores and data sources visible
4. ✅ **Scalable** - Supports ICES rectangles and grid cells
5. ✅ **Future-ready** - Foundation for seasonal patterns and ML models

**Deployment time:** ~5 minutes
**Risk level:** Low (graceful fallbacks, no breaking changes)
**Rollback time:** ~2 minutes

---

**Ready to deploy!** Follow the steps above and monitor for the first week.

**Questions?** See `docs/SPECIES_REGIONAL_AVAILABILITY_SYSTEM.md` for complete details.
