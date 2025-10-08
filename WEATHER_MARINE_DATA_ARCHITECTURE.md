# Weather Data Architecture for Findr Conditions

## Overview
This document clarifies the data architecture for the Findr Conditions feature, distinguishing between weather pipeline data (user location-specific) and marine bio indicators (ICES rectangle-specific).

## Data Source Separation

### 1. Weather Pipeline Data (User Location @ 4 Decimal Places)
These data points come from the **OpenWeather API** via `/api/weather-with-pollen` and are specific to the user's precise location (rounded to 4 decimal places for cache optimization).

**Managed by**: `useFindrEnvironmentalSignals` hook

**Data Points**:
- ☁️ **Cloud Cover** (`cloudCover`): Current cloud coverage percentage (0-100%)
- ☀️ **UV Index** (`uvIndex`): Current UV Index (0-11+)
- 🌸 **Pollen Levels** (`pollen`): Grass, tree, and weed pollen counts
- 🏭 **Air Quality** (`airQuality`): PM2.5, PM10, NO2, O3, SO2, CO levels

**Location Precision**: 4 decimal places (±11 meters)
- Example: `lat=43.7500, lon=-6.5000`
- Rationale: Weather conditions vary at city/neighborhood level, not block level

**Update Trigger**: When user location changes or component reloads

**API Endpoint**: `/api/weather-with-pollen?lat={lat}&lon={lon}`

**Consumers**:
- `EnvironmentalSummaryCard` (UV Index, pollen, air quality)
- `MarineBioIndicatorsCard` (Stealth calculation via UVI + cloud cover)

---

### 2. Marine Bio Indicators (ICES Rectangle Level)
These data points come from **Supabase** and represent broader regional marine conditions at the ICES rectangle level (typically 30' latitude × 1° longitude or ~30nm × 30nm).

**Managed by**: Supabase RPC calls in `/api/findr/conditions`

**Data Points**:
- 🌊 **Sea Temperature** (`seaTemperatureC`)
- 🦠 **Chlorophyll** (`chlorophyllMgM3`) - Plankton productivity
- 💨 **Dissolved Oxygen** (`dissolvedOxygenMgL`)
- 🧪 **Nitrate** (`nitrateUmolL`) - Nutrient levels
- 🧪 **Phosphate** (`phosphateUmolL`) - Nutrient levels
- 🧂 **Salinity** (`salinityPsu`)
- 🦐 **Phytoplankton** (`phytoplanktonAvg`)

**Location Precision**: ICES Rectangle (e.g., "20C5", "24E1")
- Example: Rectangle 24E1 covers Gijón & central Asturias
- Rationale: Marine bio conditions are relatively uniform over large areas

**Update Frequency**: Periodic updates from Supabase (marine research data)

**API Endpoint**: `/api/findr/conditions?rectangleCode={code}`

**Consumers**:
- `MarineBioIndicatorsCard` (All indicators except stealth)
- Marine forecast cards (sea temp, waves, etc.)

---

### 3. Tides (ICES Rectangle Level)
Tide predictions come from **Supabase** at the ICES rectangle level.

**Data Points**:
- 🌊 **Next High Tide** (`nextHighIso`)
- 🌊 **Next Low Tide** (`nextLowIso`)
- 📊 **Hourly Tide Heights** (part of hourly marine JSON)

**Location Precision**: ICES Rectangle center coordinates
- Rationale: Tide patterns are consistent across ~30nm regions

**API Endpoint**: `/api/findr/conditions?rectangleCode={code}`

**Consumers**:
- `TideSummaryCard`
- Hourly marine charts

---

### 4. Hybrid: Stealth Indicator
The **Stealth Indicator** is unique as it combines data from both sources:

**Calculation**:
```typescript
calculateStealthIndex(
  environmentalSignals.uvIndex,      // User location (4dp)
  environmentalSignals.cloudCover    // User location (4dp)
)
```

**Why Hybrid?**:
- UV and cloud cover vary significantly at neighborhood level
- Fish wariness is affected by local light conditions, not regional
- Needs precise, real-time weather data for accurate tactical advice

**Result**: Light penetration index (0-100) classified into stealth levels
- Very Low (0-20%): Excellent conditions, fish feel secure
- Low (20-35%): Good stealth conditions
- Normal (35-55%): Moderate caution needed
- High (55-75%): Fish wary, need longer leaders
- Very High (75-100%): Extreme wariness, stealth critical

**Display**: Appears in `MarineBioIndicatorsCard` alongside marine bio data

---

## Location Coordinate Flow

### User Location (4dp)
```
User selects/navigates to fishing area
         ↓
Rectangle center coordinates (e.g., 43.75, -6.5)
         ↓
Passed to useFindrEnvironmentalSignals(lat, lon)
         ↓
Rounded to 4dp: lat.toFixed(4), lon.toFixed(4)
         ↓
/api/weather-with-pollen?lat=43.7500&lon=-6.5000
         ↓
OpenWeather API call
         ↓
Returns: current.clouds, current.uvi, pollen, air quality
```

### Rectangle Location
```
User selects fishing area
         ↓
Active rectangle code (e.g., "20C5")
         ↓
/api/findr/conditions?rectangleCode=20C5
         ↓
Supabase query for rectangle data
         ↓
Returns: marine bio, tides, rectangle metadata
```

---

## Component Data Responsibilities

### `pages/findr/conditions.tsx`
- **Manages**: Active rectangle selection
- **Provides**: `activeRectangle` state to children

### `components/findr/ConditionsDashboard.tsx`
- **Manages**: Data orchestration
- **Hooks**:
  - `useFindrConditions(activeRectangle)` → Marine bio + tides
  - `useFindrEnvironmentalSignals(lat, lon)` → Weather data
- **Derives**: 
  - `marineBioIndicators` (includes stealth from weather)
  - `environmentalSignals` (UV, cloud, pollen, air)

### `components/findr/weather/MarineBioIndicatorsCard.tsx`
- **Receives**: `indicators` array with all bio + stealth data
- **Displays**: Grid of indicator cards (expandable for insights)

### `components/findr/weather/EnvironmentalSummaryCard.tsx`
- **Receives**: `pollen`, `airQuality`, `uvIndex` from environmental signals
- **Displays**: Environmental conditions summary

---

## Cache Strategy

### Weather Data (4dp)
- **Precision**: 4 decimal places
- **Cache Key**: `lat=43.7500&lon=-6.5000`
- **TTL**: Short (5-15 minutes recommended)
- **Rationale**: Weather changes quickly, benefits from fresh data

### Marine Bio Data (Rectangle)
- **Precision**: ICES rectangle code
- **Cache Key**: `rectangleCode=20C5&date=2025-10-08`
- **TTL**: Long (hours to days)
- **Rationale**: Marine bio conditions change slowly

---

## API Endpoint Summary

| Endpoint | Data Source | Location Type | Precision | Update Frequency |
|----------|-------------|---------------|-----------|------------------|
| `/api/weather-with-pollen` | OpenWeather | User location | 4dp (~11m) | Real-time (5-15min) |
| `/api/findr/conditions` | Supabase | ICES rectangle | Rectangle (~30nm) | Periodic (hours-days) |
| `/api/findr/predictions` | Supabase RPC | ICES rectangle | Rectangle | Daily |

---

## Key Architectural Decisions

### Why 4 Decimal Places for Weather?
- **Precision**: ±11 meters (sufficient for neighborhood-level weather)
- **Cache Efficiency**: Same coordinates used by nearby users
- **API Cost**: Reduces redundant API calls
- **Weather Granularity**: Weather doesn't vary significantly at sub-11m level

### Why Rectangle Level for Marine Bio?
- **Data Availability**: Marine research data collected at regional level
- **Natural Variation**: Marine conditions relatively uniform over 30nm
- **Supabase Efficiency**: Aligned with ICES rectangle schema
- **Scientific Standard**: ICES rectangles are industry-standard fishing areas

### Why Hybrid for Stealth?
- **Tactical Importance**: Light conditions directly affect fishing success
- **Micro-variations**: Cloud cover can vary significantly within 30nm
- **Real-time Need**: Anglers need current conditions, not regional averages
- **Best of Both**: Combines precise weather with regional context

---

## Testing Verification

To verify the architecture is working correctly:

1. **Navigate to**: `http://localhost:3001/findr/conditions`
2. **Select different fishing areas**
3. **Check Network tab**:
   - `/api/findr/conditions?rectangleCode=XX` - Should fire on area change
   - `/api/weather-with-pollen?lat=XX.XXXX&lon=XX.XXXX` - Should fire with 4dp coords
4. **Verify Stealth Indicator**:
   - Changes when moving to areas with different weather
   - Does NOT change when moving within same weather region
   - Shows different values on sunny vs cloudy days

---

## Related Documentation

- `STEALTH_INDICATOR_IMPLEMENTATION.md` - Detailed stealth calculation docs
- `EMODNET_DATA_GUIDE.md` - EMODnet substrate/bathymetry integration
- `utils/coordinatePrecision.ts` - Coordinate rounding utilities
- `hooks/useFindrEnvironmentalSignals.ts` - Weather data hook
- `hooks/useFindrConditions.ts` - Marine conditions hook

---

## Migration Notes

Previous implementation mixed weather and marine data sources. This architecture:
- ✅ Separates concerns by data source and granularity
- ✅ Optimizes API usage and caching
- ✅ Provides more accurate stealth calculations
- ✅ Maintains backward compatibility
- ✅ Follows industry standards (ICES rectangles)
