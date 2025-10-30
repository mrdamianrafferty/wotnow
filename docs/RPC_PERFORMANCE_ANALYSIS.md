# RPC Performance Analysis: `get_global_fishing_predictions`

**Date**: 2025-10-30
**Function**: `get_global_fishing_predictions`
**Current Performance**: ~20+ seconds
**Target**: <3 seconds

---

## Performance Bottlenecks Identified

### 1. **CARTESIAN PRODUCT via CROSS JOIN** ⚠️ CRITICAL
**Location**: Lines 172-173
```sql
FROM species s
CROSS JOIN grid_conditions gc
```

**Problem**:
- Creates every possible combination of species × grid_conditions
- If 500 species × 1 grid record = 500 rows to process
- ALL species get scored even if they won't make top 100

**Impact**: **SEVERE** (5-10 seconds)

**Solution**:
- Add WHERE clause to filter species BEFORE cross join
- Use biogeographic region filter earlier
- Consider LATERAL join instead of CROSS JOIN

---

### 2. **Multiple Moon Phase Calculations** ⚠️ HIGH
**Locations**: Lines 87-89, 108-110, 331-333

```sql
SELECT illumination INTO moon_illum
FROM calculate_moon_phase(target_date)
LIMIT 1;

-- Later in CTE:
moon_data AS (
  SELECT
    (SELECT phase_name FROM calculate_moon_phase(target_date) LIMIT 1) as phase_name,
    (SELECT illumination FROM calculate_moon_phase(target_date) LIMIT 1) as illumination
)
```

**Problem**:
- `calculate_moon_phase()` called 3+ times per request
- Each call may involve complex astronomical calculations

**Impact**: **MODERATE** (1-3 seconds)

**Solution**:
- Calculate moon phase ONCE at function start
- Store in variables, reuse throughout
- Remove redundant CTE subqueries

---

### 3. **JSONB Type Checking on Every Row** ⚠️ MODERATE
**Location**: Lines 137-152, 352-371

```sql
CASE
  WHEN jsonb_typeof(to_jsonb(s.temp_opt_c)) = 'array' THEN
    (to_jsonb(s.temp_opt_c)->0)::text || '-' || (to_jsonb(s.temp_opt_c)->1)::text
  WHEN s.temp_opt_c IS NOT NULL THEN
    (to_jsonb(s.temp_opt_c))::text
  ELSE NULL
END as temp_pref_str
```

**Problem**:
- `to_jsonb()` + `jsonb_typeof()` called for EVERY species
- String concatenation happens for every row
- Repeated for temp, depth, substrate preferences

**Impact**: **MODERATE** (1-2 seconds)

**Solution**:
- Pre-compute these strings in a materialized column
- Or compute once in a subquery, not inline
- Consider storing as VARCHAR instead of numeric array

---

### 4. **Redundant Function Calls** ⚠️ MODERATE
**Location**: Lines 64-68

```sql
nearest_grid_cell := find_nearest_grid_cell(user_lat, user_lon);
biogeographic_region := get_biogeographic_region_from_coords(user_lat, user_lon);
```

**Problem**:
- These functions likely do expensive spatial calculations
- `find_nearest_grid_cell` might scan entire grid table
- Called even if data will come from cache

**Impact**: **MODERATE** (1-2 seconds)

**Solution**:
- Add spatial indexes on grid tables
- Consider caching grid cell → bioregion mapping
- Optimize these helper functions

---

### 5. **Complex String Building in SELECT** ⚠️ LOW
**Location**: Lines 292-321, 427-446

```sql
jsonb_build_object(
  'temperature', jsonb_build_object(
    'actual', fs.env_temperature,
    'match', fs.temp_match,
    'score', fs.temp_score,
    'species_pref', fs.temp_pref_str
  ),
  ...
) as factors
```

**Problem**:
- JSONB construction for every row (100 species)
- Could be deferred to application layer

**Impact**: **LOW** (0.5-1 second)

**Solution**:
- Consider returning flat columns instead
- Build JSONB in Node.js if needed
- Or build only for top 20 species

---

### 6. **No Early Filtering** ⚠️ HIGH
**Problem**:
- ALL species in biogeographic region are scored
- Top 100 selected at the end via `LIMIT 100`
- No WHERE clause to exclude unlikely species

**Impact**: **HIGH** (2-5 seconds)

**Solution**:
- Add temperature range filter: `WHERE temp_opt_c IS NOT NULL`
- Filter by depth if provided
- Exclude species with `is_active = false` (if such column exists)

---

## Optimization Recommendations

### **QUICK WINS** (Implement First)

#### 1. **Cache Moon Phase** (Save 1-3 seconds)
```sql
-- At function start:
DECLARE
  moon_phase_name text;
  moon_illum numeric;
BEGIN
  -- Calculate ONCE
  SELECT phase_name, illumination INTO moon_phase_name, moon_illum
  FROM calculate_moon_phase(target_date)
  LIMIT 1;

  -- Remove moon_data CTE entirely
```

#### 2. **Add Species Filter** (Save 2-4 seconds)
```sql
FROM species s
WHERE s.name_en IS NOT NULL
  AND s.temp_opt_c IS NOT NULL  -- Only species with known temp preferences
  AND (s.biogeographic_regions IS NULL
       OR biogeographic_region = ANY(s.biogeographic_regions))
CROSS JOIN grid_conditions gc
```

#### 3. **Reduce JSONB String Building** (Save 1-2 seconds)
```sql
-- Option A: Pre-compute in a dedicated CTE
WITH species_preferences AS (
  SELECT
    id,
    -- Compute all preference strings once
    ...
  FROM species
  WHERE ...
)

-- Option B: Move to application layer (best)
-- Return temp_opt_c as array, format in Node.js
```

---

### **MEDIUM COMPLEXITY** (Implement Second)

#### 4. **Replace CROSS JOIN with Filtered Join** (Save 3-5 seconds)
```sql
-- Instead of CROSS JOIN (Cartesian product):
FROM species s
JOIN grid_conditions_latest gc ON gc.cell_id = nearest_grid_cell
WHERE s.biogeographic_regions IS NULL
   OR biogeographic_region = ANY(s.biogeographic_regions)
```

This ensures only 1 grid_conditions row is joined, not all species × all grids.

#### 5. **Add Index on grid_conditions_latest.cell_id**
```sql
CREATE INDEX IF NOT EXISTS idx_grid_conditions_latest_cell_id
ON grid_conditions_latest(cell_id);
```

#### 6. **Optimize Helper Functions**
- Review `find_nearest_grid_cell()` - ensure spatial index exists
- Review `get_biogeographic_region_from_coords()` - add caching if possible

---

### **ADVANCED** (Consider Later)

#### 7. **Materialized Columns for Preferences**
```sql
ALTER TABLE species
ADD COLUMN temp_pref_display VARCHAR(20)
GENERATED ALWAYS AS (
  CASE
    WHEN temp_opt_c[1] IS NOT NULL AND temp_opt_c[2] IS NOT NULL
    THEN temp_opt_c[1]::text || '-' || temp_opt_c[2]::text
    ELSE NULL
  END
) STORED;
```

#### 8. **Denormalized Grid Data**
Create a materialized view combining grid_conditions + grid_cell metadata:
```sql
CREATE MATERIALIZED VIEW grid_conditions_enriched AS
SELECT
  gc.*,
  g.region_code,
  g.biogeographic_region
FROM grid_conditions_latest gc
JOIN grid_025deg g ON g.cell_id = gc.cell_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY grid_conditions_enriched;
```

#### 9. **Pre-filtered Species Table**
Create materialized view of "active" species with pre-computed strings:
```sql
CREATE MATERIALIZED VIEW species_active_with_prefs AS
SELECT
  s.*,
  -- All preference strings pre-computed
  ...
FROM species s
WHERE s.name_en IS NOT NULL
  AND s.is_active = true;
```

---

## Trade-offs Analysis

### Keep vs. Remove

| Feature | Value | Performance Cost | Recommendation |
|---------|-------|------------------|----------------|
| Species preference strings | HIGH | MODERATE | **KEEP** - Pre-compute |
| JSONB factors object | MEDIUM | LOW | **KEEP** - Already cached |
| All score components | HIGH | LOW | **KEEP** - Needed for UI |
| CROSS JOIN | LOW | **SEVERE** | **REMOVE** - Use filtered JOIN |
| Moon phase in CTE | LOW | MODERATE | **REMOVE** - Calculate once |
| Biogeographic filtering | HIGH | LOW | **KEEP** - Add earlier |
| String concatenations | MEDIUM | MODERATE | **OPTIMIZE** - Pre-compute |

---

## Implementation Priority

### Phase 1: Critical Fixes (Target: <5 seconds)
1. ✅ Fix CROSS JOIN → Use filtered JOIN
2. ✅ Cache moon phase calculation
3. ✅ Add species WHERE filter before join

**Expected Savings**: 6-12 seconds

### Phase 2: Moderate Optimizations (Target: <3 seconds)
4. ✅ Add grid_conditions_latest(cell_id) index
5. ✅ Optimize find_nearest_grid_cell function
6. ✅ Pre-compute preference strings in CTE

**Expected Savings**: 2-4 seconds

### Phase 3: Advanced (Target: <2 seconds)
7. ⏳ Materialized columns for preferences
8. ⏳ Denormalized grid view
9. ⏳ Query plan analysis with EXPLAIN ANALYZE

**Expected Savings**: 1-2 seconds

---

## Testing Plan

1. **Baseline**: Run `EXPLAIN ANALYZE` on current function
2. **After Each Fix**: Compare execution time
3. **Load Test**: Test with multiple concurrent requests
4. **Cache Hit Rate**: Monitor how often cache is used

```sql
-- Performance test query:
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_global_fishing_predictions(43.5, -5.25, '2025-10-29', 'en');
```

---

## Next Steps

1. Create Phase 1 migration with critical fixes
2. Test on production data
3. Monitor performance metrics
4. Iterate with Phase 2 if needed

**Estimated Total Time Savings**: 10-18 seconds (from ~20s to ~2-3s)
