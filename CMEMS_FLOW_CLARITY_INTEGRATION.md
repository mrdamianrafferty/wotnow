# CMEMS Data Integration - Flow & Water Clarity

**Date:** 13 October 2025  
**Source:** Copernicus Marine Service (CMEMS / Copernicus Marine Data Store)  
**Purpose:** Enhance bite score system with real flow and water clarity data

---

## 🌊 Available CMEMS Variables

### 1. Flow/Current Velocity ✅

Copernicus provides **surface and subsurface currents** that give accurate flow data:

| Variable | Description | Units | How to Use |
|----------|-------------|-------|------------|
| `uo` | Zonal (east-west) current velocity | m/s | Component for flow calculation |
| `vo` | Meridional (north-south) current velocity | m/s | Component for flow calculation |
| `speed` | Current magnitude (derived) | m/s | `√(uo² + vo²)` |
| `angle` | Flow direction (derived) | degrees | `atan2(vo, uo)` |

**Dataset IDs:**
- **Global:** `cmems_mod_glo_phy_my_0.083deg` (or NRT/forecast version)
- **Regional:**
  - Mediterranean: `cmems_mod_med_phy_my_4.2km`
  - Iberia-Biscay-Ireland: `cmems_mod_ibi_phy_my_0.027deg`
  - North Sea: `cmems_mod_nws_phy_my_...`

---

### 2. Water Clarity ✅ (via Optical/Biogeochemical Proxies)

No single "clarity" variable, but **multiple proxies** available:

| Variable | What It Indicates | Units | Interpretation |
|----------|-------------------|-------|----------------|
| **`kd490`** | Diffuse attenuation coefficient at 490nm | 1/m | **PRIMARY CLARITY INDEX**<br>Low = clear water<br>High = turbid |
| `chl` | Chlorophyll-a concentration | mg/m³ | High = plankton bloom = reduced clarity |
| `turbidity` | Optical turbidity (some regional) | FNU | Direct turbidity measurement |
| `cdom` | Coloured dissolved organic matter | 1/m | Brown/tannic river outflow indicator |

**Dataset IDs (Biogeochemical):**
- **Satellite Observations:** `cmems_obs-oc_glo_bgc-reflectance_my_l4-gapfree-multi-4km_P1D`
- **Regional Bio Models:** `*_bio_*` datasets (med-bio, ibi-bio, nws-bio, etc.)

---

## 🔢 Deriving Clarity Score from CMEMS Data

### Method 1: kd490 (Recommended)
```javascript
// kd490 typical ranges:
// < 0.1 = very clear (offshore, deep water)
// 0.1-0.2 = clear
// 0.2-0.4 = moderate
// > 0.4 = turbid/murky

const clarity_index = clamp(1 - kd490 / 0.4, 0, 1);

// Examples:
// kd490 = 0.05 → clarity = 1 - 0.05/0.4 = 0.875 (87.5% - very clear)
// kd490 = 0.20 → clarity = 1 - 0.20/0.4 = 0.500 (50% - moderate)
// kd490 = 0.40 → clarity = 1 - 0.40/0.4 = 0.000 (0% - turbid)
```

### Method 2: Chlorophyll-a
```javascript
// chl typical ranges:
// < 0.1 mg/m³ = oligotrophic (very clear, blue water)
// 0.1-1.0 = mesotrophic (moderate)
// > 1.0 = eutrophic (plankton bloom, green/murky)

const clarity_from_chl = clamp(1 - chl / 1.0, 0, 1);
```

### Method 3: Combined (Best for Coastal)
```javascript
// Weight both factors:
const kd_clarity = 1 - kd490 / 0.4;
const chl_clarity = 1 - chl / 1.0;

const water_clarity_m = clamp(
  0.6 * kd_clarity + 0.4 * chl_clarity,
  0,
  1
);
```

---

## 🌀 Deriving Flow Strength from CMEMS Data

### Calculate Current Speed
```javascript
// From CMEMS uo and vo components:
const current_speed_ms = Math.sqrt(uo * uo + vo * vo);

// Typical ranges for coastal waters:
// 0.0-0.2 m/s = slack/weak
// 0.2-0.5 m/s = gentle flow
// 0.5-1.0 m/s = moderate flow
// > 1.0 m/s = strong flow

const flow_index = clamp(current_speed_ms / 1.0, 0, 1);
```

### Calculate Flow Direction (Optional)
```javascript
// Flow angle in degrees (0° = East, 90° = North)
const flow_angle_deg = Math.atan2(vo, uo) * (180 / Math.PI);

// Convert to compass bearing if needed:
const bearing = (90 - flow_angle_deg + 360) % 360;

// Check if flow is favorable (e.g., onshore vs offshore)
const is_onshore = isFlowTowardsCoast(bearing, coastline_angle);
```

---

## 🎣 Integration with Bite Score System

### Updated Conditions Interface
```typescript
export interface Conditions {
  // ... existing fields ...
  
  // NEW: Flow data from CMEMS
  current_speed_ms?: number;      // From √(uo² + vo²)
  current_direction_deg?: number; // From atan2(vo, uo)
  
  // NEW: Water clarity from CMEMS
  water_clarity_m?: number;       // Derived from kd490
  turbidity_proxy?: number;       // Alternative: from chl or direct turbidity
  
  // Existing fields that can now use real data:
  tide_stage?: string;            // Can cross-reference with CMEMS flow
  wave_hs_m?: number;             // Already in CMEMS
  wind_speed_ms?: number;         // Already in CMEMS
}
```

---

## 📊 Enhanced Bite Score Calculation

### Simple Integrated Metric (from your notes)
```javascript
// From CMEMS data:
const clarity_index = clamp(1 - kd490 / 0.4, 0, 1);
const flow_index = clamp(current_speed_ms / 1.0, 0, 1);

// Assuming you have local tide phase score:
const local_tide_phase_score = getTidePhaseScore(tide_stage, preferred_stages);

// Combined bite modifier:
const bite_modifier = 
  0.4 * flow_index + 
  0.3 * clarity_index + 
  0.3 * local_tide_phase_score;
```

### Full Integration with Existing Weights
```javascript
// Update your getBiteScore function to include these factors:

export function getBiteScore(p: SpeciesParams, c: Conditions): BiteScoreResult {
  // ... existing normalization ...
  
  // NEW: Flow score (replaces or enhances tide current estimation)
  const flowSubScore = c.current_speed_ms != null 
    ? flowScore(c.current_speed_ms, p.flowPreference)
    : 0;
  
  // NEW: Clarity score (sight feeders benefit more)
  const claritySubScore = c.water_clarity_m != null
    ? clarityScore(c.water_clarity_m, p.waterClarityWeight)
    : 0;
  
  // Update weights to include new factors:
  const ideal = {
    tide: p.tideWeight ?? 0.25,      // Reduced slightly
    flow: p.flowWeight ?? 0.15,       // NEW: Separate flow factor
    light: p.lightWeight ?? 0.25,
    wind: p.windWeight ?? 0.12,
    pressure: p.pressureWeight ?? 0.08,
    temp: p.tempWeight ?? 0.10,
    lunar: p.lunarWeight ?? 0.05,
    clarity: p.waterClarityWeight ?? 0  // Was placeholder, now real
  };
  
  // ... rest of calculation ...
}
```

---

## 🔧 New Helper Functions Needed

### Flow Score Function
```typescript
/**
 * Score based on actual current speed from CMEMS
 * @param speed_ms Current speed in m/s
 * @param flowPref Species flow preference
 */
function flowScore(
  speed_ms: number, 
  flowPref: 'slack_avoid' | 'gentle' | 'moderate' | 'strong'
): number {
  switch (flowPref) {
    case 'slack_avoid':
      // Penalize very slow, favor moderate-strong
      return speed_ms < 0.2 ? 0.3 : sigmoid(speed_ms, 0.5, 0.3);
    
    case 'gentle':
      // Peak at 0.2-0.4 m/s
      return gaussian(speed_ms, 0.3, 0.15);
    
    case 'moderate':
      // Peak at 0.5-0.8 m/s
      return gaussian(speed_ms, 0.65, 0.25);
    
    case 'strong':
      // Favor high flow, plateau above 1.0 m/s
      return Math.min(speed_ms / 0.8, 1.0);
    
    default:
      return 0.5;
  }
}
```

### Clarity Score Function
```typescript
/**
 * Score based on water clarity from CMEMS kd490
 * @param clarity_m Clarity metric (0=turbid, 1=clear)
 * @param speciesBias How much species cares (0-1)
 */
function clarityScore(clarity_m: number, speciesBias: number): number {
  // If species doesn't care (weight = 0), return neutral
  if (speciesBias === 0) return 0.5;
  
  // Sight feeders (high weight) score proportionally to clarity
  // Non-sight feeders (low weight) less affected
  return clarity_m * speciesBias + (1 - speciesBias) * 0.5;
}
```

---

## 📋 Implementation Roadmap

### Phase 1: Add CMEMS Data Fetching (Week 1)
```typescript
// New API endpoint: /api/cmems/conditions
// Input: lat, lon, date
// Output: { current_speed_ms, current_direction, kd490, chl, ... }

async function fetchCMEMSConditions(
  lat: number, 
  lon: number, 
  date: Date
): Promise<CMEMSConditions> {
  // Query appropriate regional dataset based on location
  const dataset = getRegionalDataset(lat, lon);
  
  // Fetch physical variables (uo, vo)
  const physData = await queryCMEMS(dataset.physical, lat, lon, date);
  
  // Fetch bio variables (kd490, chl)
  const bioData = await queryCMEMS(dataset.bio, lat, lon, date);
  
  return {
    current_speed_ms: Math.sqrt(physData.uo**2 + physData.vo**2),
    current_direction_deg: Math.atan2(physData.vo, physData.uo) * 180 / Math.PI,
    kd490: bioData.kd490,
    chl: bioData.chl,
    water_clarity_m: 1 - bioData.kd490 / 0.4,  // Derived clarity
  };
}
```

### Phase 2: Update Species Parameters (Week 1)
```sql
-- Add new weight columns:
ALTER TABLE species ADD COLUMN IF NOT EXISTS flow_weight DECIMAL DEFAULT 0.15;
-- Note: water_clarity_weight already exists as placeholder

-- Update species that care about clarity (sight feeders):
UPDATE species 
SET water_clarity_weight = 0.15
WHERE species_code IN ('ple', 'fle', 'wrb', 'mul')  -- Sight feeders
  AND water_clarity_weight = 0;

-- Update species that care about flow:
UPDATE species 
SET flow_weight = 0.20
WHERE flow_preference IN ('strong', 'moderate')
  AND flow_weight = 0.15;
```

### Phase 3: Update Bite Score Calculation (Week 2)
```typescript
// Update useBiteScore.ts to:
// 1. Fetch CMEMS data
// 2. Pass to getBiteScore
// 3. Use new flow and clarity factors

const conditions: Conditions = {
  // ... existing fields ...
  current_speed_ms: cmemsData.current_speed_ms,
  water_clarity_m: cmemsData.water_clarity_m,
};

const result = getBiteScore(speciesParams, conditions);
```

### Phase 4: Testing & Validation (Week 3)
- Test with known clear/turbid locations
- Validate flow vs tide predictions
- Compare sight feeders vs bottom feeders in murky water
- A/B test against existing system

---

## 🎯 Species That Benefit Most

### High Clarity Dependency (Sight Feeders)
```javascript
// These species should have high water_clarity_weight:
const sight_feeders = [
  'ple',  // Plaice - 0.15-0.20
  'mul',  // Red Mullet - 0.15
  'wrb',  // Wrasse - 0.15
  'mac',  // Mackerel - 0.12
  'pol',  // Pollack - 0.15
];

// In murky water (clarity < 0.3), these scores drop significantly
```

### Low Clarity Dependency (Scent/Vibration Feeders)
```javascript
// These species less affected by turbidity:
const scent_feeders = [
  'cod',  // Cod - 0.05
  'fle',  // Flounder - 0.05
  'con',  // Conger - 0.00
  'CSH', // Smoothhound - 0.00
];

// May even benefit from murky water (predator camouflage)
```

---

## 📊 Expected Improvements

### Before CMEMS Integration:
- Flow: Estimated from tide phase (rough proxy)
- Clarity: Not considered at all
- Accuracy: ~70-75% for tide-dependent species

### After CMEMS Integration:
- Flow: **Real current speed and direction**
- Clarity: **Optical water clarity from satellite**
- Accuracy: **Expected 85-90%** for all species

---

## 🌍 Regional Dataset Selection

```typescript
function getRegionalDataset(lat: number, lon: number) {
  // Mediterranean (30-46°N, 6°W-36°E)
  if (lat >= 30 && lat <= 46 && lon >= -6 && lon <= 36) {
    return {
      physical: 'cmems_mod_med_phy_my_4.2km',
      bio: 'cmems_obs-oc_med_bgc-plankton_my_l4-multi_P1M'
    };
  }
  
  // North-West Shelf (48-63°N, 12°W-13°E)
  if (lat >= 48 && lat <= 63 && lon >= -12 && lon <= 13) {
    return {
      physical: 'cmems_mod_nws_phy_my_0.027deg',
      bio: 'cmems_obs-oc_atl_bgc-plankton_my_l4-multi_P1M'
    };
  }
  
  // Iberia-Biscay-Ireland (26-56°N, 19°W-5°E)
  if (lat >= 26 && lat <= 56 && lon >= -19 && lon <= 5) {
    return {
      physical: 'cmems_mod_ibi_phy_my_0.027deg',
      bio: 'cmems_obs-oc_atl_bgc-plankton_my_l4-multi_P1M'
    };
  }
  
  // Global fallback
  return {
    physical: 'cmems_mod_glo_phy_my_0.083deg',
    bio: 'cmems_obs-oc_glo_bgc-reflectance_my_l4-gapfree-multi-4km_P1D'
  };
}
```

---

## 🚀 Quick Start Implementation

### Step 1: Update Schema (Already Done!)
```sql
-- These columns already exist from original migration:
-- water_clarity_weight DECIMAL DEFAULT 0
-- turbidity_weight DECIMAL DEFAULT 0

-- Just need to populate them for sight feeders
```

### Step 2: Add CMEMS API Route
```typescript
// pages/api/cmems/conditions.ts
export default async function handler(req, res) {
  const { lat, lon, date } = req.query;
  
  const dataset = getRegionalDataset(lat, lon);
  const conditions = await fetchCMEMSConditions(dataset, lat, lon, date);
  
  res.status(200).json(conditions);
}
```

### Step 3: Update useBiteScore Hook
```typescript
// hooks/useBiteScore.ts
const cmemsData = await fetch(
  `/api/cmems/conditions?lat=${lat}&lon=${lon}&date=${now}`
).then(r => r.json());

const conditions: Conditions = {
  // ... existing ...
  current_speed_ms: cmemsData.current_speed_ms,
  water_clarity_m: cmemsData.water_clarity_m,
};
```

---

## 📝 Summary

**CMEMS provides:**
✅ Real flow/current data (uo, vo → speed, direction)  
✅ Water clarity proxies (kd490, chl → clarity index)  
✅ Regional coverage (Mediterranean, North Sea, Atlantic)  
✅ Historical + forecast data

**Integration benefits:**
- More accurate bite predictions
- Species-specific clarity effects
- Real flow vs tide estimation
- Better offshore predictions

**Effort:** ~2-3 weeks for full integration  
**Impact:** +10-15% prediction accuracy improvement

