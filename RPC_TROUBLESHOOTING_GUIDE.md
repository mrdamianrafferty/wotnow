# RPC TROUBLESHOOTING & RECOVERY GUIDE

**Last Updated:** October 18, 2025  
**Purpose:** Quick reference for diagnosing and fixing RPC failures  
**Urgency:** CRITICAL - RPC failures break all predictions

---

## 🚨 Quick Diagnosis Checklist

When predictions stop working, check these in order:

### 1. Verify RPC Functions Exist
```sql
-- Check if functions exist and their signatures
SELECT 
  proname as function_name,
  pronargs as num_args,
  proargnames as arg_names,
  proargtypes as arg_types
FROM pg_proc 
WHERE proname LIKE '%environmental_predictions%'
ORDER BY proname;
```

**Expected Results:**
- ✅ `get_environmental_predictions_enhanced` (8 parameters)
- ⚠️ `get_environmental_predictions_basic` (4 parameters) - DEPRECATED, not used

### 2. Test RPC Directly
```typescript
// Test enhanced RPC (production function)
npx tsx scripts/test-enhanced-with-without-gps.ts

// Test regional filtering
npx tsx scripts/test-5-regions-service.ts
```

### 3. Check API Logs
```bash
# In Vercel dashboard or local logs
grep "RPC error" logs
grep "Could not find function" logs
grep "parameter mismatch" logs
```

### 4. Verify Environmental Data
```sql
-- Check recent data exists
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT rectangle_code) as unique_rectangles,
  MAX(captured_at) as latest_data
FROM findr_conditions_snapshots
WHERE captured_at >= CURRENT_DATE - INTERVAL '30 days';
```

**Expected:** 
- Total records: > 1000
- Unique rectangles: 20-30
- Latest data: Within last 24 hours

---

## 📋 Database Schema Reference

### Core Tables

#### `species` Table
**Purpose:** Species information and behavioral data

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `id` | uuid | Primary key | `f47ac10b-...` |
| `species_code` | varchar | FAO alpha code | `'BSS'` |
| `name_en` | varchar | English name | `'Sea Bass'` |
| `scientific_name` | varchar | Latin name | `'Dicentrarchus labrax'` |
| `temp_opt_c` | numeric[] | Optimal temp range [min, max] | `{12.0, 22.0}` |
| `temp_weight` | numeric | Temperature importance (0-1) | `0.25` |
| `lunar_weight` | numeric | Lunar phase importance (0-1) | `0.05` |
| `wind_weight` | numeric | Wind importance (0-1) | `0.5` |
| `pressure_weight` | numeric | Pressure importance (0-1) | `0.5` |
| `depth_min_m` | numeric | Min depth (meters) | `0` |
| `depth_max_m` | numeric | Max depth (meters) | `100` |
| `biogeographic_regions` | text[] | Where species occurs | `{Atlantic, Celtic Sea}` |
| `diurnal_sensitivity` | text | Light sensitivity | `'moderate'` |
| `light_weight` | numeric | Light importance (0-1) | `0.5` |
| `playful_bio_en` | text | Species description | `'A silver hunter...'` |

**Critical Fields for RPC:**
- `temp_opt_c[1]` - Minimum optimal temperature
- `temp_opt_c[2]` - Maximum optimal temperature
- `temp_weight` - Multiplier for temperature score
- `biogeographic_regions` - Array for filtering by location

#### `findr_conditions_snapshots` Table
**Purpose:** Environmental data by ICES rectangle

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `id` | uuid | Primary key | `f47ac10b-...` |
| `rectangle_code` | text | ICES statistical rectangle | `'21D8'` |
| `captured_at` | timestamptz | When data was captured | `2025-10-18T03:08:52Z` |
| `sea_temp_c` | numeric | Sea temperature (Celsius) | `15.2` |
| `chlorophyll_mg_m3` | numeric | Chlorophyll concentration | `2.5` |
| `dissolved_oxygen_mg_l` | numeric | Oxygen concentration | `8.2` |
| `salinity_psu` | numeric | Salinity (PSU) | `35.0` |
| `water_clarity_kd490` | numeric | Water clarity index | `0.08` |

**Data Freshness:** RPC uses 30-day lookback window

#### `species_bio_bands` Table
**Purpose:** Species preferences for biogeochemical parameters

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `species_id` | uuid | Foreign key to species | `f47ac10b-...` |
| `parameter` | text | Which parameter | `'chlorophyll'` |
| `happy_bands` | integer[] | Preferred levels | `{3, 4, 5}` |
| `unhappy_bands` | integer[] | Avoided levels | `{1, 2}` |

**Parameters:** `'chlorophyll'`, `'oxygen'`, `'salinity'`

#### `bio_bands_thresholds` Table
**Purpose:** Defines biogeochemical band levels

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `parameter` | text | Which parameter | `'chlorophyll'` |
| `level` | integer | Band level (1-5) | `3` |
| `threshold` | numeric | Minimum value for level | `1.0` |

#### `species_substrates` Table
**Purpose:** Substrate preferences for each species

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `species_code` | varchar | FAO alpha code | `'BSS'` |
| `has_sand` | boolean | Likes sandy substrate | `true` |
| `has_gravel` | boolean | Likes gravel | `false` |
| `has_rock` | boolean | Likes rocky substrate | `true` |
| `has_mud` | boolean | Likes muddy substrate | `false` |

---

## 🔧 RPC Function Reference

### `get_environmental_predictions_enhanced`

**Current Production Function** (Always used as of 2025-10-18)

#### Function Signature
```sql
CREATE OR REPLACE FUNCTION get_environmental_predictions_enhanced(
  target_rectangle text,           -- ICES rectangle code
  target_date date,                 -- Prediction date
  user_lat numeric,                 -- User latitude (can be NULL)
  user_lon numeric,                 -- User longitude (can be NULL)
  substrate_type text DEFAULT NULL, -- Substrate type at location
  depth_meters numeric DEFAULT NULL,-- Depth at location
  current_wind_speed_ms numeric DEFAULT NULL,      -- Wind speed (m/s)
  current_pressure_hpa numeric DEFAULT NULL        -- Pressure (hPa)
)
```

#### Parameters Explained

| Parameter | Required | Example | Notes |
|-----------|----------|---------|-------|
| `target_rectangle` | Yes | `'21D8'` | ICES statistical rectangle |
| `target_date` | Yes | `'2025-10-18'` | Date to predict for |
| `user_lat` | Yes* | `43.5` or `NULL` | Can be NULL, disables lunar/substrate/depth scoring |
| `user_lon` | Yes* | `-9.0` or `NULL` | Can be NULL |
| `substrate_type` | No | `'rocky_reef'` | `NULL` gives neutral score (12 points) |
| `depth_meters` | No | `15.0` | `NULL` gives neutral score (10 points) |
| `current_wind_speed_ms` | No | `5.0` | `NULL` gives neutral score (7 points) |
| `current_pressure_hpa` | No | `1015.0` | `NULL` gives neutral score (7 points) |

*Required in function signature but can be NULL

#### Return Columns

| Column | Type | Description | Range |
|--------|------|-------------|-------|
| `species_id` | uuid | Species identifier | - |
| `species_code` | varchar | FAO alpha code | - |
| `name_en` | varchar | English name | - |
| `scientific_name` | varchar | Scientific name | - |
| `playful_bio_en` | text | Species description | - |
| `ices_rectangle` | text | ICES rectangle | - |
| `prediction_date` | date | Prediction date | - |
| `confidence` | integer | Overall confidence % | 0-100 |
| `bio_band_score` | integer | Biogeochemical score | 0-30 |
| `temp_score` | integer | Temperature score | 0-40 |
| `substrate_score` | integer | Substrate match score | 0-25 |
| `depth_score` | integer | Depth match score | 0-20 |
| `light_score` | integer | Light conditions score | 0-15 |
| `habitat_bonus` | integer | Habitat bonus points | 0-10 |
| `lunar_score` | integer | Lunar phase score | 0-15 |
| `weather_score` | integer | Weather conditions score | 0-10 |
| `freshness_score` | integer | Data freshness score | 0-15 |
| `completeness_score` | integer | Data completeness score | 0-10 |
| `moon_phase` | text | Current moon phase | `'full_moon'`, etc. |
| `moon_illumination` | numeric | Moon illumination % | 0-1 |

#### Scoring Breakdown

**Maximum Points:** 170 total (normalized to 0-100%)

| Component | Max Points | Depends On |
|-----------|------------|------------|
| Bio-bands (chlorophyll + oxygen + salinity) | 30 | Environmental data |
| Temperature | 40 | temp_opt_c, temp_weight |
| Substrate | 25 | substrate_type parameter |
| Depth | 20 | depth_meters parameter |
| Light | 15 | Time of day, light_weight |
| Habitat bonus | 10 | substrate + depth combination |
| Lunar | 15 | Moon phase, lunar_weight |
| Weather | 10 | Wind + pressure, weights |
| Freshness | 15 | How recent the data is |
| Completeness | 10 | How complete the data is |

#### Deployment Location
**File:** `supabase/migrations/20251018009_update_enhanced_with_biogeographic_temp_scoring.sql`

**Key Features:**
- ✅ Biogeographic filtering (prevents Mediterranean fish in Atlantic)
- ✅ Temperature-based scoring with species weights
- ✅ 30-day data fallback window
- ✅ Handles NULL lat/lon gracefully
- ✅ Substrate/depth scoring with neutral defaults
- ✅ Weather scoring (wind + pressure)
- ✅ Lunar phase scoring

---

## 🔍 Common Failure Modes

### 1. "Could not find function" Error

**Symptom:**
```
Could not find the function public.get_environmental_predictions_enhanced
```

**Causes:**
- Function was dropped/deleted
- Wrong schema (public vs other)
- Function signature changed but API not updated

**Fix:**
```bash
# Re-run latest migration
cd /Users/damianrafferty/Projects/WotNow
npx supabase db push

# Verify function exists
npx tsx scripts/test-enhanced-with-without-gps.ts
```

**Prevention:**
- Always test after migrations
- Never manually DROP functions in production
- Use migrations for all schema changes

### 2. "Parameter Mismatch" Error

**Symptom:**
```
function get_environmental_predictions_enhanced(
  current_pressure_hpa, 
  target_date, 
  ...
) does not exist
```

**Causes:**
- API passing parameters in wrong order
- Parameter names don't match function signature
- Missing required parameters

**Fix:**
Check API code matches function signature:

```typescript
// pages/api/findr/predictions.ts (lines ~590-605)
const rpcParams = {
  target_rectangle: rectangleCode,      // Order matters!
  target_date: predictionDate,
  user_lat: userLat || null,
  user_lon: userLon || null,
  substrate_type: substrateData?.substrate || null,
  depth_meters: bathymetryData?.depth_meters || null,
  current_wind_speed_ms: currentWindSpeedMS,
  current_pressure_hpa: currentPressureHPA,
};
```

**Prevention:**
- Use named parameters (not positional)
- Add API integration tests
- Document parameter order changes

### 3. "No Predictions Returned" (Empty Array)

**Symptom:**
- RPC succeeds but returns `[]`
- No error message

**Causes:**
1. No environmental data for rectangle/date
2. Biogeographic filtering too aggressive
3. All species filtered out by region
4. Data window too narrow (< 30 days)

**Diagnosis:**
```sql
-- Check if rectangle has ANY data
SELECT 
  rectangle_code,
  COUNT(*) as records,
  MAX(captured_at) as latest
FROM findr_conditions_snapshots
WHERE rectangle_code = '21D8'  -- Replace with target
  AND captured_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY rectangle_code;

-- Check species count by region
SELECT 
  unnest(biogeographic_regions) as region,
  COUNT(*) as species_count
FROM species
WHERE biogeographic_regions IS NOT NULL
GROUP BY region
ORDER BY species_count DESC;

-- Check for species without regions (will appear everywhere)
SELECT COUNT(*) 
FROM species 
WHERE biogeographic_regions IS NULL;
```

**Fix Options:**

A. Extend data window (if data is older):
```sql
-- In RPC function, change:
WHERE DATE(captured_at) BETWEEN target_date - INTERVAL '30 days' AND target_date
-- To:
WHERE DATE(captured_at) BETWEEN target_date - INTERVAL '60 days' AND target_date
```

B. Add more species to region:
```sql
-- Example: Add Sea Bass to Celtic Sea
UPDATE species
SET biogeographic_regions = 
  array_append(biogeographic_regions, 'Celtic Sea')
WHERE name_en = 'Sea Bass'
  AND NOT ('Celtic Sea' = ANY(biogeographic_regions));
```

C. Fix region mapping in RPC:
```sql
-- Check rectangle_region normalization (line ~50 in RPC)
rectangle_region := CASE
  WHEN target_rectangle IN ('21D8', '21D9', ...) THEN 'Atlantic'
  WHEN target_rectangle LIKE '07%' THEN 'Mediterranean'
  ...
END;
```

### 4. "All Species Have Same Score"

**Symptom:**
- All predictions show identical confidence %
- No score differentiation

**Causes:**
- Temperature scoring not using species data
- Using wrong temp_opt_c format
- temp_weight not applied

**Diagnosis:**
```sql
-- Check species have temp data
SELECT 
  name_en,
  temp_opt_c,
  temp_weight,
  lunar_weight,
  wind_weight
FROM species
WHERE name_en IN ('Sea Bass', 'Bogue', 'Mackerel')
ORDER BY name_en;
```

**Expected:**
```
name_en     | temp_opt_c | temp_weight | lunar_weight
------------|------------|-------------|-------------
Bogue       | {16,24}    | 0.15        | 0.05
Mackerel    | {8,20}     | 0.35        | 0.05
Sea Bass    | {10,24}    | 0.25        | 0.10
```

**Fix:**
Ensure RPC uses array indexing:
```sql
-- CORRECT (in temperature_matches CTE)
WHEN be.env_temperature BETWEEN be.temp_opt_c[1] AND be.temp_opt_c[2]

-- WRONG
WHEN be.env_temperature BETWEEN split_part(be.temp_opt_c, ',', 1)
```

### 5. "Mediterranean Species in Atlantic"

**Symptom:**
- Bogue appears in 21D8 (Galician Coast)
- Region filtering not working

**Causes:**
- Species `biogeographic_regions` includes wrong regions
- Rectangle normalization maps to wrong region
- NULL regions (species appears everywhere)

**Diagnosis:**
```typescript
// Quick test
npx tsx scripts/test-5-regions-service.ts
```

**Fix:**
```sql
-- Check Bogue regions
SELECT name_en, biogeographic_regions 
FROM species 
WHERE name_en = 'Bogue';

-- Should be: {Mediterranean, IBI}
-- If wrong, fix with:
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean', 'IBI']
WHERE name_en = 'Bogue';
```

**Prevention:**
- Use migration 20251018010 as template
- Test each region after changes
- Document species native ranges

---

## 🚀 Quick Recovery Procedures

### Emergency Restore (Function Completely Broken)

**Step 1: Re-deploy latest working migration**
```bash
cd /Users/damianrafferty/Projects/WotNow
npx supabase db push
```

**Step 2: Verify deployment**
```bash
npx tsx scripts/test-enhanced-with-without-gps.ts
```

**Step 3: If still broken, check migrations order**
```bash
ls -la supabase/migrations/20251018*.sql
```

Expected order:
```
20251018001_add_biogeographic_filtering.sql
20251018002_populate_all_species_regions.sql
20251018003_boost_temp_weight_migratory.sql
20251018005_extend_data_fallback_period.sql
20251018006_fix_region_matching.sql
20251018007_use_actual_temp_fields.sql (FAILED - skip)
20251018008_fix_temp_array_parsing.sql
20251018009_update_enhanced_with_biogeographic_temp_scoring.sql
20251018010_fix_mediterranean_species_regions.sql
```

**Step 4: If migrations corrupted, restore from git**
```bash
git checkout main -- supabase/migrations/20251018009*.sql
npx supabase db reset --linked  # CAUTION: Destroys all data
```

### Quick Parameter Fix

If API parameters don't match function:

```typescript
// pages/api/findr/predictions.ts
// Find line ~590, ensure this exact structure:

const rpcFunctionName = 'get_environmental_predictions_enhanced';

const rpcParams = {
  target_rectangle: rectangleCode,
  target_date: predictionDate,
  user_lat: userLat || null,
  user_lon: userLon || null,
  substrate_type: substrateData?.substrate || null,
  depth_meters: bathymetryData?.depth_meters || null,
  current_wind_speed_ms: currentWindSpeedMS,
  current_pressure_hpa: currentPressureHPA,
};

const { data, error } = await supabase.rpc(rpcFunctionName, rpcParams);
```

### Quick Data Fix

If no environmental data:

```sql
-- Check data ingestion jobs are running
SELECT 
  COUNT(*) as records_today,
  MAX(captured_at) as latest_capture
FROM findr_conditions_snapshots
WHERE captured_at >= CURRENT_DATE;

-- If zero, check Copernicus ingestion scripts
```

---

## 📂 File Locations

### API Code
- **Main API:** `pages/api/findr/predictions.ts` (lines 580-650)
- **RPC call:** Line ~605
- **Parameter construction:** Lines 590-603

### Migrations (in order)
```
supabase/migrations/
├── 20251018001_add_biogeographic_filtering.sql
├── 20251018002_populate_all_species_regions.sql
├── 20251018003_boost_temp_weight_migratory.sql
├── 20251018005_extend_data_fallback_period.sql
├── 20251018006_fix_region_matching.sql
├── 20251018008_fix_temp_array_parsing.sql (Basic RPC - deprecated)
├── 20251018009_update_enhanced_with_biogeographic_temp_scoring.sql (PRODUCTION)
└── 20251018010_fix_mediterranean_species_regions.sql
```

### Test Scripts
```
scripts/
├── test-enhanced-with-without-gps.ts        # Test GPS/no-GPS modes
├── test-5-regions-service.ts                # Test regional filtering
├── check-species-regions.ts                 # Check biogeographic data
└── test-biogeographic-regions.ts            # Regional validation
```

### Documentation
```
DEPLOYMENT_20251018_UNIFIED_RPC.md           # Latest deployment
DEPLOYMENT_20251018_BIOGEOGRAPHIC_SCORING.md # Biogeographic filtering
RPC_TROUBLESHOOTING_GUIDE.md                 # This file
```

---

## 🧪 Testing Procedures

### Before Deploying Changes

```bash
# 1. Test enhanced RPC with both GPS modes
npx tsx scripts/test-enhanced-with-without-gps.ts

# 2. Test regional filtering
npx tsx scripts/test-5-regions-service.ts

# 3. Check species regions are correct
npx tsx scripts/check-species-regions.ts

# 4. Verify no TypeScript errors
npm run type-check

# 5. Test API locally
npm run dev
# Then visit: http://localhost:3000/api/findr/predictions?rectangleCode=21D8&predictionDate=2025-10-18
```

### After Deploying to Production

```bash
# 1. Check Vercel deployment logs
# Look for: "RPC response via client"

# 2. Test live API
curl "https://fishfindr.eu/api/findr/predictions?rectangleCode=21D8&predictionDate=2025-10-18"

# 3. Monitor error rates
# Check Vercel dashboard for 500 errors

# 4. Verify predictions on frontend
# Visit: https://fishfindr.eu/findr
# Select rectangle 21D8
# Expect: 50-60 predictions
```

---

## 📞 Contact & Escalation

### When to Escalate

- RPC completely broken (no predictions)
- Data corruption detected
- Migration rollback needed
- Production downtime > 5 minutes

### Recovery Time Objectives

- **RPC function missing:** 5 minutes (re-run migration)
- **Parameter mismatch:** 10 minutes (update API, deploy)
- **Data missing:** 30 minutes (re-run ingestion)
- **Full database restore:** 2 hours (from backup)

---

## 📝 Change Log

| Date | Change | Migration | Impact |
|------|--------|-----------|--------|
| 2025-10-18 | Unified RPC (always use enhanced) | API change | Fixed 90% of users |
| 2025-10-18 | Fixed Mediterranean species regions | 20251018010 | Fixed Bogue in Atlantic |
| 2025-10-18 | Added biogeographic filtering to enhanced | 20251018009 | Regional filtering |
| 2025-10-18 | Fixed temp_opt_c array parsing | 20251018008 | Score differentiation |
| 2025-10-18 | Extended data window to 30 days | 20251018005 | More predictions |

---

## ✅ Health Check Queries

Run these to verify system health:

```sql
-- 1. RPC functions exist
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname LIKE '%environmental_predictions%';
-- Expect: get_environmental_predictions_enhanced (8 params)

-- 2. Recent environmental data
SELECT COUNT(*), MAX(captured_at) 
FROM findr_conditions_snapshots 
WHERE captured_at >= CURRENT_DATE - INTERVAL '7 days';
-- Expect: > 1000 records, latest within 24 hours

-- 3. Species have biogeographic regions
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE biogeographic_regions IS NOT NULL) as with_regions
FROM species;
-- Expect: with_regions close to total

-- 4. Mediterranean species NOT in Atlantic
SELECT name_en, biogeographic_regions 
FROM species 
WHERE name_en = 'Bogue';
-- Expect: {Mediterranean, IBI} only

-- 5. Temperature data populated
SELECT 
  COUNT(*) FILTER (WHERE temp_opt_c IS NOT NULL) as with_temp,
  COUNT(*) FILTER (WHERE temp_weight IS NOT NULL) as with_weight
FROM species;
-- Expect: Most species have both
```

---

**Status:** ✅ **ACTIVE GUIDE**  
**Last Tested:** 2025-10-18  
**Next Review:** When RPC issues occur or major changes deployed
