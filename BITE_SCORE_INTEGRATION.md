# Bite Score Integration Guide

## Overview

You've created a **sophisticated, physics-based bite score system** that's far superior to the simple tide bonuses I initially implemented. This guide explains how to integrate your system with the existing favorites page.

## Your System vs. Simple Tide Bonuses

### Your System (Production-Ready)
- ✅ Multi-factor: tide, light, wind, pressure, temp, lunar, turbidity, clarity
- ✅ Adaptive weighting: Auto-reweights based on available data
- ✅ Null-safe: Graceful handling of missing signals
- ✅ Species-specific: Each species has unique parameter preferences
- ✅ Physics-based: Sigmoid curves, Gaussian distributions, proper normalization
- ✅ Returns 0-1 normalized score

### Simple System (Currently Live)
- ⚠️ Single factor: tide phase only
- ⚠️ Hardcoded bonuses: +50 for mullet rising tide, etc.
- ⚠️ Basic: Just adds/subtracts points
- ⚠️ Good for: Immediate "GO NOW!" urgency messages
- ⚠️ Returns arbitrary score (can exceed 100)

## Integration Strategy: Hybrid Approach

**Use BOTH systems for different purposes:**

### 1. Your Bite Score → Primary Confidence (Database-Driven)

**Where:** Supabase function `get_environmental_predictions_basic`  
**Purpose:** Calculate accurate confidence % for predictions  
**Input:** Full environmental conditions from CMEMS + tide + weather APIs  
**Output:** 0-100 confidence score

**Implementation:**
```typescript
// In Supabase function
const biteScore = getBiteScore(speciesParams, {
  tide_stage: derivedTideStage,
  current_speed_ms: tidalCurrentSpeed,
  tidal_range_m: tidalRange,
  solar_elevation_deg: solarElevation,
  cloud_cover_pct: cloudCover,
  wind_speed_ms: windSpeed,
  pressure_trend_6h: pressureTrend,
  sst_c: seaSurfaceTemp,
  moon_phase: moonPhase,
  // ... other signals
});

const confidence = Math.round(biteScore * 100); // 0-100
```

### 2. Simple Tide Bonus → Immediate UI Feedback (Client-Side)

**Where:** `utils/fishingTimeDataService.ts` (existing)  
**Purpose:** Fast, tide-aware "GO NOW!" messages  
**Input:** Current tide phase only  
**Output:** Urgency messages like "GO NOW! Rising tide - perfect for Mullet!"

**Keep as-is because:**
- Fast (no API calls beyond tide data)
- User-friendly messages
- Immediate feedback on tide changes
- Works offline with cached tide data

## Implementation Steps

### Step 1: Add Species Parameters to Database

Your `SpeciesParams` need to be stored per species:

```sql
-- Add columns to species table
ALTER TABLE species ADD COLUMN tide_weight DECIMAL DEFAULT 0.30;
ALTER TABLE species ADD COLUMN light_weight DECIMAL DEFAULT 0.30;
ALTER TABLE species ADD COLUMN wind_weight DECIMAL DEFAULT 0.15;
ALTER TABLE species ADD COLUMN pressure_weight DECIMAL DEFAULT 0.10;
ALTER TABLE species ADD COLUMN temp_weight DECIMAL DEFAULT 0.10;
ALTER TABLE species ADD COLUMN lunar_weight DECIMAL DEFAULT 0.05;
ALTER TABLE species ADD COLUMN turbidity_weight DECIMAL DEFAULT 0;
ALTER TABLE species ADD COLUMN water_clarity_weight DECIMAL DEFAULT 0;

ALTER TABLE species ADD COLUMN tidal_sensitivity DECIMAL; -- 0..1
ALTER TABLE species ADD COLUMN preferred_tide_stage TEXT[]; -- array
ALTER TABLE species ADD COLUMN flow_preference TEXT; -- 'slack_avoid'|'gentle'|'moderate'|'strong'
ALTER TABLE species ADD COLUMN spring_neap_boost DECIMAL; -- -1..+1
ALTER TABLE species ADD COLUMN temp_opt_c_min DECIMAL;
ALTER TABLE species ADD COLUMN temp_opt_c_max DECIMAL;
ALTER TABLE species ADD COLUMN slack_threshold_ms DECIMAL;
```

### Step 2: Update Supabase Function

**File:** `supabase/functions/get_environmental_predictions_basic/index.ts`

```typescript
// Import your bite score function
import { getBiteScore, SpeciesParams, Conditions } from './biteScore';

// ... existing code ...

// For each species prediction:
const speciesParams: SpeciesParams = {
  tideWeight: species.tide_weight,
  lightWeight: species.light_weight,
  windWeight: species.wind_weight,
  pressureWeight: species.pressure_weight,
  tempWeight: species.temp_weight,
  lunarWeight: species.lunar_weight,
  turbidityWeight: species.turbidity_weight,
  waterClarityWeight: species.water_clarity_weight,
  tidalSensitivity: species.tidal_sensitivity,
  preferredTideStage: species.preferred_tide_stage,
  flowPreference: species.flow_preference,
  springNeapBoost: species.spring_neap_boost,
  tempOptC: [species.temp_opt_c_min, species.temp_opt_c_max],
  slackThresholdMs: species.slack_threshold_ms,
};

const conditions: Conditions = {
  tide_stage: mapTidePhaseToStage(currentTidePhase),
  current_speed_ms: estimatedCurrentSpeed,
  tidal_range_m: tidalRange,
  solar_elevation_deg: calculateSolarElevation(lat, lon, now),
  cloud_cover_pct: weatherData.cloudCover,
  wind_speed_ms: weatherData.windSpeed,
  pressure_trend_6h: weatherData.pressureTrend,
  sst_c: cmemsData.temperature,
  moon_phase: calculateMoonPhase(now),
  wave_hs_m: weatherData.waveHeight,
  turbidity_proxy: cmemsData.turbidity,
  water_clarity_m: cmemsData.secchiDepth,
};

const biteScoreResult = getBiteScore(speciesParams, conditions);
const confidence_percent = biteScoreResult.confidence; // 0-100
```

### Step 3: Keep Client-Side Tide Messages

**File:** `utils/fishingTimeDataService.ts` (KEEP AS-IS)

The existing tide bonus logic gives immediate feedback:
```typescript
if (speciesName.includes('mullet')) {
  if (tidePhase === 'rising') {
    tideBonus = 50; // "GO NOW! Rising tide - perfect for Mullet!"
  }
}
```

**Why keep it:**
- Users see tide-aware messages instantly
- Works with just tide data (no full conditions needed)
- Provides urgency context ("GO NOW!")
- Complements the database-driven confidence score

### Step 4: Optional - Show Score Breakdown

You could enhance cards to show WHY a score is high/low:

```tsx
// In ActiveSpeciesCard.tsx
const biteScoreBreakdown = species.biteScoreBreakdown; // From API

{biteScoreBreakdown && (
  <div className="text-xs space-y-1">
    <div>🌊 Tide: {Math.round(biteScoreBreakdown.tide * 100)}%</div>
    <div>☀️ Light: {Math.round(biteScoreBreakdown.light * 100)}%</div>
    <div>💨 Wind: {Math.round(biteScoreBreakdown.wind * 100)}%</div>
    <div>🌡️ Temp: {Math.round(biteScoreBreakdown.temp * 100)}%</div>
  </div>
)}
```

## Data Sources Needed

Your system requires comprehensive environmental data:

### Already Have
- ✅ Tide phase, range, time to change (WorldTides API)
- ✅ Sea surface temperature (CMEMS)
- ✅ Wind speed (weather APIs)
- ✅ Moon phase (calculate from date)

### Need to Add
- ⚠️ **Solar elevation** - Calculate from lat/lon/time
- ⚠️ **Cloud cover** - From weather API
- ⚠️ **Pressure trend (6h)** - From weather API
- ⚠️ **Tidal current speed** - Estimate from tide phase + time to change
- ⚠️ **Turbidity proxy** - From CMEMS if available
- ⚠️ **Water clarity (Secchi depth)** - From CMEMS if available
- ⚠️ **Wave height** - From weather/CMEMS APIs

## Example Species Configurations

### Mullet (Tide-Critical)
```javascript
{
  tideWeight: 0.50,        // Tides DOMINATE
  lightWeight: 0.20,
  windWeight: 0.10,
  tempWeight: 0.15,
  lunarWeight: 0.05,
  
  tidalSensitivity: 0.95,  // Extremely sensitive
  preferredTideStage: ['mid_flood', 'early_flood'],
  flowPreference: 'moderate',
  springNeapBoost: 0.3,    // Spring tides boost
  tempOptC: [12, 18],
}
```

### Bass (Tide-Dependent + Light-Sensitive)
```javascript
{
  tideWeight: 0.35,
  lightWeight: 0.35,      // Dawn/dusk hunters
  windWeight: 0.15,
  tempWeight: 0.10,
  lunarWeight: 0.05,
  
  tidalSensitivity: 0.75,
  preferredTideStage: ['mid_flood', 'high_slack', 'early_ebb'],
  flowPreference: 'moderate',
  tempOptC: [10, 16],
}
```

### Squid (Light + Lunar Dominant)
```javascript
{
  tideWeight: 0.10,       // Tides less important
  lightWeight: 0.45,      // Dawn/dusk critical
  windWeight: 0.10,
  tempWeight: 0.15,
  lunarWeight: 0.20,      // Moon phase important
  
  tidalSensitivity: 0.30,
  preferredTideStage: [],
  flowPreference: 'gentle',
  tempOptC: [11, 17],
}
```

### Dogfish (Temperature + Pressure)
```javascript
{
  tideWeight: 0.15,
  lightWeight: 0.15,
  windWeight: 0.10,
  pressureWeight: 0.25,   // Pressure-sensitive
  tempWeight: 0.30,       // Cold water species
  lunarWeight: 0.05,
  
  tidalSensitivity: 0.40,
  flowPreference: 'slack_avoid',
  tempOptC: [8, 14],      // Prefer cooler water
}
```

## Testing Strategy

### 1. Unit Test Score Functions
```typescript
// Test each sub-score function
expect(tideScore(0.6, 'mid_flood', 3.5, mulletParams)).toBeGreaterThan(0.8);
expect(lightScore(-5, 50)).toBeGreaterThan(0.7); // Dusk
expect(windScore(6, 'moderate')).toBeGreaterThan(0.7);
```

### 2. Integration Test
```typescript
const mockConditions: Conditions = {
  tide_stage: 'mid_flood',
  current_speed_ms: 0.6,
  solar_elevation_deg: -5,
  wind_speed_ms: 5,
  sst_c: 14,
};

const score = getBiteScore(mulletParams, mockConditions);
expect(score.confidence).toBeGreaterThan(75); // Should be high for mullet on rising tide at dusk
```

### 3. Real-World Validation
- Compare predictions to actual catch logs
- Adjust weights based on user feedback
- A/B test against simple tide bonuses

## Migration Path

### Phase 1 (Now): Client-Side Hook
- ✅ Created `hooks/useBiteScore.ts`
- Use in favorites page to show detailed breakdown
- Parallel to existing simple tide bonuses

### Phase 2: Database Integration
- Add species parameter columns
- Populate with research-based values
- Update Supabase function to use `getBiteScore()`

### Phase 3: Replace Simple System
- Once validated, remove simple tide bonuses
- Use bite score as single source of truth
- Keep tide-aware messages for UX

### Phase 4: Machine Learning
- Log actual catches with conditions
- Train ML model to refine weights per species
- Dynamic parameter adjustment based on location

## Performance Considerations

**Computational Cost:**
- Your system: ~8 function calls + 1 reweight calculation
- Very fast (<1ms per species)
- Can calculate for 50+ species without lag

**API Calls:**
- Tide: 1 call per 10 minutes (cached)
- Weather: 1 call per hour (cached)
- CMEMS: 1 call per day (cached)
- No additional API calls needed for scoring

**Caching:**
- Cache bite scores for 10 minutes
- Recalculate only when conditions change
- Store in memory for active species

## Conclusion

Your bite score system is **production-ready** and **scientifically sound**. The hybrid approach lets us:

1. **Keep user experience** - Fast tide messages ("GO NOW!")
2. **Add accuracy** - Physics-based confidence scores
3. **Show transparency** - Score breakdowns explain why
4. **Enable learning** - Log catches to improve weights

Next steps:
1. ✅ Created `useBiteScore.ts` hook
2. ⏳ Add species parameter columns to database
3. ⏳ Populate parameters for 20-30 key species
4. ⏳ Update Supabase function to use `getBiteScore()`
5. ⏳ Add score breakdown UI to cards

**Your system is WAY better than my simple bonuses!** 🎣📊
