# Open-Meteo API Integration Guide for WotNow

This document provides a comprehensive guide for using Open-Meteo APIs to fetch environmental data such as UV Index (UVI), Air Quality Index (AQI), and pollen data. It covers endpoint selection, caching, rate limiting, and API best practices.

## Endpoint Selection Guide

### UV Index (UVI)
- **Primary Endpoint**: `/v1/forecast`
  - **Hourly Variables**: `uv_index`, `uv_index_clear_sky`
  - **Daily Variables**: `uv_index_max`, `uv_index_clear_sky_max`
  - **Best Practice**: Use this endpoint when already fetching weather data
- **Alternative Endpoint**: `/v1/air-quality` 
  - Also exposes UVI hourly
  - Convenient if already calling this endpoint for AQI/pollen

### Air Quality (AQI + pollutants)
- **Endpoint**: `/v1/air-quality`
- **Available Data**:
  - Hourly pollutants (PM₂.₅, PM₁₀, O₃, NO₂, SO₂, CO)
  - European AQI and US AQI indices
  - UVI
- **Domain Selection**:
  - `domains=cams_europe` for Europe (finer 0.1° grid, ~11 km)
  - `domains=cams_global` (0.25°, ~25 km) for global coverage
- **Update Frequency**:
  - CAMS Europe: ~every 24h (4-day forecast)
  - CAMS Global: ~every 12h (5-day forecast)

### Pollen
- **Endpoint**: `/v1/air-quality` (Europe only, in season)
- **Hourly Variables**: `alder_pollen`, `birch_pollen`, `grass_pollen`, `mugwort_pollen`, `olive_pollen`, `ragweed_pollen`
- **Limitations**: 
  - Only available in Europe (CAMS Europe domain)
  - Only available during pollen season
  - 4-day forecast maximum

## Example API URLs

### UVI via Weather Forecast (hourly + daily)
```
https://api.open-meteo.com/v1/forecast?latitude=43.48&longitude=-5.27
&hourly=uv_index,uv_index_clear_sky
&daily=uv_index_max,uv_index_clear_sky_max
&timezone=Europe%2FMadrid
```

### AQI + pollutants (Europe domain) + UVI + Pollen
```
https://air-quality-api.open-meteo.com/v1/air-quality?latitude=43.48&longitude=-5.27
&hourly=pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,
uv_index,uv_index_clear_sky,
european_aqi,us_aqi,
alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen
&domains=cams_europe
&timezone=Europe%2FMadrid
```

## Update Cadence

- **Air Quality (CAMS Europe)**: ~24h updates, 4-day forecast
- **Air Quality (CAMS Global)**: ~12h updates, 5-day forecast
- **Weather Forecast (incl. UVI)**: Models update hourly to 6-hourly depending on model; Open-Meteo advises allowing ~10 minutes after a model update for data propagation

## Date Range Limitations

- **Maximum Forecast Date**: Open-Meteo's APIs currently support forecasts up to `2025-08-24`
- **Our Implementation**: Automatically detects if current date exceeds this limit and uses fallback to most recent available data
- **Stale Data Handling**: When using data beyond the maximum date, we mark the response with `isStale: true` and add a warning message to the UI

## Practical Routing Rules

1. If you already call weather: get UVI from `/v1/forecast`; add `uv_index[_max]`
2. When you need AQI or pollen: call `/v1/air-quality`
3. In Europe: prefer `domains=cams_europe` for AQI/pollen; elsewhere use `cams_global`
4. Our `fetchEnvironmentalData()` function automatically optimizes API calls based on your data needs

## Caching & Rate-Limiting Implementation

Our implementation uses a tiered approach to reduce API load while maintaining data freshness:

### Cache TTLs (per location)
- **Weather `/v1/forecast`**: 
  - 15 minutes for hourly UVI
  - 60 minutes for daily `uv_index_max`
- **Air-quality `/v1/air-quality`**: 
  - 30 minutes for pollutants/AQI
  - 60 minutes for hourly pollen
  - 120 minutes for daily pollen aggregations
  - Longer caching during off-season

### Request Optimization Features

#### 1. Request Deduplication
- Identical in-flight requests are coalesced to a single API call
- Concurrent calls for the same location use the same promise

#### 2. Jittered Cache Expiration
- Cache TTLs include ±10-20% jitter to prevent thundering herd problems
- Example: 15-minute TTL becomes 13-17 minutes (randomized)

#### 3. Concurrency Control
- Maximum 4 concurrent outbound API calls
- Additional requests are queued and processed when slots become available

#### 4. Smart Retries
- Exponential backoff with jitter for failed requests
- Only retry on 429 (rate limit) and 5xx (server errors)
- Maximum 3 retry attempts per request

#### 5. Parameter Optimization
- Batches multiple variables in single API call
- Automatically selects correct domain based on location
- Pins domain parameter to prevent unexpected switches

## Error Handling

Our implementation includes comprehensive error handling:

1. **Network Errors**: Retries with exponential backoff
2. **Timeout Protection**: All requests have a 10-second timeout
3. **Rate Limiting**: Detects 429 responses and backs off accordingly
4. **Fallback Mechanism**: Returns cached data when available even if refresh fails
5. **Data Validation**: Verifies response structure before processing

## Implementation Interfaces

The new OpenMeteo service (`openMeteoService.ts`) provides these main functions:

### 1. `fetchUVIndex(lat, lon, forecastDays?, forceRefresh?)`
```typescript
// Fetch just UV Index data
const uviData = await fetchUVIndex(51.5074, -0.1278);
console.log('Max UVI today:', uviData.daily.uv_index_max[0]);
```

### 2. `fetchAirQuality(lat, lon, includePollen?, forecastDays?, forceRefresh?)`
```typescript
// Fetch air quality data (with pollen if available)
const aqiData = await fetchAirQuality(48.8566, 2.3522, true);
console.log('Current US AQI:', aqiData.hourly.us_aqi[0]);
```

### 3. `fetchEnvironmentalData(lat, lon, forecastDays?, options?)`
```typescript
// Optimized fetch of all environmental data
const envData = await fetchEnvironmentalData(40.7128, -74.006, 7, {
  needUVI: true,
  needAQI: true, 
  needPollen: true,
  forceRefresh: false
});

// Access hourly or daily aggregated data
console.log('Today\'s max UVI:', envData.daily[0].uv_index_max);
```

### 4. Cache Management
```typescript
// Get cache statistics
const stats = getCacheStats();
console.log(`Cache has ${stats.entriesCount} entries using ~${stats.sizeEstimate}`);

// Clear cache
clearCache();
```

## Implementation Checklist

- ✅ Endpoint matches data: 
  - UVI → `/v1/forecast` (or piggyback on `/v1/air-quality`)
  - AQI/pollen → `/v1/air-quality`
- ✅ Requested variables exist on that endpoint (names exactly as docs)
- ✅ Domain pinned for Europe (`domains=cams_europe`) when expecting European pollen/AQI
- ✅ Timezone set to avoid UTC-local mismatches
- ✅ Cache TTLs reflect model cadence (see above)
- ✅ One call per endpoint per location with all needed hourly= (and daily=) fields to reduce API load
- ✅ Request deduplication to prevent duplicate API calls
- ✅ Concurrency control to prevent overwhelming the API
- ✅ Jittered cache expiration to prevent thundering herd problems
- ✅ Smart retry logic with exponential backoff

## Testing

A comprehensive test script is available at `test-openmeteo-service.js` to verify the implementation works as expected. Run it to see the service in action:

```bash
node test-openmeteo-service.js
```

## Future Enhancements

1. **Persistent Cache**: Consider implementing Redis or another persistent cache for production
2. **Proactive Refresh**: Background job to refresh cache for common locations
3. **Metrics Collection**: Track API call volume, cache hit rates, and error rates
4. **Circuit Breaker**: Implement circuit breaker pattern for API instability
5. **Geospatial Clustering**: Group nearby locations to reduce redundant API calls

## Open-Meteo API Terms of Service

Remember that Open-Meteo is a free service with rate limits. From their [Terms of Service](https://open-meteo.com/en/terms):

1. **Rate Limits**: No explicit limit is stated, but they expect "reasonable use"
2. **Attribution**: Not required for the API, but appreciated
3. **Availability**: No SLA guarantees; service provided as-is
4. **Commercial Use**: Allowed, but for high-volume commercial applications consider their paid options

## Additional Resources

- [Open-Meteo Documentation](https://open-meteo.com/en/docs)
- [Open-Meteo Weather API](https://open-meteo.com/en/docs/weather-api)
- [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api)
