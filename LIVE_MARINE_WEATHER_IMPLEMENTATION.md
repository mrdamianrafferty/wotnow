# Live Marine Weather Implementation

## Problem Discovered
- Conditions page showing only 2 days of forecast instead of 7
- All wave/wind data was zeros (Supabase ingestion hadn't run)
- **Architecture issue**: Weather data was being cached in database (becomes stale, dangerous for maritime safety)
- **Critical bug**: `fetchMetNoMarineSeries` and `fetchOpenMeteoMarineSeries` default to `maxHours: 24`, limiting data to ~2 days

## Solution Implemented

### 1. Live Weather API Endpoint
**File**: `pages/api/findr/marine-weather.ts`

- Priority fallback: MET Norway → Open-Meteo
- **Fixed maxHours bug**: Now requests `maxHours: 192` (8 days × 24 hours)
- Aggregates hourly data into daily summaries with fishing scores
- Returns:
  - `current`: Real-time wave/wind/temperature conditions
  - `hourly`: 48 hours of detailed forecasts
  - `daily`: 7 days of daily summaries
  - `source`: Which API provided the data ('met', 'openmeteo', 'fallback')

**Test Results**:
```bash
curl "http://localhost:3001/api/findr/marine-weather?lat=55.7558&lon=-5.8333"

Source: met
Daily count: 7
  Today     8 Oct    wave=1.3m wind=17.4kts temp=14.1°C score=75
  Tomorrow  9 Oct    wave=0.9m wind=13.6kts temp=14.1°C score=100
  Fri       10 Oct   wave=0.6m wind=12.2kts temp=14.1°C score=100
  Sat       11 Oct   wave=0.3m wind=2.4kts  temp=14.1°C score=85
  Sun       12 Oct   wave=0.2m wind=0.8kts  temp=14.2°C score=85
  Mon       13 Oct   wave=0.1m wind=0.9kts  temp=14.3°C score=85
  Tue       14 Oct   wave=0.1m wind=1.8kts  temp=14.3°C score=85
```

### 2. React Hook
**File**: `hooks/useFindrMarineWeather.ts`

- Fetches from `/api/findr/marine-weather`
- Returns typed state with loading/error handling
- Provides `reload()` function for manual refresh
- Tracks `updatedAt` timestamp and `source` indicator

### 3. Architecture Correction

**BEFORE (Wrong)**:
- Supabase stores: marine bio + tides + **waves + wind + hourly + daily forecasts**
- Data becomes stale within hours
- Dangerous for anglers relying on outdated conditions

**AFTER (Correct)**:
- **Supabase stores**: Marine bio indicators (chlorophyll, oxygen, nutrients) + water temperature + tides
  - From Copernicus Marine Service
  - Updates daily (slow-changing data)
- **Live fetch**: Wave height, wind speed/direction, hourly/daily forecasts
  - From MET Norway / Open-Meteo
  - Fetched fresh on every request (fast-changing data)

## The maxHours Bug

**Root Cause**:
```typescript
// lib/services/weatherService.ts:182
const maxHours = options?.maxHours ?? 24;  // ⚠️ Default only 24 hours!

// Line 238
const limited = hours.slice(0, Math.max(1, maxHours));  // Truncates to 24h
```

**Impact**:
- Only 24 hours of data returned
- When aggregating into days: 24h = ~2 days max
- User saw "7 day forecast only showing 2 days"

**Fix**:
```typescript
// pages/api/findr/marine-weather.ts
const metResult = await fetchMetNoMarineSeries(latNum, lonNum, startISO, endISO, {
  maxHours: 192,  // ✅ Request 8 days worth
});
```

## Next Steps

1. **Update ConditionsDashboard** to use `useFindrMarineWeather` hook
2. **Update WaveSummaryCard** to use `marineWeather.current.waveHeightM`
3. **Update WindSummaryCard** to use `marineWeather.current.windSpeedKts`
4. **Remove wave/wind from Supabase ingestion** (future cleanup)
5. **Test accuracy** against yr.no and Windy.com forecasts

## Safety Note

This fix is **critical for maritime safety**. Anglers rely on accurate, up-to-date wave and wind forecasts. Cached/stale data could lead to dangerous situations at sea. Live fetching ensures they always see current conditions.

## Files Modified

- ✅ `hooks/useFindrMarineWeather.ts` (new)
- ✅ `pages/api/findr/marine-weather.ts` (new)
- 🔄 `components/findr/ConditionsDashboard.tsx` (pending)
- 🔄 `components/findr/WaveSummaryCard.tsx` (pending)
- 🔄 `components/findr/WindSummaryCard.tsx` (pending)

## Testing

```bash
# Test 7-day forecast
curl "http://localhost:3001/api/findr/marine-weather?lat=55.7558&lon=-5.8333" \
  | jq '.daily | length'
# Should return: 7

# Test current conditions
curl "http://localhost:3001/api/findr/marine-weather?lat=55.7558&lon=-5.8333" \
  | jq '.current'
# Should return real wave/wind data
```

## Related Documents

- `CRITICAL_DATA_ARCHITECTURE_FIX.md` - Detailed architecture analysis
- `WEATHER_MARINE_DATA_ARCHITECTURE.md` - System design overview
