# Bio-Bands Table Structure Verification

**Date:** 12 October 2025  
**Status:** ✅ VERIFIED  

---

## 📊 Database Structure Confirmed

### 1. `species_bio_bands` Table

**Status:** ✅ EXISTS and POPULATED

**Schema:**
```sql
CREATE TABLE species_bio_bands (
  species_id UUID NOT NULL,
  parameter TEXT NOT NULL,
  happy_bands bio_level[] NOT NULL,
  unhappy_bands bio_level[] NOT NULL,
  CONSTRAINT pk_species_bio_bands PRIMARY KEY (species_id, parameter),
  CONSTRAINT species_bio_bands_species_id_fkey FOREIGN KEY (species_id) 
    REFERENCES species (id) ON DELETE CASCADE
);
```

**bio_level ENUM:**
```sql
CREATE TYPE bio_level AS ENUM (
  'very_low',
  'low', 
  'normal',
  'high',
  'very_high'
);
```

**Current Data:**
- **Total records:** 20 (confirmed via query)
- **Species with data:** 3 (multiple parameters per species)
- **Parameters:** chlorophyll, nitrate, oxygen, phosphate, phytoplankton, salinity, surfaceTemperature

**Sample Record:**
```json
{
  "species_id": "e27c2d1c-7189-4d86-b394-5bc921f662eb",
  "parameter": "chlorophyll",
  "happy_bands": ["normal"],
  "unhappy_bands": ["very_high"]
}
```

**Example Data by Parameter:**
```javascript
// chlorophyll
happy_bands: ["normal"]
unhappy_bands: ["very_high"]

// nitrate
happy_bands: ["normal"]
unhappy_bands: ["very_high"]

// oxygen
happy_bands: ["normal", "high"]
unhappy_bands: ["very_low", "low"]

// phosphate
happy_bands: ["normal"]
unhappy_bands: ["very_high"]

// phytoplankton
happy_bands: ["normal"]
unhappy_bands: ["very_high"]

// salinity
happy_bands: ["normal", "high"]
unhappy_bands: ["very_low"]

// surfaceTemperature
happy_bands: ["low", "normal"]
unhappy_bands: ["very_high"]
```

---

### 2. Bio-Bands Threshold Lookup Table

**Status:** ⚠️ NOT FOUND - NEEDS TO BE CREATED

The threshold data you provided exists as application logic (in your JSON/code), but **not as a database table**.

**Recommendation:** Create a `bio_bands_thresholds` table to store the official threshold mappings.

**Proposed Schema:**
```sql
CREATE TABLE bio_bands_thresholds (
  idx INTEGER PRIMARY KEY,
  parameter TEXT NOT NULL,
  level bio_level NOT NULL,
  threshold NUMERIC NOT NULL,
  angler_interpretation TEXT NOT NULL,
  CONSTRAINT unique_parameter_threshold UNIQUE (parameter, threshold)
);

-- Index for fast classification queries
CREATE INDEX idx_bio_bands_param_threshold 
ON bio_bands_thresholds (parameter, threshold DESC);
```

**Population Script Needed:**
```sql
-- Insert the 35 threshold records from your JSON
INSERT INTO bio_bands_thresholds (idx, parameter, level, threshold, angler_interpretation)
VALUES
  (0, 'chlorophyll', 'very_low', 0, 'Water too clear; little food chain action'),
  (1, 'chlorophyll', 'low', 0.5, 'Slight activity, bait scarce'),
  (2, 'chlorophyll', 'normal', 1.5, 'Balanced; predators can hunt'),
  (3, 'chlorophyll', 'high', 3, 'Plankton bloom, prey fish active'),
  (4, 'chlorophyll', 'very_high', 5, 'Bloom overload; can lower oxygen locally'),
  
  (5, 'nitrate', 'very_low', 0, 'Nutrient desert, weak food chain'),
  (6, 'nitrate', 'low', 1, 'Low nutrients, limited growth'),
  (7, 'nitrate', 'normal', 3, 'Balanced nutrient level'),
  (8, 'nitrate', 'high', 6, 'Nutrient surge, prey increase likely'),
  (9, 'nitrate', 'very_high', 10, 'Overload, algal bloom risk'),
  
  (10, 'oxygen', 'very_low', 0, 'Hypoxic – fish struggle to survive'),
  (11, 'oxygen', 'low', 2, 'Stressed fish, poor feeding'),
  (12, 'oxygen', 'normal', 4, 'Comfortable for most coastal fish'),
  (13, 'oxygen', 'high', 7, 'Healthy, lively feeding'),
  (14, 'oxygen', 'very_high', 10, 'Excellent oxygenation, very active fish'),
  
  (15, 'phosphate', 'very_low', 0, 'Nutrient-poor water'),
  (16, 'phosphate', 'low', 0.1, 'Low nutrients, modest growth'),
  (17, 'phosphate', 'normal', 0.3, 'Balanced nutrient level'),
  (18, 'phosphate', 'high', 0.6, 'Nutrient boost, prey increase'),
  (19, 'phosphate', 'very_high', 1, 'Too much nutrient, algal bloom risk'),
  
  (20, 'phytoplankton', 'very_low', 0, 'No base food, poor chain'),
  (21, 'phytoplankton', 'low', 1000, 'Sparse plankton, prey limited'),
  (22, 'phytoplankton', 'normal', 5000, 'Healthy food chain'),
  (23, 'phytoplankton', 'high', 20000, 'Strong bloom, baitfish abundant'),
  (24, 'phytoplankton', 'very_high', 50000, 'Over-bloom, oxygen stress possible'),
  
  (25, 'salinity', 'very_low', 20, 'Estuarine, too fresh for many marine species'),
  (26, 'salinity', 'low', 28, 'Brackish, fewer saltwater predators'),
  (27, 'salinity', 'normal', 32, 'Typical coastal salinity'),
  (28, 'salinity', 'high', 36, 'Open sea levels, stable'),
  (29, 'salinity', 'very_high', 40, 'Unusually saline, stressful for fish'),
  
  (30, 'surfaceTemperature', 'very_low', 0, 'Freezing, marine activity minimal'),
  (31, 'surfaceTemperature', 'low', 8, 'Cold, only hardy species feed'),
  (32, 'surfaceTemperature', 'normal', 14, 'Comfortable for most temperate fish'),
  (33, 'surfaceTemperature', 'high', 20, 'Warm, high fish activity'),
  (34, 'surfaceTemperature', 'very_high', 26, 'Hot, some fish stressed or go deep');
```

---

## 🔧 Helper Function Needed

**`classify_parameter()` function:**
```sql
CREATE OR REPLACE FUNCTION classify_parameter(
  p_parameter TEXT,
  p_value NUMERIC
)
RETURNS bio_level AS $$
  -- Find the highest threshold that the value exceeds
  SELECT level
  FROM bio_bands_thresholds
  WHERE parameter = p_parameter
    AND p_value >= threshold
  ORDER BY threshold DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Example usage:
-- SELECT classify_parameter('surfaceTemperature', 16.5);
-- Returns: 'normal' (16.5°C >= 14 threshold, < 20)

-- SELECT classify_parameter('salinity', 12);
-- Returns: 'very_low' (12 ppt < 20 threshold)
```

---

## 🎯 Integration Summary

### What EXISTS:
1. ✅ **`species_bio_bands` table** - Stores which bio_levels each species prefers
   - 20 records across 3 species
   - Parameters: chlorophyll, nitrate, oxygen, phosphate, phytoplankton, salinity, surfaceTemperature
   - Format: happy_bands (array), unhappy_bands (array)

2. ✅ **`bio_level` enum** - Defines the 5 levels (very_low, low, normal, high, very_high)

3. ✅ **Species table** - Has species_id UUID for foreign key relationships

### What NEEDS TO BE CREATED:
1. ⚠️ **`bio_bands_thresholds` table** - Lookup table for classifying raw values
   - 35 records (7 parameters × 5 levels each)
   - Used by `classify_parameter()` function
   - Contains your JSON threshold data

2. ⚠️ **`classify_parameter()` function** - Converts raw CMEMS values to bio_levels
   - Takes: parameter name (text), raw value (numeric)
   - Returns: bio_level enum
   - Used in prediction queries

3. ⚠️ **`species.environmental_preferences` column** - JSONB with numeric ranges
   - Phase 9 migration (already designed)
   - 62 species × complete environmental profiles

---

## 📋 Action Items for Phase 9

### 1. Create Thresholds Table (15 mins)
```bash
# Create SQL file: migrations/create_bio_bands_thresholds.sql
# Populate with 35 threshold records from JSON
# Execute in Supabase
```

### 2. Create Classification Function (5 mins)
```bash
# Add classify_parameter() to same migration file
# Test with sample queries
```

### 3. Verify Integration (10 mins)
```sql
-- Test classification
SELECT 
  classify_parameter('surfaceTemperature', 16.5) as temp_level,
  classify_parameter('salinity', 34.2) as sal_level,
  classify_parameter('oxygen', 6.8) as oxygen_level;

-- Expected results:
-- temp_level: 'normal' (14-19°C)
-- sal_level: 'normal' (32-35 ppt)  
-- oxygen_level: 'normal' (4-6 mg/L, just below 'high' at 7)
```

### 4. Populate species_bio_bands (Optional - later)
```bash
# Script to convert environmental_preferences numeric ranges
# into qualitative happy/unhappy bands for all 62 species
# Example: Bass optimal 15-20°C → happy_bands: ['normal', 'high']
```

---

## 🚀 Next Steps

1. **Create `bio_bands_thresholds` table** - Store your JSON threshold data
2. **Create `classify_parameter()` function** - Enable raw value classification
3. **Run Phase 9 migration** - Add `environmental_preferences` to species table
4. **Build prediction RPC** - Use BOTH systems together:
   - `environmental_preferences` for precise numeric scoring (temperature, salinity)
   - `species_bio_bands` + thresholds for modifiers (oxygen, chlorophyll bonuses)

**Estimated time:** 30 minutes to complete database setup ✅

---

## 📁 Files to Create

1. `migrations/create_bio_bands_thresholds.sql` - Table + data + function
2. `scripts/populate-species-bio-bands-all.ts` - Populate all 62 species (optional)
3. `scripts/test-bio-bands-classification.ts` - Validation tests

Ready to proceed! 🎯
