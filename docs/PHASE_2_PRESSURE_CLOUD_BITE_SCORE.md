# Phase 2: Pressure & Cloud Cover Bite Score Integration

**Date:** November 4, 2025
**Status:** 🚧 Ready to Implement
**Dependencies:** Phase 1 Complete ✅

---

## Overview

Phase 2 integrates the newly available **air pressure** and **cloud cover** data from Phase 1 into the bite score calculation. This completes two critical components of the weather score and adds a new cloud/light interaction factor.

### What Phase 1 Delivered

✅ `air_pressure_hpa` - Mean sea level pressure (OpenMeteo/MET Norway)
✅ `cloud_cover_pct` - Cloud cover percentage 0-100 (OpenMeteo/MET Norway)
✅ ~100% coverage expected after next ingestion (tomorrow)

### What Phase 2 Will Add

1. **Pressure Trend Scoring** (10 points) - Rising/steady/falling pressure impact
2. **Cloud Cover Scoring** (5 points) - Species-specific cloud preferences
3. **Light × Cloud Interaction** (Enhancement) - Amplify dawn/dusk in overcast conditions

---

## Current Bite Score Status

### Implemented Components (Database)

From `BITE_SCORE_COMPLETE_ALGORITHM.md`:

| Component | Points | Status | Data Source |
|-----------|--------|--------|-------------|
| Temperature | 40 max | ✅ Working | CMEMS `surface_temperature_c` |
| Tide | 30 max | ⏳ Placeholder (0 pts) | WorldTides API (available but not scored) |
| Light/Diurnal | 15 max | ✅ Working | Time-based calculation |
| Lunar Phase | 10 max | ✅ Working | `moon_cache` table |
| Wind | 10 max | ✅ Working | `findr_conditions_snapshots.wind_speed_kts` |
| **Pressure** | **10 max** | ❌ **Missing** | `air_pressure_hpa` **(NOW AVAILABLE)** |
| Bio Factors | 5 max | ✅ Working | `species_bio_bands` |
| Habitat Bonus | 10 max | ✅ Working | Species-specific rules |

### Current Implementation Gap

The bite score algorithm in `supabase/migrations/20251018014_add_bite_score_calculation.sql` currently has:

```sql
-- Pressure Component (weight: 0.10) - Lines 116-123
CASE
  WHEN current_pressure_hpa IS NULL THEN 5
  WHEN current_pressure_hpa > 1020 THEN 10   -- High pressure (stable)
  WHEN current_pressure_hpa > 1010 THEN 8    -- Normal
  WHEN current_pressure_hpa > 1000 THEN 6    -- Low
  ELSE 4                                      -- Very low (storms)
END * COALESCE(pressure_weight, 0.10)
```

**Problem:** This only scores static pressure, not the **trend** (rising/falling), which is what fish actually respond to.

**No Cloud Cover Scoring:** Cloud cover is not currently part of the bite score algorithm at all.

---

## Phase 2 Implementation Plan

### 2.1 Add Pressure Trend Calculation

**Objective:** Calculate 3-hour and 6-hour pressure trends to detect rising/falling patterns.

#### Database Schema Addition

```sql
-- Add to findr_conditions_snapshots (or new table)
ALTER TABLE findr_conditions_snapshots
ADD COLUMN pressure_trend_3h_hpa REAL,
ADD COLUMN pressure_trend_6h_hpa REAL,
ADD COLUMN pressure_trend_category TEXT; -- 'rising', 'steady', 'falling', 'rapid_falling'
```

**Trend Categories:**
- `rising`: +2 hPa or more in 3h
- `steady`: -2 to +2 hPa in 3h
- `falling`: -2 to -5 hPa in 3h
- `rapid_falling`: < -5 hPa in 3h (storm approaching)

#### Calculation Script

Create `scripts/calculate-pressure-trends.ts`:

```typescript
/**
 * Calculate pressure trends from historical snapshots
 * Run after daily ingestion to compute trends
 */

async function calculatePressureTrends(rectangleCode: string, currentTime: Date) {
  // 1. Fetch current pressure
  const current = await supabase
    .from('findr_conditions_snapshots')
    .select('air_pressure_hpa')
    .eq('rectangle_code', rectangleCode)
    .eq('captured_at', currentTime)
    .single();

  // 2. Fetch 3h and 6h historical pressures
  const history3h = await supabase
    .from('findr_conditions_snapshots')
    .select('air_pressure_hpa')
    .eq('rectangle_code', rectangleCode)
    .gte('captured_at', new Date(currentTime.getTime() - 3 * 60 * 60 * 1000))
    .lt('captured_at', currentTime)
    .order('captured_at', { ascending: false })
    .limit(1);

  // 3. Calculate trend
  if (current.data && history3h.data?.[0]) {
    const trend3h = current.data.air_pressure_hpa - history3h.data[0].air_pressure_hpa;

    let category: string;
    if (trend3h >= 2) category = 'rising';
    else if (trend3h <= -5) category = 'rapid_falling';
    else if (trend3h <= -2) category = 'falling';
    else category = 'steady';

    // 4. Update snapshot with trend
    await supabase
      .from('findr_conditions_snapshots')
      .update({
        pressure_trend_3h_hpa: trend3h,
        pressure_trend_category: category
      })
      .eq('rectangle_code', rectangleCode)
      .eq('captured_at', currentTime);
  }
}
```

**Integration Point:** Add to `scripts/ingestFindrConditions.ts` after snapshot insert, or run as separate post-processing step.

### 2.2 Update Bite Score Algorithm - Pressure Trend

**Replace** the existing pressure scoring (Lines 116-123) with trend-aware scoring:

```sql
-- Pressure Trend Component (weight: 0.10) → 10 points
CASE
  WHEN pressure_trend_category IS NULL THEN 5  -- No trend data
  WHEN pressure_trend_category = 'rising' THEN 8  -- Rising pressure: fish feed moderately
  WHEN pressure_trend_category = 'steady' THEN 10  -- Steady pressure: BEST for feeding
  WHEN pressure_trend_category = 'falling' THEN 12  -- Falling pressure: fish feed aggressively!
  WHEN pressure_trend_category = 'rapid_falling' THEN 6  -- Storm approaching: activity drops
  ELSE 5
END * COALESCE(pressure_weight, 0.10)
```

**Scientific Rationale:**
- **Falling Pressure (Best):** Fish sense approaching weather fronts, feed heavily before storms
- **Steady Pressure:** Stable conditions, consistent feeding
- **Rising Pressure:** Post-storm, fish less active as system stabilizes
- **Rapid Falling:** Imminent storm, fish seek shelter, feeding stops

**Migration File:** `supabase/migrations/20251105001_add_pressure_trend_scoring.sql`

### 2.3 Add Cloud Cover Scoring

**Objective:** Add cloud cover as a new component that interacts with light conditions.

#### Species-Specific Cloud Preferences

Add to `species` table:

```sql
ALTER TABLE species
ADD COLUMN cloud_preference TEXT DEFAULT 'neutral',  -- 'overcast', 'partly_cloudy', 'clear', 'neutral'
ADD COLUMN cloud_weight REAL DEFAULT 0.05;
```

**Species Examples:**
- **Bass** (`cloud_preference: 'overcast'`, `cloud_weight: 0.08`): Hunt better in low light
- **Mackerel** (`cloud_preference: 'partly_cloudy'`, `cloud_weight: 0.05`): Visual feeders, need some light
- **Wrasse** (`cloud_preference: 'clear'`, `cloud_weight: 0.03`): Daytime sight feeders

#### Cloud Cover Scoring Function

```sql
-- Cloud Cover Component (weight: 0.05) → 5 points
CASE
  WHEN cloud_cover_pct IS NULL THEN 5  -- No data
  WHEN cloud_preference = 'overcast' THEN
    CASE
      WHEN cloud_cover_pct > 80 THEN 10  -- Heavy overcast
      WHEN cloud_cover_pct > 60 THEN 8   -- Overcast
      WHEN cloud_cover_pct > 40 THEN 6   -- Partly cloudy
      ELSE 4  -- Clear skies (suboptimal for ambush predators)
    END
  WHEN cloud_preference = 'partly_cloudy' THEN
    CASE
      WHEN cloud_cover_pct BETWEEN 40 AND 70 THEN 10  -- Ideal
      WHEN cloud_cover_pct BETWEEN 20 AND 80 THEN 8
      ELSE 6  -- Too clear or too overcast
    END
  WHEN cloud_preference = 'clear' THEN
    CASE
      WHEN cloud_cover_pct < 30 THEN 10  -- Clear skies
      WHEN cloud_cover_pct < 50 THEN 8   -- Mostly clear
      WHEN cloud_cover_pct < 70 THEN 6   -- Partly cloudy
      ELSE 4  -- Overcast (suboptimal for sight feeders)
    END
  ELSE 5  -- Neutral species
END * COALESCE(cloud_weight, 0.05)
```

**Migration File:** `supabase/migrations/20251105002_add_cloud_cover_scoring.sql`

### 2.4 Light × Cloud Interaction (Bonus)

**Objective:** Amplify dawn/dusk scores when combined with overcast conditions (prime ambush feeding time).

```sql
-- Light + Cloud Interaction Bonus (max +3 points)
CASE
  WHEN time_category IN ('dawn', 'dusk')
   AND cloud_cover_pct > 60
   AND diurnal_sensitivity = 'strong' THEN 3  -- Perfect ambush conditions!
  WHEN time_category IN ('dawn', 'dusk')
   AND cloud_cover_pct > 60 THEN 2  -- Good conditions
  WHEN time_category IN ('dawn', 'dusk')
   AND cloud_cover_pct > 40 THEN 1  -- Slight bonus
  ELSE 0
END
```

**Example Impact:**
- **Bass at dusk with 70% cloud cover:**
  - Light score: 15 pts
  - Cloud score: 8 pts
  - Interaction bonus: +3 pts
  - **Total: 26 pts from light/cloud** (vs 15 pts without cloud data)

---

## Updated Bite Score Point Distribution

After Phase 2 implementation:

| Component | Max Points | Status | Notes |
|-----------|------------|--------|-------|
| Temperature | 40 | ✅ Working | Core species matching |
| Tide | 30 | ⏳ TODO | Awaiting tide flow calculation |
| Light/Diurnal | 15 | ✅ Working | Time-based |
| Lunar Phase | 10 | ✅ Working | Moon cache |
| **Pressure Trend** | **10** | **🆕 Phase 2** | **Rising/steady/falling** |
| Wind | 10 | ✅ Working | Wind speed |
| Bio Factors | 5 | ✅ Working | Chlorophyll/O2/salinity |
| **Cloud Cover** | **5** | **🆕 Phase 2** | **Species-specific** |
| **Light × Cloud Bonus** | **3** | **🆕 Phase 2** | **Interaction amplifier** |
| Habitat Bonus | 10 | ✅ Working | Species rules |

**New Theoretical Maximum:** 138 points (up from 120)
**Realistic Maximum:** 95-105 points with all factors favorable

---

## Implementation Checklist

### Week 1: Data Pipeline

- [ ] **Day 1-2:** Add pressure trend columns to database schema
- [ ] **Day 2-3:** Implement pressure trend calculation script
- [ ] **Day 3:** Integrate trend calculation into daily ingestion pipeline
- [ ] **Day 4:** Add cloud preference fields to species table
- [ ] **Day 5:** Populate cloud preferences for top 20 species

### Week 2: Scoring Functions

- [ ] **Day 1-2:** Update bite score SQL function with pressure trend scoring
- [ ] **Day 2-3:** Add cloud cover scoring to bite score function
- [ ] **Day 3-4:** Implement light × cloud interaction bonus
- [ ] **Day 4:** Test bite score calculations with Phase 1 data
- [ ] **Day 5:** Validate scoring against historical catch data

### Week 3: Verification & Tuning

- [ ] **Day 1:** Create test queries for pressure trend edge cases
- [ ] **Day 2:** Verify cloud scoring for different species types
- [ ] **Day 3:** Measure bite score variance before/after Phase 2
- [ ] **Day 4:** Calibrate weights based on initial results
- [ ] **Day 5:** Document scoring behavior and examples

---

## Testing Strategy

### Unit Tests

```typescript
// Test pressure trend categorization
describe('Pressure Trend Calculation', () => {
  it('should categorize rising pressure correctly', () => {
    expect(categorizeTrend(+3.5)).toBe('rising');
  });

  it('should categorize falling pressure correctly', () => {
    expect(categorizeTrend(-3.0)).toBe('falling');
  });

  it('should categorize rapid falling correctly', () => {
    expect(categorizeTrend(-6.5)).toBe('rapid_falling');
  });
});

// Test cloud cover scoring
describe('Cloud Cover Scoring', () => {
  it('should score overcast preference correctly', () => {
    const score = calculateCloudScore('overcast', 85);
    expect(score).toBeGreaterThan(8);
  });

  it('should score clear preference correctly', () => {
    const score = calculateCloudScore('clear', 15);
    expect(score).toBeGreaterThan(8);
  });
});
```

### Integration Tests

```sql
-- Test bite score with Phase 1 data
SELECT
  rectangle_code,
  name_en,
  bite_score,
  air_pressure_hpa,
  pressure_trend_3h_hpa,
  pressure_trend_category,
  cloud_cover_pct
FROM calculate_bite_score('22L4', '2025-11-05 06:00:00')
WHERE bite_score > 80
ORDER BY bite_score DESC
LIMIT 10;
```

### Validation Queries

```sql
-- Compare bite scores before/after pressure trend integration
WITH before_phase2 AS (
  SELECT rectangle_code, name_en, bite_score_old
  FROM bite_score_archive_20251104
),
after_phase2 AS (
  SELECT rectangle_code, name_en, bite_score
  FROM calculate_bite_score('22L4', NOW())
)
SELECT
  b.rectangle_code,
  b.name_en,
  b.bite_score_old,
  a.bite_score AS bite_score_new,
  (a.bite_score - b.bite_score_old) AS delta
FROM before_phase2 b
JOIN after_phase2 a USING (rectangle_code, name_en)
WHERE ABS(a.bite_score - b.bite_score_old) > 5
ORDER BY delta DESC;
```

---

## Expected Impact

### Bite Score Improvements

**Before Phase 2:**
- Bass at dawn with 1015 hPa: ~65 points
- Mackerel at midday with 1018 hPa: ~72 points

**After Phase 2:**
- Bass at dawn with 1013 hPa (falling -3 hPa/3h) + 70% cloud: ~83 points (+18)
- Mackerel at midday with 1022 hPa (rising +2.5 hPa/3h) + 45% cloud: ~76 points (+4)

### User-Facing Benefits

1. **More Accurate Predictions:** Bite scores now respond to approaching weather fronts
2. **Better Dawn/Dusk Timing:** Cloud × light interaction amplifies peak feeding times
3. **Species Differentiation:** Sight feeders vs ambush predators scored differently
4. **Explainability:** Users can see "Falling pressure + overcast = high bite score"

---

## Monitoring & Metrics

### Data Quality Checks

```sql
-- Check pressure trend coverage
SELECT
  COUNT(*) AS total_snapshots,
  COUNT(pressure_trend_3h_hpa) AS with_trend,
  ROUND(100.0 * COUNT(pressure_trend_3h_hpa) / COUNT(*), 1) AS coverage_pct
FROM findr_conditions_snapshots
WHERE captured_at > NOW() - INTERVAL '7 days';
```

### Bite Score Distribution

```sql
-- Analyze bite score distribution after Phase 2
SELECT
  FLOOR(bite_score / 10) * 10 AS score_bucket,
  COUNT(*) AS count,
  AVG(pressure_trend_3h_hpa) AS avg_pressure_trend,
  AVG(cloud_cover_pct) AS avg_cloud_cover
FROM bite_scores_with_phase2
GROUP BY score_bucket
ORDER BY score_bucket;
```

---

## Rollback Plan

If Phase 2 changes cause issues:

1. **Database Rollback:** Revert migrations 20251105001 and 20251105002
2. **Scoring Rollback:** Restore previous bite score function from migration 20251018014
3. **Data Retention:** Keep pressure trend data for future re-implementation

---

## Next Steps After Phase 2

Once pressure and cloud scoring are validated:

### Phase 3: Tide Flow Integration (30 points)
- Calculate tide flow speed from high/low timestamps
- Implement species-specific tide stage preferences
- Add slack vs flow scoring

### Phase 4: UI Integration
- Display bite score prominently in predictions
- Show contributing factors (pressure trend, cloud cover, etc.)
- Add bite score time-series chart (best times in next 48h)

### Phase 5: Validation Loop
- Compare bite scores against catch log data
- Measure prediction accuracy (high score = more catches?)
- Calibrate weights based on validation

---

## References

- **Phase 1 Documentation:** `PHASE_1_WEATHER_INTEGRATION_COMPLETE.md`
- **Current Bite Score Algorithm:** `BITE_SCORE_COMPLETE_ALGORITHM.md`
- **Real-Time Scoring Plan:** `REAL_TIME_BITE_SCORE_IMPLEMENTATION_PLAN.md`
- **Barometric Pressure Research:** Multiple fishing studies correlating falling pressure with increased feeding
- **Cloud Cover Impact:** Ambush predator hunting success rates in low-light conditions

---

**Document Version:** 1.0
**Last Updated:** November 4, 2025
**Author:** Claude + Damian Rafferty
