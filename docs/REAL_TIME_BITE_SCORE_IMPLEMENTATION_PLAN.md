# Real-Time Bite Score Implementation Plan
**Date**: October 29, 2025
**Focus**: Moment-specific factors that matter RIGHT NOW

## 🎯 New Scoring Framework (100 points total)

| Component | Max | Why Now? | Data Source | Status |
|-----------|-----|----------|-------------|--------|
| tide_moment_score | 25 | Flow turns fish on/off | WorldTides API + calculation | ⏳ TODO |
| light_moment_score | 20 | Dawn/dusk/night flips feeding | Current (working) | ✅ DONE |
| wind_wave_turbidity_score | 15 | Surface chop, stirred bait | findr_conditions_snapshots | ⏳ TODO |
| pressure_trend_score | 10 | Rising/steady > falling | MET Norway | ⏳ TODO |
| temp_bio_indicators_score | 10 | Within species band or penalize | grid_conditions_latest + species_bio_bands | ⏳ TODO |
| water_clarity_score | 10 | Sight vs ambush species | kd490 (CMEMS) + clarity_weight | ⏳ TODO |
| micro_weather_score | 5 | Clouds/drizzle/squalls | MET Norway / OpenMeteo | ⏳ TODO |
| lunar_window_score | 5 | Solunar major/minor periods | John Alden Knight algorithm | ⏳ TODO |

**Realistic maximum**: 80-90 with everything firing

---

## 📊 Data Inventory

### Currently Available:

**grid_conditions_latest**:
- ✅ `surface_temperature_c` (1,054/1,082 cells = 97.4%)
- ✅ `chlorophyll_mg_m3` (489 cells)
- ✅ `oxygen_mg_l` (489 cells)
- ✅ `salinity_psu` (489 cells)

**findr_conditions_snapshots**:
- ✅ `wind_speed_kts`, `wind_direction_deg`
- ✅ `wave_height_m`, `wave_hs_m` (significant wave height)
- ✅ `wave_period_s`, `wave_direction_deg`
- ✅ `wind_sea_height_m`
- ✅ `next_high_tide_iso`, `next_low_tide_iso`
- ✅ `tide_phase`, `tide_stage`, `tide_height_m`
- ✅ `kd490` (water clarity from CMEMS)

**species table**:
- ✅ `clarity_weight` (sight feeder weighting)
- ✅ `is_night_species` (nocturnal classification)
- ✅ `temp_opt_c` (optimal temperature range)

**species_bio_bands table**:
- ✅ `happy_bands`, `unhappy_bands` (environmental preferences)
- ✅ Parameters: surfaceTemperature, chlorophyll, oxygen, salinity

**moon_cache table**:
- ✅ `moon_phase_name`, `moon_illumination_pct`
- ✅ `sunrise_iso`, `sunset_iso`, `moonrise_iso`, `moonset_iso`

### Need to Source:

- ❌ Barometric pressure trend (MET Norway)
- ❌ Cloud cover % (MET Norway / OpenMeteo)
- ❌ Precipitation type/intensity (MET Norway / OpenMeteo)
- ❌ Tide flow speed (calculate from WorldTides or phase)

---

## 🔨 Implementation Steps

### Phase 1: Data Pipeline (Week 1)

**1.1 Add MET Norway Pressure Data**
```typescript
// Fetch barometric pressure with 3-6 hour history
// Calculate trend: rising (>1 hPa/3h), steady (±1 hPa), falling (<-1 hPa)
// Store in: grid_conditions_latest.pressure_hpa, pressure_trend
```

**1.2 Add MET Norway Micro-Weather**
```typescript
// Fetch: cloud_cover_pct, precipitation_mm, weather_condition_code
// Store in: grid_conditions_latest.cloud_cover_pct, precipitation_type
```

**1.3 Calculate Tide Flow Speed**
```typescript
// From next_high_tide_iso and next_low_tide_iso:
// - Calculate minutes to next tide change
// - Estimate flow speed: max at mid-flood/mid-ebb, min at slack
// - Store in: grid_conditions_latest.tide_flow_speed_ms
```

**1.4 Verify Wind/Wave Data in Grid**
```sql
-- Check if wind_speed_kts, wave_height_m are in grid_conditions_latest
-- If not, migrate from findr_conditions_snapshots waterfall
```

### Phase 2: Scoring Functions (Week 2)

**2.1 tide_moment_score (25 pts)**
```sql
CREATE FUNCTION score_tide_moment(
  tide_phase text,  -- early_flood, mid_flood, high, early_ebb, mid_ebb, low_slack
  flow_speed_ms numeric,  -- 0-2+ m/s
  species_tide_sensitivity numeric,  -- 0.2-0.9
  minutes_to_change integer  -- time until next tide change
) RETURNS integer;

-- Scoring logic:
-- - Species with high tide_sensitivity (>0.7): 25 pts at mid-flood/mid-ebb
-- - Species with low tide_sensitivity (<0.3): 15 pts at slack
-- - Flow speed multiplier: 1.0 at optimal, 0.5 at slack
-- - Time penalty: -5 pts if >90 min from tide change (for high-tide species)
```

**2.2 pressure_trend_score (10 pts)**
```sql
CREATE FUNCTION score_pressure_trend(
  pressure_trend text  -- 'rising', 'steady', 'falling', 'rapid_drop'
) RETURNS integer;

-- Scoring logic:
-- - Rising: 10 pts (fish active)
-- - Steady: 8 pts (stable conditions)
-- - Falling: 5 pts (reduced activity)
-- - Rapid drop (<-3 hPa/3h): 2 pts (bite often stalls)
```

**2.3 wind_wave_turbidity_score (15 pts)**
```sql
CREATE FUNCTION score_wind_wave_turbidity(
  wind_speed_kts numeric,
  wind_direction_deg numeric,
  wave_height_m numeric,
  species_wind_sensitivity numeric,  -- 0.25-0.75
  shore_direction_deg numeric  -- for onshore vs offshore
) RETURNS integer;

-- Scoring logic:
-- - Calm (<5 kts): 15 pts for calm-water species, 8 pts for current-feeders
-- - Light chop (5-15 kts): 15 pts for most species (optimal bait movement)
-- - Moderate (15-25 kts): 10 pts (reduced for surface feeders)
-- - Heavy (>25 kts): 3 pts (poor conditions)
-- - Onshore wind bonus: +2 pts (pushes bait to shore)
-- - Wave height penalty: -1 pt per 0.5m above species comfort zone
```

**2.4 temp_bio_indicators_score (10 pts)**
```sql
CREATE FUNCTION score_temp_bio_indicators(
  species_id uuid,
  current_temp numeric,
  chlorophyll numeric,
  oxygen numeric,
  salinity numeric
) RETURNS integer;

-- Scoring logic (binary gates):
-- Temperature (hard gate):
--   - Within optimal band: 5 pts
--   - In "unhappy" band: 0 pts (hard gate, blocks bite)
--   - Outside all bands: 2 pts (marginal)
--
-- Bio indicators (additive, max 5 pts):
--   - Each parameter in "happy" band: +2 pts
--   - Each parameter in "unhappy" band: 0 pts
--   - Neutral: +1 pt
--   - Max 5 pts from chlorophyll, oxygen, salinity combined
```

**2.5 water_clarity_score (10 pts)**
```sql
CREATE FUNCTION score_water_clarity(
  species_id uuid,
  kd490 numeric,  -- 0.04 (very clear) to 0.5+ (very turbid)
  species_clarity_weight numeric  -- 0.0-1.0 (sight feeder importance)
) RETURNS integer;

-- Scoring logic:
-- - Sight feeders (clarity_weight > 0.7):
--     kd490 < 0.1 (clear): 10 pts
--     kd490 0.1-0.2 (moderate): 7 pts
--     kd490 > 0.2 (turbid): 3 pts
--
-- - Ambush predators (clarity_weight < 0.3):
--     kd490 > 0.2 (turbid): 10 pts (love cover!)
--     kd490 0.1-0.2 (moderate): 7 pts
--     kd490 < 0.1 (clear): 4 pts
--
-- - Opportunistic (0.3-0.7): 7 pts regardless (adaptable)
```

**2.6 micro_weather_score (5 pts)**
```sql
CREATE FUNCTION score_micro_weather(
  cloud_cover_pct numeric,  -- 0-100
  precipitation_type text,  -- 'none', 'drizzle', 'light', 'heavy', 'squall'
  is_night_species boolean
) RETURNS integer;

-- Scoring logic:
-- - Clear skies, no precipitation: 3 pts (neutral)
-- - Light overcast (30-70%): 5 pts (optimal - diffused light)
-- - Heavy overcast (>70%): 4 pts for day species, 5 pts for nocturnal
-- - Light drizzle: 5 pts (insects/bait active on surface)
-- - Heavy rain: 2 pts (poor visibility, fish retreat)
-- - Squalls: 1 pt (dangerous, bite stops)
```

**2.7 lunar_window_score (5 pts)**
```sql
CREATE FUNCTION score_lunar_window(
  current_time_utc timestamp,
  moon_transit_time timestamp,  -- when moon crosses meridian
  moon_illumination_pct numeric
) RETURNS integer;

-- John Alden Knight's Solunar Theory:
-- - Major period: 2 hours centered on moon overhead/underfoot (transit ± 1h)
-- - Minor period: 2 hours centered on moonrise/moonset
-- - Peak activity at new/full moon (high illumination differential)
--
-- Scoring:
-- - During major period + high illumination: 5 pts
-- - During minor period + high illumination: 4 pts
-- - During major period + low illumination: 4 pts
-- - Outside periods: 2 pts (baseline activity)
```

### Phase 3: RPC Function Update (Week 3)

**Replace `get_global_fishing_predictions` with**:
```sql
CREATE OR REPLACE FUNCTION get_real_time_fishing_predictions(
  user_lat numeric,
  user_lon numeric,
  target_datetime timestamp DEFAULT NOW(),
  p_lang text DEFAULT 'en'
)
RETURNS TABLE (
  species_id uuid,
  species_code text,
  name_en text,
  bite_score integer,  -- 0-100 (realistic max: 80-90)

  -- Component scores for UI breakdown
  tide_moment_score integer,
  light_moment_score integer,
  wind_wave_turbidity_score integer,
  pressure_trend_score integer,
  temp_bio_indicators_score integer,
  water_clarity_score integer,
  micro_weather_score integer,
  lunar_window_score integer,

  -- Metadata
  grid_cell_id text,
  has_complete_data boolean,
  data_freshness_minutes integer
)
```

### Phase 4: UI Presentation (Week 4)

**4.1 Primary Display**
```tsx
// Show bite_score prominently: "78%" with color gradient
// Green (70-100), Yellow (40-69), Red (0-39)
```

**4.2 Expandable Breakdown**
```tsx
<ScoreBreakdown>
  <ScoreFactor
    name="Tide & Flow"
    score={25}
    max={25}
    icon="🌊"
    status="excellent"  // green
    explanation="Perfect mid-flood tide for this species"
  />
  <ScoreFactor
    name="Light Conditions"
    score={15}
    max={20}
    icon="🌅"
    status="good"
    explanation="Dawn approaching - prime feeding window"
  />
  {/* ... other factors */}
</ScoreBreakdown>
```

**4.3 Real-Time Indicators**
```tsx
// Update bite_score every 15 minutes as conditions change
// Show "⏰ Best bite in 47 minutes" when solunar/tide aligns
// Flash notification when score jumps >10 pts ("Bite window opening!")
```

---

## 🧪 Testing Plan

### Unit Tests:
- [ ] Each scoring function with edge cases
- [ ] Temperature hard gates (unsuitable temps = 0)
- [ ] Tide flow calculation accuracy
- [ ] Solunar period calculation vs published tables

### Integration Tests:
- [ ] Full RPC with all 8 components
- [ ] Data freshness handling (stale data penalties)
- [ ] Multiple species ranking consistency

### Real-World Validation:
- [ ] Compare predictions to actual catch logs (findr_catch_entries)
- [ ] A/B test: old vs new scoring (track validation accuracy)

---

## 📈 Success Metrics

**Before (Current System)**:
- Bite scores: 38-75 range
- Bio_band_score: 0-30 (often 0 due to missing data)
- No real-time awareness (scores same at 3am vs 6am)

**After (Real-Time System)**:
- Bite scores: 15-90 range (wider, more dynamic)
- Scores change every 15 minutes with conditions
- "Best bite NOW" vs "wait 2 hours for tide turn"
- Hard gates eliminate impossible catches

**KPIs**:
- Catch validation accuracy: Target >70% (species predicted in top 10 were caught)
- User engagement: Session length +30% (checking updates)
- Catch logging: +50% entries (users trust predictions more)

---

## 🚀 Rollout Strategy

**Week 1**: Backend data pipeline (pressure, micro-weather, tide flow)
**Week 2**: Scoring functions + unit tests
**Week 3**: RPC function + integration tests
**Week 4**: UI implementation + A/B testing
**Week 5**: Production rollout with monitoring

**Rollback Plan**: Keep old `get_global_fishing_predictions` as fallback if new system fails.
