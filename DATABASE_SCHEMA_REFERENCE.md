# Database Schema Reference

**Last Updated:** November 12, 2025
**Purpose:** Comprehensive reference for database tables, columns, and types to prevent RPC type mismatches

---

## Table of Contents

1. [species](#species) - Fish species master data
2. [ices_rectangles](#ices_rectangles) - ICES fishing zones
3. [findr_conditions_latest](#findr_conditions_latest) - Latest environmental conditions
4. [moon_cache](#moon_cache) - Moon phase data cache
5. [findr_prediction_sessions](#findr_prediction_sessions) - Prediction cache
6. [findr_prediction_impressions](#findr_prediction_impressions) - Prediction view tracking
7. [findr_catch_entries](#findr_catch_entries) - User catch logs
8. [user_favourites](#user_favourites) - User favorite species
9. [user_location_preferences](#user_location_preferences) - User location history
10. [translation_cache](#translation_cache) - DeepL translation cache
11. [Common Type Pitfalls](#common-type-pitfalls)

---

## species

**Purpose:** Master table for fish species with environmental preferences, localized names, and metadata.

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `id` | UUID | string | - | ✗ | Primary key |
| `species_code` | VARCHAR(10) | string | 10 | ✗ | **⚠️ MUST cast to TEXT in RPC** |
| `scientific_name` | VARCHAR(200) | string | 200 | ✗ | **⚠️ MUST cast to TEXT in RPC** |
| `name_en` | VARCHAR(100) | string | 100 | ✗ | **⚠️ MUST cast to TEXT in RPC** |
| `name_es` | VARCHAR(100) | string | 100 | ✓ | **⚠️ MUST cast to TEXT in RPC** |
| `name_fr` | VARCHAR(100) | string | 100 | ✓ | **⚠️ MUST cast to TEXT in RPC** |
| `name_de` | VARCHAR(100) | string | 100 | ✓ | **⚠️ MUST cast to TEXT in RPC** |
| `name_it` | VARCHAR(100) | string | 100 | ✓ | **⚠️ MUST cast to TEXT in RPC** |
| `name_pt` | VARCHAR(100) | string | 100 | ✓ | **⚠️ MUST cast to TEXT in RPC** |
| `guild` | ENUM fish_guild | string | - | ✓ | **⚠️ MUST cast to TEXT in RPC** |
| `diurnal_sensitivity` | TEXT (CHECK) | string | - | ✓ | Values: 'strong', 'moderate', 'weak'. **⚠️ MUST cast to TEXT** |
| `flow_preference` | TEXT (CHECK) | string | - | ✓ | Values: 'slack_avoid', 'gentle', 'moderate', 'strong'. **⚠️ MUST cast to TEXT** |
| `playful_bio_en` | TEXT | string | - | ✓ | Already TEXT, no cast needed |
| `species_badges` | TEXT[] | array | - | ✓ | Array type, no cast needed |
| `preferred_tide_stage` | TEXT[] | array | - | ✓ | Array type, no cast needed |
| `temp_opt_c` | NUMERIC[] | array | - | ✓ | Array type, no cast needed |
| `biogeographic_regions` | TEXT[] | array | - | ✓ | Array type, no cast needed |
| `tide_weight` | NUMERIC | number | - | ✓ | Default: 0.30 |
| `light_weight` | NUMERIC | number | - | ✓ | Default: 0.30 |
| `wind_weight` | NUMERIC | number | - | ✓ | Default: 0.15 |
| `pressure_weight` | NUMERIC | number | - | ✓ | Default: 0.10 |
| `temp_weight` | NUMERIC | number | - | ✓ | Default: 0.10 |
| `lunar_weight` | NUMERIC | number | - | ✓ | Default: 0.05 |
| `cloud_weight` | NUMERIC | number | - | ✓ | Default: 0.05 |
| `slug` | TEXT | string | - | ✓ | URL-friendly identifier |
| `aliases` | JSONB | array | - | ✓ | Alternative names |
| `created_at` | TIMESTAMPTZ | string | - | ✓ | ISO 8601 format |
| `updated_at` | TIMESTAMPTZ | string | - | ✓ | ISO 8601 format |

### Custom Types

```sql
-- ENUM type for guild
CREATE TYPE fish_guild AS ENUM (
  'pelagic',
  'reef_kelp',
  'benthic',
  'surf_estuary',
  'cephalopod'
);
```

### RPC Casting Example

```sql
-- CORRECT: Cast VARCHAR and ENUM columns to TEXT
SELECT
  s.species_code::TEXT,          -- VARCHAR(10) → TEXT
  s.name_en::TEXT,                -- VARCHAR(100) → TEXT
  s.scientific_name::TEXT,        -- VARCHAR(200) → TEXT
  s.guild::TEXT,                  -- ENUM fish_guild → TEXT
  s.diurnal_sensitivity::TEXT,    -- TEXT with CHECK → TEXT (explicit)
  s.flow_preference::TEXT,        -- TEXT with CHECK → TEXT (explicit)
  s.playful_bio_en,               -- Already TEXT
  s.species_badges,               -- Already TEXT[]
  s.temp_opt_c                    -- Already NUMERIC[]
FROM species s;
```

---

## ices_rectangles

**Purpose:** ICES rectangular fishing zones with geographic boundaries and metadata.

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `id` | UUID | string | - | ✗ | Primary key |
| `rectangle_code` | VARCHAR(10) | string | 10 | ✗ | **⚠️ Use this, NOT 'code'** |
| `region` | TEXT | string | - | ✓ | **⚠️ Use this, NOT 'biogeographic_region'** |
| `center_lat` | NUMERIC | number | - | ✗ | Decimal degrees |
| `center_lon` | NUMERIC | number | - | ✗ | Decimal degrees |
| `lat_south` | NUMERIC | number | - | ✗ | South boundary |
| `lat_north` | NUMERIC | number | - | ✗ | North boundary |
| `lon_west` | NUMERIC | number | - | ✗ | West boundary |
| `lon_east` | NUMERIC | number | - | ✗ | East boundary |
| `country_codes` | TEXT[] | array | - | ✓ | ISO 2-letter codes |
| `is_coastal` | BOOLEAN | boolean | - | ✓ | Within 20km of shore |
| `distance_to_shore_km` | NUMERIC | number | - | ✓ | Distance to nearest coastline |
| `cmems_region` | TEXT | string | - | ✓ | CMEMS dataset region code |
| `has_copernicus_coverage` | BOOLEAN | boolean | - | ✓ | Data availability flag |
| `coastal_sample_point` | GEOGRAPHY(POINT) | object | - | ✓ | PostGIS point for sampling |
| `created_at` | TIMESTAMPTZ | string | - | ✓ | ISO 8601 format |

### Common Pitfalls

❌ **WRONG:**
```sql
-- Old column names that no longer exist
SELECT code, biogeographic_region FROM ices_rectangles;
```

✅ **CORRECT:**
```sql
-- Use current column names
SELECT rectangle_code, region FROM ices_rectangles;
```

---

## findr_conditions_latest

**Purpose:** Latest environmental conditions snapshot for each rectangle (view or materialized view).

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `rectangle_code` | VARCHAR(10) | string | 10 | ✗ | **⚠️ Foreign key to ices_rectangles** |
| `captured_at` | TIMESTAMPTZ | string | - | ✗ | When data was captured |
| `source` | TEXT | string | - | ✓ | Data source identifier |
| `sea_temp_c` | NUMERIC | number | - | ✓ | **⚠️ Use COALESCE(water_temp_c, sea_temp_c)** |
| `water_temp_c` | NUMERIC | number | - | ✓ | **⚠️ Use COALESCE(water_temp_c, sea_temp_c)** |
| `salinity_psu` | NUMERIC | number | - | ✓ | **⚠️ Use this, NOT 'salinity_ppt'** |
| `wind_speed_kts` | NUMERIC | number | - | ✓ | Wind speed in knots |
| `wind_direction_deg` | NUMERIC | number | - | ✓ | 0-360 degrees |
| `wave_height_m` | NUMERIC | number | - | ✓ | Significant wave height |
| `current_speed_ms` | NUMERIC | number | - | ✓ | Current speed m/s |
| `current_direction_deg` | NUMERIC | number | - | ✓ | 0-360 degrees |
| `current_east_ms` | NUMERIC | number | - | ✓ | Eastward component |
| `current_north_ms` | NUMERIC | number | - | ✓ | Northward component |
| `air_pressure_hpa` | NUMERIC | number | - | ✓ | Atmospheric pressure |
| `cloud_cover_pct` | NUMERIC | number | - | ✓ | 0-100 percentage |
| `kd490` | NUMERIC | number | - | ✓ | Light attenuation coefficient |
| `water_clarity_kd490` | TEXT | string | - | ✓ | Clarity category |
| `chlorophyll_mg_m3` | NUMERIC | number | - | ✓ | Chlorophyll concentration |
| `dissolved_oxygen_mg_l` | NUMERIC | number | - | ✓ | DO concentration |
| `nitrate_umol_l` | NUMERIC | number | - | ✓ | Nitrate concentration |
| `phosphate_umol_l` | NUMERIC | number | - | ✓ | Phosphate concentration |
| `snapshot_day` | DATE | string | - | ✓ | Date of snapshot |
| `created_at` | TIMESTAMPTZ | string | - | ✓ | ISO 8601 format |

### Common Pitfalls

❌ **WRONG:**
```sql
-- Old column names
SELECT temperature_c, salinity_ppt, data_age_hours FROM findr_conditions_latest;
```

✅ **CORRECT:**
```sql
-- Use current column names and calculate age
SELECT
  COALESCE(water_temp_c, sea_temp_c) as temperature,
  salinity_psu,
  EXTRACT(EPOCH FROM (NOW() - captured_at)) / 3600 as data_age_hours
FROM findr_conditions_latest;
```

---

## moon_cache

**Purpose:** Cached moon phase data for efficient lookup.

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `id` | UUID | string | - | ✗ | Primary key |
| `local_date` | DATE | string | - | ✗ | **⚠️ Use this, NOT 'date'** |
| `lat_bucket` | NUMERIC | number | - | ✗ | Rounded latitude |
| `lon_bucket` | NUMERIC | number | - | ✗ | Rounded longitude |
| `timezone` | TEXT | string | - | ✓ | IANA timezone |
| `moon_phase_name` | TEXT | string | - | ✓ | **⚠️ Use this, NOT 'phase'** |
| `moon_phase_fraction` | NUMERIC | number | - | ✓ | 0-1 fraction of lunar cycle |
| `moon_illumination_pct` | NUMERIC | number | - | ✓ | **⚠️ Use this, NOT 'illumination'** |
| `moon_phase_stage` | TEXT | string | - | ✓ | 'waxing' or 'waning' |
| `moonrise_iso` | TIMESTAMPTZ | string | - | ✓ | ISO 8601 format |
| `moonset_iso` | TIMESTAMPTZ | string | - | ✓ | ISO 8601 format |
| `sunrise_iso` | TIMESTAMPTZ | string | - | ✓ | ISO 8601 format |
| `sunset_iso` | TIMESTAMPTZ | string | - | ✓ | ISO 8601 format |
| `cached_at` | TIMESTAMPTZ | string | - | ✓ | **⚠️ Use for ORDER BY** |
| `expires_at` | TIMESTAMPTZ | string | - | ✓ | Cache expiry |

### Common Pitfalls

❌ **WRONG:**
```sql
-- Old column names
SELECT date, phase, illumination FROM moon_cache WHERE date = '2025-11-12';
```

✅ **CORRECT:**
```sql
-- Use current column names and handle duplicates
SELECT moon_phase_name, moon_illumination_pct
FROM moon_cache
WHERE local_date = '2025-11-12'
ORDER BY cached_at DESC
LIMIT 1;  -- Important: Multiple rows may exist per date
```

---

## findr_prediction_sessions

**Purpose:** Cache table for prediction API responses (3-hour TTL).

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `rectangle_code` | VARCHAR(10) | string | 10 | ✗ | Part of composite key |
| `prediction_date` | DATE | string | - | ✗ | Part of composite key |
| `language` | VARCHAR(10) | string | 10 | ✗ | Part of composite key |
| `payload` | JSONB | object | - | ✗ | Full API response |
| `fetched_at` | TIMESTAMPTZ | string | - | ✗ | Cache creation time |
| `expires_at` | TIMESTAMPTZ | string | - | ✗ | Cache expiry (3 hours) |

### Primary Key

```sql
PRIMARY KEY (rectangle_code, prediction_date, language)
```

---

## findr_prediction_impressions

**Purpose:** Track when users view predictions (for validation).

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `id` | UUID | string | - | ✗ | Primary key |
| `user_id` | UUID | string | - | ✗ | Foreign key to auth.users |
| `rectangle_code` | VARCHAR(10) | string | 10 | ✗ | ICES rectangle |
| `prediction_date` | DATE | string | - | ✗ | Date of prediction |
| `viewed_at` | TIMESTAMPTZ | string | - | ✗ | When user viewed |
| `species_ids` | UUID[] | array | - | ✗ | Species in prediction |
| `top_confidence` | INTEGER | number | - | ✓ | Highest confidence % |
| `session_id` | TEXT | string | - | ✓ | Browser session |

---

## findr_catch_entries

**Purpose:** User catch logs for validating predictions.

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `id` | UUID | string | - | ✗ | Primary key |
| `user_id` | UUID | string | - | ✗ | Foreign key to auth.users |
| `species_id` | UUID | string | - | ✗ | Foreign key to species |
| `caught_at` | TIMESTAMPTZ | string | - | ✗ | When fish was caught |
| `rectangle_code` | VARCHAR(10) | string | 10 | ✗ | ICES rectangle |
| `latitude` | NUMERIC | number | - | ✓ | Precise location |
| `longitude` | NUMERIC | number | - | ✓ | Precise location |
| `bait_used` | TEXT | string | - | ✓ | User-reported bait |
| `habitat` | TEXT | string | - | ✓ | User-reported habitat |
| `linked_impression_id` | UUID | string | - | ✓ | Links to impression |
| `was_predicted` | BOOLEAN | boolean | - | ✓ | Validation flag |
| `prediction_confidence` | INTEGER | number | - | ✓ | Confidence if predicted |
| `created_at` | TIMESTAMPTZ | string | - | ✓ | Log creation time |

---

## user_favourites

**Purpose:** User favorite species for notifications.

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `id` | UUID | string | - | ✗ | Primary key |
| `user_id` | UUID | string | - | ✗ | Foreign key to auth.users |
| `species_id` | UUID | string | - | ✗ | Foreign key to species |
| `added_at` | TIMESTAMPTZ | string | - | ✗ | When favorited |
| `last_checked` | TIMESTAMPTZ | string | - | ✓ | Last notification check |
| `notifications_enabled` | BOOLEAN | boolean | - | ✓ | Default: false |
| `notification_threshold` | INTEGER | number | - | ✓ | Min confidence % (default: 70) |
| `notification_channels` | JSONB | object | - | ✓ | `{email, push, sms}` |

### Unique Constraint

```sql
UNIQUE (user_id, species_id)
```

---

## user_location_preferences

**Purpose:** User location history and preferences.

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `id` | UUID | string | - | ✗ | Primary key |
| `user_id` | UUID | string | - | ✗ | Foreign key to auth.users |
| `rectangle_code` | VARCHAR(10) | string | 10 | ✗ | ICES rectangle |
| `place_name` | TEXT | string | - | ✓ | Human-readable name |
| `latitude` | NUMERIC | number | - | ✓ | Center coordinates |
| `longitude` | NUMERIC | number | - | ✓ | Center coordinates |
| `visit_count` | INTEGER | number | - | ✓ | How many times visited |
| `last_visited_at` | TIMESTAMPTZ | string | - | ✓ | Most recent visit |
| `is_favorite` | BOOLEAN | boolean | - | ✓ | User marked as favorite |
| `created_at` | TIMESTAMPTZ | string | - | ✓ | First visit |

---

## translation_cache

**Purpose:** Cache DeepL API translations to reduce costs.

### Key Columns

| Column | SQL Type | JS Type | Max Length | Nullable | Notes |
|--------|----------|---------|------------|----------|-------|
| `id` | UUID | string | - | ✗ | Primary key |
| `source_text` | TEXT | string | - | ✗ | Original text |
| `source_language` | VARCHAR(10) | string | 10 | ✗ | ISO language code |
| `target_language` | VARCHAR(10) | string | 10 | ✗ | ISO language code |
| `translated_text` | TEXT | string | - | ✗ | Translation result |
| `provider` | TEXT | string | - | ✓ | 'deepl' or other |
| `cached_at` | TIMESTAMPTZ | string | - | ✗ | Cache creation time |
| `hit_count` | INTEGER | number | - | ✓ | Cache reuse counter |

### Unique Index

```sql
UNIQUE (source_text, source_language, target_language)
```

---

## Common Type Pitfalls

### 1. VARCHAR vs TEXT in RPC Functions

**Problem:** PostgreSQL is strict about type matching. `VARCHAR(n)` ≠ `TEXT` ≠ `VARCHAR`

❌ **WRONG:**
```sql
RETURNS TABLE (
  species_code TEXT,
  name_en TEXT
)
...
SELECT s.species_code, s.name_en  -- species_code is VARCHAR(10), name_en is VARCHAR(100)
FROM species s;
```

**Error:** `Returned type character varying(10) does not match expected type text in column 1`

✅ **CORRECT:**
```sql
RETURNS TABLE (
  species_code TEXT,
  name_en TEXT
)
...
SELECT s.species_code::TEXT, s.name_en::TEXT  -- Explicit cast
FROM species s;
```

### 2. ENUM Types Must Be Cast to TEXT

**Problem:** Custom ENUM types (like `fish_guild`) don't automatically convert to TEXT.

❌ **WRONG:**
```sql
RETURNS TABLE (
  guild TEXT
)
...
SELECT s.guild  -- guild is ENUM fish_guild
FROM species s;
```

**Error:** `Returned type fish_guild does not match expected type text in column N`

✅ **CORRECT:**
```sql
RETURNS TABLE (
  guild TEXT
)
...
SELECT s.guild::TEXT  -- Explicit cast
FROM species s;
```

### 3. INTEGER vs NUMERIC in CASE Statements

**Problem:** Integer literals (5, 0) return INTEGER type, not NUMERIC.

❌ **WRONG:**
```sql
RETURNS TABLE (
  habitat_bonus NUMERIC
)
...
SELECT
  CASE
    WHEN substrate IS NOT NULL THEN 5  -- Returns INTEGER
    ELSE 0  -- Returns INTEGER
  END AS habitat_bonus
```

**Error:** `Returned type integer does not match expected type numeric in column N`

✅ **CORRECT:**
```sql
RETURNS TABLE (
  habitat_bonus NUMERIC
)
...
SELECT
  (CASE
    WHEN substrate IS NOT NULL THEN 5.0  -- Returns NUMERIC
    ELSE 0.0  -- Returns NUMERIC
  END)::NUMERIC AS habitat_bonus  -- Explicit cast for safety
```

### 4. Old Column Names

**Problem:** Column names changed during migrations but old code still references them.

| Table | ❌ Old Name | ✅ Current Name |
|-------|------------|----------------|
| ices_rectangles | `code` | `rectangle_code` |
| ices_rectangles | `biogeographic_region` | `region` |
| findr_conditions_latest | `temperature_c` | `sea_temp_c` / `water_temp_c` |
| findr_conditions_latest | `salinity_ppt` | `salinity_psu` |
| findr_conditions_latest | `data_age_hours` | *(calculated)* |
| moon_cache | `date` | `local_date` |
| moon_cache | `phase` | `moon_phase_name` |
| moon_cache | `illumination` | `moon_illumination_pct` |
| species | `species_id` | `id` |

### 5. Biogeographic Region Mapping

**Problem:** Rectangle.region values (e.g., "English Channel") don't match species.biogeographic_regions (e.g., "NE_Atlantic").

❌ **WRONG:**
```sql
-- Using rectangle.region directly
SELECT region INTO rectangle_region FROM ices_rectangles WHERE rectangle_code = target_rectangle;
WHERE rectangle_region = ANY(s.biogeographic_regions);  -- Won't match!
```

✅ **CORRECT:**
```sql
-- Map rectangle code to biogeographic region
rectangle_region := CASE
  WHEN target_rectangle LIKE '07%' OR target_rectangle LIKE '08%' THEN 'Mediterranean'
  WHEN target_rectangle LIKE '20%' OR target_rectangle LIKE '21%' THEN 'NE_Atlantic'
  -- ... more mappings
  ELSE 'NE_Atlantic'
END;
WHERE rectangle_region = ANY(s.biogeographic_regions);  -- Now matches!
```

**Biogeographic Regions in Species Table:**
- `NE_Atlantic` - Northeast Atlantic (European waters, ICES codes 20-65)
- `Mediterranean` - Mediterranean Sea (ICES codes 07-08)
- `NW_Atlantic` - Northwest Atlantic (US East Coast, codes 70-76)
- `Gulf_of_Mexico` - Gulf of Mexico (codes 90-94)
- `Caribbean` - Caribbean (codes 95-97)
- `NE_Pacific` - Northeast Pacific (US/Canada West Coast, codes 77-85)
- `Gulf_of_Alaska` - Gulf of Alaska (codes 86-88)
- `Hawaii` - Hawaii (code 98)
- `Sea_of_Cortez` - Sea of Cortez
- `US_Atlantic` - US Atlantic waters

**See migration:** `20251112210000_add_region_mapping_to_rpc.sql` for complete mapping logic.

### 6. Handling Multiple Rows

**Problem:** Some queries may return multiple rows when you expect one.

❌ **RISKY:**
```sql
SELECT moon_phase_name INTO v_moon_phase
FROM moon_cache
WHERE local_date = target_date;  -- May return multiple rows
```

**Error:** `more than one row returned by a subquery used as an expression`

✅ **SAFE:**
```sql
SELECT moon_phase_name INTO v_moon_phase
FROM moon_cache
WHERE local_date = target_date
ORDER BY cached_at DESC  -- Get most recent
LIMIT 1;  -- Explicitly limit to 1 row
```

---

## Quick Reference for RPC Development

### Type Casting Checklist

When creating RPC functions that return TABLE:

- [ ] All VARCHAR columns cast to TEXT: `column_name::TEXT`
- [ ] All ENUM columns cast to TEXT: `guild::TEXT`
- [ ] All TEXT columns with CHECK constraints cast explicitly: `diurnal_sensitivity::TEXT`
- [ ] All CASE statements returning NUMERIC use `.0` decimals: `5.0`, `0.0`
- [ ] All CASE statements with NUMERIC return type have explicit `::NUMERIC` cast
- [ ] Use `COALESCE()` for nullable columns: `COALESCE(water_temp_c, sea_temp_c)`
- [ ] Use `ORDER BY ... LIMIT 1` for potentially duplicate rows
- [ ] Calculate derived columns (like data_age_hours) in the query
- [ ] Use current column names (check this reference doc)

### Testing RPC Functions

```typescript
// Test script template
const { data, error } = await supabase.rpc('your_function_name', {
  param1: 'value1',
  param2: '2025-11-12',
});

if (error) {
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  console.error('Error details:', error.details);  // Shows which column failed
  console.error('Error hint:', error.hint);
} else {
  console.log('Success! Returned', data.length, 'rows');
  console.log('Sample:', JSON.stringify(data[0], null, 2));
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 42804 | Type mismatch | Add explicit type cast (::TEXT, ::NUMERIC) |
| 42P01 | Table/relation not found | Check table name spelling |
| 42703 | Column not found | Check column name (see Old Names table above) |
| 42883 | Function not found | Check function signature |
| 23505 | Unique constraint violation | Check for duplicates |

---

## See Also

- [RPC_TYPE_CASTING_GUIDE.md](./RPC_TYPE_CASTING_GUIDE.md) - Detailed guide on type casting
- [GETTING_STARTED.md](./GETTING_STARTED.md) - How Findr predictions work
- [CLAUDE.md](./CLAUDE.md) - Main project documentation

**Last Reviewed:** November 12, 2025
**Maintained By:** Development team
**Update Frequency:** After schema migrations
