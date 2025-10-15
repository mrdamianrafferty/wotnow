# Environmental Matching: Two-Phase Filtering System

**Created**: 11 October 2025  
**Status**: Architecture Design  
**Supersedes**: Environmental gates in POC_CORRECTED (now integrated into cleaner structure)

---

## 🎯 Core Principle

> **First ask "Can this species exist here?" (binary), then ask "How well is it doing?" (scored)**

This two-phase approach mirrors how biogeography actually works: species have hard limits (can't survive outside them) and preference gradients (thrive in optimal conditions, tolerate suboptimal ones).

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: Rectangle + Date + Platform                          │
│  - Rectangle: ices_rectangles.id (has lat/lon/region)       │
│  - Date: Current date → month/season                         │
│  - Platform: 'shore' or 'boat'                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  FETCH ENVIRONMENTAL CONDITIONS                              │
│  - Temperature: CMEMS BGC data or seasonal baseline         │
│  - Salinity: CMEMS BGC data                                 │
│  - Depth: Rectangle bathymetry                              │
│  - Substrate: emodnet_substrate (rocky/sandy/mud/mixed)     │
│  - Biogeographic zone: ices_rectangles.biogeo_zone          │
│  - Season: derived from date (winter/spring/summer/autumn)  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: REGIONAL BIOGEOGRAPHIC GATES (HARD FILTERS)       │
│  For each species: Does it exist in this region?            │
│  Returns: List of eligible species (binary pass/fail)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: ENVIRONMENTAL SUITABILITY SCORING                  │
│  For each eligible species: How good are conditions?         │
│  - Temperature match (0.0-1.0)                              │
│  - Salinity match (0.0-1.0)                                 │
│  - Depth match (0.0-1.0)                                    │
│  - Substrate match (0.0-1.0)                                │
│  - Seasonal bonus (0.0-0.2)                                 │
│  Returns: Scored species (0.0-1.0)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: RECREATIONAL ACCESSIBILITY FILTER                  │
│  Apply platform-specific depth penalties                     │
│  - Shore: 0-20m ×1.0, 20-40m ×0.7, >40m ×0.3               │
│  - Boat: 0-80m ×1.0, 80-150m ×0.7, >150m ×0.3              │
│  Returns: Final scored & ranked predictions                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    OUTPUT: Top 15 species
```

---

## 🚪 PHASE 1: Regional Biogeographic Gates

### Purpose
Eliminate species that cannot exist in the target region due to fundamental biogeographic constraints.

### Gate Types

#### 1. **Biogeographic Zone Gate**
Hard boundaries based on established marine biogeographic regions.

```javascript
// Species database structure
{
  "species_code": "cod",
  "regional_gates": {
    "allowed_zones": [
      "north_sea",
      "baltic",
      "norwegian_sea",
      "north_atlantic",
      "barents_sea"
    ],
    "excluded_zones": [
      "mediterranean",
      "black_sea"
    ],
    "notes": "Cold-water species, cannot tolerate Med temperatures"
  }
}
```

**Examples**:
- Cod: ✅ North Sea, Baltic, Norwegian Sea | ❌ Mediterranean, Black Sea
- Bream: ✅ Mediterranean, South Atlantic | ❌ Baltic, Norwegian Sea
- Sea Bass: ✅ North Sea (seasonal), Atlantic, Med | ❌ Baltic, Norwegian Sea

#### 2. **Seasonal Presence Gate**
Some species are only present in certain regions during specific seasons.

```javascript
{
  "species_code": "sea-bass",
  "regional_gates": {
    "allowed_zones": ["north_sea", "atlantic", "mediterranean"],
    "seasonal_restrictions": {
      "north_sea": {
        "allowed_months": [6, 7, 8, 9, 10],  // June-October
        "reason": "Seasonal migrants, arrive with warming water"
      }
    }
  }
}
```

**Examples**:
- Sea Bass in North Sea: ✅ Summer/Autumn (June-Oct) | ❌ Winter/Spring
- Herring in Norwegian Sea: ✅ Summer (feeding) | ⚠️ Winter (spawning migration, deeper)
- Mackerel: ✅ Coastal summer | ⚠️ Offshore winter

#### 3. **Absolute Temperature Ceiling/Floor Gate**
Hard physiological limits that override all other factors.

```javascript
{
  "species_code": "cod",
  "regional_gates": {
    "absolute_limits": {
      "temperature_max_celsius": 20,
      "reason": "Cannot survive sustained temps above 20°C"
    }
  }
}
```

**Examples**:
- Cod: Temperature > 20°C → ❌ EXCLUDED
- Bream: Temperature < 10°C → ❌ EXCLUDED
- Herring: Salinity < 6 PSU → ❌ EXCLUDED

#### 4. **Absolute Salinity Gate**
Species that cannot osmoregulate outside certain salinity ranges.

```javascript
{
  "species_code": "cod",
  "regional_gates": {
    "absolute_limits": {
      "salinity_min_psu": 11,
      "reason": "Cannot successfully spawn below 11-12 PSU (Baltic cod exception)"
    }
  }
}
```

**Examples**:
- Cod in Baltic: Salinity < 11 PSU → ❌ EXCLUDED (cannot reproduce)
- Bream: Salinity < 20 PSU → ❌ EXCLUDED (euryhaline but has limits)
- Herring: Salinity 6-38 PSU → ✅ WIDE TOLERANCE

---

## 📊 PHASE 2: Environmental Suitability Scoring

### Purpose
For species that passed Phase 1 (can exist in this region), calculate how well-suited the current environmental conditions are.

### Scoring Components

#### 1. **Temperature Match Score** (Weight: 35%)

```javascript
function calculateTemperatureScore(currentTemp, speciesProfile) {
  const { optimal_min, optimal_max, tolerance_min, tolerance_max } = 
    speciesProfile.temperature;
  
  // Check if outside absolute tolerance
  if (currentTemp < tolerance_min || currentTemp > tolerance_max) {
    return 0.0;  // Should have been caught by Phase 1 gates, but safety check
  }
  
  // Inside optimal range = 1.0
  if (currentTemp >= optimal_min && currentTemp <= optimal_max) {
    return 1.0;
  }
  
  // Between tolerance and optimal = linear gradient
  if (currentTemp < optimal_min) {
    // Cold side gradient
    const range = optimal_min - tolerance_min;
    const distance = optimal_min - currentTemp;
    return 1.0 - (distance / range) * 0.6;  // Min score 0.4
  } else {
    // Warm side gradient
    const range = tolerance_max - optimal_max;
    const distance = currentTemp - optimal_max;
    return 1.0 - (distance / range) * 0.6;  // Min score 0.4
  }
}
```

**Example: Cod in North Sea**
```
Current temp: 16°C
Optimal: 2-10°C
Tolerance: 0-18°C

Score = 1.0 - ((16 - 10) / (18 - 10)) * 0.6
      = 1.0 - (6/8) * 0.6
      = 1.0 - 0.45
      = 0.55 → Temperature score: 0.55 (warm for cod, but tolerable)
```

#### 2. **Salinity Match Score** (Weight: 25%)

```javascript
function calculateSalinityScore(currentSalinity, speciesProfile) {
  const { optimal_min, optimal_max, tolerance_min, tolerance_max } = 
    speciesProfile.salinity;
  
  if (currentSalinity < tolerance_min || currentSalinity > tolerance_max) {
    return 0.0;
  }
  
  if (currentSalinity >= optimal_min && currentSalinity <= optimal_max) {
    return 1.0;
  }
  
  if (currentSalinity < optimal_min) {
    const range = optimal_min - tolerance_min;
    const distance = optimal_min - currentSalinity;
    return 1.0 - (distance / range) * 0.5;
  } else {
    const range = tolerance_max - optimal_max;
    const distance = currentSalinity - optimal_max;
    return 1.0 - (distance / range) * 0.5;
  }
}
```

**Example: Cod in Baltic Sea**
```
Current salinity: 8 PSU
Optimal: 30-35 PSU
Tolerance: 11-38 PSU

8 PSU < 11 PSU → FAILS Phase 1 gate → ❌ EXCLUDED
(Cod cannot spawn below 11 PSU, so shouldn't appear in predictions)
```

**Example: Herring in Baltic Sea**
```
Current salinity: 8 PSU
Optimal: 25-35 PSU
Tolerance: 6-38 PSU

8 PSU is in tolerance but below optimal:
Score = 1.0 - ((25 - 8) / (25 - 6)) * 0.5
      = 1.0 - (17/19) * 0.5
      = 1.0 - 0.45
      = 0.55 → Salinity score: 0.55 (survives but not ideal)
```

#### 3. **Depth Match Score** (Weight: 20%)

```javascript
function calculateDepthScore(rectangleDepth, speciesProfile) {
  const { optimal_min, optimal_max, tolerance_min, tolerance_max } = 
    speciesProfile.depth;
  
  // Use middle 50% of rectangle depth range as "effective depth"
  const effectiveDepth = rectangleDepth.p25_to_p75_median;
  
  if (effectiveDepth < tolerance_min || effectiveDepth > tolerance_max) {
    return 0.0;
  }
  
  if (effectiveDepth >= optimal_min && effectiveDepth <= optimal_max) {
    return 1.0;
  }
  
  if (effectiveDepth < optimal_min) {
    const range = optimal_min - tolerance_min;
    const distance = optimal_min - effectiveDepth;
    return 1.0 - (distance / range) * 0.4;
  } else {
    const range = tolerance_max - optimal_max;
    const distance = effectiveDepth - optimal_max;
    return 1.0 - (distance / range) * 0.4;
  }
}
```

**Example: Haddock in North Sea**
```
Rectangle depth: 20-80m (median 45m)
Optimal: 30-120m
Tolerance: 10-300m

45m is in optimal range → Depth score: 1.0
```

#### 4. **Substrate/Habitat Match Score** (Weight: 20%)

```javascript
function calculateSubstrateScore(rectangleSubstrate, speciesProfile) {
  const { preferred, acceptable, avoided } = speciesProfile.habitat;
  
  // Get dominant substrate type from emodnet data
  const dominantType = rectangleSubstrate.dominant;
  const secondaryType = rectangleSubstrate.secondary;
  
  // Preferred habitat = 1.0
  if (preferred.includes(dominantType)) {
    return 1.0;
  }
  
  // Acceptable habitat = 0.7
  if (acceptable.includes(dominantType) || preferred.includes(secondaryType)) {
    return 0.7;
  }
  
  // Avoided habitat = 0.3 (rare, but not impossible)
  if (avoided.includes(dominantType)) {
    return 0.3;
  }
  
  // Mixed/Unknown = neutral 0.6
  return 0.6;
}
```

**Example: Plaice**
```
Rectangle substrate: Sandy (70%), Mud (30%)
Preferred: ["sandy", "muddy"]
Acceptable: ["mixed"]
Avoided: ["rocky"]

Dominant type "sandy" is in preferred → Substrate score: 1.0
```

**Example: Pollack**
```
Rectangle substrate: Sandy (70%), Mud (30%)
Preferred: ["rocky", "wrecks", "kelp"]
Acceptable: ["mixed"]
Avoided: ["pure_sand", "pure_mud"]

Dominant type "sandy" is in avoided → Substrate score: 0.3
(Pollack CAN be caught over sand, but prefers structure)
```

#### 5. **Seasonal Bonus** (Additive: +0.0 to +0.2)

```javascript
function calculateSeasonalBonus(currentMonth, speciesProfile) {
  const { spawning_months, feeding_peak_months } = speciesProfile.seasonal;
  
  let bonus = 0.0;
  
  // Spawning season = +0.1 (fish congregate, easier to target)
  if (spawning_months.includes(currentMonth)) {
    bonus += 0.1;
  }
  
  // Feeding peak = +0.1 (aggressive, bite well)
  if (feeding_peak_months.includes(currentMonth)) {
    bonus += 0.1;
  }
  
  // Cap at +0.2
  return Math.min(bonus, 0.2);
}
```

**Example: Herring in Norwegian Sea (Summer)**
```
Current month: July (7)
Spawning: [2, 3] (Feb-Mar)
Feeding peak: [6, 7, 8] (Jun-Aug)

In feeding peak → Seasonal bonus: +0.1
```

### Combined Environmental Score

```javascript
function calculateEnvironmentalScore(conditions, speciesProfile) {
  const tempScore = calculateTemperatureScore(conditions.temp, speciesProfile);
  const salinityScore = calculateSalinityScore(conditions.salinity, speciesProfile);
  const depthScore = calculateDepthScore(conditions.depth, speciesProfile);
  const substrateScore = calculateSubstrateScore(conditions.substrate, speciesProfile);
  const seasonalBonus = calculateSeasonalBonus(conditions.month, speciesProfile);
  
  const baseScore = 
    (tempScore * 0.35) +
    (salinityScore * 0.25) +
    (depthScore * 0.20) +
    (substrateScore * 0.20);
  
  const finalScore = Math.min(baseScore + seasonalBonus, 1.0);
  
  return {
    final_score: finalScore,
    breakdown: {
      temperature: tempScore,
      salinity: salinityScore,
      depth: depthScore,
      substrate: substrateScore,
      seasonal_bonus: seasonalBonus
    }
  };
}
```

---

## 🎣 PHASE 3: Recreational Accessibility Filter

### Purpose
Down-rank species that are too deep to target with recreational gear from the chosen platform.

### Implementation

```javascript
function applyRecreationalAccessibility(environmentalScore, speciesProfile, platform) {
  const typicalDepth = speciesProfile.depth.typical_fishing_depth;
  
  let penalty = 1.0;  // No penalty by default
  
  if (platform === 'shore') {
    if (typicalDepth <= 20) {
      penalty = 1.0;  // Perfect for shore
    } else if (typicalDepth <= 40) {
      penalty = 0.7;  // Possible but harder
    } else {
      penalty = 0.3;  // Rarely caught from shore
    }
  } else if (platform === 'boat') {
    if (typicalDepth <= 80) {
      penalty = 1.0;  // Perfect for recreational boat
    } else if (typicalDepth <= 150) {
      penalty = 0.7;  // Needs specialized gear
    } else {
      penalty = 0.3;  // Commercial depths (trawlers/longliners)
    }
  }
  
  return {
    final_score: environmentalScore.final_score * penalty,
    accessibility_penalty: penalty,
    ...environmentalScore
  };
}
```

**Example: Hake (typical depth 250m) from Boat**
```
Environmental score: 0.92 (great conditions!)
Platform: boat
Typical fishing depth: 250m

250m > 150m → penalty = 0.3
Final score: 0.92 × 0.3 = 0.28 (down-ranked, rarely targeted recreationally)
```

---

## 📋 Complete Example: North Sea Rectangle in Summer

### Input
```javascript
{
  "rectangle_id": "38F2",
  "date": "2025-07-15",
  "platform": "boat",
  "conditions": {
    "temperature": 16.5,  // °C
    "salinity": 34.2,     // PSU
    "depth": {
      "min": 15,
      "max": 65,
      "median": 38,
      "p25_to_p75": 35
    },
    "substrate": {
      "dominant": "mixed",
      "secondary": "sandy",
      "rocky_pct": 30,
      "sandy_pct": 50,
      "muddy_pct": 20
    },
    "biogeo_zone": "north_sea",
    "month": 7,
    "season": "summer"
  }
}
```

### Phase 1: Regional Gates

**Cod**
```
✅ PASS Biogeographic gate (north_sea in allowed_zones)
✅ PASS Seasonal gate (no restrictions in North Sea)
✅ PASS Temperature ceiling (16.5°C < 20°C max)
✅ PASS Salinity gate (34.2 PSU > 11 PSU min)
→ Cod proceeds to Phase 2
```

**Bream (Gilthead)**
```
❌ FAIL Biogeographic gate (north_sea not in allowed_zones)
→ Bream excluded, does not proceed to Phase 2
```

**Sea Bass**
```
✅ PASS Biogeographic gate (north_sea in allowed_zones)
✅ PASS Seasonal gate (July in allowed_months [6,7,8,9,10])
✅ PASS Temperature ceiling (16.5°C in range)
✅ PASS Salinity gate (34.2 PSU acceptable)
→ Sea Bass proceeds to Phase 2
```

**Mackerel**
```
✅ PASS Biogeographic gate (north_sea in allowed_zones)
✅ PASS Seasonal gate (summer = coastal presence)
✅ PASS Temperature ceiling (16.5°C perfect)
✅ PASS Salinity gate (34.2 PSU perfect)
→ Mackerel proceeds to Phase 2
```

### Phase 2: Environmental Scoring

**Cod**
```
Temperature: 16.5°C vs optimal 2-10°C (tolerance 0-18°C)
  → Score: 0.55 (warm but tolerable)
  
Salinity: 34.2 PSU vs optimal 30-35 PSU (tolerance 28-38 PSU)
  → Score: 1.0 (perfect)
  
Depth: 35m median vs optimal 20-150m (tolerance 10-300m)
  → Score: 1.0 (perfect)
  
Substrate: Mixed (30% rocky) vs preferred [rocky, sandy]
  → Score: 0.7 (acceptable)
  
Seasonal: July, spawning [1,2,3], feeding [5,6,7,8]
  → Bonus: +0.1 (feeding peak)

Base score: (0.55 × 0.35) + (1.0 × 0.25) + (1.0 × 0.20) + (0.7 × 0.20)
          = 0.193 + 0.25 + 0.20 + 0.14
          = 0.783
          
Final: 0.783 + 0.1 = 0.883
```

**Sea Bass**
```
Temperature: 16.5°C vs optimal 13-21°C (tolerance 8-25°C)
  → Score: 1.0 (perfect)
  
Salinity: 34.2 PSU vs optimal 30-38 PSU (tolerance 15-40 PSU)
  → Score: 1.0 (perfect)
  
Depth: 35m median vs optimal 5-40m (tolerance 2-80m)
  → Score: 1.0 (perfect)
  
Substrate: Mixed vs preferred [rocky, reef, estuaries, kelp]
  → Score: 0.7 (acceptable, some rocky present)
  
Seasonal: July, spawning [4,5,6], feeding [6,7,8,9]
  → Bonus: +0.2 (both spawning tail + feeding peak)

Base score: (1.0 × 0.35) + (1.0 × 0.25) + (1.0 × 0.20) + (0.7 × 0.20)
          = 0.35 + 0.25 + 0.20 + 0.14
          = 0.94
          
Final: 0.94 + 0.2 = 1.0 (capped at 1.0)
```

**Mackerel**
```
Temperature: 16.5°C vs optimal 10-18°C (tolerance 5-22°C)
  → Score: 1.0 (perfect)
  
Salinity: 34.2 PSU vs optimal 32-37 PSU (tolerance 30-40 PSU)
  → Score: 1.0 (perfect)
  
Depth: 35m median vs optimal 10-80m (tolerance 5-200m)
  → Score: 1.0 (perfect)
  
Substrate: Mixed vs preferred [pelagic, any - not substrate-dependent]
  → Score: 1.0 (pelagic species, substrate irrelevant)
  
Seasonal: July, spawning [4,5], feeding [6,7,8,9]
  → Bonus: +0.1 (feeding peak)

Base score: (1.0 × 0.35) + (1.0 × 0.25) + (1.0 × 0.20) + (1.0 × 0.20)
          = 0.35 + 0.25 + 0.20 + 0.20
          = 1.0
          
Final: 1.0 + 0.1 = 1.0 (capped)
```

### Phase 3: Recreational Accessibility

**Cod** (typical fishing depth: 85m)
```
Environmental score: 0.883
Platform: boat
Depth: 85m

85m > 80m but ≤ 150m → penalty = 0.7

Final score: 0.883 × 0.7 = 0.618
```

**Sea Bass** (typical fishing depth: 22.5m)
```
Environmental score: 1.0
Platform: boat
Depth: 22.5m

22.5m ≤ 80m → penalty = 1.0

Final score: 1.0 × 1.0 = 1.0
```

**Mackerel** (typical fishing depth: 40m)
```
Environmental score: 1.0
Platform: boat
Depth: 40m

40m ≤ 80m → penalty = 1.0

Final score: 1.0 × 1.0 = 1.0
```

### Final Ranking

```
1. 🥇 Sea Bass: 1.00 (Perfect conditions, optimal depth)
2. 🥈 Mackerel: 1.00 (Perfect conditions, optimal depth)
3. 🥉 Cod: 0.618 (Warm for cod, but deeper gear needed)
```

---

## 🗄️ Database Schema

### Species Table Addition

```sql
ALTER TABLE species 
ADD COLUMN environmental_preferences JSONB;

CREATE INDEX idx_species_environmental_preferences 
ON species USING GIN (environmental_preferences);
```

### JSONB Structure

```json
{
  "temperature": {
    "optimal_min": 13,
    "optimal_max": 21,
    "tolerance_min": 8,
    "tolerance_max": 25,
    "notes": "Summer migrant to North Sea, needs 12°C+ to feed actively"
  },
  "salinity": {
    "optimal_min": 30,
    "optimal_max": 38,
    "tolerance_min": 15,
    "tolerance_max": 40,
    "notes": "Euryhaline, can enter low-salinity estuaries"
  },
  "depth": {
    "optimal_min": 5,
    "optimal_max": 40,
    "tolerance_min": 2,
    "tolerance_max": 80,
    "typical_fishing_depth": 22.5,
    "notes": "Shallow coastal species, reefs and estuaries"
  },
  "habitat": {
    "preferred": ["rocky", "reef", "estuaries", "kelp"],
    "acceptable": ["mixed", "harbours"],
    "avoided": ["pure_mud", "very_deep"],
    "spawning": ["coastal", "estuaries"],
    "feeding": ["rocky", "reef", "kelp"]
  },
  "seasonal": {
    "spawning_months": [4, 5, 6],
    "feeding_peak_months": [6, 7, 8, 9],
    "migration_pattern": "coastal_summer_offshore_winter",
    "notes": "Arrives in North Sea May-June, departs October-November"
  },
  "regional_gates": {
    "allowed_zones": [
      "north_sea",
      "celtic_sea",
      "english_channel",
      "bay_of_biscay",
      "iberian_atlantic",
      "mediterranean"
    ],
    "excluded_zones": [
      "baltic",
      "norwegian_sea",
      "barents_sea"
    ],
    "seasonal_restrictions": {
      "north_sea": {
        "allowed_months": [6, 7, 8, 9, 10],
        "reason": "Summer migrant, temperature-driven presence"
      }
    },
    "absolute_limits": {
      "temperature_min_celsius": 8,
      "temperature_max_celsius": 25,
      "salinity_min_psu": 15
    }
  },
  "recreational_accessibility": {
    "shore_suitable": true,
    "boat_suitable": true,
    "specialized_gear_required": false,
    "notes": "Top recreational target from shore and boat"
  }
}
```

---

## 🔧 RPC Function Implementation

```sql
CREATE OR REPLACE FUNCTION get_environmental_predictions(
  p_rectangle_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE,
  p_platform TEXT DEFAULT 'boat',
  p_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
  species_id UUID,
  species_code TEXT,
  species_name TEXT,
  scientific_name TEXT,
  
  -- Phase 1: Gate results
  passed_regional_gate BOOLEAN,
  gate_failure_reason TEXT,
  
  -- Phase 2: Environmental scores
  temperature_score NUMERIC,
  salinity_score NUMERIC,
  depth_score NUMERIC,
  substrate_score NUMERIC,
  seasonal_bonus NUMERIC,
  environmental_score NUMERIC,
  
  -- Phase 3: Accessibility
  accessibility_penalty NUMERIC,
  final_score NUMERIC,
  
  -- Metadata
  confidence TEXT,
  data_quality TEXT,
  conditions_summary JSONB
) AS $$
DECLARE
  v_conditions JSONB;
  v_month INTEGER;
  v_season TEXT;
BEGIN
  -- Extract month and season
  v_month := EXTRACT(MONTH FROM p_target_date);
  v_season := CASE
    WHEN v_month IN (12, 1, 2) THEN 'winter'
    WHEN v_month IN (3, 4, 5) THEN 'spring'
    WHEN v_month IN (6, 7, 8) THEN 'summer'
    ELSE 'autumn'
  END;
  
  -- Fetch environmental conditions for rectangle
  SELECT jsonb_build_object(
    'temperature', COALESCE(bgc.temp_celsius, seasonal_baseline_temp(rect.biogeo_zone, v_season)),
    'salinity', COALESCE(bgc.salinity_psu, seasonal_baseline_salinity(rect.biogeo_zone, v_season)),
    'depth', jsonb_build_object(
      'min', rect.depth_min,
      'max', rect.depth_max,
      'median', rect.depth_median,
      'p25_to_p75', (rect.depth_p25 + rect.depth_p75) / 2
    ),
    'substrate', substrate.data,
    'biogeo_zone', rect.biogeo_zone,
    'month', v_month,
    'season', v_season
  )
  INTO v_conditions
  FROM ices_rectangles rect
  LEFT JOIN cmems_bgc bgc ON bgc.rectangle_id = rect.id 
    AND bgc.date = p_target_date
  LEFT JOIN emodnet_substrate substrate ON substrate.rectangle_id = rect.id
  WHERE rect.id = p_rectangle_id;
  
  -- Return predictions for all species
  RETURN QUERY
  WITH species_data AS (
    SELECT 
      s.id,
      s.species_code,
      s.name_en,
      s.scientific_name,
      s.environmental_preferences
    FROM species s
    WHERE s.environmental_preferences IS NOT NULL
  ),
  
  -- PHASE 1: Regional Gates
  phase1_filtered AS (
    SELECT 
      sd.*,
      check_regional_gates(sd.environmental_preferences, v_conditions) AS gate_result
    FROM species_data sd
  ),
  
  -- PHASE 2: Environmental Scoring
  phase2_scored AS (
    SELECT 
      p1.*,
      calculate_environmental_score(p1.environmental_preferences, v_conditions) AS env_score
    FROM phase1_filtered p1
    WHERE (p1.gate_result->>'passed')::boolean = true
  ),
  
  -- PHASE 3: Recreational Accessibility
  phase3_final AS (
    SELECT 
      p2.*,
      apply_recreational_accessibility(
        p2.env_score,
        p2.environmental_preferences,
        p_platform
      ) AS final_result
    FROM phase2_scored p2
  )
  
  SELECT 
    p3.id,
    p3.species_code,
    p3.name_en,
    p3.scientific_name,
    
    (p3.gate_result->>'passed')::boolean,
    p3.gate_result->>'failure_reason',
    
    (p3.env_score->'breakdown'->>'temperature')::numeric,
    (p3.env_score->'breakdown'->>'salinity')::numeric,
    (p3.env_score->'breakdown'->>'depth')::numeric,
    (p3.env_score->'breakdown'->>'substrate')::numeric,
    (p3.env_score->'breakdown'->>'seasonal_bonus')::numeric,
    (p3.env_score->>'environmental_score')::numeric,
    
    (p3.final_result->>'accessibility_penalty')::numeric,
    (p3.final_result->>'final_score')::numeric,
    
    determine_confidence(p3.final_result, v_conditions),
    assess_data_quality(v_conditions),
    v_conditions
  FROM phase3_final p3
  ORDER BY (p3.final_result->>'final_score')::numeric DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 Summary: Why Two-Phase System?

### Advantages

1. **Mirrors Biology**: Species distributions are governed by hard limits (can't survive) and preference gradients (thrives vs. tolerates)

2. **Computationally Efficient**: Regional gates eliminate 50-80% of species immediately, avoiding expensive scoring calculations

3. **Interpretable**: Users understand "Can't live here" vs. "Lives here but conditions aren't great"

4. **Maintainable**: Biogeographic presence is relatively static (changes on decadal timescales), while environmental scoring responds to real-time conditions

5. **Prevents False Positives**: 
   - Old system: Mediterranean cod might score 0.2 (poor but present)
   - New system: Mediterranean cod scores 0.0 (excluded by regional gate)

6. **Enables Rich UI**:
   ```
   🟢 Sea Bass (1.00) - Perfect conditions
   🟢 Mackerel (1.00) - Peak feeding season
   🟡 Cod (0.62) - Present but warm for them, needs deeper gear
   ⚪ Bream (N/A) - Not found in this region
   ```

### Migration Path

1. ✅ Extract all 62 species with regional data (DONE)
2. Parse existing `advice.regions` to populate `regional_gates.allowed_zones`
3. Research temperature/salinity/depth/habitat for 47 partial species
4. Build complete JSONB profiles with two-phase structure
5. Create helper functions: `check_regional_gates()`, `calculate_environmental_score()`, `apply_recreational_accessibility()`
6. Deploy RPC function
7. Update UI to show gate results + environmental breakdown

---

**Next Step**: Would you like me to start converting the existing species data into this two-phase structure, or should we focus on researching the environmental parameters for the 47 partial species first?
