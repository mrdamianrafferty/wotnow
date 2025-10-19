# Moon API Integration Plan - Task 4

## Current Status

### ✅ Already Implemented (Task 3)
- **0dp coordinate rounding** (~111km precision)
- **24h cache** in Supabase `moon_cache` table
- **Reduced API calls by 99%** through coordinate bucketing

### 📍 Current Implementation
- **Primary API**: ipgeolocation.io (requires API key)
- **Endpoints**: `/api/moon`, `/api/unified-weather`
- **Service**: `lib/astro/moonService.ts`
- **Cost**: $15/month for ipgeolocation.io astronomy API

## Integration Strategy

### Option 1: Add Free Astronomy APIs (RECOMMENDED)

Create a waterfall similar to marine API:
1. **Open-Meteo Astronomy API** (FREE, no API key)
2. **Met.no Sunrise API** (FREE, no API key, requires User-Agent)
3. **SunCalc library** (FREE, local calculation fallback)
4. **ipgeolocation.io** (PAID, last resort only)

### Option 2: Use moon-api.com

**Problem**: moon-api.com doesn't exist as a free public API
- The domain redirects or doesn't have a documented free tier
- Would need API key anyway (defeating purpose)

### Option 3: Use Open-Meteo (BEST FREE OPTION)

**Advantages**:
- ✅ Completely free
- ✅ No API key required
- ✅ Global coverage
- ✅ Reliable infrastructure
- ✅ Already used in `astronomy-highlights.ts`
- ✅ Provides: sunrise, sunset, moonrise, moonset, moon phase, moon illumination

**API Endpoint**:
```
https://api.open-meteo.com/v1/astronomy?latitude={lat}&longitude={lon}&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&daily=sunrise,sunset,moonrise,moonset,moon_phase,moon_illumination
```

## Recommended Implementation

### Phase 1: Add Open-Meteo as Primary Source

Update `lib/astro/moonService.ts`:

```typescript
async function fetchFromOpenMeteo(lat: number, lon: number, date: string): Promise<IpGeoAstronomyResponse | null> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/astronomy');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('start_date', date);
    url.searchParams.set('end_date', date);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('daily', 'sunrise,sunset,moonrise,moonset,moon_phase,moon_illumination');

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.daily) return null;

    // Convert Open-Meteo format to IpGeoAstronomyResponse format
    return {
      date: data.daily.time?.[0],
      timezone: data.timezone,
      sunrise: data.daily.sunrise?.[0],
      sunset: data.daily.sunset?.[0],
      moonrise: data.daily.moonrise?.[0],
      moonset: data.daily.moonset?.[0],
      moon_angle: data.daily.moon_phase?.[0], // 0-360 degrees
      moon_illumination_percentage: data.daily.moon_illumination?.[0], // 0-100
    };
  } catch (error) {
    console.error('Open-Meteo astronomy error:', error);
    return null;
  }
}
```

### Phase 2: Add SunCalc Fallback

For when all APIs fail:

```typescript
import { getMoonTimes, getTimes, getMoonIllumination } from 'suncalc';

async function fetchFromSunCalc(lat: number, lon: number, date: string): Promise<IpGeoAstronomyResponse> {
  const targetDate = new Date(date);
  const moonTimes = getMoonTimes(targetDate, lat, lon);
  const sunTimes = getTimes(targetDate, lat, lon);
  const moonIllum = getMoonIllumination(targetDate);

  return {
    date,
    timezone: 'UTC',
    sunrise: sunTimes.sunrise?.toISOString(),
    sunset: sunTimes.sunset?.toISOString(),
    moonrise: moonTimes.rise?.toISOString(),
    moonset: moonTimes.set?.toISOString(),
    moon_angle: moonIllum.phase * 360, // Convert 0-1 to degrees
    moon_illumination_percentage: moonIllum.fraction * 100,
  };
}
```

### Phase 3: Update Waterfall Logic

```typescript
export async function getMoonSunData(params: FetchParams): Promise<MoonSunData> {
  const supabase = getSupabaseServerClient();
  const latBucket = roundToGrid(params.lat);
  const lonBucket = roundToGrid(params.lon);

  const previewDate = params.date ?? Temporal.Now.instant().toZonedDateTimeISO('UTC').toPlainDate().toString();
  
  // 1. Check cache
  const cachedRow = await readFromCache(supabase, latBucket, lonBucket, previewDate);
  if (cachedRow) {
    console.log('✅ Astronomy cache hit');
    return mapRowToPayload(cachedRow);
  }

  // 2. Try Open-Meteo (FREE)
  console.log('🔄 Trying Open-Meteo astronomy...');
  let live = await fetchFromOpenMeteo(params.lat, params.lon, previewDate);
  
  // 3. Try ipgeolocation.io (PAID, only if API key exists and Open-Meteo failed)
  if (!live && (process.env.MOON_API_KEY || process.env.IPGEOLOCATION_API_KEY)) {
    console.log('⚠️  Falling back to ipgeolocation.io (PAID)');
    live = await requestAstronomyData(params);
  }
  
  // 4. Fallback to SunCalc (FREE, local calculation)
  if (!live) {
    console.log('📊 Using SunCalc local calculation');
    live = await fetchFromSunCalc(params.lat, params.lon, previewDate);
  }

  const localDate = live.date ?? previewDate;
  const payload = buildPayload(live, latBucket, lonBucket);
  await writeCache(supabase, latBucket, lonBucket, localDate, payload, live as Record<string, unknown> | null);
  return payload;
}
```

## Cost Impact

### Current Costs
- **ipgeolocation.io**: $15/month for 1,500 requests/month
- **With 0dp rounding**: ~150 requests/month (99% reduction)
- **Effective cost**: ~$1.50/month

### With Open-Meteo Integration
- **Open-Meteo**: $0/month (free)
- **SunCalc**: $0/month (local library)
- **ipgeolocation.io**: $0/month (not called)
- **Total cost**: $0/month
- **Savings**: $15/month (100% reduction)

## Implementation Steps

1. ✅ **Verify 0dp rounding** - Already done in Task 3
2. 🔄 **Add Open-Meteo fetch function** - New code
3. 🔄 **Add SunCalc fallback** - New code
4. 🔄 **Update waterfall logic** - Modify existing
5. 🔄 **Add logging for source tracking** - Monitor which source is used
6. 🔄 **Update tests** - Verify waterfall behavior
7. 🔄 **Update documentation** - Document new architecture

## Testing Strategy

1. **Cache hit test**: Verify 0dp rounding works
2. **Open-Meteo success**: Primary free source works
3. **Open-Meteo failure**: Falls back to SunCalc
4. **Paid API avoidance**: Verify ipgeolocation.io not called when free sources work
5. **Manual verification**: Check astronomy data accuracy

## Success Criteria

- ✅ Astronomy data fetched from free sources
- ✅ 0dp coordinate rounding working (99% API reduction)
- ✅ 24h cache working
- ✅ Zero paid API calls in normal operation
- ✅ $15/month cost savings
- ✅ Backward compatibility maintained
- ✅ All tests passing

## Timeline

- **Phase 1**: Add Open-Meteo integration (30 minutes)
- **Phase 2**: Add SunCalc fallback (15 minutes)
- **Phase 3**: Testing and verification (15 minutes)
- **Total**: ~1 hour

## Next Steps

1. Implement Open-Meteo fetch function
2. Implement SunCalc fallback
3. Update waterfall logic in `getMoonSunData`
4. Add logging for source tracking
5. Test with real coordinates
6. Update documentation

## Notes

- **SunCalc library already installed** (used in `/api/moon.ts`)
- **Open-Meteo already used** in `astronomy-highlights.ts`
- **0dp rounding already implemented** in Task 3
- **Cache infrastructure ready** - just need to update data source
- **No breaking changes** - waterfall maintains same response format
