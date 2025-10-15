# Extended Forecast Investigation for Go Daisy

**Date:** 15 October 2025
**Status:** 🔍 Investigation
**Goal:** Extend Go Daisy predictions from 5 days to 7-16 days

---

## Current Situation

### What We Have Now
- **Activities page shows**: 5 days of weather data
- **Data sources**:
  - OpenWeather One Call 3.0: **8 days** daily forecast
  - Open-Meteo: **7 days** forecast (explicitly limited in code)
  - Met Norway Marine: **~10 days** ocean forecast

### Code Evidence

**lib/services/weatherService.ts:746**
```typescript
/**
 * Get current weather and forecast (up to 8 days, plus hourly/minutely/current/alerts/air pollution)
 * Docs: https://openweathermap.org/api/one-call-3#example
 */
```

**lib/services/weatherService.ts:969**
```typescript
/**
 * Transform One Call API daily data to a unified forecast structure (up to 8 days)
 * - Returns array of daily forecast objects compatible with legacy 2.5 API consumers
 */
function transformDailyForecast(oneCallData: { daily?: unknown[] }): ForecastListItem[] {
  if (!oneCallData.daily) return [];
  return oneCallData.daily.slice(0, 8).map((day: unknown) => {
    // Transform to unified format
  });
}
```

**lib/services/weatherService.ts:306**
```typescript
// Open-Meteo Marine endpoint
const params: Record<string, unknown> = {
  latitude: lat,
  longitude: lon,
  hourly: OPEN_METEO_MARINE_VARS,
  current: OPEN_METEO_MARINE_VARS,
  timezone: 'UTC',
  wind_speed_unit: 'ms',
  timeformat: 'unixtime',
  past_days: 0,
  forecast_days: 7,  // ✅ Set to 7 days
};
```

**pages/api/unified-weather.ts:1896**
```typescript
// Open-Meteo has a 5-day limit for weather/air quality
console.log(`Limiting Open-Meteo forecast window to 5 days: ${startDate} to ${endDate}`);
```

---

## API Capabilities Analysis

### 1. OpenWeather One Call 3.0 ✅
- **Free tier**: 8 days daily forecast
- **Paid tier**: Same (no extension)
- **Data available**:
  - Temperature (min/max/day/night)
  - Precipitation probability
  - Wind speed/direction
  - Clouds, humidity, pressure
  - UV index
  - Weather conditions
- **Reliability**: ⭐⭐⭐⭐⭐ (industry standard)
- **Current usage**: Up to 8 days already fetched
- **Limiting factor**: None - we can use all 8 days

### 2. Open-Meteo ⚠️
- **Free tier**: 16 days forecast for weather
- **Current limit in code**: 5 days (artificially restricted)
- **Data available**:
  - Temperature, precipitation
  - Wind speed/direction
  - Cloud cover
  - Soil moisture/temperature
  - Snow depth/fall
  - **BUT NOT**: Air quality/pollen beyond 5 days
- **Reliability**: ⭐⭐⭐⭐ (very good, open source)
- **Marine forecast**: 7 days
- **Limiting factor**: Air quality/pollen API limited to 5 days

### 3. Met Norway ✅
- **Free tier**: ~10 days ocean forecast
- **Data available**:
  - Sea temperature
  - Wave height/direction
  - Current speed/direction
  - Wind speed/direction (from locationforecast)
- **Reliability**: ⭐⭐⭐⭐⭐ (government weather service)
- **Coverage**: Arctic, Baltic, North Sea, North Atlantic
- **Limiting factor**: Geographic coverage (not Mediterranean)

### 4. Open-Meteo Marine ✅
- **Free tier**: 7 days marine forecast
- **Data available**:
  - Wave height/direction/period
  - Swell height/direction
  - Sea temperature
  - Ocean current speed/direction
- **Reliability**: ⭐⭐⭐⭐
- **Coverage**: Global
- **Current usage**: Already set to 7 days
- **Limiting factor**: None for marine data

---

## What Environmental Data Can We Get for Days 6-16?

### Days 1-5 (Current) ✅
✅ Temperature
✅ Precipitation
✅ Wind speed/direction
✅ Cloud cover
✅ UV index
✅ Air quality
✅ Pollen
✅ Marine conditions (waves, currents, sea temp)
✅ Tides (astronomical, predictable far ahead)

### Days 6-8 (OpenWeather covers this) ⭐
✅ Temperature
✅ Precipitation
✅ Wind speed/direction
✅ Cloud cover
✅ UV index
❌ Air quality (Open-Meteo limit)
❌ Pollen (Open-Meteo limit)
✅ Marine conditions (Met Norway + Open-Meteo)
✅ Tides (astronomical)

**Assessment**: **GOOD ENOUGH** for activity predictions
Most critical factors available: temp, wind, rain, clouds, UV

### Days 9-16 (Open-Meteo only) ⚠️
✅ Temperature
✅ Precipitation
✅ Wind speed/direction
✅ Cloud cover
❌ UV index (OpenWeather limit)
❌ Air quality
❌ Pollen
✅/❌ Marine conditions (7-day limit on marine APIs)
✅ Tides (astronomical)

**Assessment**: **BASIC BUT USABLE** for activity predictions
Core weather available, but missing marine data and air quality

---

## Recommended Approach

### Phase 1: Extend to 8 Days (Easy) ⭐
**Effort**: 1-2 hours
**Confidence**: Very high
**Data quality**: Excellent

**What to do:**
1. Remove artificial limit in activities page (currently shows 5 days)
2. OpenWeather already provides 8 days - just use them all
3. Met Norway marine already provides 7+ days
4. Open-Meteo marine provides 7 days

**Changes needed:**
- `pages/activities.tsx`: Display up to 8 days instead of 5
- No API changes needed (already fetching 8 days)

**Data available Days 6-8:**
- ✅ Temperature, precipitation, wind, clouds, UV
- ✅ Marine conditions (waves, sea temp, currents)
- ✅ Tides
- ❌ Air quality, pollen (acceptable trade-off)

### Phase 2: Extend to 16 Days (Medium) ⚠️
**Effort**: 4-6 hours
**Confidence**: Medium-high
**Data quality**: Good for land activities, limited for marine

**What to do:**
1. Add Open-Meteo 16-day forecast as supplemental data source
2. Use for days 9-16 when OpenWeather data ends
3. Accept degraded marine data (only 7 days available)
4. Show reduced confidence badges for days 9-16

**Changes needed:**
- `pages/api/unified-weather.ts`: Fetch Open-Meteo 16-day forecast separately
- `pages/activities.tsx`: Display up to 16 days with confidence indicators
- Add UI badge: "Basic forecast" for days 9-16

**Data available Days 9-16:**
- ✅ Temperature, precipitation, wind, clouds
- ❌ UV index, air quality, pollen
- ❌ Marine conditions (7-day limit)
- ✅ Tides (always available)

**Activities that work well Days 9-16:**
- 🏃 Running, cycling, hiking (temp, rain, wind sufficient)
- ⚽ Football, tennis (basic weather adequate)
- 🎭 Cinema, restaurants (indoor, weather less critical)

**Activities with reduced accuracy Days 9-16:**
- 🏄 Surfing, sailing (no wave/current data)
- 🤿 Diving (no marine visibility)
- 🏖️ Beach activities (no UV index)

---

## Impact on Activity Scoring

### Current Scoring Factors
Looking at the codebase, activities are scored based on:
- Temperature range (comfort)
- Precipitation (rain = bad for outdoor)
- Wind speed (too windy = bad for most activities)
- Cloud cover (affects some activities)
- UV index (for sun exposure activities)
- Marine conditions (for water sports)
- Air quality (for outdoor exercise)

### Days 6-8 Scoring (Phase 1)
**Impact**: Minimal
All critical factors available except air quality/pollen.

**Confidence adjustment**: None needed (data quality same as days 1-5)

### Days 9-16 Scoring (Phase 2)
**Impact**: Moderate
Core weather available, but missing marine + air quality + UV.

**Confidence adjustment recommendations:**
```typescript
// Days 1-5: Full confidence
const day1to5Score = calculateActivityScore(allFactors);

// Days 6-8: High confidence (missing air quality only)
const day6to8Score = calculateActivityScore(allFactors - airQuality) * 0.95;

// Days 9-16: Medium confidence (basic weather only)
const day9to16Score = calculateActivityScore(basicWeatherOnly) * 0.80;
```

**Visual indicators:**
- Days 1-5: No badge
- Days 6-8: "Forecast" badge (subtle)
- Days 9-16: "Extended forecast" badge (more prominent)

---

## Code Changes Required

### Phase 1: 8-Day Forecast (Quick Win)

**1. pages/activities.tsx**
```typescript
// Current (limited to 5 days)
const daysToShow = Math.min(5, forecastByDay.length);

// Change to (use all available days, up to 8)
const daysToShow = Math.min(8, forecastByDay.length);
```

**2. Optional: Add confidence badge for days 6-8**
```typescript
{dayIndex >= 5 && (
  <span className="badge badge-ghost badge-sm">Extended forecast</span>
)}
```

**Estimated effort**: 30 minutes
**Risk**: Very low

### Phase 2: 16-Day Forecast (Requires new API integration)

**1. pages/api/unified-weather.ts**
Add new endpoint or extend existing:
```typescript
// Fetch Open-Meteo 16-day forecast
const extendedForecast = await fetchOpenMeteo16Day(lat, lon);

// Merge with OpenWeather 8-day data
const mergedForecast = [
  ...openWeatherDays.slice(0, 8),  // Days 1-8 (OpenWeather)
  ...extendedForecast.slice(8, 16) // Days 9-16 (Open-Meteo only)
];
```

**2. Add confidence scoring**
```typescript
function getDay Confidence(dayIndex: number): number {
  if (dayIndex < 5) return 1.0;    // Days 1-5: Full data
  if (dayIndex < 8) return 0.95;   // Days 6-8: No air quality
  return 0.80;                     // Days 9-16: Basic weather only
}
```

**3. Update UI to show confidence**
```typescript
<div className="flex items-center gap-2">
  <span className="text-lg font-bold">{score}%</span>
  {confidence < 1.0 && (
    <span className="badge badge-warning badge-sm">
      {confidence === 0.95 ? 'Forecast' : 'Extended'}
    </span>
  )}
</div>
```

**Estimated effort**: 4-6 hours
**Risk**: Medium (new API integration, testing needed)

---

## Recommendations

### For Quick Impact (This Week)
✅ **Do Phase 1**: Extend to 8 days
- Minimal effort (30 min - 1 hour)
- Uses existing data (already fetched)
- High data quality (same as days 1-5 except air quality)
- Low risk

### For Maximum Value (Next Sprint)
⏳ **Consider Phase 2**: Extend to 16 days
- Medium effort (4-6 hours)
- Requires new API integration
- Good for land activities, limited for marine
- Add confidence badges to set user expectations

### What to Tell Users
**Days 1-5**: "Accurate forecast"
**Days 6-8**: "Forecast" (subtle indicator)
**Days 9-16**: "Extended forecast - weather only" (clear about limitations)

---

## Testing Plan

### Phase 1 Testing
1. ✅ Verify 8 days appear on activities page
2. ✅ Check all activity scores calculate correctly
3. ✅ Confirm marine activities work (surfing, sailing)
4. ✅ Test on mobile (scrolling through 8 days)

### Phase 2 Testing
1. ✅ Verify 16 days appear with correct confidence badges
2. ✅ Check days 1-8 use OpenWeather data
3. ✅ Check days 9-16 use Open-Meteo data
4. ✅ Confirm marine activities show "Limited data" for days 9-16
5. ✅ Test edge cases (location change, date change)

---

## Conclusion

**Answer to your question:**
> "How far into the future can we go with met norway data?"

- **Met Norway marine**: ~10 days
- **Open-Meteo marine**: 7 days
- **OpenWeather general**: 8 days
- **Open-Meteo general**: 16 days

**Practical recommendation:**
- **Phase 1 (Easy)**: Extend to **8 days** using existing OpenWeather data
- **Phase 2 (Medium)**: Extend to **16 days** using Open-Meteo for days 9-16

**Best compromise for Go Daisy:**
- **8-day forecast** gives excellent data quality across all activities
- **16-day forecast** works well for land activities, limited for marine sports
- Both are FREE (no additional API costs)

**My recommendation**: Start with Phase 1 (8 days) this week, evaluate user demand for Phase 2 (16 days).
