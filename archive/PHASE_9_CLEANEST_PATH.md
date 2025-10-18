# Phase 9 Migration - Cleanest Path Forward

**Date:** 12 October 2025  
**Goal:** Get environmental predictions working in production  
**Timeline:** 2-3 hours to working system

---

## 🎯 Current State Assessment

### ✅ What You HAVE (Ready to Deploy):

1. **Environmental Data - COMPLETE ✅**
   - File: `ENVIRONMENTAL_DATA_COMPLETE.json`
   - Coverage: 62 species, 100% complete
   - Data: temperature, salinity, depth, substrate for all species
   - Quality: High (FishBase + OBIS + manual curation)

2. **Bio-Bands Thresholds - SQL READY ✅**
   - File: `migrations/create_bio_bands_thresholds.sql`
   - Data: 35 threshold records (7 parameters × 5 levels)
   - Function: `classify_parameter()` ready to deploy
   - Tested: Manual tests passed 7/7 edge cases

3. **Species Bio-Bands - PARTIALLY IN DATABASE ⚠️**
   - Database: 210 records (30 species × 7 parameters)
   - JSON Export: 300+ records (30+ species)
   - Issue: Discrepancy between DB and your export data

4. **Environmental Preferences Migration - SQL READY ✅**
   - File: `migrations/add_environmental_preferences.sql`
   - Schema: JSONB column with indexes
   - Data source: `ENVIRONMENTAL_DATA_COMPLETE.json` (62 species)

### ⚠️ What's UNCLEAR:

**The Bio-Bands Data Discrepancy:**
- You have 300+ bio-bands records in JSON format (with scientific_name)
- Database has 210 records (with species_id UUIDs)
- Are these the same data or different versions?
- Do you need to import the JSON or is the DB current?

---

## 🛣️ Cleanest Path Forward (Two Options)

### Option A: Skip Bio-Bands for MVP (FASTEST - 2 hours)

**Rationale:** Bio-bands are **optional modifiers**. Environmental predictions work without them using just the precise numeric ranges.

**Steps:**
1. ✅ Deploy threshold table (15 mins)
2. ✅ Deploy environmental_preferences column (15 mins)
3. ✅ Populate 62 species environmental data (30 mins)
4. ✅ Build basic prediction RPC (60 mins)
5. ✅ Test and validate (15 mins)

**Result:** Working environmental predictions without bio-band bonuses

**Later:** Add bio-bands layer when you clarify the data source

---

### Option B: Full Three-Tier System (COMPLETE - 4 hours)

**Rationale:** Bio-bands make predictions more sophisticated with qualitative bonuses/penalties.

**Steps:**
1. ✅ Deploy threshold table (15 mins)
2. ⚠️ **CLARIFY BIO-BANDS DATA SOURCE** (30 mins)
   - Is your JSON the authoritative source?
   - Should we replace or merge with DB data?
   - Are there 30 or 62 species covered?
3. ✅ Import/update bio-bands data (45 mins)
4. ✅ Deploy environmental_preferences column (15 mins)
5. ✅ Populate 62 species environmental data (30 mins)
6. ✅ Build full prediction RPC with bio-band modifiers (90 mins)
7. ✅ Test and validate (30 mins)

**Result:** Complete three-tier prediction system

---

## 🎬 RECOMMENDED: Option A (MVP First)

**Why Skip Bio-Bands for Now?**

1. **Environmental_preferences alone is powerful:**
   ```typescript
   // This works great on its own:
   score = 
     calculateTempScore(16.5, {optimal_min: 15, optimal_max: 20}) * 0.35 +
     calculateSalinityScore(34.2, {optimal_min: 32, optimal_max: 35}) * 0.25 +
     calculateDepthScore(15, {typical_min: 1, typical_max: 50}) * 0.20 +
     calculateSubstrateScore('rock', ['rock', 'kelp']) * 0.20;
   // = 0.87 (very good prediction without bio-bands!)
   ```

2. **Bio-bands data needs clarification:**
   - 210 DB records vs. 300+ JSON records
   - Which is authoritative?
   - Do you have all 62 species or just 30?

3. **You can add bio-bands later:**
   - They're modifiers (1.0-1.15× bonuses)
   - Predictions work without them
   - Can be added incrementally without breaking anything

4. **Faster to production:**
   - 2 hours vs. 4 hours
   - Less risk of data conflicts
   - Clear path forward

---

## 📋 Step-by-Step: Option A (MVP)

### Phase 9A: Database Setup (30 mins)

**Step 1: Create Thresholds Table (10 mins)**
```sql
-- In Supabase SQL Editor
-- Copy/paste: migrations/create_bio_bands_thresholds.sql
-- Creates: bio_bands_thresholds table + classify_parameter() function
```

**Validation:**
```sql
SELECT COUNT(*) FROM bio_bands_thresholds;
-- Expected: 35

SELECT classify_parameter('surfaceTemperature', 16.5);
-- Expected: 'normal'
```

**Step 2: Add Environmental Preferences Column (10 mins)**
```sql
-- In Supabase SQL Editor
-- Copy/paste: migrations/add_environmental_preferences.sql
-- Creates: environmental_preferences JSONB column + indexes
```

**Validation:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='species' AND column_name='environmental_preferences';
-- Expected: environmental_preferences
```

**Step 3: Create Data Migration Script (10 mins)**
```bash
# Create: scripts/populate-environmental-preferences.ts
# Reads: ENVIRONMENTAL_DATA_COMPLETE.json
# Writes: species.environmental_preferences for 62 species
```

---

### Phase 9B: Data Population (30 mins)

**Step 4: Populate Environmental Data**
```bash
npx tsx scripts/populate-environmental-preferences.ts
```

**Validation:**
```sql
-- Check all 62 species populated
SELECT COUNT(*) FROM species 
WHERE environmental_preferences IS NOT NULL;
-- Expected: 62

-- Test specific species (Bass)
SELECT name_en, 
  environmental_preferences->'temperature'->>'optimal_min' as temp_min,
  environmental_preferences->'temperature'->>'optimal_max' as temp_max
FROM species 
WHERE species_code = 'bss';
-- Expected: European Bass, 15, 20
```

---

### Phase 9C: Prediction RPC (60 mins)

**Step 5: Build Basic Environmental Predictions**

Create: `supabase/functions/get_environmental_predictions_v1.sql`

```sql
CREATE OR REPLACE FUNCTION get_environmental_predictions_v1(
  p_rectangle_code TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  species_code TEXT,
  species_name TEXT,
  environmental_score NUMERIC,
  confidence TEXT,
  factors JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH rectangle_conditions AS (
    -- Get CMEMS data for rectangle
    SELECT 
      avg_temp,
      avg_salinity,
      substrate_type
    FROM cmems_daily_summary
    WHERE rectangle_code = p_rectangle_code
    AND date = p_date
  ),
  species_scores AS (
    SELECT 
      s.species_code,
      s.name_en,
      -- Temperature score (0-1)
      CASE 
        WHEN rc.avg_temp BETWEEN 
          (s.environmental_preferences->'temperature'->>'optimal_min')::numeric AND
          (s.environmental_preferences->'temperature'->>'optimal_max')::numeric
        THEN 1.0
        WHEN rc.avg_temp BETWEEN
          (s.environmental_preferences->'temperature'->>'tolerance_min')::numeric AND
          (s.environmental_preferences->'temperature'->>'tolerance_max')::numeric
        THEN 0.6
        ELSE 0.2
      END * 0.35 AS temp_score,
      
      -- Salinity score (0-1)
      CASE 
        WHEN rc.avg_salinity BETWEEN
          (s.environmental_preferences->'salinity'->>'optimal_min')::numeric AND
          (s.environmental_preferences->'salinity'->>'optimal_max')::numeric
        THEN 1.0
        WHEN rc.avg_salinity BETWEEN
          (s.environmental_preferences->'salinity'->>'tolerance_min')::numeric AND
          (s.environmental_preferences->'salinity'->>'tolerance_max')::numeric
        THEN 0.6
        ELSE 0.2
      END * 0.25 AS sal_score,
      
      -- Substrate match (0-1)
      CASE 
        WHEN s.environmental_preferences->'substrate'->'preferred' @> 
          to_jsonb(ARRAY[rc.substrate_type])
        THEN 1.0
        WHEN s.environmental_preferences->'substrate'->'acceptable' @> 
          to_jsonb(ARRAY[rc.substrate_type])
        THEN 0.7
        ELSE 0.3
      END * 0.40 AS substrate_score
      
    FROM species s
    CROSS JOIN rectangle_conditions rc
    WHERE s.environmental_preferences IS NOT NULL
  )
  SELECT 
    ss.species_code,
    ss.name_en,
    (ss.temp_score + ss.sal_score + ss.substrate_score) * 10 AS environmental_score,
    CASE 
      WHEN (ss.temp_score + ss.sal_score + ss.substrate_score) > 0.8 THEN 'high'
      WHEN (ss.temp_score + ss.sal_score + ss.substrate_score) > 0.6 THEN 'medium'
      ELSE 'low'
    END AS confidence,
    jsonb_build_object(
      'temperature_score', ss.temp_score,
      'salinity_score', ss.sal_score,
      'substrate_score', ss.substrate_score
    ) AS factors
  FROM species_scores ss
  ORDER BY environmental_score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
```

---

### Phase 9D: Testing (15 mins)

**Step 6: Validate Predictions**

```sql
-- Test Cornwall summer (should favor Bass, Wrasse)
SELECT * FROM get_environmental_predictions_v1('31F1', '2024-07-15');

-- Test North Sea winter (should favor Cod, Whiting)
SELECT * FROM get_environmental_predictions_v1('38E9', '2024-01-15');

-- Test Baltic (should favor euryhaline species)
SELECT * FROM get_environmental_predictions_v1('39G5', '2024-05-15');
```

**Expected Results:**
- Summer Cornwall: Bass, Pollock, Wrasse high scores
- Winter North Sea: Cod, Haddock, Whiting high scores
- Baltic: Flounder, Herring high scores

---

## 🎯 After MVP: Adding Bio-Bands (Phase 10)

Once MVP is working, circle back to bio-bands:

1. **Clarify your bio-bands data:**
   - Is the 300+ JSON record set authoritative?
   - Should we import it fresh or merge with DB?

2. **Update RPC to include bio-band modifiers:**
   ```sql
   -- Add oxygen/chlorophyll bonuses
   final_score = base_score * 
     (CASE WHEN classify_parameter('oxygen', rc.avg_oxygen) IN 
       (SELECT unnest(happy_bands) FROM species_bio_bands 
        WHERE species_id = s.id AND parameter = 'oxygen')
      THEN 1.1 ELSE 1.0 END);
   ```

3. **Test hybrid scoring:**
   - Validate bonuses applied correctly
   - Ensure unhappy bands penalize appropriately

---

## ✅ Summary: Cleanest Path

**Immediate (Today - 2 hours):**
1. Deploy thresholds table ✅
2. Deploy environmental_preferences column ✅
3. Populate 62 species data ✅
4. Build basic prediction RPC ✅
5. Test and validate ✅

**Result:** Working environmental predictions in production!

**Next Week (Phase 10 - 2 hours):**
1. Clarify bio-bands data source
2. Import/update bio-bands
3. Add bio-band modifiers to RPC
4. Test hybrid scoring
5. Deploy enhanced predictions

**Benefits:**
- ✅ Fastest to production
- ✅ No data conflicts
- ✅ Incrementally improves
- ✅ Clear validation at each step
- ✅ Can launch with MVP, enhance later

---

## 🚦 Decision Point

**Choose your path:**

- **Option A (Recommended):** MVP with environmental_preferences only → 2 hours
- **Option B:** Full system with bio-bands → Need to clarify data source first

**My recommendation:** Go with Option A. Get working predictions in production today, then add bio-bands refinements next week once data source is clarified.

What do you think? Ready to execute Option A? 🚀
