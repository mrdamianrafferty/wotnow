# Conditions Page Recovery Guide

**Last Updated**: 20 October 2025  
**Purpose**: Quick reference for resolving common issues on the Conditions page

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Unit Normalization Reference](#unit-normalization-reference)
4. [Data Flow Debugging](#data-flow-debugging)
5. [Database Schema Reference](#database-schema-reference)
6. [Quick Fixes Checklist](#quick-fixes-checklist)

---

## Architecture Overview

### Component Hierarchy
```
pages/findr/conditions.tsx
  └── ConditionsDashboard.tsx
      ├── FishingAreaInfo.tsx
      ├── FindrNextFewDaysCard.tsx (7-day forecast)
      └── Hourly Carousel (24-hour forecast)
```

### API Endpoints
- `/api/findr/conditions` - Main conditions data + rectangle info
- `/api/findr/marine-weather` - Marine weather data (hourly, daily, current)
- `/api/tides` - Tide information
- `lib/services/weatherService.ts` - Multi-source weather fetching

### Weather Data Sources
1. **Met.no** (Norway) - Primary source
   - Native units: m/s, °C
   - Coverage: Global
   
2. **Open-Meteo** - Fallback
   - Native units: m/s, °C
   - Coverage: Global
   
3. **NWS/NOAA** (USA only)
   - Native units: mph, °F
   - **Critical**: Must convert to m/s and °C
   - Coverage: US waters only

---

## Common Issues & Solutions

### Issue 1: Location Shows "IBI" Instead of "Bay of Biscay"

**Symptoms**:
- Display shows technical code (e.g., "IBI", "NWS") instead of human-readable name
- "Area: IBI (IBI 28E5)" instead of "Area: Bay of Biscay (IBI 28E5)"

**Root Cause**:
- Database `region` field contains CMEMS code instead of human-readable name
- OR API mapping returns wrong field as name

**Solution**:

1. **Check API mapping** (`pages/api/findr/conditions.ts` line ~419):
```typescript
name: region,              // Should be human-readable (e.g., "Bay of Biscay")
region: cmems_region || code,  // Should be CMEMS code (e.g., "IBI")
```

2. **Check database data**:
```sql
SELECT rectangle_code, region, cmems_region 
FROM cmems_rectangles 
WHERE rectangle_code = '28E5';

-- Should return:
-- rectangle_code | region          | cmems_region
-- 28E5          | Bay of Biscay   | IBI
```

3. **Fix database if needed**:
```sql
UPDATE cmems_rectangles 
SET region = 'Bay of Biscay' 
WHERE rectangle_code = '28E5' AND region = 'IBI';
```

4. **Fix component display** (`ConditionsDashboard.tsx` line ~593):
```typescript
{data.rectangle.name} ({data.rectangle.region} {data.rectangle.code})
```

5. **Fix FishingAreaInfo** (`FishingAreaInfo.tsx` line ~47):
```typescript
const region = rectangleRegion || activeOption?.region || 'Unknown region';
```

**Files to Check**:
- `pages/api/findr/conditions.ts` (API mapping)
- `components/findr/ConditionsDashboard.tsx` (display)
- `components/findr/FishingAreaInfo.tsx` (area info)
- Database: `cmems_rectangles` table

---

### Issue 2: Wind Speed Shows "0 kts" or "—" in Hourly Carousel

**Symptoms**:
- Hourly forecast shows no wind speed or "0 kts"
- Daily forecast shows correct wind speeds
- Current conditions show correct wind speeds

**Root Cause**:
- Wind data fetched from Met.no location forecast but not merged into hourly array
- Type system used `windSpeedKts` instead of `windSpeedMS`
- Backend storing wind in knots instead of m/s

**Solution**:

1. **Verify type interfaces** (`hooks/useFindrMarineWeather.ts` lines 28-58):
```typescript
// ✅ CORRECT:
interface MarineHourlyForecast {
  time: string;
  windSpeedMS?: number;  // NOT windSpeedKts!
  windDirectionDeg?: number;
  // ...
}
```

2. **Check wind data population** (`pages/api/findr/marine-weather.ts` lines 481-496):
```typescript
// Populate wind data from weatherByHour map
for (const hour of hourly) {
  const weather = weatherByHour.get(hour.time);
  if (weather) {
    if (typeof weather.windSpeedMS === 'number') {
      hour.windSpeedMS = weather.windSpeedMS;
    }
    if (typeof weather.windDirDeg === 'number') {
      hour.windDirectionDeg = weather.windDirDeg;
    }
  }
}
```

3. **Check UI conversion** (`ConditionsDashboard.tsx` line ~247):
```typescript
windSpeedKts: typeof h.windSpeedMS === 'number' 
  ? h.windSpeedMS * 1.94384  // Convert m/s to knots for display
  : null
```

**Key Principle**: 
- **Backend**: Always store in `windSpeedMS` (m/s)
- **Frontend**: Convert to knots (× 1.94384) only for display

**Files to Check**:
- `pages/api/findr/marine-weather.ts` (wind data population)
- `hooks/useFindrMarineWeather.ts` (type definitions)
- `components/findr/ConditionsDashboard.tsx` (UI conversion)

---

### Issue 3: NWS/NOAA Shows Wrong Temperatures or Wind Speeds

**Symptoms**:
- US locations show temperatures that seem doubled or wrong
- Wind speeds in US waters don't match expectations
- Temperature shows in Fahrenheit instead of Celsius

**Root Cause**:
- NWS API returns imperial units (mph, °F)
- Conversion functions exist but not applied to all data (especially hourly)

**Solution**:

1. **Verify conversion functions exist** (`lib/services/weatherService.ts` lines 667-680):
```typescript
// Convert mph to m/s
function parseWindSpeed(windSpeed?: string): number | undefined {
  if (!windSpeed) return undefined;
  const match = windSpeed.match(/(\d+)/);
  if (!match) return undefined;
  const mph = parseInt(match[1]);
  return mph * 0.44704; // mph to m/s
}

// Convert Fahrenheit to Celsius
function fahrenheitToCelsius(fahrenheit?: number): number | undefined {
  if (fahrenheit == null || !Number.isFinite(fahrenheit)) return undefined;
  return (fahrenheit - 32) * 5 / 9;
}
```

2. **Check ALL data transformations are converted** (lines 640-668):
```typescript
// ✅ Current - MUST convert
current: {
  temp: fahrenheitToCelsius(periods[0]?.temperature),
  wind_speed: parseWindSpeed(periods[0]?.windSpeed),
  // ...
}

// ✅ Daily - MUST convert
daily: periods.slice(0, 7).map(period => ({
  temp: { day: fahrenheitToCelsius(period.temperature) },
  wind_speed: parseWindSpeed(period.windSpeed),
  // ...
}))

// ✅ Hourly - MUST convert (this is often missed!)
const hourlyPeriods = hourlyData?.properties?.periods || [];
const transformedHourly = hourlyPeriods.map((hour: { 
  temperature?: number; 
  windSpeed?: string; 
  [key: string]: unknown 
}) => ({
  ...hour,
  temperature: fahrenheitToCelsius(hour.temperature),
  windSpeed: hour.windSpeed,
}));
```

**Critical Check**: Look for ANY place where NWS data is returned without conversion:
```typescript
// ❌ WRONG - Missing conversion:
hourly: hourlyData?.properties?.periods || []

// ✅ CORRECT - With conversion:
hourly: transformedHourly
```

**Conversion Constants**:
- mph → m/s: `× 0.44704`
- °F → °C: `(F - 32) × 5/9`
- m/s → knots: `× 1.94384` (UI only)

**Files to Check**:
- `lib/services/weatherService.ts` (NWS implementation ~lines 590-680)

---

### Issue 4: 7-Day Forecast Not Scrollable on Mobile

**Symptoms**:
- 7-day forecast cards extend beyond screen width
- No horizontal scroll available
- Cards are cut off on small screens

**Solution**:

Add overflow and scroll styling to `FindrNextFewDaysCard.tsx`:

```tsx
// Container (line ~122)
<div className="space-y-4 overflow-x-auto pb-2">

// Cards wrapper (line ~195)
<div className="flex flex-row gap-4 min-w-fit md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-w-[600px] md:min-w-0">
```

**Key CSS Classes**:
- `overflow-x-auto` - Enable horizontal scroll
- `min-w-fit` - Prevent card wrapping on mobile
- `min-w-[600px]` - Ensure minimum width for scrolling
- `md:min-w-0` - Remove minimum width on larger screens

**Files to Check**:
- `components/findr/weather/FindrNextFewDaysCard.tsx`

---

## Unit Normalization Reference

### The Golden Rule

**Backend**: All measurements in metric units
- Wind speed: `windSpeedMS` (meters per second)
- Temperature: Celsius
- Distance: meters
- Pressure: hPa

**Frontend**: Convert to user-friendly units ONLY for display
- Wind: m/s → knots (× 1.94384)
- Temperature: Usually stays in °C (or add °F option)

### Why This Matters

1. **Single Source of Truth**: Backend always uses metric
2. **Easier Debugging**: No confusion about what units data is in
3. **Consistent APIs**: All APIs return same units
4. **Flexible UI**: Easy to add user preferences for units

### Type System Enforcement

```typescript
// ✅ CORRECT - Explicit unit in name
interface MarineHourlyForecast {
  windSpeedMS: number;  // Clear it's in m/s
}

// ❌ WRONG - Ambiguous
interface MarineHourlyForecast {
  windSpeed: number;  // What unit is this?
}
```

---

## Data Flow Debugging

### Tracing Wind Speed Issues

1. **Source: Met.no API**
```typescript
// lib/services/weatherService.ts ~line 747
windSpeed: timeseries[0]?.data?.instant?.details?.wind_speed  // Already in m/s
```

2. **Transform: marine-weather API**
```typescript
// pages/api/findr/marine-weather.ts ~line 491
hour.windSpeedMS = weather.windSpeedMS;  // Store as m/s
```

3. **Transport: React Hook**
```typescript
// hooks/useFindrMarineWeather.ts
windSpeedMS?: number;  // Type as m/s
```

4. **Display: ConditionsDashboard**
```typescript
// components/findr/ConditionsDashboard.tsx ~line 247
windSpeedKts: h.windSpeedMS * 1.94384  // Convert to knots for display
```

### Debugging Checklist

When wind speed is missing or wrong:

- [ ] Check if Met.no returned wind data: `console.log(weather.windSpeedMS)`
- [ ] Check if it's in weatherByHour map: `console.log(weatherByHour.size)`
- [ ] Check if it's merged into hourly array: `console.log(hourly[0].windSpeedMS)`
- [ ] Check if UI receives it: `console.log(marineWeather.hourly[0].windSpeedMS)`
- [ ] Check conversion factor: Should be × 1.94384 for m/s to knots

---

## Database Schema Reference

### `cmems_rectangles` Table

```sql
CREATE TABLE cmems_rectangles (
  id SERIAL PRIMARY KEY,
  rectangle_code VARCHAR(10) NOT NULL,  -- ICES code (e.g., "28E5")
  region VARCHAR(255),                   -- Human-readable (e.g., "Bay of Biscay")
  cmems_region VARCHAR(50),              -- CMEMS code (e.g., "IBI")
  -- ... other fields
);
```

### Field Usage

- **`rectangle_code`**: ICES statistical rectangle (always shown)
- **`region`**: Display name for users (e.g., "Bay of Biscay", "English Channel")
- **`cmems_region`**: CMEMS dataset identifier (e.g., "IBI", "NWS", "BAL")

### Common Data Issues

```sql
-- Check for bad data (region containing codes instead of names)
SELECT rectangle_code, region, cmems_region 
FROM cmems_rectangles 
WHERE region IN ('IBI', 'NWS', 'BAL', 'ARC', 'BLK');

-- Fix example
UPDATE cmems_rectangles 
SET region = 'Bay of Biscay' 
WHERE cmems_region = 'IBI' AND region = 'IBI';
```

---

### Issue 5: Stealth Mode Indicator Missing from Bio Indicators

**Symptoms**:
- Bio indicators card shows chlorophyll, oxygen, nitrate, phosphate, salinity, temperature, phytoplankton
- "Stealth Mode" indicator (with sunglasses icon) is missing
- Other indicators display correctly

**Root Cause**:
- Stealth calculation requires latitude, longitude for sun position calculation
- Previously depended on UV Index which was often unavailable
- Now calculates from: time of day (sun position), cloud cover, and water clarity

**Stealth Mode Levels**:
- 🥷 **Ninja Mode** (high/very_high light): Fish are spooky; keep quiet and invisible
- 🎯 **Blend In** (normal light): Stay subtle, but not paranoid
- 📣 **Loud and Proud** (low/very_low light): Visibility's poor, they'll never notice

**Solution**:

1. **Verify stealth is in indicator order** (`utils/bioMarineLevels.ts` line ~37):
```typescript
export const MARINE_BIO_INDICATOR_ORDER: MarineBioIndicatorType[] = [
  'chlorophyll',
  'oxygen',
  'nitrate',
  'phosphate',
  'stealth',  // Should be here
  'salinity',
  'surfaceTemperature',
  'phytoplankton',
];
```

2. **Check stealth calculation** (`utils/bioMarineLevels.ts` ~line 200):
```typescript
export function calculateStealthIndex(
  lat?: number | null,
  lon?: number | null,
  cloudCover?: number | null,
  waterClarityIndex?: number | null,
  currentTime: Date = new Date()
): number | null
```

3. **Verify ConditionsDashboard passes correct data** (~line 518):
```typescript
stealth: calculateStealthIndex(
  data.rectangle.centerLat,
  data.rectangle.centerLon,
  environmentalSignals.cloudCover ?? null,
  marine.waterClarityIndex ?? null
),
```

4. **Check data availability**:
   - **Lat/Lon**: Always available from rectangle data ✅
   - **Cloud Cover**: From weather-with-pollen API (optional)
   - **Water Clarity**: From kd490 database field (optional)
   - **Sun Position**: Calculated from lat/lon + current time ✅

**How Stealth Mode Works**:
- **Base Light Level**: Calculated from solar elevation angle
  - Night (sun < -12°): 0% light → **Loud and Proud**
  - Twilight (-12° to 0°): 0-20% light → **Loud and Proud** to **Blend In**
  - Day (0° to 90°): 20-100% light → **Blend In** to **Ninja Mode**
- **Cloud Modifier**: Heavy clouds reduce light by up to 70%
- **Water Clarity Modifier**: Clear water increases light penetration by up to 20%
- **Result**: 0-100 index where higher = more light = need **Ninja Mode** tactics

**Debugging Steps**:
```bash
# Check if lat/lon are valid
console.log('Rectangle:', data.rectangle.centerLat, data.rectangle.centerLon);

# Check cloud cover availability
console.log('Cloud cover:', environmentalSignals.cloudCover);

# Check water clarity
console.log('Water clarity:', marine.waterClarityIndex);

# Check stealth calculation result
const stealth = calculateStealthIndex(lat, lon, cloudCover, waterClarity);
console.log('Stealth index:', stealth);
```

**Key Principle**: 
Stealth Mode indicator should **always appear** now because it only requires lat/lon (which we always have). Cloud cover and water clarity are optional enhancements - if missing, calculation uses sun position alone.

**Display Logic**:
- **0-35**: Loud and Proud (very_low/low) - Low light, fish confident
- **36-65**: Blend In (normal) - Moderate light, fish somewhat alert  
- **66-100**: Ninja Mode (high/very_high) - High light, fish very wary

**Files to Check**:
- `utils/bioMarineLevels.ts` (calculation function)
- `components/findr/ConditionsDashboard.tsx` (usage)
- `components/findr/weather/MarineBioIndicatorsCard.tsx` (display)

---

## Quick Fixes Checklist

### Location Name Shows Code Instead of Name

1. [ ] Check API returns `name` field with human-readable value
2. [ ] Check database `region` field has proper name (not code)
3. [ ] Check component uses `rectangle.name` not `rectangle.region`
4. [ ] Clear Next.js cache: `rm -rf .next && npm run dev`

### Wind Speed Missing in Hourly Forecast

1. [ ] Check all interfaces use `windSpeedMS` not `windSpeedKts`
2. [ ] Check wind data is populated in marine-weather API (lines 481-496)
3. [ ] Check UI converts m/s to knots (× 1.94384)
4. [ ] Check Met.no API is returning wind data
5. [ ] Restart dev server: `pkill -f "next dev" && npm run dev`

### NWS Shows Wrong Temperatures

1. [ ] Check `fahrenheitToCelsius()` function exists
2. [ ] Check conversion applied to current data
3. [ ] Check conversion applied to daily data
4. [ ] **Check conversion applied to hourly data** (often missed!)
5. [ ] Verify conversion: `(°F - 32) × 5/9 = °C`

### 7-Day Forecast Not Scrolling

1. [ ] Add `overflow-x-auto` to container
2. [ ] Add `min-w-fit` to cards wrapper
3. [ ] Add `min-w-[600px]` for mobile scroll trigger
4. [ ] Test on mobile device or Chrome DevTools mobile view

### Stealth Mode Indicator Missing

1. [ ] Check `MARINE_BIO_INDICATOR_ORDER` includes 'stealth'
2. [ ] Verify lat/lon are passed to calculateStealthIndex
3. [ ] Check console for calculation errors
4. [ ] Verify indicator appears in marineBioIndicators array
5. [ ] Check if `buildMarineBioIndicators` filters out null values
6. [ ] Verify custom labels: "Ninja Mode", "Blend In", "Loud and Proud"

---

## Testing Commands

```bash
# Run weather service tests
npx jest lib/services/weatherService.test.ts

# Test specific location conditions API
curl "http://localhost:3000/api/findr/conditions?lat=47.5&lon=-3.5" | jq

# Test marine weather API
curl "http://localhost:3000/api/findr/marine-weather?lat=47.5&lon=-3.5" | jq

# Check rectangle data
psql $DATABASE_URL -c "SELECT * FROM cmems_rectangles WHERE rectangle_code = '28E5';"

# Clear Next.js cache and restart
rm -rf .next && npm run dev

# Kill and restart dev server
pkill -f "next dev" && sleep 2 && npm run dev
```

---

## Related Documentation

- `CMEMS_INTEGRATION_STATUS.md` - Overall CMEMS integration
- `CONDITIONS_PAGE_ENHANCEMENTS_2025-10-17.md` - Feature enhancements
- `COPERNICUS_DEPLOYMENT_GUIDE.md` - Deployment procedures
- `API_COMPREHENSIVE_COPERNICUS_COMPLETE.md` - API documentation

---

## Emergency Recovery Steps

If the Conditions page is completely broken:

1. **Check dev server is running**: `curl http://localhost:3000/api/health`
2. **Clear all caches**: `rm -rf .next && npm run dev`
3. **Check database connection**: Test any SQL query
4. **Check API responses**: Use curl commands above
5. **Check browser console**: Look for TypeScript errors or API failures
6. **Revert to last known good commit** if needed

---

## Key Learnings

### Architecture Decisions

1. **Unit normalization at backend**: Prevents inconsistencies, single source of truth
2. **Type system with explicit units**: `windSpeedMS` makes units clear
3. **Conversion only in UI**: Backend never stores display units
4. **Human-readable database fields**: Users see names, not codes

### Common Pitfalls

1. **Forgetting hourly data conversions**: Always check ALL data paths get converted
2. **Using wrong field for display**: Use `name` for display, `region` for CMEMS code
3. **Type system conflicts**: Don't mix `windSpeedKts` and `windSpeedMS`
4. **Cache issues**: Always clear `.next` folder when types change

### Prevention

1. Use TypeScript interfaces with explicit unit names
2. Add unit tests for conversion functions
3. Document expected units in comments
4. Use grep to find all places a field is used before changing it

---

**Version**: 1.0  
**Authors**: Development Team  
**Last Incident**: 20 October 2025 - NWS hourly temperature conversion
