# Pressure Trend Data Strategy - Source Analysis
**Date**: November 5, 2025
**Goal**: Determine best approach for collecting real-time hourly pressure data for trend analysis

---

## Current State

**Already Implemented** ✅:
- Database columns: `pressure_trend_3h_hpa`, `pressure_trend_6h_hpa`, `pressure_trend_category`
- Calculation script: `scripts/calculate-pressure-trends.ts` (calculates from historical snapshots)
- Daily snapshot ingestion: Runs via cron, calls MET Norway / OpenMeteo once per day
- Pressure scoring: Integrated into `get_global_fishing_predictions()` RPC function

**The Gap**:
- Current ingestion runs **once per day** (via `ingestFindrConditions.ts`)
- We collect `air_pressure_hpa` from OpenMeteo / MET Norway
- Trend calculation needs 3-6 hour history → **only works if we collect hourly snapshots**
- Currently: We calculate trends AFTER daily ingest using historical lookback
- Problem: For real-time bite scores, we need CURRENT trends, not day-old trends

---

## 🎯 The Requirement

**For Real-Time Bite Scores**, we need:
- Pressure readings every hour (or at least every 3 hours)
- 3-hour trend: current pressure - pressure from 3h ago
- 6-hour trend: current pressure - pressure from 6h ago
- Trend category: rising (>+2 hPa), steady (-2 to +2), falling (<-2), rapid_falling (<-5)

**Key Insight**: Pressure systems are large-scale (100s of km), so:
- Coarse spatial resolution is fine (we don't need per-ICES-rectangle granularity)
- We could use regional pressure centers instead of 1000+ individual rectangles
- This dramatically reduces API call volume

---

## 📊 Data Source Options

### Option 1: Open-Meteo (FREE, Current Choice)
**Service**: https://open-meteo.com/
**What We're Already Using**: Yes, in `lib/services/weatherService.ts`

**Pros**:
- ✅ Already integrated (`fetchOpenMeteoWeather()`)
- ✅ Returns `surface_pressure` (hPa) in hourly data
- ✅ Completely free for non-commercial OR <10k requests/day
- ✅ No API key required
- ✅ Supports hourly historical data (past 7 days)
- ✅ Can fetch `&hourly=surface_pressure` (1 field = very lightweight)

**Cons**:
- ⚠️ Fair use policy: "reasonable" usage undefined
- ⚠️ If we poll 1000 rectangles hourly = 24k requests/day (over limit)
- ❌ Rate limits unclear (could throttle us)

**Recommended Strategy**:
- Use Open-Meteo, but **only poll ~20-50 regional centers** instead of all rectangles
- Assign each ICES rectangle to nearest regional pressure center (spatial lookup)
- Example: Europe = 10 regions, US East = 5 regions, etc.
- 50 regions × 24 hours = 1,200 requests/day ✅ Well under limit

**API Example**:
```bash
curl "https://api.open-meteo.com/v1/forecast?\
latitude=51.5&longitude=0.1&\
hourly=surface_pressure&\
forecast_days=1"
```

Returns:
```json
{
  "hourly": {
    "time": ["2025-11-05T00:00", "2025-11-05T01:00", ...],
    "surface_pressure": [1013.2, 1013.5, 1013.8, ...]
  }
}
```

---

### Option 2: MET Norway (FREE, European Focus)
**Service**: https://api.met.no/
**What We're Already Using**: Yes, in `lib/services/weatherService.ts`

**Pros**:
- ✅ Already integrated (`fetchMetNoMarineSeries()`)
- ✅ Returns `air_pressure_at_sea_level` in timeseries data
- ✅ Completely free, no API key
- ✅ Very reliable, government-run
- ✅ Covers all of Europe + North Atlantic

**Cons**:
- ❌ Only covers Europe, North Atlantic, Arctic (not global)
- ⚠️ Rate limit: 20 requests per second (generous)
- ⚠️ User-Agent header required (we already comply)

**Recommended Strategy**:
- Use MET Norway for European rectangles (where our primary users are)
- Fall back to Open-Meteo for non-European rectangles
- Hybrid approach = best of both worlds

**API Example**:
```bash
curl "https://api.met.no/weatherapi/locationforecast/2.0/complete?\
lat=51.5&lon=0.1" \
-H "User-Agent: WotNow/1.0 contact@fishfindr.eu"
```

Returns pressure in each timeseries entry:
```json
{
  "properties": {
    "timeseries": [
      {
        "time": "2025-11-05T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1013.2
            }
          }
        }
      }
    ]
  }
}
```

---

### Option 3: NOAA GFS (FREE, Coarse Resolution)
**Service**: https://nomads.ncep.noaa.gov/ (GRIB2 data)
**What We're Already Using**: No

**Pros**:
- ✅ Completely free, US government data
- ✅ Global coverage
- ✅ Very low granularity (0.25° or 1° grids) = perfect for pressure systems
- ✅ No API keys or rate limits (bulk download)

**Cons**:
- ❌ GRIB2 format = complex to parse (need library)
- ❌ Bulk download approach (100s of MB per forecast)
- ❌ Overkill for our needs (designed for weather modeling)
- ❌ High implementation complexity

**Verdict**: Too complex. Not recommended unless we need global coverage at scale.

---

### Option 4: Historical Data on Request (Fallback)
**Approach**: User requests bite score → fetch last 6h of pressure data on-the-fly

**Pros**:
- ✅ Zero background polling (API calls only on user demand)
- ✅ Works with any source (Open-Meteo, MET Norway)
- ✅ No cron jobs or scheduled tasks

**Cons**:
- ❌ Slow user experience (extra API round-trip per prediction)
- ❌ API dependency for every bite score calculation
- ❌ Difficult to cache (pressure trends change constantly)
- ❌ Doesn't support precomputed bite windows

**Verdict**: Only use as fallback if proactive polling becomes unfeasible.

---

## 🏗️ Recommended Implementation

### **Hybrid Approach: Rounded Coordinate Caching (RECOMMENDED)**

**Strategy**:
1. Round all rectangle coordinates to **0 decimal places** (nearest degree) for Europe
2. This creates natural ~111km pressure grid (perfect for pressure systems)
3. Poll MET Norway hourly for unique rounded coordinates
4. Store 3-6 hour timeseries in `pressure_snapshots` table
5. Calculate trends directly from consecutive timesteps (Δ pressure over 3h)

**Why This Works**:
- **MET Norway's own recommendation**: Cache by rounded coordinates to reduce load
- Pressure systems span 100s of km → 1° resolution (111km) is scientifically appropriate
- European ICES rectangles span ~50°N to ~70°N, -15°W to +30°E = only **20 × 45 = 900 unique 1° cells**
- But many cells are land → actual API calls likely **~200-300 unique coordinates**
- 300 coords × 24 hours = **7,200 requests/day** (still manageable)
- Each MET Norway call returns hourly series → we get 3-6 hour history in ONE request
- **No separate pressure center assignment needed** - rectangle lat/lon → round(lat,0), round(lon,0) → lookup

**Database Schema**:
```sql
CREATE TABLE pressure_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat_rounded integer NOT NULL,     -- Rounded to 0 decimal places
  lon_rounded integer NOT NULL,     -- Rounded to 0 decimal places
  captured_at timestamptz NOT NULL,
  pressure_hpa numeric NOT NULL,
  pressure_3h_ago_hpa numeric,      -- For trend calculation
  pressure_6h_ago_hpa numeric,      -- For trend calculation
  trend_3h_hpa numeric,             -- Δ pressure over 3 hours
  trend_6h_hpa numeric,             -- Δ pressure over 6 hours
  trend_category text,              -- 'rising', 'steady', 'falling', 'rapid_falling'
  source text NOT NULL,             -- 'met_norway' or 'openmeteo'
  raw_json jsonb,                   -- Store full MET Norway timeseries
  created_at timestamptz DEFAULT now(),

  UNIQUE(lat_rounded, lon_rounded, captured_at)
);

CREATE INDEX idx_pressure_snapshots_coords_time ON pressure_snapshots(lat_rounded, lon_rounded, captured_at DESC);
```

**Lookup Logic** (simple rounding):
```typescript
// For any ICES rectangle, get pressure data by rounding coordinates
function getPressureKey(lat: number, lon: number): { lat: number; lon: number } {
  return {
    lat: Math.round(lat),   // 51.234 → 51, 56.789 → 57
    lon: Math.round(lon)    // -4.567 → -5, 3.123 → 3
  };
}

// Example: Brighton (50.82, -0.14) → rounds to (51, 0)
// All nearby rectangles also round to (51, 0) → same pressure data
```

**MET Norway API Call**:
```typescript
async function fetchMetNoPressure(lat: number, lon: number) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'FishFindr/1.0 contact@fishfindr.eu'
    }
  });

  const data = await response.json();

  // Extract pressure from timeseries
  return data.properties.timeseries.map((t: any) => ({
    time: t.time,
    pressure: t.data.instant.details.air_pressure_at_sea_level
  }));
}
```

**Trend Calculation** (from your example):
```typescript
function calculateTrend(pressureNow: number, pressure3hAgo: number): string {
  const delta = pressureNow - pressure3hAgo;

  if (delta <= -2.0) return 'falling';        // ≤ -2.0 hPa
  if (delta >= 2.0) return 'rising';          // ≥ +2.0 hPa
  if (delta <= -5.0) return 'rapid_falling';  // ≤ -5.0 hPa (severe)

  return 'steady';  // -2.0 to +2.0 hPa
}
```

---

## 📅 Implementation Plan

### Phase 1: Regional Pressure Centers (Week 1)
1. **Define 50 pressure centers** covering all fishing zones
2. **Create `pressure_snapshots` table**
3. **Write hourly poll script**: `scripts/poll-pressure-centers.ts`
   - Fetches pressure from Open-Meteo / MET Norway for all centers
   - Inserts into `pressure_snapshots`
4. **Set up hourly cron** (GitHub Actions or Vercel Cron)
5. **Add pressure center assignment** to `ices_rectangles` table (one-time)

### Phase 2: Trend Calculation (Week 1)
1. **Update `calculate-pressure-trends.ts`**:
   - Query `pressure_snapshots` instead of `findr_conditions_snapshots`
   - Look up rectangle's assigned pressure center
   - Calculate 3h/6h trends from regional data
2. **Update `findr_conditions_latest` table**:
   - Add columns for trend data (already done ✅)
3. **Test trend calculation** on 10 sample rectangles

### Phase 3: Integration (Week 2)
1. **Update `get_global_fishing_predictions()` RPC**:
   - Use pressure trend data from `findr_conditions_latest`
   - Already implemented ✅ (migration `20251105000003`)
2. **Add UI display** for pressure trends in breakdown modal
3. **Test end-to-end** with live data

---

## 🎛️ Rate Limit Management

**Open-Meteo Limits**:
- Free tier: 10,000 requests/day
- Our usage: 50 centers × 24 hours = 1,200 requests/day
- **Safety margin**: 8,800 requests/day (88% headroom)

**MET Norway Limits**:
- 20 requests/second (very generous)
- Our usage: ~20 European centers per hour = negligible

**Fallback Strategy**:
- If Open-Meteo rate-limits us → fall back to 6-hourly polling (200 req/day)
- If both fail → use last known pressure (mark as stale)
- If no recent data → exclude pressure from bite score (other factors still work)

---

## 💰 Cost Analysis

**Current Costs**: $0/month (all free APIs)

**Proposed Costs**: $0/month (all free APIs)

**Risk**: Open-Meteo fair use policy
- Mitigation: Regional centers keep us under 10k requests/day
- Fallback: If they complain, reduce polling frequency or switch to MET Norway only

**Long-Term**: If we scale to 100k+ users:
- Consider paid weather API (WeatherAPI.com, VisualCrossing)
- Estimated cost: ~$50-100/month for unlimited requests

---

## ✅ Recommendation

**Implement Hybrid Regional Pressure Centers approach**:

1. **Short-term (Week 1)**:
   - Define 50 pressure centers
   - Poll Open-Meteo + MET Norway hourly
   - Store in `pressure_snapshots` table

2. **Medium-term (Week 2)**:
   - Calculate trends from regional data
   - Integrate into bite score predictions
   - Add UI display

3. **Long-term** (if needed):
   - Monitor Open-Meteo usage
   - Add fallback logic if rate-limited
   - Consider paid API if we exceed fair use

**Why This Is Best**:
- ✅ Completely free with current usage patterns
- ✅ Low implementation complexity (reuse existing API integrations)
- ✅ Scalable (regional approach avoids per-rectangle overhead)
- ✅ Accurate (pressure systems are large-scale)
- ✅ Reliable (dual sources: MET Norway + Open-Meteo)

---

## 🚀 Next Steps

1. Create `PRESSURE_CENTERS` configuration file with 50 regional centers
2. Write `scripts/poll-pressure-centers.ts` (hourly poll)
3. Set up GitHub Actions cron for hourly execution
4. Test polling for 1 week to validate data quality
5. Integrate into bite score calculations
6. Deploy UI updates to show pressure trends

**Timeline**: 1-2 weeks to full implementation

---

## 📝 Implementation Code Examples

### TypeScript Utility for Trend Calculation

Based on your request, here's a utility that takes a MET Norway timeseries array and returns the trend label:

```typescript
/**
 * Calculate pressure trend from MET Norway locationforecast timeseries
 *
 * @param timeseries - Array from MET Norway API: properties.timeseries
 * @param targetTime - Time to calculate trend for (default: now)
 * @returns Trend category and delta values
 */
interface PressureTrend {
  category: 'rising' | 'steady' | 'falling' | 'rapid_falling' | 'unknown';
  pressureNow: number | null;
  pressure3hAgo: number | null;
  delta3h: number | null;
  explanation: string;
}

export function calculatePressureTrend(
  timeseries: Array<{
    time: string;
    data: {
      instant: {
        details: {
          air_pressure_at_sea_level?: number;
        };
      };
    };
  }>,
  targetTime: Date = new Date()
): PressureTrend {
  // Find closest entry to target time
  const now = timeseries.reduce((closest, entry) => {
    const entryTime = new Date(entry.time);
    const closestTime = new Date(closest.time);
    return Math.abs(entryTime.getTime() - targetTime.getTime()) <
           Math.abs(closestTime.getTime() - targetTime.getTime())
      ? entry
      : closest;
  });

  // Find entry closest to 3 hours ago
  const target3hAgo = new Date(targetTime.getTime() - 3 * 60 * 60 * 1000);
  const threeHoursAgo = timeseries.reduce((closest, entry) => {
    const entryTime = new Date(entry.time);
    const closestTime = new Date(closest.time);
    return Math.abs(entryTime.getTime() - target3hAgo.getTime()) <
           Math.abs(closestTime.getTime() - target3hAgo.getTime())
      ? entry
      : closest;
  });

  const pressureNow = now.data.instant.details.air_pressure_at_sea_level;
  const pressure3hAgo = threeHoursAgo.data.instant.details.air_pressure_at_sea_level;

  if (pressureNow === undefined || pressure3hAgo === undefined) {
    return {
      category: 'unknown',
      pressureNow: pressureNow ?? null,
      pressure3hAgo: pressure3hAgo ?? null,
      delta3h: null,
      explanation: 'Insufficient pressure data'
    };
  }

  const delta = pressureNow - pressure3hAgo;

  // Categorize per your specification
  let category: PressureTrend['category'];
  let explanation: string;

  if (delta <= -5.0) {
    category = 'rapid_falling';
    explanation = `Pressure falling rapidly (${delta.toFixed(1)} hPa/3h) - bite may stall`;
  } else if (delta <= -2.0) {
    category = 'falling';
    explanation = `Pressure falling (${delta.toFixed(1)} hPa/3h) - reduced fish activity`;
  } else if (delta >= 2.0) {
    category = 'rising';
    explanation = `Pressure rising (${delta.toFixed(1)} hPa/3h) - fish active`;
  } else {
    category = 'steady';
    explanation = `Pressure stable (${delta.toFixed(1)} hPa/3h)`;
  }

  return {
    category,
    pressureNow,
    pressure3hAgo,
    delta3h: delta,
    explanation
  };
}
```

### Usage Example

```typescript
// Fetch MET Norway data
const response = await fetch(
  'https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=51&lon=0',
  {
    headers: {
      'User-Agent': 'FishFindr/1.0 contact@fishfindr.eu'
    }
  }
);

const data = await response.json();

// Calculate trend
const trend = calculatePressureTrend(data.properties.timeseries);

console.log(trend);
// Output:
// {
//   category: 'rising',
//   pressureNow: 1015.2,
//   pressure3hAgo: 1013.1,
//   delta3h: 2.1,
//   explanation: 'Pressure rising (2.1 hPa/3h) - fish active'
// }
```

### Hourly Poll Script Skeleton

```typescript
#!/usr/bin/env tsx
/**
 * Poll MET Norway for pressure data at rounded European coordinates
 * Run hourly via cron: 0 * * * *
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUniqueRoundedCoordinates(): Promise<Array<{ lat: number; lon: number }>> {
  // Query all ICES rectangles, round coordinates, deduplicate
  const { data: rectangles } = await supabase
    .from('ices_rectangles')
    .select('center_lat, center_lon')
    .gte('center_lat', 35)  // Mediterranean to Arctic
    .lte('center_lat', 72)
    .gte('center_lon', -15) // Atlantic to Black Sea
    .lte('center_lon', 45);

  const uniqueCoords = new Map<string, { lat: number; lon: number }>();

  rectangles?.forEach(rect => {
    const lat = Math.round(rect.center_lat);
    const lon = Math.round(rect.center_lon);
    const key = `${lat},${lon}`;
    uniqueCoords.set(key, { lat, lon });
  });

  return Array.from(uniqueCoords.values());
}

async function pollPressureData() {
  const coordinates = await getUniqueRoundedCoordinates();

  console.log(`Polling pressure for ${coordinates.length} unique coordinates`);

  for (const { lat, lon } of coordinates) {
    try {
      const response = await fetch(
        `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`,
        {
          headers: {
            'User-Agent': 'FishFindr/1.0 contact@fishfindr.eu'
          }
        }
      );

      const data = await response.json();
      const trend = calculatePressureTrend(data.properties.timeseries);

      // Insert into pressure_snapshots
      await supabase.from('pressure_snapshots').insert({
        lat_rounded: lat,
        lon_rounded: lon,
        captured_at: new Date().toISOString(),
        pressure_hpa: trend.pressureNow,
        pressure_3h_ago_hpa: trend.pressure3hAgo,
        trend_3h_hpa: trend.delta3h,
        trend_category: trend.category,
        source: 'met_norway',
        raw_json: data.properties.timeseries
      });

      console.log(`✓ (${lat}, ${lon}): ${trend.explanation}`);

      // Rate limiting: MET Norway allows 20 req/sec, but be polite
      await new Promise(resolve => setTimeout(resolve, 100)); // 10 req/sec

    } catch (error) {
      console.error(`✗ (${lat}, ${lon}): ${error.message}`);
    }
  }
}

pollPressureData();
```

This implementation:
- ✅ Follows MET Norway's caching recommendation (rounded coordinates)
- ✅ Calculates trends directly from timeseries (no separate storage needed)
- ✅ Uses your trend classification logic
- ✅ Stores everything needed for bite score calculation
- ✅ Can run hourly without hitting rate limits
