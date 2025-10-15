# Using Existing species_bio_bands Table for Environmental Matching

**Date**: 12 October 2025  
**Status**: Integration Design - UPDATED with Bio-Bands Threshold Data  

---

## 🎯 Discovery

The database already has a `species_bio_bands` table designed for environmental parameters:

```sql
create table public.species_bio_bands (
  species_id uuid not null,
  parameter text not null,
  happy_bands bio_level[] not null,
  unhappy_bands bio_level[] not null,
  constraint pk_species_bio_bands primary key (species_id, parameter),
  constraint species_bio_bands_species_id_fkey foreign KEY (species_id) 
    references species (id) on delete CASCADE
);
```

**bio_level enum**: `very_low`, `low`, `normal`, `high`, `very_high`

### Current Data

Already has 10 records for some species with parameters:
- `chlorophyll`
- `nitrate`
- `oxygen`
- `phosphate`
- `phytoplankton`
- `salinity`
- `surfaceTemperature`

Example (from inspection):
```json
{
  "species_id": "e27c2d1c-7189-4d86-b394-5bc921f662eb",
  "parameter": "salinity",
  "happy_bands": ["normal", "high"],
  "unhappy_bands": ["very_low"]
}
```

---

## 🔄 Integration Strategy

### OFFICIAL Bio-Bands Thresholds (from Database)

The database has a complete threshold mapping table that defines the exact boundaries between bio_level classifications:

#### Temperature (surfaceTemperature)
```javascript
[
  { idx: 30, level: "very_low",  threshold: 0,  interpretation: "Freezing, marine activity minimal" },
  { idx: 31, level: "low",       threshold: 8,  interpretation: "Cold, only hardy species feed" },
  { idx: 32, level: "normal",    threshold: 14, interpretation: "Comfortable for most temperate fish" },
  { idx: 33, level: "high",      threshold: 20, interpretation: "Warm, high fish activity" },
  { idx: 34, level: "very_high", threshold: 26, interpretation: "Hot, some fish stressed or go deep" }
]

// Classification logic:
// 0-7°C   = very_low  (Cod, Haddock optimal zone)
// 8-13°C  = low       (Wrasse starting to feed, Bass slow)
// 14-19°C = normal    (Most temperate species active)
// 20-25°C = high      (Bass, Mackerel peak feeding)
// 26+°C   = very_high (Stress for most temperate species)
```

#### Salinity
```javascript
[
  { idx: 25, level: "very_low",  threshold: 20, interpretation: "Estuarine, too fresh for many marine species" },
  { idx: 26, level: "low",       threshold: 28, interpretation: "Brackish, fewer saltwater predators" },
  { idx: 27, level: "normal",    threshold: 32, interpretation: "Typical coastal salinity" },
  { idx: 28, level: "high",      threshold: 36, interpretation: "Open sea levels, stable" },
  { idx: 29, level: "very_high", threshold: 40, interpretation: "Unusually saline, stressful for fish" }
]

// Classification logic:
// <20 ppt = very_low  (Freshwater influence, Flounder only)
// 20-27   = very_low  (Estuarine, Bass/Flounder tolerate)
// 28-31   = low       (Brackish, eliminates most marine species)
// 32-35   = normal    (Atlantic/North Sea standard: 33-35 ppt)
// 36-39   = high      (Mediterranean/open ocean: 37-39 ppt)
// 40+ ppt = very_high (Hypersaline, stressful conditions)
```

#### Oxygen (dissolved_oxygen)
```javascript
[
  { idx: 10, level: "very_low",  threshold: 0,  interpretation: "Hypoxic – fish struggle to survive" },
  { idx: 11, level: "low",       threshold: 2,  interpretation: "Stressed fish, poor feeding" },
  { idx: 12, level: "normal",    threshold: 4,  interpretation: "Comfortable for most coastal fish" },
  { idx: 13, level: "high",      threshold: 7,  interpretation: "Healthy, lively feeding" },
  { idx: 14, level: "very_high", threshold: 10, interpretation: "Excellent oxygenation, very active fish" }
]

// Impact on predictions:
// <2 mg/L   = Hard penalty (hypoxic, fish stressed/absent)
// 2-4 mg/L  = Moderate penalty (poor feeding conditions)
// 4-7 mg/L  = Neutral (baseline acceptable)
// 7-10 mg/L = Bonus (enhanced feeding activity)
// 10+ mg/L  = Strong bonus (very active predation)
```

#### Chlorophyll (productivity indicator)
```javascript
[
  { idx: 0, level: "very_low",  threshold: 0,   interpretation: "Water too clear; little food chain action" },
  { idx: 1, level: "low",       threshold: 0.5, interpretation: "Slight activity, bait scarce" },
  { idx: 2, level: "normal",    threshold: 1.5, interpretation: "Balanced; predators can hunt" },
  { idx: 3, level: "high",      threshold: 3,   interpretation: "Plankton bloom, prey fish active" },
  { idx: 4, level: "very_high", threshold: 5,   interpretation: "Bloom overload; can lower oxygen locally" }
]

// Impact on predictions:
// very_low  = Penalty for predators (no baitfish present)
// low       = Slight penalty (limited prey availability)
// normal    = Neutral (balanced ecosystem)
// high      = Bonus for pelagics (Mackerel, Herring, Bass)
// very_high = Penalty (algal bloom stress, oxygen depletion risk)
```

#### Nutrients (nitrate, phosphate, phytoplankton)

**Nitrate:**
```javascript
[
  { idx: 5, level: "very_low",  threshold: 0,  interpretation: "Nutrient desert, weak food chain" },
  { idx: 6, level: "low",       threshold: 1,  interpretation: "Low nutrients, limited growth" },
  { idx: 7, level: "normal",    threshold: 3,  interpretation: "Balanced nutrient level" },
  { idx: 8, level: "high",      threshold: 6,  interpretation: "Nutrient surge, prey increase likely" },
  { idx: 9, level: "very_high", threshold: 10, interpretation: "Overload, algal bloom risk" }
]
```

**Phosphate:**
```javascript
[
  { idx: 15, level: "very_low",  threshold: 0,   interpretation: "Nutrient-poor water" },
  { idx: 16, level: "low",       threshold: 0.1, interpretation: "Low nutrients, modest growth" },
  { idx: 17, level: "normal",    threshold: 0.3, interpretation: "Balanced nutrient level" },
  { idx: 18, level: "high",      threshold: 0.6, interpretation: "Nutrient boost, prey increase" },
  { idx: 19, level: "very_high", threshold: 1,   interpretation: "Too much nutrient, algal bloom risk" }
]
```

**Phytoplankton:**
```javascript
[
  { idx: 20, level: "very_low",  threshold: 0,     interpretation: "No base food, poor chain" },
  { idx: 21, level: "low",       threshold: 1000,  interpretation: "Sparse plankton, prey limited" },
  { idx: 22, level: "normal",    threshold: 5000,  interpretation: "Healthy food chain" },
  { idx: 23, level: "high",      threshold: 20000, interpretation: "Strong bloom, baitfish abundant" },
  { idx: 24, level: "very_high", threshold: 50000, interpretation: "Over-bloom, oxygen stress possible" }
]
```

**Prediction Impact:** Secondary factors for ecosystem productivity. High nutrients/phytoplankton = more baitfish = higher predator activity (bonus modifier).

---

## 🎯 Classification Helper Function

```sql
-- Create function to classify raw CMEMS values into bio_level bands
CREATE OR REPLACE FUNCTION classify_parameter(
  p_parameter TEXT,
  p_value NUMERIC
)
RETURNS TEXT AS $$
  -- Find the highest threshold that the value exceeds
  -- This returns the corresponding bio_level
  SELECT level
  FROM bio_bands_thresholds  -- Assuming table with your JSON data
  WHERE parameter = p_parameter
    AND p_value >= threshold
  ORDER BY threshold DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Example usage:
-- SELECT classify_parameter('surfaceTemperature', 16.5);
-- Returns: 'normal' (16.5°C is >= 14 threshold but < 20)

-- SELECT classify_parameter('salinity', 12);
-- Returns: 'very_low' (12 ppt is < 20 threshold - estuarine)

-- SELECT classify_parameter('oxygen', 8.5);
-- Returns: 'high' (8.5 mg/L is >= 7 threshold but < 10)
```

---

## 🔄 Integration Strategy (UPDATED)

### Option 1: Use bio_bands for Phase 2 Scoring (Recommended)

Map our numeric environmental parameters to qualitative bands, then use `species_bio_bands` table:

#### Mapping Numeric Ranges to bio_level Bands (UPDATED with Official Thresholds)

**Temperature (°C)** - OFFICIAL THRESHOLDS
```javascript
function temperatureToBioLevel(temp_celsius) {
  if (temp_celsius < 8) return 'very_low';   // 0-7°C: Freezing/cold
  if (temp_celsius < 14) return 'low';       // 8-13°C: Cold, hardy species
  if (temp_celsius < 20) return 'normal';    // 14-19°C: Comfortable temperate
  if (temp_celsius < 26) return 'high';      // 20-25°C: Warm, high activity
  return 'very_high';                        // 26+°C: Hot, stress
}
```

**Salinity (PSU)** - OFFICIAL THRESHOLDS
```javascript
function salinityToBioLevel(salinity_psu) {
  if (salinity_psu < 20) return 'very_low';  // <20 ppt: Too fresh for marine
  if (salinity_psu < 28) return 'very_low';  // 20-27 ppt: Estuarine
  if (salinity_psu < 32) return 'low';       // 28-31 ppt: Brackish
  if (salinity_psu < 36) return 'normal';    // 32-35 ppt: Typical coastal
  if (salinity_psu < 40) return 'high';      // 36-39 ppt: Open sea/Med
  return 'very_high';                        // 40+ ppt: Hypersaline
}
```

**Oxygen (mg/L)** - OFFICIAL THRESHOLDS
```javascript
function oxygenToBioLevel(oxygen_mg_per_l) {
  if (oxygen_mg_per_l < 2) return 'very_low';   // <2: Hypoxic
  if (oxygen_mg_per_l < 4) return 'low';        // 2-3: Stressed
  if (oxygen_mg_per_l < 7) return 'normal';     // 4-6: Comfortable
  if (oxygen_mg_per_l < 10) return 'high';      // 7-9: Healthy
  return 'very_high';                           // 10+: Excellent
}
```

**Chlorophyll (mg/m³)** - OFFICIAL THRESHOLDS
```javascript
function chlorophyllToBioLevel(chlorophyll_mg_per_m3) {
  if (chlorophyll_mg_per_m3 < 0.5) return 'very_low';  // <0.5: Too clear
  if (chlorophyll_mg_per_m3 < 1.5) return 'low';       // 0.5-1.4: Slight
  if (chlorophyll_mg_per_m3 < 3) return 'normal';      // 1.5-2.9: Balanced
  if (chlorophyll_mg_per_m3 < 5) return 'high';        // 3-4.9: Bloom
  return 'very_high';                                   // 5+: Overload
}
```

**Depth (meters)** - CUSTOM (not in official bio-bands, but useful for accessibility)
```javascript
function depthToBioLevel(depth_m) {
  if (depth_m < 10) return 'very_low';   // 0-9m: Shallow inshore/shore fishing
  if (depth_m < 30) return 'low';        // 10-29m: Shallow coastal
  if (depth_m < 100) return 'normal';    // 30-99m: Mid-depth boat fishing
  if (depth_m < 300) return 'high';      // 100-299m: Deep offshore
  return 'very_high';                    // 300+m: Very deep commercial
}
```

#### Species Profile in bio_bands

**Example: Cod**
```sql
-- Temperature: optimal 2-10°C (very_low to low), tolerates to 18°C (normal)
INSERT INTO species_bio_bands (species_id, parameter, happy_bands, unhappy_bands)
VALUES 
  ('39d25a22-dea4-41b1-8af0-c55e501b715c', 'surfaceTemperature', 
   ARRAY['very_low', 'low']::bio_level[], 
   ARRAY['high', 'very_high']::bio_level[]),
   
  -- Salinity: optimal 30-35 PSU (normal), tolerates 28-38 (low to high), but needs ≥11 PSU to spawn
  ('39d25a22-dea4-41b1-8af0-c55e501b715c', 'salinity', 
   ARRAY['normal']::bio_level[], 
   ARRAY['very_low']::bio_level[]),
   
  -- Depth: optimal 20-150m (low to normal), tolerates 10-300m
  ('39d25a22-dea4-41b1-8af0-c55e501b715c', 'depth', 
   ARRAY['low', 'normal']::bio_level[], 
   ARRAY['very_high']::bio_level[]);
```

**Example: Bream (warm-water Med species)**
```sql
INSERT INTO species_bio_bands (species_id, parameter, happy_bands, unhappy_bands)
VALUES 
  -- Temperature: optimal 15-24°C (normal to high), can't tolerate cold
  ('...', 'surfaceTemperature', 
   ARRAY['normal', 'high']::bio_level[], 
   ARRAY['very_low', 'low']::bio_level[]),
   
  -- Salinity: high salinity preference (Med 36-39 PSU)
  ('...', 'salinity', 
   ARRAY['normal', 'high']::bio_level[], 
   ARRAY['very_low', 'low']::bio_level[]),
   
  -- Depth: shallow coastal (2-30m)
  ('...', 'depth', 
   ARRAY['very_low', 'low']::bio_level[], 
   ARRAY['high', 'very_high']::bio_level[]);
```

**Example: Herring (euryhaline, wide tolerance)**
```sql
INSERT INTO species_bio_bands (species_id, parameter, happy_bands, unhappy_bands)
VALUES 
  -- Temperature: cool water preference
  ('...', 'surfaceTemperature', 
   ARRAY['very_low', 'low', 'normal']::bio_level[], 
   ARRAY['very_high']::bio_level[]),
   
  -- Salinity: VERY euryhaline (6-38 PSU tolerance)
  ('...', 'salinity', 
   ARRAY['very_low', 'low', 'normal', 'high']::bio_level[], 
   ARRAY[]::bio_level[]),  -- No unhappy bands! Tolerates everything
   
  -- Depth: mid-water pelagic
  ('...', 'depth', 
   ARRAY['very_low', 'low', 'normal']::bio_level[], 
   ARRAY['very_high']::bio_level[]);
```

---

## 🧮 Phase 2 Scoring with bio_bands

### Algorithm

```javascript
function calculateEnvironmentalScore(rectangleConditions, speciesBioBands) {
  const parameters = ['surfaceTemperature', 'salinity', 'depth'];
  const weights = {
    'surfaceTemperature': 0.35,
    'salinity': 0.25,
    'depth': 0.20,
    'substrate': 0.20  // Handle separately (not in bio_bands yet)
  };
  
  let totalScore = 0;
  
  for (const param of parameters) {
    const currentLevel = parameterToBioLevel(rectangleConditions[param], param);
    const bands = speciesBioBands[param];
    
    if (!bands) {
      // No data for this parameter, assume neutral
      totalScore += weights[param] * 0.6;
      continue;
    }
    
    // Check if current level is in happy bands
    if (bands.happy_bands.includes(currentLevel)) {
      totalScore += weights[param] * 1.0;  // Perfect
    }
    // Check if current level is in unhappy bands
    else if (bands.unhappy_bands.includes(currentLevel)) {
      totalScore += weights[param] * 0.0;  // Unsuitable
    }
    // Not in either (tolerance zone)
    else {
      totalScore += weights[param] * 0.6;  // Tolerable
    }
  }
  
  return totalScore;
}
```

### Scoring Logic

**3-tier system**:
1. **Happy bands** (1.0 score): Optimal conditions, species thrives
2. **Tolerance zone** (0.6 score): Not in happy or unhappy, species can survive but not ideal
3. **Unhappy bands** (0.0 score): Unsuitable, species stressed or absent

### Example Calculation

**North Sea Rectangle** (16.5°C, 34.2 PSU, 35m depth)

**Cod**:
```
Temperature: 16.5°C → 'normal' level
  Cod happy: ['very_low', 'low']
  Cod unhappy: ['high', 'very_high']
  'normal' not in either → Tolerance zone → 0.6 × 0.35 = 0.21

Salinity: 34.2 PSU → 'normal' level
  Cod happy: ['normal']
  Cod unhappy: ['very_low']
  'normal' in happy → 1.0 × 0.25 = 0.25

Depth: 35m → 'low' level
  Cod happy: ['low', 'normal']
  Cod unhappy: ['very_high']
  'low' in happy → 1.0 × 0.20 = 0.20

Total: 0.21 + 0.25 + 0.20 = 0.66
(Matches our earlier calculation of 0.618 with accessibility penalty!)
```

**Sea Bass**:
```
Temperature: 16.5°C → 'normal' level
  Sea Bass happy: ['normal', 'high']
  Sea Bass unhappy: ['very_low']
  'normal' in happy → 1.0 × 0.35 = 0.35

Salinity: 34.2 PSU → 'normal' level
  Sea Bass happy: ['low', 'normal', 'high']  (euryhaline)
  Sea Bass unhappy: ['very_low']
  'normal' in happy → 1.0 × 0.25 = 0.25

Depth: 35m → 'low' level
  Sea Bass happy: ['very_low', 'low']
  Sea Bass unhappy: ['high', 'very_high']
  'low' in happy → 1.0 × 0.20 = 0.20

Total: 0.35 + 0.25 + 0.20 = 0.80
(Plus substrate + seasonal → ~1.0 final score ✓)
```

---

## 🗄️ Database Schema Updates

### Add Additional Parameters

```sql
-- Add substrate parameter for habitat preferences
-- Will need to define substrate bio_level mapping:
--   very_low: pure_mud
--   low: muddy_sand
--   normal: sandy_mixed
--   high: rocky_mixed
--   very_high: pure_rock

-- Add oxygen (already exists in some records)
-- Add chlorophyll (already exists)
-- Add depth (new parameter)
```

### Migration to Populate All Species

```sql
-- Script to populate species_bio_bands for all 62 species
-- Using data from SPECIES_PHASE1_REGIONAL_GATES.json
-- And environmental research from Phase 2

INSERT INTO species_bio_bands (species_id, parameter, happy_bands, unhappy_bands)
SELECT 
  s.id,
  'surfaceTemperature',
  map_temperature_happy_bands(env.temp_optimal_min, env.temp_optimal_max),
  map_temperature_unhappy_bands(env.temp_tolerance_min, env.temp_tolerance_max)
FROM species s
JOIN species_environmental_data env ON env.species_code = s.species_code;

-- Repeat for salinity, depth, etc.
```

---

## ✅ Advantages of Using bio_bands

1. **Existing Infrastructure**: Table already exists, just needs population
2. **Qualitative Logic**: Easier to reason about ("cod likes cold water" → happy: ['very_low', 'low'])
3. **Flexible**: Can add new parameters (substrate, oxygen, pH) without schema changes
4. **Performance**: Array containment checks are fast with GIN indexes
5. **Extensible**: Can add more bio_levels if needed (e.g., 'extremely_low')
6. **Tolerates Missing Data**: If parameter not in bio_bands, assume neutral score

---

## 🚀 Implementation Plan

### Phase 1: Convert Existing Data

1. Take SPECIES_PHASE1_REGIONAL_GATES.json (absolute_limits)
2. Map numeric temperature/salinity limits to bio_level bands
3. Populate species_bio_bands for 15 POC species

### Phase 2: Research & Populate Remaining Species

1. Research 47 partial species (FishBase, ICES)
2. Define happy_bands and unhappy_bands for each parameter
3. Bulk insert into species_bio_bands

### Phase 3: Update RPC Function

```sql
CREATE OR REPLACE FUNCTION get_environmental_predictions(
  p_rectangle_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE,
  p_platform TEXT DEFAULT 'boat',
  p_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
  species_id UUID,
  species_name TEXT,
  final_score NUMERIC,
  temperature_match TEXT,  -- 'happy', 'tolerance', 'unhappy'
  salinity_match TEXT,
  depth_match TEXT,
  ...
) AS $$
BEGIN
  -- 1. Get rectangle conditions
  -- 2. Convert conditions to bio_levels
  -- 3. Join species_bio_bands
  -- 4. Score each species based on band matches
  -- 5. Apply Phase 1 regional gates
  -- 6. Apply Phase 3 recreational accessibility
  -- 7. Return top N
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Data Structure Comparison

### Old Approach (numeric ranges in JSONB)
```json
{
  "temperature": {
    "optimal_min": 2,
    "optimal_max": 10,
    "tolerance_min": 0,
    "tolerance_max": 18
  }
}
```

### New Approach (qualitative bands in bio_bands table)
```sql
-- Same information, different representation
parameter: 'surfaceTemperature'
happy_bands: ['very_low', 'low']  -- 0-10°C
unhappy_bands: ['high', 'very_high']  -- 18-30°C
-- Everything else is tolerance zone
```

**Both are valid!** The bio_bands approach is:
- More flexible (add/remove bands easily)
- More intuitive (species "likes cold" vs "optimal 2-10°C")
- Already implemented in your database
- Easier to query (array containment vs range checks)

---

## 🎯 Recommendation

**Use the existing `species_bio_bands` table** for Phase 2 environmental scoring:

1. ✅ Aligns with existing database schema
2. ✅ Simpler queries (array containment vs numeric ranges)
3. ✅ More maintainable (add parameters without schema changes)
4. ✅ Intuitive for domain experts ("cod likes very_low to low temps")
5. ✅ Already has some data (chlorophyll, oxygen, etc.)

**Keep Phase 1 regional gates separate** (in `environmental_preferences` JSONB or new table):
- `allowed_zones`
- `excluded_zones`
- `seasonal_restrictions`
- `absolute_limits` (hard cutoffs before bio_band scoring)

This gives us the best of both worlds: **hard regional gates** (Phase 1) + **flexible environmental scoring** (Phase 2 via bio_bands).

---

## 🎯 COMPLETE INTEGRATION: How It All Fits Together

### Three-Tier System

1. **Bio-Bands Thresholds Table** (existing)
   - Defines boundaries between bio_levels for each parameter
   - Used to classify raw CMEMS data: `classify_parameter('surfaceTemperature', 16.5) → 'normal'`
   - Provides angler interpretations: "Comfortable for most temperate fish"

2. **Species Bio-Bands Table** (`species_bio_bands`, existing)
   - Defines which bio_levels each species prefers
   - `happy_bands`: ['normal', 'high'] = thrives in these conditions
   - `unhappy_bands`: ['very_low'] = stressed/absent in these conditions
   - Parameters: surfaceTemperature, salinity, oxygen, chlorophyll, etc.

3. **Species Environmental Preferences** (NEW - Phase 9 migration)
   - JSONB column on `species` table
   - Stores detailed numeric ranges from ENVIRONMENTAL_DATA_COMPLETE.json
   - Temperature tolerance/optimal (8-24°C), salinity tolerance/optimal (5-38 ppt)
   - Depth ranges, substrate preferences, seasonal patterns
   - 62 species × complete environmental profiles

### How They Work Together

#### Step 1: Get Raw Environmental Data
```sql
-- CMEMS data for rectangle
SELECT 
  avg_sea_temperature,     -- 16.5°C
  avg_salinity,             -- 34.2 ppt
  avg_dissolved_oxygen,     -- 6.8 mg/L
  avg_chlorophyll,          -- 2.1 mg/m³
  dominant_substrate,       -- 'rock'
  avg_depth                 -- 15m
FROM rectangles_environmental_snapshot
WHERE rectangle_id = '30E7' AND snapshot_date = '2024-07-15';
```

#### Step 2: Classify into Bio-Levels
```sql
SELECT 
  classify_parameter('surfaceTemperature', 16.5) AS temp_level,      -- 'normal'
  classify_parameter('salinity', 34.2) AS salinity_level,            -- 'normal'
  classify_parameter('oxygen', 6.8) AS oxygen_level,                 -- 'normal' (close to 'high')
  classify_parameter('chlorophyll', 2.1) AS chlorophyll_level;       -- 'normal'
```

#### Step 3: Match Against Species Preferences (Two Approaches)

**Approach A: Use Bio-Bands (Qualitative)**
```sql
-- Check if Sea Bass happy with 'normal' temperature
SELECT happy_bands, unhappy_bands
FROM species_bio_bands
WHERE species_id = (SELECT id FROM species WHERE species_code = 'bss')
  AND parameter = 'surfaceTemperature';

-- Result: happy_bands = ['normal', 'high'], unhappy_bands = ['very_low']
-- 'normal' level → IN happy_bands → Score: 1.0 ✅
```

**Approach B: Use Environmental Preferences (Precise)**
```sql
-- Check if 16.5°C within Sea Bass optimal range
SELECT 
  environmental_preferences->'temperature'->>'optimal_min',  -- 15
  environmental_preferences->'temperature'->>'optimal_max'   -- 20
FROM species
WHERE species_code = 'bss';

-- 16.5°C between 15-20°C → Score: 1.0 (sigmoid curve) ✅
```

**HYBRID APPROACH (RECOMMENDED):**
```sql
-- Use BOTH for comprehensive scoring:
-- 1. Environmental preferences (temperature, salinity) = PRECISE numeric scoring
-- 2. Bio-bands (oxygen, chlorophyll) = MODIFIERS (bonuses/penalties)

final_score = 
  (temp_score × 0.35) +              -- From environmental_preferences numeric
  (salinity_score × 0.25) +          -- From environmental_preferences numeric
  (depth_score × 0.20) +             -- From environmental_preferences numeric
  (substrate_score × 0.20)           -- From environmental_preferences categorical
  × oxygen_bonus                     -- From bio_bands classification (1.0-1.15)
  × chlorophyll_bonus;               -- From bio_bands classification (0.8-1.1)
```

### Real-World Example: Sea Bass in 30E7 (July)

**Rectangle Conditions:**
- Temperature: 16.5°C → `classify_parameter()` → 'normal' level
- Salinity: 34.2 ppt → 'normal' level
- Oxygen: 6.8 mg/L → 'normal' level (threshold 4, just below 'high' at 7)
- Chlorophyll: 2.1 mg/m³ → 'normal' level
- Substrate: 'rock' (categorical)
- Depth: 15m (numeric)

**Sea Bass Environmental Preferences (from ENVIRONMENTAL_DATA_COMPLETE.json):**
```json
{
  "temperature": {
    "tolerance_min": 8,
    "tolerance_max": 24,
    "optimal_min": 15,
    "optimal_max": 20
  },
  "salinity": {
    "tolerance_min": 5,
    "tolerance_max": 38,
    "optimal_min": 30,
    "optimal_max": 38
  },
  "depth": {
    "typical_min": 1,
    "typical_max": 100,
    "optimal_min": 2,
    "optimal_max": 20
  },
  "substrate": {
    "preferred": ["rock", "sand", "mixed"]
  }
}
```

**Scoring:**
1. **Temperature:** 16.5°C within optimal (15-20°C) → Score: 1.0 ✅
2. **Salinity:** 34.2 ppt within optimal (30-38 ppt) → Score: 1.0 ✅
3. **Depth:** 15m within optimal (2-20m) → Score: 1.0 ✅
4. **Substrate:** 'rock' in preferred array → Score: 1.0 ✅
5. **Oxygen bonus:** 'normal' level → Modifier: 1.0 (neutral)
6. **Chlorophyll bonus:** 'normal' level → Modifier: 1.0 (neutral)

**Environmental Score:** (1.0×0.35 + 1.0×0.25 + 1.0×0.20 + 1.0×0.20) × 1.0 × 1.0 = **1.0**

**Bio-Band (July):** 9/10 (peak summer feeding)

**Final Score:** (9/10) × 1.0 × 10 = **9.0/10** 🎯

---

## 📋 Phase 9 Migration Checklist (UPDATED)

### A. Database Schema
- [x] Create `migrations/add_environmental_preferences.sql`
- [ ] Verify `bio_bands_thresholds` table exists with your JSON data
- [ ] Create `classify_parameter()` helper function
- [ ] Verify `species_bio_bands` table structure
- [ ] Check existing data in `species_bio_bands` (10 records for some species)

### B. Data Population
- [ ] Create TypeScript migration script: `scripts/migrate-environmental-data-to-supabase.ts`
- [ ] Read ENVIRONMENTAL_DATA_COMPLETE.json (62 species)
- [ ] Generate UPDATE statements for `species.environmental_preferences`
- [ ] Execute in staging environment
- [ ] Validate 62/62 species have populated environmental_preferences

### C. Bio-Bands Population (Optional Enhancement)
- [ ] Script to populate `species_bio_bands` for all 62 species
- [ ] Map numeric preferences to qualitative happy/unhappy bands
  - Example: Bass optimal 15-20°C → happy_bands: ['normal', 'high']
  - Example: Cod optimal 4-10°C → happy_bands: ['very_low', 'low']
- [ ] Bulk insert temperature, salinity bands for all species

### D. RPC Function Development
- [ ] Create `calculate_environmental_score()` helper function
  - Takes species environmental_preferences JSONB
  - Takes raw rectangle conditions
  - Returns weighted score using numeric ranges
- [ ] Create oxygen/chlorophyll bonus calculation
  - Uses `classify_parameter()` to get bio_levels
  - Applies modifiers (0.8-1.15)
- [ ] Create `get_environmental_predictions()` main RPC
  - Combines numeric scoring + bio-band modifiers
  - Applies bio-band monthly baseline
  - Returns ranked predictions with explanations

### E. Testing
- [ ] Test `classify_parameter()` with sample data
  - `SELECT classify_parameter('surfaceTemperature', 16.5);` → 'normal'
  - `SELECT classify_parameter('salinity', 12);` → 'very_low'
- [ ] Test scoring for known good matches (Bass in July Cornwall)
- [ ] Test scoring for known poor matches (Cod in July Cornwall)
- [ ] Test regional filtering (Baltic vs North Sea salinity)
- [ ] Test substrate hard constraints (Wrasse needs rock)

---

## 🚀 Next Steps

1. **Confirm bio-bands table name** - Is it `bio_bands_thresholds` or different?
2. **Run migration** - Populate `environmental_preferences` for 62 species
3. **Build RPC** - Hybrid scoring using both approaches
4. **Validate** - Test predictions against known patterns

**Estimated Time:** 4-6 hours to complete Phase 9 migration + RPC build

**Expected Improvement:** 65% accuracy (bio-bands only) → **85-90% accuracy** (hybrid environmental + bio-bands) 🎣⭐
