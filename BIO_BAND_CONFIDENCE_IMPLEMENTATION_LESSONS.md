# Bio-Band Confidence Scoring Implementation: Lessons Learned

**Date:** October 16, 2025  
**Status:** ✅ Successfully Deployed  
**Result:** Species-specific confidence scoring working (37I0: 74-94% with variation)

---

## Overview

Successfully implemented species-specific confidence scoring using bio_bands data that was previously "sitting there marooned". The system now differentiates species based on their chemical tolerance preferences matched against actual environmental conditions.

## Critical Issues Encountered

### 1. Parameter Name Mismatch (CRITICAL) 🚨

**Problem:** Database table and threshold table used different naming conventions for the same parameter.

**Tables Involved:**
- `species_bio_bands` table
- `bio_bands_thresholds` table

**The Issue:**
```sql
-- species_bio_bands uses:
parameter = 'surface_temperature'  -- snake_case

-- bio_bands_thresholds uses:
parameter = 'surfaceTemperature'   -- camelCase

-- RPC function was searching for:
WHERE parameter = 'surfaceTemperature'  -- Didn't match species_bio_bands!
```

**Impact:** Temperature matching completely failed. Species with temperature preferences weren't being scored correctly.

**Solution:** Update RPC function to use correct snake_case name:
```sql
WHERE sbb.parameter = 'surface_temperature'  -- Match the actual DB column
```

**Lesson:** Always verify actual column values in database, don't assume naming conventions. Use:
```sql
SELECT DISTINCT parameter FROM species_bio_bands;
SELECT DISTINCT parameter FROM bio_bands_thresholds;
```

---

### 2. Wrong Column Name for Playful Bio (BLOCKING)

**Problem:** Function referenced a column that doesn't exist.

**Table:** `species`

**The Issue:**
```sql
-- Function tried to use:
WHERE playful_bio IS NOT NULL  -- Column doesn't exist!

-- Actual column name:
WHERE playful_bio_en IS NOT NULL  -- Correct
```

**Error Message:**
```
column "playful_bio" does not exist
```

**Impact:** Function couldn't execute at all.

**Solution:** Use correct column name `playful_bio_en`.

**Lesson:** Check exact column names with:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'species';
```

---

### 3. Species Substrates Join Mismatch (BLOCKING)

**Problem:** Tried to join using wrong key column.

**Table:** `species_substrates`

**The Issue:**
```sql
-- Function tried:
WHERE species_substrates.species_id = be.species_id  -- Column doesn't exist!

-- Actual structure:
-- species_substrates has: species_code, name_en, has_sand, has_gravel, etc.
-- It uses species_code NOT species_id!

-- Correct join:
WHERE species_substrates.species_code = be.species_code
```

**Error Message:**
```
column species_substrates.species_id does not exist
```

**Impact:** Completeness scoring failed, couldn't check if species had substrate data.

**Solution:** Join on `species_code` instead:
```sql
SELECT 1 FROM species_substrates ss 
WHERE ss.species_code = be.species_code
```

**Lesson:** Different tables may use different primary keys. Always check table schema:
```javascript
const { data } = await supabase
  .from('species_substrates')
  .select('*')
  .limit(1);
console.log(Object.keys(data[0]));
```

---

### 4. Return Type Mismatch (BLOCKING)

**Problem:** Function return type didn't match actual column type.

**Table:** `species`

**The Issue:**
```sql
-- Function declared:
RETURNS TABLE (
  name_en text,  -- Declared as TEXT
  ...
)

-- But actual column type:
name_en VARCHAR(100)  -- Is VARCHAR(100)!
```

**Error Message:**
```
structure of query does not match function result type
Details: "Returned type character varying(100) does not match expected type text in column 2."
```

**Impact:** Function execution failed completely.

**Solution:** Match exact data type:
```sql
RETURNS TABLE (
  name_en varchar,  -- Match actual type
  ...
)
```

**Lesson:** PostgreSQL is strict about type matching. Always check actual column types:
```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'species' AND column_name = 'name_en';
```

---

### 5. Column Reference Ambiguity (BLOCKING)

**Problem:** Multiple CTEs with same table alias caused ambiguous references.

**The Issue:**
```sql
bio_band_matches AS (
  SELECT be.species_id,  -- Ambiguous! Which 'be'?
    CASE WHEN be.env_chlorophyll IS NOT NULL THEN
      (SELECT ... WHERE be.env_chlorophyll >= threshold)  -- Nested reference unclear
    END
  FROM biogeochemical_enhancements be
)
```

**Error Message:**
```
column reference "species_id" is ambiguous
```

**Impact:** Query couldn't execute due to unclear column references.

**Solution:** Use unique table aliases for outer query:
```sql
bio_band_matches AS (
  SELECT be_outer.species_id,  -- Clear which table
    CASE WHEN be_outer.env_chlorophyll IS NOT NULL THEN
      (SELECT ... WHERE be_outer.env_chlorophyll >= threshold)
    END
  FROM biogeochemical_enhancements be_outer  -- Unique alias
)
```

**Lesson:** Use descriptive, unique aliases especially in nested queries with CTEs.

---

### 6. Data Split Across Snapshots (DESIGN ISSUE)

**Problem:** Environmental data split across different dates in snapshots table.

**Table:** `findr_conditions_snapshots`

**The Issue:**
```sql
-- Original query:
WHERE DATE(captured_at) = target_date  -- Exact match only!

-- But data is split:
-- Oct 15: has chlorophyll, oxygen, salinity (NO temperature)
-- Oct 16: has temperature (NO biogeochem data)

-- Query with exact date returns NULL for missing parameters!
```

**Impact:** Bio-band matching returned 0 because it couldn't find complete data on single date.

**Solution:** Use date range window:
```sql
WHERE DATE(captured_at) BETWEEN target_date - INTERVAL '7 days' AND target_date

-- Then aggregate:
MAX(CASE WHEN sea_temp_c IS NOT NULL THEN sea_temp_c END) as sea_temp_c,
MAX(CASE WHEN chlorophyll_mg_m3 IS NOT NULL THEN chlorophyll_mg_m3 END) as chlorophyll_mg_m3
```

**Lesson:** Environmental snapshots may capture different parameters at different times. Always use a time window and aggregate to get complete picture.

---

## Table Schema Reference

### Critical Tables and Their Actual Structure

#### `species_bio_bands`
```sql
Columns:
- species_id (uuid) - FK to species.id
- parameter (text) - VALUES: 'chlorophyll', 'oxygen', 'salinity', 'surface_temperature' (snake_case!)
- happy_bands (bio_level[]) - Array of levels where species thrives
- unhappy_bands (bio_level[]) - Array of levels where species struggles

Note: Parameter names use snake_case ('surface_temperature' NOT 'surfaceTemperature')
```

#### `bio_bands_thresholds`
```sql
Columns:
- parameter (text) - VALUES: 'chlorophyll', 'oxygen', 'salinity', 'surfaceTemperature' (camelCase!)
- level (bio_level) - VALUES: 'very_low', 'low', 'normal', 'high', 'very_high'
- threshold (numeric) - Minimum value for this level

Note: Parameter names use camelCase ('surfaceTemperature' NOT 'surface_temperature')
WARNING: Inconsistent with species_bio_bands!
```

#### `species`
```sql
Columns (relevant):
- id (uuid) - Primary key
- species_code (varchar) - FAO code (e.g., 'cod', 'BUH')
- name_en (varchar(100)) - NOT text! Important for return type
- scientific_name (text)
- playful_bio_en (text) - NOT 'playful_bio'! Localized field

Note: Many fields are localized with _en, _es, _fr suffixes
```

#### `species_substrates`
```sql
Columns:
- id (uuid) - Primary key
- species_code (varchar) - FK to species.species_code (NOT species.id!)
- name_en (varchar)
- has_sand (boolean)
- has_gravel (boolean)
- has_rock (boolean)
- has_mud (boolean)
- has_mixed (boolean)

WARNING: Joins on species_code NOT species_id!
```

#### `findr_conditions_snapshots`
```sql
Columns:
- rectangle_code (text)
- captured_at (timestamp) - When data was captured
- sea_temp_c (numeric) - May be NULL
- chlorophyll_mg_m3 (numeric) - May be NULL
- dissolved_oxygen_mg_l (numeric) - May be NULL
- salinity_psu (numeric) - May be NULL

WARNING: Data for different parameters captured at different times!
```

---

## Migration Files Applied

**Total migrations created:** 16 (20251016005 through 20251016016)

**Key migrations:**
1. `20251016005_enhanced_confidence_scoring.sql` - Initial implementation (had bugs)
2. `20251016006-008` - Column name fixes (water_temperature_c → sea_temp_c)
3. `20251016009_species_specific_confidence.sql` - Added bio-band matching (broken)
4. `20251016011_fix_parameter_names.sql` - Fixed parameter name mismatch
5. `20251016012_fix_ambiguous_column.sql` - Fixed table aliases
6. `20251016013_fix_substrates_join.sql` - Fixed species_substrates join
7. `20251016014_fix_playful_bio_column.sql` - Fixed playful_bio → playful_bio_en
8. `20251016015_fix_select_structure.sql` - Fixed SELECT structure
9. `20251016016_fix_return_type.sql` - Fixed VARCHAR return type ✅ FINAL WORKING VERSION

---

## Debugging Commands Used

### Check actual parameter names:
```javascript
const { data: bioBands } = await supabase
  .from('species_bio_bands')
  .select('parameter');
const uniqueParams = [...new Set(bioBands.map(b => b.parameter))];
console.log('Parameters:', uniqueParams);
// Result: ['chlorophyll', 'oxygen', 'salinity', 'surface_temperature']
```

### Check table columns:
```javascript
const { data } = await supabase.from('species').select('*').limit(1);
console.log(Object.keys(data[0]));
// Reveals actual column names
```

### Test bio-band matching manually:
```sql
-- Get Cod's chlorophyll preference
SELECT parameter, happy_bands, unhappy_bands 
FROM species_bio_bands 
WHERE species_id = '39d25a22-dea4-41b1-8af0-c55e501b715c' 
AND parameter = 'chlorophyll';

-- Get 37I0's chlorophyll value
SELECT chlorophyll_mg_m3 
FROM findr_conditions_snapshots 
WHERE rectangle_code = '37I0' 
AND chlorophyll_mg_m3 IS NOT NULL;

-- Classify value into band
SELECT level FROM bio_bands_thresholds 
WHERE parameter = 'chlorophyll' 
AND 0.086 >= threshold 
ORDER BY threshold DESC LIMIT 1;
```

---

## Success Metrics

**Before Fix:**
- All species: bio_band_score = 0/30
- No species-specific variation
- Confidence identical within rectangle

**After Fix:**
- 37I0 Rectangle:
  - Mullet species: 22/30 bio-band score → 94% confidence
  - Other species: 17/30 bio-band score → 89% confidence
  - Range: 74-94% with species-specific variation ✅

**Confidence Components (working):**
1. ✅ Bio-band match (0-30): Species-specific chemical tolerance scoring
2. ✅ Temperature (0-25): Species thermal preference matching
3. ⚠️  Substrate (0-20): Placeholder (12 pts all) - needs lat/lon implementation
4. ✅ Freshness (0-20): Data recency scoring
5. ✅ Completeness (0-15): Species profile quality

---

## Key Takeaways

### 1. Always Verify Database Schema
- Don't assume column names or types
- Use `SELECT *` queries to see actual structure
- Check `information_schema.columns` for precise types

### 2. Check Naming Conventions Are Consistent
- Look for snake_case vs camelCase mismatches
- Check for localized suffixes (_en, _es, etc.)
- Verify parameter/enum values match across tables

### 3. Understand Join Relationships
- Not all tables use `id` as foreign key
- Check actual FK column names (species_code vs species_id)
- Use proper table aliases to avoid ambiguity

### 4. Consider Data Capture Patterns
- Environmental data may be split across timestamps
- Use time windows, not exact date matches
- Aggregate with MAX/COALESCE to handle NULLs

### 5. PostgreSQL Type Strictness
- Return types must match EXACTLY (varchar ≠ text)
- Column references must be unambiguous
- Nested queries need careful aliasing

---

## Files Created/Modified

**Created:**
- `supabase/migrations/20251016005-016_*.sql` (12 migration files)
- `scripts/test-enhanced-confidence.js`
- `CONFIDENCE_SCORING_ALGORITHM.md`
- `CONFIDENCE_SCORING_DEPLOYMENT.md`
- `BIO_BAND_CONFIDENCE_IMPLEMENTATION_LESSONS.md` (this file)

**Data Added:**
- `upsert_researched_bio_bands.sql` - 210 species bio-band preferences

---

## Cache Management

### Cache Table Structure

**Table:** `findr_prediction_sessions`

**Columns:**
- `rectangle_code` (text) - ICES rectangle identifier
- `prediction_date` (date) - Date of predictions
- `language` (text) - Localization language (en, es, fr, etc.)
- `payload` (jsonb) - Cached prediction data
- `fetched_at` (timestamp) - When cache was created
- `expires_at` (timestamp) - When cache expires (3-hour TTL)

**Cache TTL:** 3 hours (defined as `CACHE_TTL_MS = 1000 * 60 * 60 * 3`)

### Clearing Cache

After deploying confidence scoring changes, clear the cache:

```javascript
// Clear cache for specific date range
const { data, error } = await supabase
  .from('findr_prediction_sessions')
  .delete()
  .eq('prediction_date', '2025-10-16')
  .select();
```

**Cache Cleared on Oct 16, 2025:**
- Deleted 15 cached sessions across 5 dates (Oct 9-16)
- Next API calls will generate fresh predictions with new scores

---

## Next Steps

- [x] Clear prediction cache to deploy new confidence scores ✅ (15 sessions cleared)
- [ ] Add lat/lon-based substrate scoring (user has EMODnet integration ready)
- [ ] Add lat/lon-based bathymetry scoring
- [ ] Monitor production confidence distribution
- [ ] Document substrate/depth scoring when implemented

---

**Final Status:** ✅ Bio-band species-specific confidence scoring is working and deployed! The data is no longer "sitting there marooned" - it's actively differentiating species based on environmental conditions. Cache cleared - users will see new scores immediately.
