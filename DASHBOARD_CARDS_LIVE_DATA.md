# Dashboard Cards - Live Data Configuration

## ✅ Current State: 3 Cards, All Using Correct Data Sources

The conditions dashboard now displays **exactly 3 summary cards**, each using the appropriate data source for its update frequency and safety requirements.

---

## 📊 The Three Cards

### 1️⃣ Wind Card (Top Left)
```typescript
<WindSummaryCard
  speedKts={windSpeedKts}           // LIVE from marineWeather.current
  directionDeg={windDirectionDeg}    // LIVE from marineWeather.current
  updatedAt={marineWeather.updatedAt ?? data.snapshot.capturedAt}
/>
```

**Data Source**: `marineWeather.current` (MET Norway → Open-Meteo)  
**Update Frequency**: Every page load (fetches current hourly data)  
**Why Live**: Wind changes rapidly (hourly), affects sailing safety  
**Fallback**: Supabase cached data if API fails (emergency only)

**Data Flow**:
```
MET Norway API → marineWeather.current.windSpeedKts → WindSummaryCard
                                    ↓ (if API fails)
              Supabase marine.windSpeedKts → WindSummaryCard
```

---

### 2️⃣ Wave Card (Top Center/Right)
```typescript
<WaveSummaryCard
  waveHeightM={waveHeightM}          // LIVE from marineWeather.current
  chlorophyllMgM3={marine.chlorophyllMgM3}  // Cached (slow-changing)
  updatedAt={marineWeather.updatedAt ?? data.snapshot.capturedAt}
/>
```

**Data Source**: `marineWeather.current` (MET Norway → Open-Meteo)  
**Update Frequency**: Every page load (fetches current hourly data)  
**Why Live**: Wave height changes rapidly (hourly), critical for safety  
**Fallback**: Supabase cached data if API fails (emergency only)  
**Note**: Chlorophyll is still from Supabase (daily ingestion, slow-changing)

**Data Flow**:
```
MET Norway API → marineWeather.current.waveHeightM → WaveSummaryCard
                                    ↓ (if API fails)
              Supabase marine.waveHeightM → WaveSummaryCard

Copernicus (daily) → Supabase marine.chlorophyllMgM3 → WaveSummaryCard
```

---

### 3️⃣ Tide Card (Bottom)
```typescript
<TideSummaryCard
  nextHighIso={data.snapshot.tides.nextHighIso}    // Cached (predictable)
  nextLowIso={data.snapshot.tides.nextLowIso}      // Cached (predictable)
  lastTideHeight={tideExtrema.max}                  // From Supabase hourly
  upcomingTideHeight={tideExtrema.min}              // From Supabase hourly
/>
```

**Data Source**: `data.snapshot.tides` (Supabase - daily ingestion)  
**Update Frequency**: Daily (tides are predictable astronomical events)  
**Why Cached**: Tides follow predictable patterns, don't need real-time data  
**No Fallback Needed**: Tide predictions are stable for weeks ahead

**Data Flow**:
```
Tide Prediction Service → Supabase data.snapshot.tides → TideSummaryCard
                                                       ↓
                          Supabase hourly data → tideExtrema (max/min) → TideSummaryCard
```

---

## ❌ Removed: Environmental Card

**Previously showed**: Pollen, Air Quality Index (AQI), UV Index  
**Why removed**: Not relevant for marine fishing conditions  
**Impact**: Cleaner UI, faster page load, less API calls

The environmental data (pollen/AQI/UV) is still used for:
- **UV Index**: Fed into stealth indicator calculation (fish wariness in bright light)
- **Cloud Cover**: Fed into stealth indicator calculation

This data is **not displayed directly** but still influences the marine bio indicators card.

---

## 🔄 Data Update Timing

| Card | Data Type | Source | Update Frequency | When Stale? |
|------|-----------|--------|------------------|-------------|
| Wind | Live | MET Norway API | Every page load | Within 1 hour |
| Wave | Live | MET Norway API | Every page load | Within 1 hour |
| Tide | Cached | Supabase | Daily ingestion | Never (predictable) |

---

## 🛡️ Fallback Safety

### Wind & Wave Fallback Logic
```typescript
// Preferred: Live data from API
const waveHeightM = marineWeather.current?.waveHeightM 
  // Emergency fallback: Cached Supabase data
  ?? marine.waveHeightM;
```

**When fallback triggers**:
- MET Norway API down
- Open-Meteo API down  
- Network error
- Invalid response

**Fallback is intentional**: Better to show slightly stale data than no data at all. Anglers can still make informed decisions with data that's a few hours old.

**Monitoring**: Check `marineWeather.source` to see which API provided data:
- `"met"` = MET Norway (preferred)
- `"openmeteo"` = Open-Meteo (fallback)
- `"fallback"` = All APIs failed, using empty data

---

## 📐 Grid Layout

```html
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  <WindSummaryCard />      <!-- Column 1 -->
  <WaveSummaryCard />      <!-- Column 2 -->
  <TideSummaryCard />      <!-- Column 3 on XL, wraps on MD -->
</div>
```

**Responsive Behavior**:
- **Mobile** (< 768px): Stacked vertically (1 column)
- **Tablet** (768px - 1279px): 2 columns, tide wraps to second row
- **Desktop** (≥ 1280px): 3 columns, all cards in one row

---

## ✅ Verification Checklist

- [x] Environmental card removed from dashboard
- [x] Wind card uses `marineWeather.current.windSpeedKts` (live)
- [x] Wind card uses `marineWeather.current.windDirectionDeg` (live)
- [x] Wave card uses `marineWeather.current.waveHeightM` (live)
- [x] Tide card uses `data.snapshot.tides` (cached - correct)
- [x] Fallback logic in place for safety
- [x] No direct usage of `marine.windSpeedKts` or `marine.waveHeightM`
- [x] Updated timestamps show `marineWeather.updatedAt`
- [x] Comprehensive documentation in code
- [x] TypeScript compilation: No errors

---

## 🚨 CRITICAL: Do Not Revert

### ❌ WRONG (Old Way)
```typescript
// This uses stale cached data - DANGEROUS!
<WindSummaryCard
  speedKts={marine.windSpeedKts}           // ❌ From Supabase (stale)
  directionDeg={marine.windDirectionDeg}    // ❌ From Supabase (stale)
/>
```

### ✅ CORRECT (Current Way)
```typescript
// This uses live data with intelligent fallback
<WindSummaryCard
  speedKts={windSpeedKts}                   // ✅ Live with fallback
  directionDeg={windDirectionDeg}            // ✅ Live with fallback
/>

// Where windSpeedKts is defined as:
const windSpeedKts = marineWeather.current?.windSpeedKts ?? marine.windSpeedKts;
```

---

## 📝 Code Comments

The dashboard has extensive inline documentation:

1. **43-line header comment**: Explains complete data architecture
2. **28-line summary cards comment**: Details each card's data source
3. **Data source mapping comment**: Explains fallback logic
4. **Inline variable comments**: Label each data type (LIVE vs CACHED)

**Finding the docs**:
- Open `components/findr/ConditionsDashboard.tsx`
- Read lines 49-91 (header comment)
- Read lines 522-549 (summary cards comment)
- Read lines 333-348 (data source mapping)

---

## 🧪 Testing

### Visual Verification
1. Open conditions page: `http://localhost:3001/conditions?rectangleCode=20C5`
2. Check **3 cards display**: Wind, Wave, Tide
3. Verify **no environmental card** (pollen/AQI/UV)
4. Check timestamps show recent data

### Data Source Verification
```bash
# Check what data source is being used
curl "http://localhost:3001/api/findr/marine-weather?lat=55.7558&lon=-5.8333" \
  | jq '.source'
# Should return: "met" or "openmeteo" (not "fallback")

# Check wind speed is not zero
curl "http://localhost:3001/api/findr/marine-weather?lat=55.7558&lon=-5.8333" \
  | jq '.current.windSpeedKts'
# Should return: a real number (e.g., 15.2)

# Check wave height is not zero  
curl "http://localhost:3001/api/findr/marine-weather?lat=55.7558&lon=-5.8333" \
  | jq '.current.waveHeightM'
# Should return: a real number (e.g., 1.7)
```

### Compare Against Real Forecasts
1. Note the wave height from our dashboard (e.g., 1.7m)
2. Check [yr.no marine forecast](https://www.yr.no/en/forecast/maritime/) for same location
3. Values should match within ±0.3m (different models have slight variations)
4. Note the wind speed from our dashboard (e.g., 15 kts)
5. Check [Windy.com](https://www.windy.com) for same location
6. Values should match within ±3 kts

---

## 📚 Related Documentation

- `MARINE_WEATHER_INTEGRATION_COMPLETE.md` - Full integration guide
- `LIVE_MARINE_WEATHER_IMPLEMENTATION.md` - Bug fix details
- `CRITICAL_DATA_ARCHITECTURE_FIX.md` - Architecture explanation
- `components/findr/ConditionsDashboard.tsx` (lines 49-91) - Header docs
- `hooks/useFindrMarineWeather.ts` - Live weather hook
- `pages/api/findr/marine-weather.ts` - Weather API endpoint

---

## 🎯 Summary

**Before**: 4 cards (Wind, Wave, Tide, Environmental)  
**After**: 3 cards (Wind, Wave, Tide)  
**Why**: Environmental data not relevant for marine fishing

**Data Quality**:
- ✅ Wind: Live (MET Norway) with fallback
- ✅ Wave: Live (MET Norway) with fallback  
- ✅ Tide: Cached (Supabase) - correct for tides
- ❌ Environmental: Removed (not marine-relevant)

**Safety**: All critical weather data (wind/wave) is live, with intelligent fallback to prevent showing "no data" in rare API failure cases.

---

**Last Updated**: October 8, 2025  
**Status**: ✅ Complete - 3 cards with correct data sources
