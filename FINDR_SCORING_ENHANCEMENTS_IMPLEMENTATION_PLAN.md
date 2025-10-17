# Findr Scoring Enhancements - Implementation Plan

## Overview

This document provides a detailed, step-by-step implementation plan for enhancing the Findr prediction scoring algorithm using existing species behavioral data.

**Total Timeline**: 2 weeks  
**Estimated Dev Time**: 20-25 hours  
**External Dependencies**: Moon phase library (free), Weather API extension (~$20/mo)  
**Expected Impact**: +40-50 point confidence improvement for well-matched conditions

---

## 🎯 Phase 1: Quick Wins (Week 1)

### **Enhancement 1: Time-of-Day Scoring**
**Priority**: ⭐⭐⭐⭐⭐ (Highest Impact, Zero Dependencies)  
**Effort**: 2-3 hours  
**Impact**: +15 points for dawn/dusk species

#### Implementation Checklist

- [ ] **Task 1.1: Add time calculation to RPC functions** (30 min)
  - File: `supabase/migrations/20251017003_add_time_of_day_scoring.sql`
  - Add helper function to extract local time from target_date
  - Calculate solar position (dawn: 5-7, dusk: 18-20, night: 21-5, day: 8-17)
  - Handle timezone consideration (use UTC + rectangle offset)

- [ ] **Task 1.2: Query diurnal_sensitivity in RPC** (15 min)
  - Modify `biogeochemical_enhancements` CTE
  - Add `s.diurnal_sensitivity` to SELECT
  - Add `s.light_weight` to SELECT

- [ ] **Task 1.3: Implement light scoring logic** (45 min)
  - Add `light_score` calculation in final SELECT
  - Logic:
    ```sql
    CASE
      WHEN current_hour IN (5,6,7,18,19,20) AND s.diurnal_sensitivity = 'strong' THEN 15
      WHEN current_hour IN (5,6,7,18,19,20) AND s.diurnal_sensitivity = 'moderate' THEN 10
      WHEN current_hour BETWEEN 21 AND 23 OR current_hour BETWEEN 0 AND 4
        AND s.diurnal_sensitivity = 'strong' THEN 12  -- Nocturnal hunters
      ELSE 5
    END * COALESCE(s.light_weight, 0.3)
    ```

- [ ] **Task 1.4: Update confidence calculation** (30 min)
  - Add `light_score` to total confidence formula
  - Adjust max points from 150 to 165 (add 15 for light)
  - Update normalization: `(total / 165) * 100`

- [ ] **Task 1.5: Update both RPC functions** (30 min)
  - Apply changes to `get_environmental_predictions_basic`
  - Apply changes to `get_environmental_predictions_enhanced`
  - Ensure consistency between both

- [ ] **Task 1.6: Test with Bass at different times** (30 min)
  - Test at 06:00 (dawn) - expect +15 points
  - Test at 12:00 (midday) - expect +5 points
  - Test at 19:00 (dusk) - expect +15 points
  - Validate confidence scores are correct

**Files to Create/Modify**:
```
supabase/migrations/20251017003_add_time_of_day_scoring.sql
```

---

### **Enhancement 2: Species-Specific Temperature Ranges**
**Priority**: ⭐⭐⭐⭐⭐ (High Impact, Zero Dependencies)  
**Effort**: 1-2 hours  
**Impact**: +5 points accuracy improvement

#### Implementation Checklist

- [ ] **Task 2.1: Query temp_opt_c in RPC** (15 min)
  - Modify `biogeochemical_enhancements` CTE
  - Add `s.temp_opt_c` to SELECT (DECIMAL[2] array)
  - Add `s.temp_weight` to SELECT

- [ ] **Task 2.2: Replace generic temp scoring** (45 min)
  - Locate existing temp_score calculation in RPC
  - Replace with species-specific logic:
    ```sql
    CASE
      -- Use species' optimal range if available
      WHEN s.temp_opt_c IS NOT NULL AND s.temp_opt_c[1] IS NOT NULL THEN
        CASE
          -- Perfect temp (within optimal range)
          WHEN be.env_temperature BETWEEN s.temp_opt_c[1] AND s.temp_opt_c[2] THEN 25
          
          -- Good temp (within ±2°C of optimal)
          WHEN be.env_temperature BETWEEN (s.temp_opt_c[1] - 2) AND (s.temp_opt_c[2] + 2) THEN 20
          
          -- Acceptable temp (within ±5°C of optimal)
          WHEN be.env_temperature BETWEEN (s.temp_opt_c[1] - 5) AND (s.temp_opt_c[2] + 5) THEN 12
          
          -- Outside comfort zone
          ELSE 5
        END
      
      -- Fallback to generic scoring if no species data
      WHEN be.env_temperature IS NULL THEN 15
      WHEN be.env_temperature >= 8 AND be.env_temperature <= 18 THEN 20
      WHEN be.env_temperature >= 5 AND be.env_temperature <= 22 THEN 15
      ELSE 10
    END * COALESCE(s.temp_weight, 0.1) as temp_score
    ```

- [ ] **Task 2.3: Update completeness scoring** (15 min)
  - Modify completeness_score calculation
  - Add bonus point for species with temp_opt_c data:
    ```sql
    + (CASE WHEN s.temp_opt_c IS NOT NULL THEN 1 ELSE 0 END)
    ```

- [ ] **Task 2.4: Apply to both RPC functions** (20 min)
  - Update `get_environmental_predictions_basic`
  - Update `get_environmental_predictions_enhanced`

- [ ] **Task 2.5: Test with different species** (20 min)
  - Test Mackerel (10-18°C optimal) at 15°C water - expect 25/25
  - Test Mackerel at 8°C water - expect 20/25
  - Test Cod (6-14°C optimal) at 15°C water - expect 20/25
  - Test Gilthead Bream (15-24°C) at 15°C - expect 25/25

**Files to Modify**:
```
supabase/migrations/20251017001_add_bio_to_predictions.sql (update)
supabase/migrations/20251017002_add_bio_to_enhanced_predictions.sql (update)
```

**New Migration**:
```
supabase/migrations/20251017004_add_species_temp_optimization.sql
```

---

### **Enhancement 3: Habitat Context Bonuses**
**Priority**: ⭐⭐⭐⭐ (Medium-High Impact, Zero Dependencies)  
**Effort**: 2-3 hours  
**Impact**: +10-15% boost for habitat matches

#### Implementation Checklist

- [ ] **Task 3.1: Research habitat detection options** (30 min)
  - Review EMODnet substrate data (already available with GPS)
  - Map substrate types to habitat contexts:
    - `rock` → `rocky_headland`, `reef`
    - `sand` → `sandy_bay`, `beach`
    - `mud` → `estuary`, `harbour`
    - `mixed` → `mixed_ground`

- [ ] **Task 3.2: Query context_bias in RPC** (15 min)
  - Add `s.context_bias` to species query in both RPCs
  - Ensure JSONB field is returned

- [ ] **Task 3.3: Add habitat detection logic** (60 min)
  - In enhanced RPC only (requires GPS + substrate)
  - Create habitat type determination:
    ```sql
    WITH habitat_determination AS (
      SELECT
        species_id,
        CASE
          WHEN user_substrate IN ('rock', 'hard bottom') THEN 'rocky_headland'
          WHEN user_substrate = 'sand' THEN 'sandy_bay'
          WHEN user_substrate = 'mud' THEN 'harbour'
          WHEN user_substrate = 'mixed sediment' THEN 'mixed_ground'
          ELSE NULL
        END as detected_habitat
      FROM predictions
    )
    ```

- [ ] **Task 3.4: Apply context bonus** (45 min)
  - Extract bonus from context_bias JSONB
  - Apply as multiplier to final confidence:
    ```sql
    SELECT
      base_confidence,
      COALESCE(
        (s.context_bias->hd.detected_habitat)::numeric,
        0
      ) as habitat_bonus,
      LEAST(100, 
        ROUND(base_confidence * (1 + habitat_bonus))
      ) as final_confidence
    FROM predictions p
    LEFT JOIN habitat_determination hd ON p.species_id = hd.species_id
    ```

- [ ] **Task 3.5: Update API response metadata** (30 min)
  - Add `habitat_bonus_applied` boolean to response
  - Add `detected_habitat` field to metadata
  - Document which species received bonuses

- [ ] **Task 3.6: Populate more context_bias data** (60 min)
  - Review species with sparse context_bias
  - Add habitat bonuses for 20+ species:
    ```sql
    UPDATE species SET context_bias = jsonb_build_object(
      'rocky_headland', 0.15,
      'reef', 0.12
    ) WHERE species_code = 'bss'; -- Bass
    
    UPDATE species SET context_bias = jsonb_build_object(
      'estuary', 0.20,
      'harbour', 0.15
    ) WHERE species_code = 'fle'; -- Flounder
    ```

- [ ] **Task 3.7: Test habitat bonuses** (30 min)
  - Test Bass with rocky substrate - expect +15% boost
  - Test Bass with sandy substrate - expect no boost
  - Test Flounder in estuary - expect +20% boost
  - Validate final scores are capped at 100

**Files to Create/Modify**:
```
supabase/migrations/20251017005_add_habitat_context_bonuses.sql
supabase/migrations/20251017006_populate_context_bias.sql
```

---

## 🌙 Phase 2: Short-Term Enhancements (Week 2)

### **Enhancement 4: Moon Phase Calculations**
**Priority**: ⭐⭐⭐⭐ (Medium-High Impact, Free)  
**Effort**: 4-5 hours  
**Impact**: +10 points for lunar-sensitive species

#### Implementation Checklist

- [ ] **Task 4.1: Research moon phase calculation** (30 min)
  - Review lunar cycle algorithms (29.53 days)
  - Choose approach:
    - Option A: PostgreSQL native date math
    - Option B: Use external library (lunarphase-js)
    - Option C: Pre-calculate and store in table
  - **Recommendation**: PostgreSQL native (zero dependencies)

- [ ] **Task 4.2: Create moon phase calculation function** (90 min)
  - File: `supabase/migrations/20251017007_add_moon_phase_function.sql`
  - Implement lunar age calculation:
    ```sql
    CREATE OR REPLACE FUNCTION calculate_moon_phase(target_date date)
    RETURNS TABLE (
      moon_age numeric,        -- Days since new moon (0-29.53)
      phase_name text,         -- 'new', 'waxing_crescent', 'first_quarter', etc.
      illumination numeric     -- 0.0 to 1.0
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
      known_new_moon date := '2000-01-06'::date;  -- Known new moon
      days_since numeric;
      lunar_cycle numeric := 29.530588853;  -- Synodic month
      current_age numeric;
    BEGIN
      days_since := target_date - known_new_moon;
      current_age := MOD(days_since, lunar_cycle);
      
      RETURN QUERY SELECT
        current_age,
        CASE
          WHEN current_age < 1.85 THEN 'new'
          WHEN current_age < 7.38 THEN 'waxing_crescent'
          WHEN current_age < 9.23 THEN 'first_quarter'
          WHEN current_age < 14.77 THEN 'waxing_gibbous'
          WHEN current_age < 16.62 THEN 'full'
          WHEN current_age < 22.15 THEN 'waning_gibbous'
          WHEN current_age < 23.99 THEN 'last_quarter'
          ELSE 'waning_crescent'
        END,
        -- Calculate illumination percentage
        CASE
          WHEN current_age <= 14.765 THEN current_age / 14.765
          ELSE (lunar_cycle - current_age) / 14.765
        END;
    END;
    $$;
    ```

- [ ] **Task 4.3: Query lunar_weight in RPC** (15 min)
  - Add `s.lunar_weight` to species query
  - Cross join with moon phase calculation

- [ ] **Task 4.4: Implement lunar scoring logic** (60 min)
  - Add lunar_score calculation:
    ```sql
    WITH moon_data AS (
      SELECT * FROM calculate_moon_phase(target_date)
    )
    SELECT
      CASE
        -- Full moon bonus for nocturnal/crepuscular feeders
        WHEN md.phase_name = 'full' 
          AND s.diurnal_sensitivity = 'strong' THEN 10
        
        -- New moon bonus (darker nights, ambush advantage)
        WHEN md.phase_name = 'new' 
          AND s.diurnal_sensitivity = 'strong' THEN 8
        
        -- Waxing/waning bonus for transitional feeders
        WHEN md.phase_name IN ('first_quarter', 'last_quarter')
          AND s.diurnal_sensitivity = 'moderate' THEN 7
        
        -- Default for non-sensitive or unknown
        ELSE 5
      END * COALESCE(s.lunar_weight, 0.05) as lunar_score
    FROM species s
    CROSS JOIN moon_data md
    ```

- [ ] **Task 4.5: Update confidence calculation** (20 min)
  - Add `lunar_score` to total confidence
  - Adjust max points from 165 to 175 (add 10 for moon)
  - Update normalization: `(total / 175) * 100`

- [ ] **Task 4.6: Add moon phase to API response** (30 min)
  - Include moon data in metadata:
    ```typescript
    metadata: {
      moonPhase: {
        age: 14.2,
        phase: 'full',
        illumination: 0.98
      }
    }
    ```

- [ ] **Task 4.7: Tune lunar_weight for species** (60 min)
  - Research nocturnal species behavior
  - Update lunar_weight values:
    ```sql
    -- Strong lunar influence
    UPDATE species SET lunar_weight = 0.15 
    WHERE species_code IN ('bss', 'cod', 'eel'); -- Bass, Cod, Eel
    
    -- Moderate lunar influence
    UPDATE species SET lunar_weight = 0.08
    WHERE species_code IN ('mac', 'gar', 'pol'); -- Mackerel, Garfish, Pollock
    
    -- Weak lunar influence
    UPDATE species SET lunar_weight = 0.03
    WHERE species_code IN ('fle', 'dab', 'pla'); -- Flatfish
    ```

- [ ] **Task 4.8: Test moon phase scoring** (45 min)
  - Test Bass on full moon night - expect +15 points
  - Test Bass on new moon night - expect +12 points
  - Test Bass on half moon - expect +7 points
  - Test during day (moon less relevant) - expect +5 points

**Files to Create**:
```
supabase/migrations/20251017007_add_moon_phase_function.sql
supabase/migrations/20251017008_add_lunar_scoring.sql
supabase/migrations/20251017009_tune_lunar_weights.sql
```

---

### **Enhancement 5: Weather API Extension (Pressure + Wind)**
**Priority**: ⭐⭐⭐⭐ (High Impact, ~$20/mo cost)  
**Effort**: 6-8 hours  
**Impact**: +15 points each (30 total)

#### Implementation Checklist

##### Part A: Database Schema Updates

- [ ] **Task 5.1: Add weather columns to conditions table** (30 min)
  - File: `supabase/migrations/20251017010_add_weather_columns.sql`
  - Add new columns:
    ```sql
    ALTER TABLE findr_conditions_snapshots 
      ADD COLUMN IF NOT EXISTS atmospheric_pressure_hpa numeric,
      ADD COLUMN IF NOT EXISTS pressure_trend text CHECK (pressure_trend IN ('rising', 'stable', 'falling')),
      ADD COLUMN IF NOT EXISTS wind_speed_ms numeric,
      ADD COLUMN IF NOT EXISTS wind_direction_deg integer,
      ADD COLUMN IF NOT EXISTS wind_gust_ms numeric;
    
    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_conditions_pressure 
      ON findr_conditions_snapshots(atmospheric_pressure_hpa);
    
    CREATE INDEX IF NOT EXISTS idx_conditions_wind 
      ON findr_conditions_snapshots(wind_speed_ms);
    ```

##### Part B: Data Ingestion Updates

- [ ] **Task 5.2: Extend Copernicus ingestion script** (90 min)
  - File: `lib/findr/ingestCoastalConditions.ts` (or similar)
  - Research if Copernicus provides atmospheric pressure
  - **Note**: Copernicus focuses on marine data, may need alternative source

- [ ] **Task 5.3: Add OpenWeather API integration** (120 min)
  - Create new service file: `lib/services/weatherService.ts`
  - Implement pressure + wind fetching:
    ```typescript
    interface WeatherData {
      pressure: number;           // hPa
      pressureTrend: 'rising' | 'stable' | 'falling';
      windSpeed: number;          // m/s
      windDirection: number;      // degrees
      windGust: number;           // m/s
    }
    
    export async function fetchWeatherForRectangle(
      rectangleCode: string,
      date: Date
    ): Promise<WeatherData> {
      // Use rectangle center coordinates
      const coords = getRectangleCenter(rectangleCode);
      
      // Call OpenWeather API
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?` +
        `lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_KEY}`
      );
      
      const data = await response.json();
      
      return {
        pressure: data.main.pressure,
        pressureTrend: calculateTrend(data.main.pressure, previousPressure),
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg,
        windGust: data.wind.gust || data.wind.speed
      };
    }
    ```

- [ ] **Task 5.4: Create pressure trend calculation** (45 min)
  - Implement trend detection (compare current vs 3h ago)
  - Store historical pressure readings
  - Calculate rise/fall rate (hPa/hour)

- [ ] **Task 5.5: Update ingestion cron job** (30 min)
  - Modify existing conditions ingestion
  - Add weather API calls
  - Handle rate limits (60 calls/min on free tier)
  - Batch process by unique rectangle coordinates

##### Part C: RPC Scoring Updates

- [ ] **Task 5.6: Query pressure/wind in RPC** (20 min)
  - Update `recent_conditions` CTE to include:
    ```sql
    MAX(CASE WHEN atmospheric_pressure_hpa IS NOT NULL 
        THEN atmospheric_pressure_hpa END) as pressure_hpa,
    MAX(CASE WHEN pressure_trend IS NOT NULL 
        THEN pressure_trend END) as pressure_trend,
    MAX(CASE WHEN wind_speed_ms IS NOT NULL 
        THEN wind_speed_ms END) as wind_speed_ms
    ```

- [ ] **Task 5.7: Add species pressure/wind weights** (15 min)
  - Add to species query:
    ```sql
    s.pressure_weight,
    s.wind_weight
    ```

- [ ] **Task 5.8: Implement pressure scoring** (60 min)
  - Add pressure_score calculation:
    ```sql
    CASE
      -- Rising pressure (1015-1025 hPa) - active feeding before high
      WHEN rc.pressure_trend = 'rising' 
        AND rc.pressure_hpa BETWEEN 1015 AND 1025 THEN 15
      
      -- Stable high pressure (>1020 hPa) - consistent good conditions
      WHEN rc.pressure_trend = 'stable' 
        AND rc.pressure_hpa > 1020 THEN 14
      
      -- Falling pressure (1000-1015 hPa) - fish sense storm, feed heavily
      WHEN rc.pressure_trend = 'falling' 
        AND rc.pressure_hpa BETWEEN 1000 AND 1015 THEN 13
      
      -- Stable moderate (1010-1020) - decent conditions
      WHEN rc.pressure_trend = 'stable'
        AND rc.pressure_hpa BETWEEN 1010 AND 1020 THEN 11
      
      -- Low pressure (<1000 hPa) - storm conditions, poor fishing
      WHEN rc.pressure_hpa < 1000 THEN 4
      
      -- Very high pressure (>1030 hPa) - fish lethargic
      WHEN rc.pressure_hpa > 1030 THEN 6
      
      -- Unknown pressure
      ELSE 8
    END * COALESCE(s.pressure_weight, 0.10) as pressure_score
    ```

- [ ] **Task 5.9: Implement wind scoring** (60 min)
  - Convert wind speed m/s to knots for scoring
  - Add wind_score calculation:
    ```sql
    CASE
      -- Calm (0-3 knots) - excellent for most species
      WHEN (rc.wind_speed_ms * 1.944) < 3 THEN 15
      
      -- Light breeze (4-10 knots) - ideal for most fishing
      WHEN (rc.wind_speed_ms * 1.944) BETWEEN 3 AND 10 THEN 15
      
      -- Moderate breeze (11-16 knots) - good, some surface disturbance
      WHEN (rc.wind_speed_ms * 1.944) BETWEEN 11 AND 16 THEN 13
      
      -- Fresh breeze (17-21 knots) - challenging but fishable
      WHEN (rc.wind_speed_ms * 1.944) BETWEEN 17 AND 21 THEN 10
      
      -- Strong breeze (22-27 knots) - difficult conditions
      WHEN (rc.wind_speed_ms * 1.944) BETWEEN 22 AND 27 THEN 6
      
      -- Gale force (>28 knots) - dangerous, poor fishing
      WHEN (rc.wind_speed_ms * 1.944) > 28 THEN 2
      
      -- Unknown wind
      ELSE 8
    END * COALESCE(s.wind_weight, 0.15) as wind_score
    ```

- [ ] **Task 5.10: Update confidence calculation** (20 min)
  - Add `pressure_score` + `wind_score` to total
  - Adjust max points from 175 to 205 (add 30)
  - Update normalization: `(total / 205) * 100`

##### Part D: Testing & Validation

- [ ] **Task 5.11: Test pressure scenarios** (45 min)
  - Test rising pressure (1018 hPa) - expect +15 points
  - Test falling pressure (1008 hPa) - expect +13 points
  - Test low pressure (995 hPa) - expect +4 points
  - Test very high pressure (1032 hPa) - expect +6 points

- [ ] **Task 5.12: Test wind scenarios** (45 min)
  - Test calm (2 knots) - expect +15 points
  - Test light breeze (8 knots) - expect +15 points
  - Test moderate (15 knots) - expect +13 points
  - Test gale (30 knots) - expect +2 points

- [ ] **Task 5.13: Tune species weights** (60 min)
  - Research species sensitivity to weather
  - Update pressure_weight:
    ```sql
    -- Highly pressure-sensitive (deep water, migration)
    UPDATE species SET pressure_weight = 0.15
    WHERE species_code IN ('bss', 'cod', 'trs'); -- Bass, Cod, Sea Trout
    
    -- Moderately pressure-sensitive
    UPDATE species SET pressure_weight = 0.10
    WHERE species_code IN ('mac', 'pol', 'whi'); -- Mackerel, Pollock, Whiting
    
    -- Less pressure-sensitive (estuarine, shallow)
    UPDATE species SET pressure_weight = 0.05
    WHERE species_code IN ('fle', 'mul'); -- Flounder, Mullet
    ```
  - Update wind_weight similarly

**Files to Create**:
```
supabase/migrations/20251017010_add_weather_columns.sql
supabase/migrations/20251017011_add_pressure_wind_scoring.sql
supabase/migrations/20251017012_tune_weather_weights.sql
lib/services/weatherService.ts
```

**API Keys Needed**:
- OpenWeather API key (free tier: 60 calls/min, 1M calls/mo)
- Estimated cost: Free for initial testing, ~$20/mo for production

---

## 📋 Complete Task Summary

### Week 1: Quick Wins (Day 1-5)
```
Day 1-2: Time-of-Day Scoring
☐ 1.1 Add time calculation helper (30min)
☐ 1.2 Query diurnal_sensitivity (15min)
☐ 1.3 Implement light scoring (45min)
☐ 1.4 Update confidence calc (30min)
☐ 1.5 Update both RPCs (30min)
☐ 1.6 Test scenarios (30min)
Total: 3 hours

Day 2-3: Temperature Optimization
☐ 2.1 Query temp_opt_c (15min)
☐ 2.2 Replace generic scoring (45min)
☐ 2.3 Update completeness (15min)
☐ 2.4 Apply to both RPCs (20min)
☐ 2.5 Test scenarios (20min)
Total: 2 hours

Day 3-5: Habitat Context Bonuses
☐ 3.1 Research habitat detection (30min)
☐ 3.2 Query context_bias (15min)
☐ 3.3 Add habitat logic (60min)
☐ 3.4 Apply bonus multiplier (45min)
☐ 3.5 Update API metadata (30min)
☐ 3.6 Populate context_bias (60min)
☐ 3.7 Test scenarios (30min)
Total: 4.5 hours

Week 1 Total: 9.5 hours
```

### Week 2: Short-Term Enhancements (Day 6-10)
```
Day 6-7: Moon Phase
☐ 4.1 Research calculation (30min)
☐ 4.2 Create moon function (90min)
☐ 4.3 Query lunar_weight (15min)
☐ 4.4 Implement scoring (60min)
☐ 4.5 Update confidence (20min)
☐ 4.6 Add to API response (30min)
☐ 4.7 Tune lunar_weights (60min)
☐ 4.8 Test scenarios (45min)
Total: 5.5 hours

Day 7-10: Weather API Extension
☐ 5.1 Add weather columns (30min)
☐ 5.2 Extend Copernicus script (90min)
☐ 5.3 Add OpenWeather integration (120min)
☐ 5.4 Pressure trend calc (45min)
☐ 5.5 Update cron job (30min)
☐ 5.6 Query pressure/wind (20min)
☐ 5.7 Add weights to query (15min)
☐ 5.8 Implement pressure scoring (60min)
☐ 5.9 Implement wind scoring (60min)
☐ 5.10 Update confidence (20min)
☐ 5.11 Test pressure scenarios (45min)
☐ 5.12 Test wind scenarios (45min)
☐ 5.13 Tune species weights (60min)
Total: 10.5 hours

Week 2 Total: 16 hours
```

### **Grand Total: 25.5 hours over 2 weeks**

---

## 🧪 Testing Strategy

### Test Scenarios Matrix

Create comprehensive test cases covering all combinations:

```sql
-- Test Bass at different times and conditions
SELECT 
  'Bass Dawn Test' as scenario,
  species_code,
  confidence,
  light_score,
  temp_score,
  lunar_score,
  pressure_score,
  wind_score
FROM get_environmental_predictions_enhanced(
  'test_rectangle',
  '2025-10-17'::date,  -- Full moon
  43.5,                 -- Asturias lat
  -8.2,                 -- Asturias lon
  'rock',              -- Rocky substrate
  15.0                 -- 15m depth
)
WHERE species_code = 'bss'
AND EXTRACT(HOUR FROM NOW()) = 6;  -- Dawn

-- Expected results:
-- light_score: 15 (dawn + strong diurnal)
-- temp_score: 25 (if 15°C in 12-18°C range)
-- lunar_score: 10 (full moon + nocturnal)
-- pressure_score: 15 (if rising 1018 hPa)
-- wind_score: 15 (if calm 8 knots)
-- habitat_bonus: +15% (rocky headland)
-- Total: Should be near 100/100
```

### Validation Checklist

- [ ] **Confidence scores stay within 0-100 range**
- [ ] **All species receive scores (no nulls)**
- [ ] **Dawn/dusk species rank higher during those times**
- [ ] **Species with optimal temp get higher scores**
- [ ] **Habitat bonuses apply correctly**
- [ ] **Moon phase affects nocturnal species more**
- [ ] **Weather conditions impact scores logically**
- [ ] **No performance regression (queries <500ms)**

---

## 📊 Expected Outcomes

### Before Enhancements
```
European Sea Bass at 18:30, 15°C, rocky substrate, full moon, rising pressure
Confidence: 60/100
- Bio-bands: 25
- Temp: 20 (generic)
- Substrate: 12 (no GPS)
- Depth: 0 (no GPS)
- Freshness: 18
- Completeness: 15
```

### After All Enhancements
```
European Sea Bass at 18:30, 15°C, rocky substrate, full moon, rising pressure
Confidence: 100/100
- Bio-bands: 25
- Temp: 25 (species-specific optimal)
- Substrate: 20 (GPS + preference match)
- Depth: 25 (GPS + optimal + dusk bonus)
- Light: 15 (dusk + strong diurnal)
- Moon: 10 (full moon + nocturnal)
- Pressure: 15 (rising pressure)
- Wind: 15 (light breeze)
- Habitat: +15% (rocky headland bonus)
- Freshness: 18
- Completeness: 16
```

**Improvement**: +40 points (+67% accuracy)

---

## 🚀 Deployment Plan

### Migration Strategy

1. **Create feature branch**: `feature/scoring-enhancements`
2. **Implement Week 1 enhancements first**
3. **Test thoroughly in development**
4. **Deploy Week 1 to production**
5. **Monitor for 2-3 days**
6. **Implement Week 2 enhancements**
7. **Deploy Week 2 to production**
8. **Monitor and tune weights based on real data**

### Rollback Plan

Each enhancement is independent:
- Time-of-day can be disabled by setting all `light_weight = 0`
- Temp optimization falls back to generic if `temp_opt_c IS NULL`
- Habitat bonus only applies when GPS provided
- Moon phase can be disabled by setting all `lunar_weight = 0`
- Weather scoring defaults to neutral if data unavailable

### Monitoring

Track these metrics post-deployment:
- Average confidence scores (should increase by 10-20 points)
- Score distribution by time of day
- User catch validation rate (aim for 70%+ match with top 5)
- Query performance (target <500ms p95)
- API error rates (should remain <1%)

---

## 💰 Cost Summary

| Item | Cost | Frequency | Notes |
|------|------|-----------|-------|
| Development Time | $0 | One-time | Internal dev work |
| OpenWeather API | $0-20 | Monthly | Free tier likely sufficient initially |
| Copernicus Data | $0 | Free | Already in use |
| Database Storage | ~$1 | Monthly | Small increase for new columns |
| **Total** | **~$20** | **Monthly** | Minimal operational cost |

---

## 📝 Documentation Updates Needed

After implementation, update these docs:

- [ ] `FINDR_PREDICTIONS_DATA_SOURCES.md` - Add new scoring components
- [ ] `RPC_CURRENT_STATE.md` - Update function signatures and scoring breakdown
- [ ] `API_COMPREHENSIVE_COPERNICUS_COMPLETE.md` - Note weather API addition
- [ ] Create `FINDR_SCORING_ALGORITHM_V2.md` - Complete scoring documentation

---

## ✅ Success Criteria

**Week 1 Complete When**:
- ✅ Bass ranks 15 points higher at dawn vs midday
- ✅ Mackerel at 15°C scores better than at 8°C
- ✅ Bass at rocky headland gets +15% confidence boost
- ✅ All tests pass
- ✅ No performance regression

**Week 2 Complete When**:
- ✅ Moon phase impacts nocturnal species scores
- ✅ Rising pressure increases all species scores
- ✅ Calm wind conditions score higher than gales
- ✅ Weather data ingested successfully for 100+ rectangles
- ✅ All tests pass

**Project Complete When**:
- ✅ Deployed to production
- ✅ Confidence scores improved by 15-25 points on average
- ✅ User feedback is positive
- ✅ No critical bugs reported after 1 week

---

## 🎯 Next Steps

1. **Review this plan** with team
2. **Set up development environment**
3. **Create feature branch**
4. **Start with Task 1.1** (Time calculation helper)
5. **Work through checklist sequentially**
6. **Test after each enhancement**
7. **Deploy in phases**
8. **Monitor and iterate**

Let's build the most accurate fishing predictions in the industry! 🎣
