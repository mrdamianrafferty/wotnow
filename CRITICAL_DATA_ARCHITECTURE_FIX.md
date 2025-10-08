# CRITICAL: Data Architecture Fix Required

## 🚨 SAFETY ISSUE: Current Data is Misleading and Dangerous

### Current Broken State
The `/findr/conditions` page is showing:
- ❌ All zeros for hourly forecasts (wave height, wind, temp)
- ❌ Only 2 days of daily forecast (should be 7)
- ❌ Wave/wind data from stale Supabase snapshots
- ❌ Data that could mislead anglers about sea conditions

**This is a safety hazard. Anglers could go out in dangerous conditions thinking it's calm.**

---

## Correct Data Architecture

### What SHOULD Be in Supabase (Low-Frequency Marine Bio Data)
Stored in `findr_conditions_snapshots` table:

1. **Marine Bio Indicators** (from Copernicus/research data):
   - `chlorophyll_mg_m3` - Plankton productivity
   - `dissolved_oxygen_mg_l` - Oxygen levels
   - `nitrate_umol_l` - Nutrient levels
   - `phosphate_umol_l` - Nutrient levels
   - `salinity_psu` - Salinity
   - `sea_temp_c` - Water temperature (from Copernicus)

2. **Tidal Information**:
   - `next_high_tide_iso` - Next high tide time
   - `next_low_tide_iso` - Next low tide time

**Update Frequency**: Daily or every few hours (these change slowly)
**Source**: Copernicus Marine Service, research data

### What SHOULD Be Fetched Live (High-Frequency Weather Data)
Fetched in real-time from weather APIs when user visits page:

1. **Wave Conditions** (MET Norway → Open-Meteo → Stormglass → OpenWeather):
   - Wave height
   - Wave period
   - Wave direction
   - Swell height/period/direction

2. **Wind Conditions**:
   - Wind speed
   - Wind direction
   - Gusts

3. **Weather Forecasts**:
   - Hourly marine forecast (next 24-48 hours)
   - Daily marine forecast (next 7 days)
   - Current conditions

4. **Environmental** (already working correctly):
   - UV Index
   - Cloud cover
   - Air quality
   - Pollen

**Update Frequency**: Real-time on page load
**Source Priority**: MET Norway → Open-Meteo → Stormglass → OpenWeather

---

## Required Changes

### 1. Remove from Supabase Table
Remove these columns from `findr_conditions_snapshots`:
- ❌ `wave_height_m` - Should be live from weather API
- ❌ `wind_speed_kts` - Should be live from weather API
- ❌ `wind_direction_deg` - Should be live from weather API
- ❌ `hourly_marine_json` - Should be live from weather API
- ❌ `daily_marine_json` - Should be live from weather API

### 2. Keep in Supabase (Marine Bio Only)
- ✅ `chlorophyll_mg_m3`
- ✅ `dissolved_oxygen_mg_l`
- ✅ `nitrate_umol_l`
- ✅ `phosphate_umol_l`
- ✅ `salinity_psu`
- ✅ `sea_temp_c` (from Copernicus, not weather API)
- ✅ `next_high_tide_iso`
- ✅ `next_low_tide_iso`

### 3. Create New Weather Hook
Create `hooks/useFindrMarineWeather.ts`:
```typescript
export function useFindrMarineWeather(lat: number, lon: number) {
  // Fetch from weather APIs (priority order):
  // 1. MET Norway
  // 2. Open-Meteo
  // 3. Stormglass
  // 4. OpenWeather
  
  return {
    current: {
      waveHeightM, windSpeedKts, seaTemperatureC, ...
    },
    hourly: [...], // Next 24-48 hours
    daily: [...],  // Next 7 days
    loading,
    error,
    source: 'met' | 'openmeteo' | 'stormglass' | 'openweather'
  };
}
```

### 4. Update ConditionsDashboard Component
```typescript
// OLD (wrong):
const hourly = useMemo(() => data.snapshot.hourly.slice(0, 12), [data.snapshot.hourly]);
const daily = useMemo(() => data.snapshot.daily.slice(0, 7), [data.snapshot.daily]);

// NEW (correct):
const marineWeather = useFindrMarineWeather(
  data.rectangle.centerLat,
  data.rectangle.centerLon
);
const hourly = marineWeather.hourly.slice(0, 12);
const daily = marineWeather.daily.slice(0, 7);
```

### 5. Update Cards to Use Live Data
- **WaveSummaryCard**: Use `marineWeather.current.waveHeightM` (not `data.snapshot.marine.waveHeightM`)
- **WindSummaryCard**: Use `marineWeather.current.windSpeedKts` (not `data.snapshot.marine.windSpeedKts`)
- **NextFewDaysCard**: Use `marineWeather.daily` (not `data.snapshot.daily`)
- **HourlyMarineChart**: Use `marineWeather.hourly` (not `data.snapshot.hourly`)

### 6. Update API Endpoint
`/api/findr/conditions` should:
- ✅ Return marine bio indicators from Supabase
- ✅ Return tide times from Supabase
- ❌ NOT return wave/wind/weather forecasts
- ❌ NOT return hourly_marine_json or daily_marine_json

### 7. Simplify Ingestion Script
`scripts/ingestFindrConditions.ts` should:
- ✅ Ingest marine bio from Copernicus
- ✅ Ingest tide times from tide services
- ❌ NOT ingest wave height (fetch live instead)
- ❌ NOT ingest wind speed (fetch live instead)
- ❌ NOT ingest hourly/daily forecasts (fetch live instead)

---

## Migration Steps

1. **Phase 1: Add Live Weather Hook** ✅ Critical
   - Create `useFindrMarineWeather` hook
   - Fetch from MET Norway/Open-Meteo/Stormglass priority
   - Return current + hourly + daily forecasts

2. **Phase 2: Update Dashboard** ✅ Critical
   - Use `useFindrMarineWeather` for all wave/wind/forecast data
   - Keep using Supabase for marine bio indicators only
   - Update all cards to use correct data source

3. **Phase 3: Clean Up Database** (Can do later)
   - Remove unused columns from `findr_conditions_snapshots`
   - Simplify ingestion script
   - Update API to not return weather data

4. **Phase 4: Verify Safety** ✅ CRITICAL
   - Test that wave heights are accurate and current
   - Test that wind speeds are accurate and current
   - Test that forecasts update in real-time
   - Compare against official marine weather sources

---

## Data Flow Diagram

### BEFORE (Broken):
```
User visits /findr/conditions
         ↓
/api/findr/conditions?rectangleCode=XX
         ↓
Supabase: findr_conditions_latest
         ↓
Returns: marine bio + STALE wave/wind + BAD hourly/daily
         ↓
Dashboard shows DANGEROUS stale data
```

### AFTER (Safe):
```
User visits /findr/conditions
         ↓
┌─ /api/findr/conditions?rectangleCode=XX
│  └─ Supabase: Returns marine bio + tides only
│
└─ useFindrMarineWeather(lat, lon)
   └─ Live API: MET Norway / Open-Meteo / Stormglass
      └─ Returns: CURRENT wave/wind + 7-day forecast
         ↓
Dashboard shows SAFE real-time data
```

---

## Why This Matters

1. **Safety**: Anglers need real-time conditions, not yesterday's forecast
2. **Accuracy**: Weather changes hourly, marine bio changes daily
3. **Cost**: Don't waste API quota caching weather data
4. **Architecture**: Right data in right place at right frequency
5. **Liability**: Showing wrong conditions could lead to accidents at sea

---

## Immediate Actions Required

1. ✅ Fix the 7-day forecast limit (5 → 7 days) - DONE
2. ⚠️ Create `useFindrMarineWeather` hook - URGENT
3. ⚠️ Update dashboard to use live weather - URGENT
4. ⚠️ Add warning banner: "Weather data currently unavailable - use official marine forecasts" - UNTIL FIXED
5. ⚠️ Test against real marine weather sources - BEFORE DEPLOYMENT

---

## Testing Checklist

Before deploying to production:
- [ ] Wave heights match MET Norway marine forecast
- [ ] Wind speeds match MET Norway marine forecast
- [ ] 7-day forecast shows all 7 days
- [ ] Hourly forecast shows next 24 hours minimum
- [ ] Data updates when page refreshes (not cached)
- [ ] Marine bio indicators still work from Supabase
- [ ] Tide times still work from Supabase
- [ ] Compare against official sources (Windy.com, yr.no, etc.)

---

## Related Files

- `hooks/useFindrConditions.ts` - Gets marine bio from Supabase ✅
- `hooks/useFindrEnvironmentalSignals.ts` - Gets UV/cloud/pollen ✅  
- `hooks/useFindrMarineWeather.ts` - **NEEDS TO BE CREATED** ⚠️
- `components/findr/ConditionsDashboard.tsx` - **NEEDS UPDATE** ⚠️
- `pages/api/findr/conditions.ts` - Returns Supabase data ✅
- `scripts/ingestFindrConditions.ts` - **NEEDS SIMPLIFICATION** (later)
- `lib/services/weatherService.ts` - Has weather API functions ✅

---

## Priority

**🚨 CRITICAL - DO NOT DEPLOY WITHOUT FIXING THIS**

The current state shows fake/stale data that could endanger anglers' safety at sea.
