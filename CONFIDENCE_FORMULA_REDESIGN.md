# Confidence Scoring Formula - Complete Redesign
## November 16, 2025

## Philosophy

**Goal**: Predict fish catchability (0-100%) based on actual catches, environmental conditions, and feeding behavior.

**Principles**:
1. **Catch data is king**: If species X is being caught in rectangle Y right now, that's the strongest signal
2. **Environmental match matters**: Temperature, oxygen, chlorophyll, clarity must align with species needs
3. **Feeding behavior affects catchability**: Time, tide, moon phase influence when fish bite
4. **Biogeographic reality**: Don't show tropical fish in Arctic waters
5. **Seasonal patterns**: Mackerel in summer = 100%, Bass in winter = low

**Exclusions**:
- Depth/substrate = location-specific tips (not regional confidence)
- These remain as advice when user taps a specific coordinate

## Formula Structure

```
CONFIDENCE (0-100) = Base Availability (40) + Environmental Match (40) + Feeding Conditions (20)
```

### 1. BASE AVAILABILITY (0-40 points)
**Purpose**: Is this species catchable in this region/season?

#### 1.1 Regional Catch History (0-30 points)
Based on ICES catch data for this rectangle + season:

```sql
CASE
  WHEN catch_count_last_30_days >= 50 THEN 30  -- Abundant
  WHEN catch_count_last_30_days >= 25 THEN 25  -- Common
  WHEN catch_count_last_30_days >= 10 THEN 20  -- Regular
  WHEN catch_count_last_30_days >= 5  THEN 15  -- Occasional
  WHEN catch_count_last_30_days >= 1  THEN 10  -- Rare
  WHEN species_in_bioregion THEN 5             -- Possible but unrecorded
  ELSE 0                                       -- Filtered out
END
```

**Reasoning**:
- Actual catches = proof of presence
- Recent catches (30 days) more relevant than old data
- Zero catches but in bioregion = keep species visible but low confidence
- Zero catches + wrong bioregion = filter out entirely

#### 1.2 Seasonal Pattern (0-10 points)
Based on species_seasonal_patterns table:

```sql
CASE
  WHEN current_month IN peak_months THEN 10      -- e.g., Mackerel Jun-Sep
  WHEN current_month IN good_months THEN 7       -- e.g., Mackerel May, Oct
  WHEN current_month IN possible_months THEN 3   -- e.g., Mackerel Apr, Nov
  ELSE 0                                         -- e.g., Mackerel Dec-Mar
END
```

**Examples**:
- Mackerel (North Sea): Peak Jun-Sep, Good May+Oct, Off-season rest
- Cod (North Sea): Peak Nov-Mar, Good Oct+Apr, Off-season summer
- Bass (UK): Peak Jul-Oct, Good May-Jun, Off-season winter

---

### 2. ENVIRONMENTAL MATCH (0-40 points)
**Purpose**: Are water conditions suitable for this species?

#### 2.1 Temperature Match (0-15 points)

```sql
-- Species has optimal_temp_min, optimal_temp_max, tolerance_temp_min, tolerance_temp_max
CASE
  WHEN actual_temp BETWEEN optimal_temp_min AND optimal_temp_max THEN 15
  WHEN actual_temp BETWEEN tolerance_temp_min AND tolerance_temp_max THEN 10
  WHEN actual_temp BETWEEN (tolerance_temp_min - 2) AND (tolerance_temp_max + 2) THEN 5
  ELSE 0
END
```

**Reasoning**:
- Temperature is critical for fish metabolism, feeding, migration
- Most species have narrow optimal range, wider tolerance
- Examples:
  - Mackerel: Optimal 12-18°C, Tolerance 8-22°C
  - Cod: Optimal 4-10°C, Tolerance 0-15°C
  - Tuna: Optimal 20-26°C, Tolerance 15-30°C

#### 2.2 Chlorophyll Match (0-10 points)
**Indicator of**: Primary productivity → baitfish → predators

```sql
-- Species has preferred_chlorophyll_level (low/medium/high)
CASE
  WHEN species.preferred = 'high' AND chlorophyll > 3.0 THEN 10
  WHEN species.preferred = 'high' AND chlorophyll > 1.5 THEN 7
  WHEN species.preferred = 'medium' AND chlorophyll BETWEEN 0.5 AND 3.0 THEN 10
  WHEN species.preferred = 'medium' AND chlorophyll BETWEEN 0.2 AND 5.0 THEN 7
  WHEN species.preferred = 'low' AND chlorophyll < 0.5 THEN 10
  WHEN species.preferred = 'low' AND chlorophyll < 1.0 THEN 7
  ELSE 5  -- Neutral if no preference
END
```

**Examples**:
- Mackerel: High chlorophyll (follows baitfish in productive waters)
- Tuna: Low-medium (clear oceanic waters)
- Flatfish: Medium (coastal/estuarine productivity)

#### 2.3 Oxygen Match (0-10 points)

```sql
CASE
  WHEN dissolved_oxygen > species.min_oxygen_comfortable THEN 10
  WHEN dissolved_oxygen > species.min_oxygen_survival THEN 5
  ELSE 0
END
```

**Reasoning**:
- Critical for high-activity species (tuna, mackerel)
- Less critical for bottom-dwellers (flatfish)
- Most species: comfortable >6 mg/L, survival >4 mg/L

#### 2.4 Water Clarity (0-5 points)
**Based on**: Kd490 (light attenuation coefficient)

```sql
-- Lower Kd490 = clearer water
CASE
  WHEN species.preferred_clarity = 'clear' AND kd490 < 0.1 THEN 5
  WHEN species.preferred_clarity = 'clear' AND kd490 < 0.2 THEN 3
  WHEN species.preferred_clarity = 'turbid' AND kd490 > 0.3 THEN 5
  WHEN species.preferred_clarity = 'turbid' AND kd490 > 0.15 THEN 3
  ELSE 3  -- Neutral
END
```

**Examples**:
- Tuna/Mackerel: Clear water (visual hunters)
- Bass: Variable (adapts to turbidity)
- Flounder: Turbid (ambush predator)

---

### 3. FEEDING CONDITIONS (0-20 points)
**Purpose**: When are fish most likely to bite?

#### 3.1 Time of Day (0-10 points)

```sql
CASE
  WHEN species.diurnal_sensitivity = 'nocturnal' THEN
    CASE
      WHEN is_night THEN 10
      WHEN is_dawn_or_dusk THEN 7
      ELSE 3
    END
  WHEN species.diurnal_sensitivity = 'diurnal' THEN
    CASE
      WHEN is_day THEN 10
      WHEN is_dawn_or_dusk THEN 7
      ELSE 3
    END
  WHEN species.diurnal_sensitivity = 'crepuscular' THEN
    CASE
      WHEN is_dawn_or_dusk THEN 10
      WHEN is_day OR is_night THEN 5
    END
  ELSE 7  -- No strong preference
END
```

**Examples**:
- Bass, Mackerel: Dawn/dusk feeders (crepuscular)
- Cod: Day/night flexible
- Conger eel: Nocturnal

#### 3.2 Lunar Phase (0-5 points)

```sql
CASE
  WHEN species.lunar_sensitivity = 'new_moon_preferred' THEN
    CASE
      WHEN moon_illumination < 25 THEN 5
      WHEN moon_illumination < 50 THEN 3
      ELSE 1
    END
  WHEN species.lunar_sensitivity = 'full_moon_preferred' THEN
    CASE
      WHEN moon_illumination > 75 THEN 5
      WHEN moon_illumination > 50 THEN 3
      ELSE 1
    END
  ELSE 3  -- Neutral
END
```

**Fishing lore**:
- New moon: Bass, sea trout (darker nights, aggressive feeding)
- Full moon: Some pelagics benefit from lunar tides
- Most species: Minor effect, 3 pts baseline

#### 3.3 Tide Stage (0-5 points)

```sql
CASE
  WHEN species.preferred_tide_stage = 'rising' AND tide_stage = 'rising' THEN 5
  WHEN species.preferred_tide_stage = 'falling' AND tide_stage = 'falling' THEN 5
  WHEN species.preferred_tide_stage = 'high' AND tide_stage = 'high' THEN 5
  WHEN species.preferred_tide_stage = 'slack' AND tide_stage = 'slack' THEN 5
  WHEN tide_stage IN ('rising', 'falling') THEN 3  -- Moving water generally good
  ELSE 2  -- Slack tide
END
```

**Examples**:
- Bass: Rising tide (pushes baitfish inshore)
- Flatfish: Slack high tide (feeding on exposed ground)
- Offshore species: Less affected

---

## Real-World Validation

### Scenario 1: Mackerel in Summer (North Sea, July, Dawn)
```
Base Availability:
  - Catch data: 120 catches last 30 days → 30 pts
  - Season: Peak summer (July) → 10 pts
  SUBTOTAL: 40/40

Environmental Match:
  - Temperature: 16°C (optimal 12-18°C) → 15 pts
  - Chlorophyll: 3.5 mg/m³ (high, preferred) → 10 pts
  - Oxygen: 8 mg/L (excellent) → 10 pts
  - Clarity: Kd490 0.08 (clear) → 5 pts
  SUBTOTAL: 40/40

Feeding Conditions:
  - Time: Dawn (crepuscular species) → 10 pts
  - Lunar: New moon → 5 pts
  - Tide: Rising → 5 pts
  SUBTOTAL: 20/20

TOTAL: 100% ✓ Perfect conditions
```

### Scenario 2: Cod in Winter (North Sea, February, Midday)
```
Base Availability:
  - Catch data: 35 catches last 30 days → 25 pts
  - Season: Peak winter → 10 pts
  SUBTOTAL: 35/40

Environmental Match:
  - Temperature: 6°C (optimal) → 15 pts
  - Chlorophyll: 0.8 mg/m³ (medium) → 7 pts
  - Oxygen: 10 mg/L (high, cold water) → 10 pts
  - Clarity: Kd490 0.15 (moderate) → 3 pts
  SUBTOTAL: 35/40

Feeding Conditions:
  - Time: Midday (flexible feeder) → 7 pts
  - Lunar: Full moon → 3 pts
  - Tide: High slack → 3 pts
  SUBTOTAL: 13/20

TOTAL: 83% ✓ Good conditions
```

### Scenario 3: Bass in Wrong Season (North Sea, January)
```
Base Availability:
  - Catch data: 0 catches, but in bioregion → 5 pts
  - Season: Off-season (winter) → 0 pts
  SUBTOTAL: 5/40

Environmental Match:
  - Temperature: 5°C (below tolerance 8-20°C) → 0 pts
  - Chlorophyll: 1.0 mg/m³ → 7 pts
  - Oxygen: 9 mg/L → 10 pts
  - Clarity: Good → 3 pts
  SUBTOTAL: 20/40

Feeding Conditions:
  - Time: Dawn → 10 pts
  - Lunar: New moon → 5 pts
  - Tide: Rising → 5 pts
  SUBTOTAL: 20/20

TOTAL: 45% ✓ Low but not impossible (some hardy individuals)
```

### Scenario 4: Tropical Fish in Arctic
```
Base Availability:
  - Catch data: 0 catches, NOT in bioregion → 0 pts

FILTERED OUT (don't show at all)
```

---

## Scientific Basis

### Temperature Sensitivity
**Source**: Marine biology research shows:
- Fish are ectotherms (body temp = water temp)
- Metabolism doubles every 10°C rise (Q10 effect)
- Feeding activity peaks in optimal temp range
- Migration patterns follow temperature gradients

**Our approach**:
- 15 pts for optimal (where feeding is maximal)
- 10 pts for tolerance (survival but reduced activity)
- 0 pts outside tolerance (species won't be there)

### Chlorophyll as Food Chain Proxy
**Source**: Oceanography
- Chlorophyll = phytoplankton density
- Phytoplankton → zooplankton → baitfish → predators
- High chlorophyll zones = productive feeding grounds
- Trophic cascade timing: ~2-4 weeks lag

**Our approach**:
- Match species to productivity level
- Pelagic predators: Follow chlorophyll blooms
- Offshore species: Prefer oligotrophic (low chlorophyll) waters

### Dissolved Oxygen
**Source**: Fish physiology
- Active species (tuna, mackerel): Need >6 mg/L
- Bottom-dwellers: Tolerate >4 mg/L
- Hypoxia (<3 mg/L): Fish avoid these areas

**Our approach**:
- 10 pts if above comfortable threshold
- 5 pts if marginal
- 0 pts if hypoxic

### Water Clarity (Kd490)
**Source**: Fish behavior
- Visual predators: Need clear water (bass, mackerel)
- Ambush predators: Use turbidity (flounder)
- Relates to feeding strategy

**Our approach**:
- Match clarity to species hunting strategy
- Smaller weight (5 pts) as fish are adaptable

### Diurnal Patterns
**Source**: Fishing lore + scientific studies
- Dawn/dusk: Peak feeding for many species (low light advantage)
- Nocturnal: Conger, some bass
- Diurnal: Mackerel, wrasse

**Our approach**:
- 10 pts for optimal time
- 7 pts for good time
- 3 pts minimum (fish always feeding somewhere)

### Lunar Phase
**Source**: Controversial but widely believed
- New moon: Darker nights = aggressive feeding (predator advantage)
- Full moon: Some species feed more (lunar tides?)
- Scientific evidence: Mixed

**Our approach**:
- 5 pts bonus (smaller weight due to uncertainty)
- 3 pts baseline (most fish ignore it)

### Tide Influence
**Source**: Strong fishing lore + evidence
- Rising tide: Pushes baitfish inshore
- Falling tide: Concentrates fish in channels
- Slack: Generally slower fishing

**Our approach**:
- 5 pts for preferred stage
- 3 pts for moving water
- 2 pts for slack

---

## Implementation Plan

### Phase 1: Data Requirements
1. **Add to species table**:
   - `peak_months` (array)
   - `good_months` (array)
   - `possible_months` (array)
   - `preferred_chlorophyll_level` (low/medium/high)
   - `min_oxygen_comfortable` (mg/L)
   - `min_oxygen_survival` (mg/L)
   - `preferred_clarity` (clear/turbid/variable)
   - `lunar_sensitivity` (new_moon/full_moon/none)

2. **Query catch data**:
   - `SELECT COUNT(*) FROM ices_catches WHERE rectangle = X AND species = Y AND date > NOW() - 30 days`
   - Cache this monthly

### Phase 2: Migration
Create new RPC function with this formula:

```sql
CREATE OR REPLACE FUNCTION get_fishing_confidence_v2(
  target_rectangle text,
  target_date date,
  target_time timestamp DEFAULT NOW()
)
RETURNS TABLE (
  species_code varchar,
  confidence_percent int,
  base_availability_score int,
  environmental_match_score int,
  feeding_conditions_score int,
  breakdown jsonb
)
```

### Phase 3: Testing
Compare against:
1. Known seasonal patterns (mackerel summer abundance)
2. Fishing reports from anglers
3. Commercial catch statistics
4. Marine biology research

### Phase 4: Tuning
- Adjust weights based on validation
- Add species-specific multipliers if needed
- Regional calibration (Med vs Atlantic vs North Sea)

---

## Benefits of This Approach

1. **Grounded in reality**: Catch data prevents fantasy predictions
2. **Scientifically sound**: Environmental factors based on marine biology
3. **Matches fishing lore**: Time/tide/moon align with angler experience
4. **Transparent**: Each component explainable
5. **Tunable**: Can adjust weights without changing structure
6. **Scales naturally**: 100% = perfect storm of conditions, 0% = impossible

## Next Steps

1. Populate species table with seasonal and preference data
2. Query ICES catch data (or use our existing `species_regional_availability`)
3. Implement new RPC function
4. Test against known scenarios
5. Deploy and monitor
6. Iterate based on angler feedback
