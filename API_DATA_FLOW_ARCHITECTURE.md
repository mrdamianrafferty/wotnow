# API Data Flow Architecture

## Current Architecture (BROKEN)

```
┌─────────────────────────────────────────────────────────────┐
│                      Go Daisy Frontend                       │
└───────────────┬──────────────────────┬──────────────────────┘
                │                      │
                │                      │ SeaTempCard makes
                │ /api/marine          │ direct calls!
                ▼                      ▼
         ┌──────────────┐      ┌──────────────┐
         │   Marine     │      │  Stormglass  │
         │   Endpoint   │      │     API      │ 💰💰💰
         └──────┬───────┘      └──────────────┘
                │                      ▲
                │ Calls directly       │
                └──────────────────────┘
                        ❌ PROBLEM!

┌────────────────────────────────────────┐
│      Copernicus Database               │
│  (Free, comprehensive marine data)     │
│         ❌ NOT USED!                   │
└────────────────────────────────────────┘
```

## Target Architecture (OPTIMIZED)

```
┌─────────────────────────────────────────────────────────────┐
│                      Go Daisy Frontend                       │
└───────────────┬──────────────────────┬──────────────────────┘
                │                      │
                │ All calls via        │ Use API endpoints
                │ backend APIs         │ only
                ▼                      ▼
         ┌──────────────┐      ┌──────────────┐
         │   Marine     │      │   Unified    │
         │   Endpoint   │      │   Weather    │
         └──────┬───────┘      └──────┬───────┘
                │                     │
                │                     │
                ▼                     ▼
    ┌───────────────────────────────────────────┐
    │      Data Source Priority Waterfall       │
    │                                            │
    │  1. Copernicus DB (free, cached)     ✅   │
    │           │ if unavailable                 │
    │           ▼                                │
    │  2. Met.no API (free)                ✅   │
    │           │ if unavailable                 │
    │           ▼                                │
    │  3. Open-Meteo (free)                ✅   │
    │           │ if unavailable                 │
    │           ▼                                │
    │  4. Stormglass (paid, emergency)     💰   │
    │           │ only if all else fails         │
    │           ▼                                │
    │  5. Return cached fallback if needed       │
    └───────────────────────────────────────────┘
```

## Data Sources by Type

### Marine Weather (Sea Temp, Waves, Currents)

```
REQUEST: Sea Temperature for 51.5°N, 0°W
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  1️⃣  Query Copernicus Database                          │
│      SELECT sea_temp_c FROM copernicus_data             │
│      WHERE rectangle = closest(51.5, 0.0)                │
│      AND data_date >= today - 2 days                     │
│      ✅ HIT: Return 14.2°C (free, <10ms)                │
└──────────────────────────────────────────────────────────┘
    │ If MISS or stale:
    ▼
┌──────────────────────────────────────────────────────────┐
│  2️⃣  Try Met.no Ocean Forecast                          │
│      GET api.met.no/oceanforecast/...                   │
│      ⚠️  Limited coverage (mainly Nordic seas)          │
│      If available: Cache 3h, return                      │
└──────────────────────────────────────────────────────────┘
    │ If unavailable:
    ▼
┌──────────────────────────────────────────────────────────┐
│  3️⃣  Try Open-Meteo Marine                              │
│      GET api.open-meteo.com/v1/marine                   │
│      ⚠️  Basic data only                                │
│      If available: Cache 1h, return                      │
└──────────────────────────────────────────────────────────┘
    │ If unavailable:
    ▼
┌──────────────────────────────────────────────────────────┐
│  4️⃣  LAST RESORT: Stormglass                            │
│      GET api.stormglass.io/v2/weather/point             │
│      💰 Costs money per call                            │
│      Cache 6h aggressively, return                       │
│      ⚠️  Log alert: "Using paid fallback"              │
└──────────────────────────────────────────────────────────┘
    │ If this fails:
    ▼
┌──────────────────────────────────────────────────────────┐
│  5️⃣  Return cached data (even if old) or fallback       │
│      Log error, return last known value                  │
└──────────────────────────────────────────────────────────┘
```

### Tide Predictions

```
REQUEST: Tides for Dublin, Ireland
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  1️⃣  WorldTides API (primary)                           │
│      GET worldtides.info/api/v3                         │
│      ✅ Accurate, predictable data                      │
│      Cache: 24 hours (tides don't change!)               │
│      Cost: Free tier or low cost                         │
└──────────────────────────────────────────────────────────┘
    │ Only if WorldTides fails:
    ▼
┌──────────────────────────────────────────────────────────┐
│  2️⃣  Stormglass Tides (emergency only)                  │
│      GET api.stormglass.io/v2/tide/extremes/point       │
│      💰 Costs money                                     │
│      Cache: 24 hours                                     │
│      ⚠️  Log alert: "WorldTides unavailable"           │
└──────────────────────────────────────────────────────────┘
```

### Astronomy (Sun/Moon Times)

```
REQUEST: Sunrise/Sunset/Moon Phase
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  1️⃣  moon-api.com (NEW - to be integrated)              │
│      GET api.moon-api.com/v1/...                        │
│      ✅ Free, dedicated moon/sun data                   │
│      Cache: 24 hours (predictable!)                      │
│      Not yet implemented ⚠️                             │
└──────────────────────────────────────────────────────────┘
    │ If unavailable:
    ▼
┌──────────────────────────────────────────────────────────┐
│  2️⃣  Open-Meteo Astronomy API                           │
│      GET api.open-meteo.com/v1/astronomy                │
│      ✅ Free, basic sun/moon data                       │
│      Cache: 24 hours                                     │
│      Currently used ✅                                  │
└──────────────────────────────────────────────────────────┘
    │ Only if both fail:
    ▼
┌──────────────────────────────────────────────────────────┐
│  3️⃣  Stormglass Astronomy (emergency only)              │
│      GET api.stormglass.io/v2/astronomy/point           │
│      💰 Costs money                                     │
│      Cache: 24 hours                                     │
│      Should rarely be needed                             │
└──────────────────────────────────────────────────────────┘
```

### General Weather

```
REQUEST: Weather forecast for London
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  1️⃣  Met.no API (primary)                               │
│      GET api.met.no/weatherapi/locationforecast/2.0     │
│      ✅ Free, high quality, government source           │
│      Cache: Dynamic (respects Cache-Control headers)     │
│      Currently used correctly ✅                        │
└──────────────────────────────────────────────────────────┘
    │ If unavailable:
    ▼
┌──────────────────────────────────────────────────────────┐
│  2️⃣  Open-Meteo Forecast API                            │
│      GET api.open-meteo.com/v1/forecast                 │
│      ✅ Free, good coverage worldwide                   │
│      Cache: 1-3 hours                                    │
│      Good fallback ✅                                   │
└──────────────────────────────────────────────────────────┘
    │ If both fail:
    ▼
┌──────────────────────────────────────────────────────────┐
│  3️⃣  OpenWeather API (if configured)                    │
│      GET api.openweathermap.org/data/2.5/weather        │
│      💰 Costs money (paid API)                          │
│      Cache: 1 hour                                       │
│      Only if OPENWEATHER_API_KEY is set                  │
└──────────────────────────────────────────────────────────┘
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│              In-Memory Cache Layer                       │
│  (Shared across all requests, per-server instance)      │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                │
│  │  Coordinates   │  │  Time-based    │                │
│  │  rounded to    │  │  buckets (AM/  │                │
│  │  3 decimals    │  │  PM windows)   │                │
│  └────────────────┘  └────────────────┘                │
│                                                          │
│  Cache Key: "51.507_-0.128_pm_2025-10-19"              │
│  Value: { data: {...}, ttl: 6h, source: "copernicus" } │
└─────────────────────────────────────────────────────────┘
           │
           │ If cache HIT: Return immediately
           │ If cache MISS: Query data sources
           ▼
┌─────────────────────────────────────────────────────────┐
│              Database Cache (Copernicus)                 │
│  (Persistent, updated daily via cron job)               │
│                                                          │
│  SELECT * FROM copernicus_data                          │
│  WHERE rectangle_code = '28E5'                          │
│  AND data_date >= CURRENT_DATE - INTERVAL '2 days'     │
│                                                          │
│  TTL: Refresh nightly (data updates once per day)       │
└─────────────────────────────────────────────────────────┘
           │
           │ If data fresh: Return
           │ If data stale: Query external APIs
           ▼
┌─────────────────────────────────────────────────────────┐
│            External API Calls (Fallback)                 │
│  Each API has its own cache TTL:                        │
│  - Met.no: Respects server headers (1-3h typically)     │
│  - Open-Meteo: 1-3h depending on data type              │
│  - WorldTides: 24h (highly predictable)                 │
│  - moon-api: 24h (sun/moon positions predictable)       │
│  - Stormglass: 6h (expensive, cache aggressively)       │
└─────────────────────────────────────────────────────────┘
```

## Coordinate Precision Impact

```
BEFORE: Full precision (6-8 decimals)
┌─────────────────────────────────────────────────┐
│  User Location        API Call Coordinate       │
│  51.50735 N, -0.1278  → 51.50735, -0.1278       │
│  51.50741 N, -0.1279  → 51.50741, -0.1279   ❌  │
│  51.50729 N, -0.1277  → 51.50729, -0.1277   ❌  │
│                                                  │
│  Result: 3 unique API calls for ~50m difference │
│  Cache hit rate: ~10%                            │
└─────────────────────────────────────────────────┘

AFTER: 3 decimal precision (0.001° ≈ 110m)
┌─────────────────────────────────────────────────┐
│  User Location        API Call Coordinate       │
│  51.50735 N, -0.1278  → 51.507, -0.128          │
│  51.50741 N, -0.1279  → 51.507, -0.128      ✅  │
│  51.50729 N, -0.1277  → 51.507, -0.128      ✅  │
│                                                  │
│  Result: 1 API call for all 3 requests          │
│  Cache hit rate: ~90%                            │
└─────────────────────────────────────────────────┘

Impact:
- API calls reduced by 90%
- Response time improved (cache hits)
- Cost reduced by 90%
- Accuracy impact: ~110m (acceptable for weather/marine data)
```

## Cost Comparison

```
BEFORE OPTIMIZATION:
┌──────────────┬────────────┬─────────────┬────────────┐
│  Provider    │ Calls/Day  │  Cost/Call  │ Cost/Month │
├──────────────┼────────────┼─────────────┼────────────┤
│ Stormglass   │   10,000   │   $0.02     │   $200     │
│ WorldTides   │    1,000   │   $0.01     │    $10     │
│ Met.no       │    5,000   │   Free      │    $0      │
│ Open-Meteo   │    2,000   │   Free      │    $0      │
├──────────────┼────────────┼─────────────┼────────────┤
│ TOTAL        │   18,000   │             │   $210     │
└──────────────┴────────────┴─────────────┴────────────┘

AFTER OPTIMIZATION:
┌──────────────┬────────────┬─────────────┬────────────┐
│  Provider    │ Calls/Day  │  Cost/Call  │ Cost/Month │
├──────────────┼────────────┼─────────────┼────────────┤
│ Copernicus   │   Database │   Free      │    $0      │
│ Met.no       │    5,000   │   Free      │    $0      │
│ Open-Meteo   │    3,000   │   Free      │    $0      │
│ moon-api     │      500   │   Free      │    $0      │
│ WorldTides   │    1,000   │   $0.01     │   $10      │
│ Stormglass   │       50   │   $0.02     │    $1      │
├──────────────┼────────────┼─────────────┼────────────┤
│ TOTAL        │    9,550   │             │   $11      │
└──────────────┴────────────┴─────────────┴────────────┘

SAVINGS: $199/month (95% reduction!)
```

---

See also:
- `API_USAGE_AUDIT_AND_REFACTOR_PLAN.md` - Detailed implementation plan
- `API_DATA_SOURCE_QUICK_REF.md` - Quick reference tables
- `MARINE_API_REFACTOR_NEEDED.md` - Marine endpoint refactor guide
