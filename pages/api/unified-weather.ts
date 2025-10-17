import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildRectangleCacheKey,
  getRectangleAnchorForLocation,
  getRectangleDayKey,
} from '../../lib/weather/rectangleAnchors';
import { getMoonSunData } from '../../lib/astro/moonService';
import { weatherMetrics } from '../../lib/monitoring/weatherMetrics';

/*
 * ████████████████████████████████████████████████████████████████████████████████████
 * ██                                                                                ██
 * ██  IMPORTANT API LIMITATION:                                                     ██
 * ██  Open-Meteo API has a strict 5-day limit for forecasts                         ██
 * ██  DO NOT modify this file to request more than 5 days or it will cause errors   ██
 * ██  This limitation is enforced in multiple places in this file                   ██
 * ██                                                                                ██
 * ████████████████████████████████████████████████████████████████████████████████████
 */

// Lightweight in-memory caches to avoid hammering APIs on fast reloads
type CacheEntry<T> = { ts: number; data: T };
// Strengthen cache maps with generics
const sgTideCache = new Map<string, CacheEntry<StormglassTidesResponse>>();
const sgMarineCache = new Map<string, CacheEntry<StormglassMarineResponse>>();
const sgBioCache = new Map<string, CacheEntry<StormglassBioResponse>>();
const owWeatherCache = new Map<string, CacheEntry<OpenWeatherOneCall3 | OpenWeatherForecast25>>();

// Generalized caches for free providers and NOAA grid resolution
const weatherCache = new Map<string, CacheEntry<UnifiedWeather>>();
const gridCache = new Map<string, CacheEntry<NwsPointProperties>>();

// ============================================================================
// COORDINATE PRECISION CONFIGURATION
// ============================================================================
/**
 * Standardized precision strategy for maximum cache efficiency:
 * - FREE PROVIDERS: Use recommended precision (4dp for MET Norway)
 * - OPENWEATHER: 3dp (~110m) to align with free-provider cache
 * - STORMGLASS: 3dp (≈110m) for marine/coastal data
 * - ENVIRONMENTAL: 2dp for air quality, pollen (regional data)
 * 
 * This gives us ~10,000x better caching than 5dp
 */
const PRECISION = {
  METNO: 4,        // MET Norway recommendation (~11m)
  NOAA: 3,         // NOAA grid precision (~111m)
  EC: 3,           // Environment Canada (~111m)
  OPENWEATHER: 3,  // Align with free-provider cache (~111m)
  STORMGLASS: 3,   // Marine data (~111m)
  ENVIRONMENTAL: 2 // Air quality, pollen (~1.1km)
} as const;

// ============================================================================
// UPDATED CACHE KEY FUNCTIONS
// ============================================================================
/**
 * Generate standardized cache keys based on data type and provider
 */
function getCacheKey(lat: number, lon: number, provider: string, dataType?: string): string {
  let precision: number;
  
  // Determine precision based on provider and data type
  if (dataType === 'environmental' || dataType === 'pollen' || dataType === 'air') {
    precision = PRECISION.ENVIRONMENTAL;
  } else if (provider === 'metno') {
    precision = PRECISION.METNO;
  } else if (provider === 'noaa') {
    precision = PRECISION.NOAA;
  } else if (provider === 'ec') {
    precision = PRECISION.EC;
  } else if (provider === 'stormglass' || dataType === 'marine') {
    precision = PRECISION.STORMGLASS;
  } else if (provider === 'openweather') {
    precision = PRECISION.OPENWEATHER;
  } else {
    // Default fallback
    precision = 3;
  }
  
  const roundedLat = roundNdp(lat, precision);
  const roundedLon = roundNdp(lon, precision);
  
  return `${roundedLat.toFixed(precision)},${roundedLon.toFixed(precision)}`;
}

/**
 * Provider-specific coordinate rounding
 */
function roundForProvider(lat: number, lon: number, provider: string): { lat: number; lon: number; precision: number } {
  const precisionMap: Record<string, number> = {
    'metno': PRECISION.METNO,
    'noaa': PRECISION.NOAA,
    'ec': PRECISION.EC,
    'openweather': PRECISION.OPENWEATHER,
    'stormglass': PRECISION.STORMGLASS,
  };
  
  const precision = precisionMap[provider] || 3;
  
  return {
    lat: roundNdp(lat, precision),
    lon: roundNdp(lon, precision),
    precision
  };
}
// Add proper interfaces for optional API payloads used in caches
interface OpenWeatherAirQuality {
  coord?: { lon?: number; lat?: number };
  list?: Array<{
    dt?: number;
    main?: { aqi?: number };
    components?: {
      co?: number; no?: number; no2?: number; o3?: number; so2?: number; pm2_5?: number; pm10?: number; nh3?: number;
    };
  }>;
}
interface OpenMeteoPollenHourly {
  hourly?: {
    time?: string[];
    grass_pollen?: number[];
    alder_pollen?: number[];
    birch_pollen?: number[];
    ragweed_pollen?: number[];
    mugwort_pollen?: number[];
    olive_pollen?: number[];
    // AQ fields occasionally used
    pm2_5?: number[];
    pm10?: number[];
    nitrogen_dioxide?: number[];
    ozone?: number[];
    sulphur_dioxide?: number[];
    carbon_monoxide?: number[];
    us_aqi?: number[];
    european_aqi?: number[];
  };
}
interface OpenMeteoSoilHourly {
  hourly?: {
    time?: string[];
    soil_temperature_0cm?: number[];
    soil_temperature_6cm?: number[];
    soil_temperature_18cm?: number[];
    soil_temperature_54cm?: number[];
    soil_moisture_0_to_1cm?: number[];
    soil_moisture_1_to_3cm?: number[];
    soil_moisture_3_to_9cm?: number[];
    soil_moisture_9_to_27cm?: number[];
  };
}
// New: minimal Open-Meteo general weather hourly typing (for pressure_msl, temperature_2m)
interface OpenMeteoGeneralHourly {
  utc_offset_seconds?: number;
  hourly?: {
    time?: string[];
    pressure_msl?: number[];
    temperature_2m?: number[];
    // NEW: include snow arrays so we can map them into unified hourly
    snowfall?: number[]; // cm per hour
    snow_depth?: number[]; // cm
  };
}

// Minimal response typings for NOAA/NWS endpoints used in this handler
interface NwsPointProperties {
  forecast?: string;
  forecastHourly?: string;
}

interface NwsPointsResponse {
  properties?: NwsPointProperties;
}

interface NwsProbabilityValue {
  value?: number;
}

interface NwsForecastPeriod {
  startTime?: string;
  endTime?: string;
  isDaytime?: boolean;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string | number;
  windGust?: string | number;
  shortForecast?: string;
  detailedForecast?: string;
  probabilityOfPrecipitation?: NwsProbabilityValue;
  icon?: string;
}

interface NwsForecastResponse {
  properties?: {
    periods?: NwsForecastPeriod[];
  };
}

// MET Norway locationforecast minimal typing
interface MetNoDetailsInstant {
  air_temperature?: number;
  wind_speed?: number;
  wind_from_direction?: number;
  air_pressure_at_sea_level?: number;
  dew_point_temperature?: number;
  relative_humidity?: number;
  cloud_area_fraction?: number;
  wind_speed_of_gust?: number;
}

interface MetNoNextHours {
  summary?: { symbol_code?: string };
  details?: {
    precipitation_amount?: number;
  };
  probability_of_precipitation?: number;
}

interface MetNoTimeseriesEntry {
  time: string;
  data?: {
    instant?: { details?: MetNoDetailsInstant };
    next_1_hours?: MetNoNextHours;
    next_6_hours?: MetNoNextHours;
    next_12_hours?: MetNoNextHours;
  };
}

interface MetNoForecastResponse {
  properties?: {
    timeseries?: MetNoTimeseriesEntry[];
  };
}
const owAirQualityCache = new Map<string, CacheEntry<OpenWeatherAirQuality>>();
const omPollenCache = new Map<string, CacheEntry<OpenMeteoPollenHourly>>();
const omSoilCache = new Map<string, CacheEntry<OpenMeteoSoilHourly>>();
const omWeatherCache = new Map<string, CacheEntry<OpenMeteoGeneralHourly>>();

// Cache statistics helper (moved top-level to avoid "used before declaration" errors)
class CacheMetrics {
  private static hits = 0;
  private static misses = 0;
  private static providers: Record<string, number> = {};

  static recordHit(provider: string) {
    this.hits++;
    this.providers[provider] = (this.providers[provider] || 0) + 1;
  }

  static recordMiss(provider: string) {
    this.misses++;
    if (!(provider in this.providers)) {
      this.providers[provider] = 0;
    }
  }

  static getStats() {
    const total = this.hits + this.misses;
    return {
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%',
      hits: this.hits,
      misses: this.misses,
      byProvider: this.providers,
      estimatedSavings: `$${(this.hits * 0.0005).toFixed(2)}`
    };
  }
}

// Cache TTL settings
const TIDE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const MARINE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const RECT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours per rectangle/day
const WEATHER_TTL_MS = 5 * 60 * 1000;   // 5 minutes for main weather data
const AIR_QUALITY_TTL_MS = 15 * 60 * 1000; // 15 minutes for air quality
const POLLEN_TTL_MS = 60 * 60 * 1000;   // 1 hour for pollen data
const SOIL_TTL_MS = 30 * 60 * 1000;     // 30 minutes for soil data

const keyLL = (lat: number, lon: number) => `${lat.toFixed(3)},${lon.toFixed(3)}`;
// Provider-aware coordinate precision
function roundNdp(n: number, dp: number) {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Free-provider feature flags (server + optional NEXT_PUBLIC_* fallbacks)
const FREE_PROVIDERS_ENABLED = (() => {
  const v = process.env.FREE_PROVIDERS_ENABLED ?? process.env.NEXT_PUBLIC_FREE_PROVIDERS_ENABLED;
  if (v == null) return false; // default off unless explicitly enabled
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true';
})();

const isFreeProviderName = (value: string): value is FreeProviderName =>
  value === 'metno' || value === 'noaa' || value === 'ec';

const CONFIGURED_FREE_PROVIDER_ORDER: FreeProviderName[] | null = (() => {
  const raw = (process.env.FREE_PROVIDER_ORDER ?? process.env.NEXT_PUBLIC_FREE_PROVIDER_ORDER ?? 'auto')
    .trim()
    .toLowerCase();
  if (!raw || raw === 'auto') {
    return null;
  }
  const parts = raw.split(',').map((s) => s.trim()).filter(isFreeProviderName);
  return parts.length ? parts : null;
})();

type FreeProviderName = 'metno' | 'noaa' | 'ec';

type FreeProviderResult = {
  provider: FreeProviderName;
  unified: UnifiedWeather;
} | null;

// --- Real MET Norway and NOAA implementations ---
// Helper: minimal MET Norway icon mapping (should be imported from a helper in real code)
function mapMetNoIcon(symbol?: string): { icon?: string; description?: string } {
  // Simplified: just pass through for now, can expand for more robust mapping
  if (!symbol) return { icon: undefined, description: undefined };
  // Example: "clearsky_day", "cloudy", "lightrain", etc.
  // Map to OpenWeather-like icon codes if desired, or just use MET Norway's
  return { icon: symbol, description: undefined };
}
// Helper: minimal NWS icon mapping (should be imported from a helper in real code)
function mapNwsIcon(iconUrl?: string): { icon?: string; description?: string } {
  if (!iconUrl) return { icon: undefined, description: undefined };
  // NOAA/NWS icon URLs look like: https://api.weather.gov/icons/land/day/few?size=medium
  // We'll extract the main code after /icons/land/(day|night)/ and before ? or /
  try {
    const m = iconUrl.match(/\/icons\/[^/]+\/(day|night)\/([^/?]+)/);
    if (m) {
      // For example, "few", "bkn", "rain", etc.
      return { icon: m[2], description: undefined };
    }
  } catch {}
  return { icon: undefined, description: undefined };
}
// Helper: compute sunrise/sunset times for a given date/lat/lon
function computeSunTimes(date: Date, _lat: number, _lon: number): { sunriseISO?: string; sunsetISO?: string } {
  // Placeholder: in production use a library like suncalc, here just return undefined
  // Or approximate with 6:00 and 18:00 local time for demo
  try {
    const y = date.getUTCFullYear(), m = date.getUTCMonth(), d = date.getUTCDate();
    const sunrise = new Date(Date.UTC(y, m, d, 6, 0, 0));
    const sunset = new Date(Date.UTC(y, m, d, 18, 0, 0));
    return { sunriseISO: sunrise.toISOString(), sunsetISO: sunset.toISOString() };
  } catch {
    return { sunriseISO: undefined, sunsetISO: undefined };
  }
}

async function fetchFromMetNo(lat: number, lon: number, units: string, mode: string): Promise<UnifiedWeather | null> {
  // Use MET Norway's recommended precision and cache results
  const { lat: metLat, lon: metLon } = roundForProvider(lat, lon, 'metno');
  const cacheKey = `metno:${getCacheKey(lat, lon, 'metno')}:${units}:${mode}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < WEATHER_TTL_MS) {
    return cached.data as UnifiedWeather;
  }

  const span = weatherMetrics.start('metno', 'locationforecast', `${units}|${mode}`);

  try {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${metLat}&lon=${metLon}`;
    const ua = process.env.METNO_USER_AGENT || 'Go Daisy/1.0 (hello@godaisy.io)';
    const response = await fetch(url, { headers: { 'User-Agent': ua, 'Accept': 'application/json' } });
    const statusCode = response.status;

    if (!response.ok) {
      span.failure(new Error(`HTTP ${statusCode}`), { status: statusCode });
      return null;
    }

    const metPayload = await response.json() as MetNoForecastResponse;
    const ts = metPayload.properties?.timeseries ?? [];
    if (!ts.length) {
      span.failure(new Error('Empty timeseries payload'), { status: statusCode });
      return null;
    }

    const HOURLY_LIMIT = Math.min(ts.length, 24 * 5); // up to ~5 days of hourly clarity
    const DAILY_LIMIT_HOURS = Math.min(ts.length, 24 * 7); // aim for a full week of day buckets

    const pickNumber = (...values: Array<number | null | undefined>): number | undefined => {
      for (const value of values) {
        if (value !== undefined && value !== null) {
          const num = Number(value);
          if (Number.isFinite(num)) return num;
        }
      }
      return undefined;
    };

    const pickString = (...values: Array<string | null | undefined>): string | undefined => {
      for (const value of values) {
        if (typeof value === 'string' && value.trim().length) return value.trim();
      }
      return undefined;
    };

    const deriveNextBlock = (entry: MetNoTimeseriesEntry) => {
      const next1 = entry.data?.next_1_hours;
      const next6 = entry.data?.next_6_hours;
      const next12 = entry.data?.next_12_hours;
      const probability = pickNumber(next1?.probability_of_precipitation, next6?.probability_of_precipitation, next12?.probability_of_precipitation);
      const precipAmount = pickNumber(next1?.details?.precipitation_amount, next6?.details?.precipitation_amount, next12?.details?.precipitation_amount);
      const symbol = pickString(next1?.summary?.symbol_code, next6?.summary?.symbol_code, next12?.summary?.symbol_code);
      return {
        pop: probability !== undefined ? probability / 100 : undefined,
        precipMM: precipAmount,
        symbol,
      } as const;
    };

    // Build hourly series with extended lookahead for aggregation while keeping payload reasonable
    const hourly: Hour[] = [];
    for (const p of ts.slice(0, HOURLY_LIMIT)) {
      const tISO = p.time;
      if (typeof tISO !== 'string') continue;
      const instDetails = p.data?.instant?.details;
      const { pop, precipMM, symbol } = deriveNextBlock(p);
      const tempC = typeof instDetails?.air_temperature === 'number' ? instDetails.air_temperature : undefined;
      const windMS = typeof instDetails?.wind_speed === 'number' ? instDetails.wind_speed : undefined;
      const windDeg = typeof instDetails?.wind_from_direction === 'number' ? instDetails.wind_from_direction : undefined;
      const pressureHpa = typeof instDetails?.air_pressure_at_sea_level === 'number' ? instDetails.air_pressure_at_sea_level : undefined;
      const mappedH = mapMetNoIcon(symbol);
      hourly.push({ timeISO: tISO, tempC, pop, windMS, windDeg, precipMM, icon: mappedH.icon, pressureHpa });
    }

    // Current from first entry
    const first = ts[0];
    const inst0 = first?.data?.instant?.details;
    const symNow = first?.data?.next_1_hours?.summary?.symbol_code
      || first?.data?.next_6_hours?.summary?.symbol_code
      || '';
    const mappedNow = mapMetNoIcon(symNow);
    const sun = computeSunTimes(new Date(), lat, lon);
    const current: UnifiedWeather = {
      name: 'MET Norway',
      lat, lon,
      isMarine: mode === 'marine',
      temperatureC: inst0?.air_temperature,
      feelsLikeC: undefined,
      dewPointC: inst0?.dew_point_temperature,
      humidityPct: inst0?.relative_humidity,
      humidity: inst0?.relative_humidity,
      pressureHpa: inst0?.air_pressure_at_sea_level,
      windSpeedMS: inst0?.wind_speed,
      windGustMS: undefined,
      windDeg: inst0?.wind_from_direction,
      visibilityKm: undefined,
      uvi: undefined,
      cloudsPct: inst0?.cloud_area_fraction,
      description: mappedNow.description,
      icon: mappedNow.icon,
      sunriseISO: sun.sunriseISO,
      sunsetISO: sun.sunsetISO,
      hourly,
    };

    // Daily aggregation (min/max temp, wind, precip, representative icon)
    const byDate: Record<string, {
      temps: number[];
      winds: number[];
      windDirs: number[];
      pops: number[];
      precip: number;
      icons: Record<string, number>;
      summary?: string;
    }> = {};

    for (const entry of ts.slice(0, DAILY_LIMIT_HOURS)) {
      const tISO = entry.time;
      if (typeof tISO !== 'string') continue;
      const key = tISO.slice(0, 10);
      const bucket = (byDate[key] ||= { temps: [], winds: [], windDirs: [], pops: [], precip: 0, icons: {} });

      const inst = entry.data?.instant?.details;
      const temp = typeof inst?.air_temperature === 'number' ? inst.air_temperature : undefined;
      const wind = typeof inst?.wind_speed === 'number' ? inst.wind_speed : undefined;
      const windDir = typeof inst?.wind_from_direction === 'number' ? inst.wind_from_direction : undefined;
      if (typeof temp === 'number') bucket.temps.push(temp);
      if (typeof wind === 'number') bucket.winds.push(wind);
      if (typeof windDir === 'number') bucket.windDirs.push(windDir);

      const { pop, precipMM, symbol } = deriveNextBlock(entry);
      if (typeof pop === 'number') bucket.pops.push(pop);
      if (typeof precipMM === 'number') bucket.precip += precipMM;
      if (symbol) {
        bucket.icons[symbol] = (bucket.icons[symbol] || 0) + 1;
        if (!bucket.summary) {
          const mapped = mapMetNoIcon(symbol);
          if (mapped.description) bucket.summary = mapped.description;
        }
      }
    }

    const daily: Day[] = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 7)
      .map(([dateISO, agg]) => {
        const rawIcon = Object.entries(agg.icons).sort((a, b) => b[1] - a[1])[0]?.[0];
        const mappedDay = rawIcon ? mapMetNoIcon(rawIcon) : { icon: undefined, description: undefined };
        const minTemp = agg.temps.length ? Math.min(...agg.temps) : undefined;
        const maxTemp = agg.temps.length ? Math.max(...agg.temps) : undefined;
        const windAvg = agg.winds.length ? agg.winds.reduce((a, b) => a + b, 0) / agg.winds.length : undefined;
        const windDirAvg = agg.windDirs.length ? agg.windDirs.reduce((a, b) => a + b, 0) / agg.windDirs.length : undefined;
        return {
          dateISO,
          minC: minTemp,
          maxC: maxTemp,
          pop: agg.pops.length ? Math.max(...agg.pops) : undefined,
          summary: agg.summary ?? mappedDay.description,
          icon: mappedDay.icon,
          windMS: windAvg,
          windDeg: windDirAvg,
          pressureHpa: undefined,
          uvi: undefined,
          precipMM: agg.precip || undefined,
          moonriseISO: undefined,
          moonsetISO: undefined,
          moonPhase: undefined,
        } as Day;
      });

    current.daily = daily;
    // Cache MET Norway unified result
    weatherCache.set(cacheKey, { ts: Date.now(), data: current });
    span.success({ status: statusCode });
    return current;
  } catch (e) {
    span.failure(e);
    console.warn('MET Norway fetch failed', e);
    return null;
  }
}

async function fetchFromNoaa(lat: number, lon: number, units: string, mode: string): Promise<UnifiedWeather | null> {
  // Use NOAA 3dp grid precision and cache both grid lookup and unified result
  const { lat: noaaLat, lon: noaaLon } = roundForProvider(lat, lon, 'noaa');
  const cacheKey = `noaa:${getCacheKey(lat, lon, 'noaa')}:${units}:${mode}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < WEATHER_TTL_MS) {
    return cached.data as UnifiedWeather;
  }

  const resultSpan = weatherMetrics.start('noaa', 'unified', `${units}|${mode}`);

  try {
    const ua = process.env.NWS_USER_AGENT || 'Go Daisy/1.0 (hello@godaisy.io)';
    // Step 1: resolve gridpoint
    const gridCacheKey = `grid:${getCacheKey(lat, lon, 'noaa')}`;
    const gridEntry = gridCache.get(gridCacheKey);
    let props: NwsPointProperties;
    if (gridEntry && Date.now() - gridEntry.ts < 7 * 24 * 60 * 60 * 1000) {
      props = gridEntry.data;
    } else {
      const spanPoints = weatherMetrics.start('noaa', 'points', `${units}|${mode}`);
      try {
        const response = await fetch(`https://api.weather.gov/points/${noaaLat},${noaaLon}`, {
          headers: { 'User-Agent': ua, 'Accept': 'application/geo+json' },
        });
        const statusCode = response.status;
        if (!response.ok) {
          const error = new Error(`HTTP ${statusCode}`);
          spanPoints.failure(error, { status: statusCode });
          resultSpan.failure(error, { status: statusCode });
          return null;
        }
        const pj = await response.json() as NwsPointsResponse;
        spanPoints.success({ status: statusCode });
        props = pj?.properties ?? {};
        gridCache.set(gridCacheKey, { ts: Date.now(), data: props });
      } catch (error) {
        spanPoints.failure(error);
        resultSpan.failure(error);
        return null;
      }
    }
    const hourlyUrl = props.forecastHourly;
    const gridUrl = props.forecast;
    if (!hourlyUrl && !gridUrl) {
      resultSpan.failure(new Error('Missing NOAA forecast URLs'));
      return null;
    }

    // Step 2: hourly periods
    let hResp: NwsForecastResponse | null = null;
    if (hourlyUrl) {
      const spanHourly = weatherMetrics.start('noaa', 'forecastHourly', `${units}|${mode}`);
      try {
        const hr = await fetch(hourlyUrl, { headers: { 'User-Agent': ua, 'Accept': 'application/geo+json' } });
        const statusCode = hr.status;
        if (!hr.ok) {
          spanHourly.failure(new Error(`HTTP ${statusCode}`), { status: statusCode });
        } else {
          hResp = await hr.json() as NwsForecastResponse;
          spanHourly.success({ status: statusCode });
        }
      } catch (error) {
        spanHourly.failure(error);
      }
    }

    // Step 3: daily periods (zone forecast)
    let dResp: NwsForecastResponse | null = null;
    if (gridUrl) {
      const spanDaily = weatherMetrics.start('noaa', 'forecast', `${units}|${mode}`);
      try {
        const dr = await fetch(gridUrl, { headers: { 'User-Agent': ua, 'Accept': 'application/geo+json' } });
        const statusCode = dr.status;
        if (!dr.ok) {
          spanDaily.failure(new Error(`HTTP ${statusCode}`), { status: statusCode });
        } else {
          dResp = await dr.json() as NwsForecastResponse;
          spanDaily.success({ status: statusCode });
        }
      } catch (error) {
        spanDaily.failure(error);
      }
    }

    const hPeriods: NwsForecastPeriod[] = hResp?.properties?.periods ?? [];
    const dPeriods: NwsForecastPeriod[] = dResp?.properties?.periods ?? [];
    if (!hPeriods.length && !dPeriods.length) {
      resultSpan.failure(new Error('Empty NOAA forecast data'));
      return null;
    }

    // helpers
    const mphToMs = (v?: number | string) => {
      if (typeof v === 'string') { const m = v.match(/([\d.]+)/); return m ? Number(m[1]) * 0.44704 : undefined; }
      if (typeof v === 'number') return v * 0.44704;
      return undefined;
    };
    const FtoC = (v?: number) => (typeof v === 'number' ? (v - 32) * (5/9) : undefined);

    // Build hourly (limit 48)
    const hourly: Hour[] = hPeriods.slice(0,48).map((p): Hour => ({
      timeISO: p.startTime ?? p.endTime ?? new Date().toISOString(),
      tempC: FtoC(p.temperature),
      pop: typeof p.probabilityOfPrecipitation?.value === 'number' ? p.probabilityOfPrecipitation.value / 100 : undefined,
      windMS: mphToMs(p.windSpeed),
      windDeg: undefined, // NWS supplies compass dir; mapping to degrees can be added later
      precipMM: undefined,
      icon: mapNwsIcon(p.icon).icon,
      pressureHpa: undefined,
      windGustMS: mphToMs(p.windGust),
    }));

    // Current from first hourly
  const first = hPeriods[0];
  const mappedNow = mapNwsIcon(first?.icon);
    const sunNws = computeSunTimes(new Date(), lat, lon);
    const current: UnifiedWeather = {
      name: 'NOAA NWS',
      lat, lon,
      isMarine: mode === 'marine',
      temperatureC: FtoC(first?.temperature),
      feelsLikeC: undefined,
      dewPointC: undefined,
      humidityPct: undefined,
      humidity: undefined,
      pressureHpa: undefined,
      windSpeedMS: mphToMs(first?.windSpeed),
      windGustMS: mphToMs(first?.windGust),
      windDeg: undefined,
      visibilityKm: undefined,
      uvi: undefined,
      cloudsPct: undefined,
      description: mappedNow.description || first?.shortForecast,
      icon: mappedNow.icon,
      sunriseISO: sunNws.sunriseISO,
      sunsetISO: sunNws.sunsetISO,
      hourly,
    };

    // Daily from zone forecast periods (NWS alternates day/night)
    const days: Record<string, Day> = {};
    for (const p of dPeriods.slice(0,12)) {
      const dateISO = String(p.startTime).slice(0,10);
      const entry = (days[dateISO] ||= { dateISO } as Day);
      const tC = FtoC(p.temperature);
      if (typeof tC === 'number') {
        if (p.isDaytime) entry.maxC = Math.max(entry.maxC ?? -Infinity, tC);
        else entry.minC = Math.min(entry.minC ?? Infinity, tC);
      }
      if (!entry.summary) entry.summary = p.shortForecast;
      const mappedDay = mapNwsIcon(p.icon);
      entry.icon = mappedDay.icon || entry.icon;
    }
    current.daily = Object.values(days).slice(0,5).map(d => {
      if (d.minC === Infinity) d.minC = undefined;
      if (d.maxC === -Infinity) d.maxC = undefined;
      return d;
    });

    // Cache NOAA unified result
    weatherCache.set(cacheKey, { ts: Date.now(), data: current });
    resultSpan.success({ status: 200 });
    return current;
  } catch (e) {
    resultSpan.failure(e);
    console.warn('NOAA NWS fetch failed:', e);
    return null;
  }
}
async function fetchFromEC(_lat: number, _lon: number, _units: string, _mode: string): Promise<UnifiedWeather | null> {
  // TODO: implement Environment Canada (MSC) mapping
  return null;
}

// --- Region routing helpers ---------------------------------------------------
function inBBox(lat: number, lon: number, bbox: [number, number, number, number]) {
  const [minLat, minLon, maxLat, maxLon] = bbox;
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}
// Very coarse bounding boxes; safe over‑inclusion is fine for fallback order.
const BBOX = {
  // Includes NO, SE, FI, DK, IS, FO, and Svalbard area generously
  NORDIC_ARCTIC: [54, -30, 84, 45] as [number, number, number, number],
  // Continental US incl. AK (partial) & HI (partial) — coarse
  USA: [18, -178, 72, -60] as [number, number, number, number],
  // Canada broad box
  CANADA: [41, -141, 84, -52] as [number, number, number, number],
  // Europe broad (Azores to Urals-ish, N Africa band included but later boxes win first)
  EUROPE: [34, -31, 72, 45] as [number, number, number, number],
};

type Region = 'nordic_arctic' | 'usa' | 'canada' | 'europe' | 'global';

function detectRegion(lat: number, lon: number): Region {
  if (inBBox(lat, lon, BBOX.NORDIC_ARCTIC)) return 'nordic_arctic';
  if (inBBox(lat, lon, BBOX.USA)) return 'usa';
  if (inBBox(lat, lon, BBOX.CANADA)) return 'canada';
  if (inBBox(lat, lon, BBOX.EUROPE)) return 'europe';
  return 'global';
}

function planForRegion(r: Region): FreeProviderName[] {
  switch (r) {
    case 'nordic_arctic':
      return ['metno']; // Always MET Norway (free), SG for marine downstream
    case 'usa':
      return ['noaa']; // NOAA primary
    case 'canada':
      return ['ec'];   // Environment Canada primary
    case 'europe':
      return ['metno']; // MET Norway primary across Europe
    default:
      return ['metno', 'noaa', 'ec']; // Global: try any free source that works
  }
}

async function tryFreeProvidersOrder(order: FreeProviderName[], lat: number, lon: number, units: string, mode: string): Promise<FreeProviderResult> {
  for (const p of order) {
    try {
      let unified: UnifiedWeather | null = null;
      if (p === 'metno') unified = await fetchFromMetNo(lat, lon, units, mode);
      else if (p === 'noaa') unified = await fetchFromNoaa(lat, lon, units, mode);
      else if (p === 'ec') unified = await fetchFromEC(lat, lon, units, mode);
      if (unified) return { provider: p, unified };
    } catch (e) {
      console.warn(`[free-provider:${p}] failed, continuing`, e);
    }
  }
  return null;
}
// -----------------------------------------------------------------------------

// Stormglass API types
interface StormglassTidePoint {
  time: string;
  height: number;
  type: 'high' | 'low';
}

interface StormglassTidesResponse {
  data: StormglassTidePoint[];
}

interface StormglassMarineHour {
  time: string;
  windSpeed?: { sg?: number };
  windDirection?: { sg?: number };
  gust?: { sg?: number };
  waveHeight?: { sg?: number };
  waveDirection?: { sg?: number };
  wavePeriod?: { sg?: number };
  swellHeight?: { sg?: number };
  swellDirection?: { sg?: number };
  swellPeriod?: { sg?: number };
  waterTemperature?: { sg?: number };
  currentSpeed?: { sg?: number };
  currentDirection?: { sg?: number };
}

interface StormglassMarineResponse {
  hours: StormglassMarineHour[];
}

// --- Stormglass Bio types ---
interface StormglassBioHour {
  time: string;
  chlorophyll?: { sg?: number } | number;
  turbidity?: { sg?: number } | number;
  dissolvedOxygen?: { sg?: number } | number;
  seaTemperature?: { sg?: number } | number;
  nitrate?: { sg?: number } | number;
  phosphate?: { sg?: number } | number;
}
interface StormglassBioResponse {
  hours: StormglassBioHour[];
}
type Hour = {
  timeISO: string
  tempC?: number
  pop?: number // 0..1
  windMS?: number
  windDeg?: number
  precipMM?: number
  icon?: string
  pressureHpa?: number
  waveHeightM?: number | null
  wavePeriodS?: number | null
  // NEW: include gust in unified hourly payload
  windGustMS?: number
  // Optional hourly UVI when available in payload
  uvi?: number
  // NEW: snow fields mapped from Open-Meteo
  snowDepthCm?: number
  snowfallRateMmH?: number
}

type Day = {
  dateISO: string
  minC?: number
  maxC?: number
  pop?: number
  summary?: string
  icon?: string
  windMS?: number
  windDeg?: number
  pressureHpa?: number
  uvi?: number
  // NEW: include aggregated precipitation amount for the day (mm)
  precipMM?: number
  moonriseISO?: string
  moonsetISO?: string
  moonPhase?: number // 0..1 (0=new, 0.5=full) from OpenWeather
  sunriseISO?: string
  sunsetISO?: string
  dayLengthMinutes?: number
  pollen?: { 
    grass?: number; 
    tree?: number; 
    weed?: number; 
    olive?: number;
    // Individual subcategories
    alder_pollen?: number;
    birch_pollen?: number;
    ragweed_pollen?: number;
    mugwort_pollen?: number;
  }
}

type Tides = {
  time: string
  type: 'high' | 'low'
  height: number | null
}[]

type Marine = {
  waveHeight?: number | null
  waveDirection?: number | null
  wavePeriod?: number | null
  swellHeight?: number | null
  swellDirection?: number | null
  swellPeriod?: number | null
}

type MetNoMarineSeriesHour = {
  timeISO: string;
  waveHeightM: number | null;
  waveDirectionDeg: number | null;
  seaTemperatureC: number | null;
  windSpeedMS: number | null;
  windSpeedKts: number | null;
  windDirectionDeg: number | null;
  currentSpeedMS: number | null;
  currentDirectionDeg: number | null;
};

type MetNoMarineSeriesResult = {
  hours: MetNoMarineSeriesHour[];
  firstHour: MetNoMarineSeriesHour;
};

type MoonSnapshot = {
  timezone?: string;
  sunriseISO?: string;
  sunsetISO?: string;
  dayLengthMinutes?: number;
  moonriseISO?: string;
  moonsetISO?: string;
  phaseName?: string;
  phaseFraction?: number;
  illuminationPct?: number;
  source?: string;
  cachedAt?: string;
  expiresAt?: string;
  latBucket?: number;
  lonBucket?: number;
  localDate?: string;
};

type UnifiedWeather = {
  // core current
  name?: string
  lat: number
  lon: number
  isMarine?: boolean
  temperatureC?: number
  feelsLikeC?: number
  dewPointC?: number
  humidityPct?: number
  humidity?: number  // for component compatibility
  pressureHpa?: number
  windSpeedMS?: number
  windGustMS?: number
  windDeg?: number
  visibilityKm?: number
  uvi?: number
  cloudsPct?: number
  description?: string
  icon?: string
  sunriseISO?: string
  sunsetISO?: string
  dayLengthMinutes?: number

  // series
  hourly?: Hour[]
  daily?: Day[]

  // marine
  marine?: Marine
  marineAnchor?: {
    rectangleCode?: string;
    lat: number;
    lon: number;
    source?: string;
  }
  tides?: Tides
  marineHourly?: Array<{
    timeISO: string;
    waveHeightM?: number | null;
    wavePeriodS?: number | null;
    waveDirectionDeg?: number | null;
    swellHeightM?: number | null;
    swellPeriodS?: number | null;
    swellDirectionDeg?: number | null;
    waterTempC?: number | null;
    windSpeedMS?: number | null;
    windDirectionDeg?: number | null;
    windGustMS?: number | null;
    currentSpeedMS?: number | null;
    currentDirectionDeg?: number | null;
  }>
  seaTemp?: number | null
  hasMarineData?: boolean // ← new flag

  // optional air quality summary (OpenWeather format)
  airQuality?: {
    aqi?: number | null
    // Individual pollutants as direct properties
    pm2_5?: number | null
    pm10?: number | null
    no2?: number | null
    o3?: number | null
    so2?: number | null
    co?: number | null
    components?: Record<string, number | null>
  }
  // optional pollen data (Open-Meteo format)
  pollen?: {
    grass?: number;
    tree?: number;
    weed?: number;
    olive?: number;
    // Individual subcategories
    alder_pollen?: number;
    birch_pollen?: number;
    ragweed_pollen?: number;
    mugwort_pollen?: number;
  }
  // optional soil snapshot (Open-Meteo hourly, latest)
  soil?: {
    temp0cm?: number;
    temp6cm?: number;
    temp18cm?: number;
    temp54cm?: number;
    moisture0to1?: number;
    moisture1to3?: number;
    moisture3to9?: number;
    moisture9to27?: number;
  }
  soilTimeISO?: string
  // optional: hourly pollen time series for per-hour UI use
  pollenHourly?: {
    time?: string[];
    grass_pollen?: number[];
    alder_pollen?: number[];
    birch_pollen?: number[];
    ragweed_pollen?: number[];
    mugwort_pollen?: number[];
    olive_pollen?: number[];
  }
  // optional: hourly AQI time series for per-hour UI use
  aqiHourly?: {
    time?: string[];
    us_aqi?: number[];
    european_aqi?: number[];
    pm2_5?: number[];
    pm10?: number[];
    nitrogen_dioxide?: number[];
    ozone?: number[];
    sulphur_dioxide?: number[];
    carbon_monoxide?: number[];
  }
  // optional: marine bio/water-quality snapshot
  bio?: {
    chlorophyll?: number | null;
    turbidity?: number | null;
    dissolvedOxygen?: number | null;
    seaTemperature?: number | null;
    nitrate?: number | null;
    phosphate?: number | null;
    updatedAt?: string;
    missing?: boolean;
  }
  moon?: MoonSnapshot;
}

// Define refined internal types to eliminate 'any'
interface OpenWeatherCurrent {
  temp?: number; feels_like?: number; dew_point?: number; humidity?: number; pressure?: number;
  wind_speed?: number; wind_gust?: number; wind_deg?: number; visibility?: number; uvi?: number;
  clouds?: number; weather?: Array<{ description?: string; icon?: string; id?: number }>; sunrise?: number; sunset?: number;
}
interface OpenWeatherHourly extends OpenWeatherCurrent { dt: number; rain?: { ['1h']?: number; ['3h']?: number }; snow?: { ['1h']?: number; ['3h']?: number }; pop?: number; pressure?: number; }
interface OpenWeatherDaily {
  dt: number; temp?: { min?: number; max?: number }; pop?: number; weather?: Array<{ description?: string; icon?: string }>; wind_speed?: number; wind_deg?: number; pressure?: number; uvi?: number; moonrise?: number; moonset?: number; moon_phase?: number;
  // Include daily precipitation totals when available (One Call 3.0)
  rain?: number; // mm over the day
  snow?: number; // mm over the day
}
interface OpenWeatherListItem { dt: number; main?: { temp?: number; feels_like?: number; pressure?: number; humidity?: number }; wind?: { speed?: number; deg?: number; gust?: number }; visibility?: number; clouds?: { all?: number }; weather?: Array<{ description?: string; icon?: string }>; pop?: number; rain?: { ['3h']?: number }; snow?: { ['3h']?: number } }
interface OpenWeatherForecast25 { source?: string; list: OpenWeatherListItem[]; city?: { sunrise?: number; sunset?: number; name?: string } }
interface OpenWeatherOneCall3 { current?: OpenWeatherCurrent; hourly?: OpenWeatherHourly[]; daily?: OpenWeatherDaily[]; city?: { sunrise?: number; sunset?: number; name?: string } }
// Weather service module typing (partial)
interface WeatherServiceModule {
  getFullWeather: (args: { lat: number; lon: number; apiKey: string; options?: { units?: string; exclude?: string } }) => Promise<OpenWeatherOneCall3 | OpenWeatherForecast25>;
  fetchStormglassTides: (lat: number, lon: number, key: string) => Promise<StormglassTidesResponse>;
  fetchStormglassMarine: (lat: number, lon: number, startISO: string, endISO: string, params: string | undefined, key: string) => Promise<StormglassMarineResponse>;
  fetchStormglassBio: (lat: number, lon: number, startISO: string, endISO: string, params: string | undefined, key: string) => Promise<StormglassBioResponse>;
  fetchMetNoMarineSeries: (lat: number, lon: number, startISO: string, endISO: string, options?: { maxHours?: number }) => Promise<MetNoMarineSeriesResult | null>;
  getAirPollution: (args: { lat: number; lon: number; apiKey: string }) => Promise<unknown>;
  fetchOpenMeteoAirPollen: (lat: number, lon: number, start: string, end: string) => Promise<unknown>;
  fetchOpenMeteoWeather: (lat: number, lon: number, start: string, end: string) => Promise<unknown>;
}
// Helper for Stormglass Bio TTL
function computeBioTTLMs(startISO: string, endISO: string): number {
  const now = Date.now();
  const end = Date.parse(endISO);
  if (!isNaN(end)) {
    const hours = (end - now) / 3_600_000;
    if (hours <= 48) return 3 * 60 * 60 * 1000;   // 3h near-term
    if (hours <= 168) return 6 * 60 * 60 * 1000;  // 6h up to 7d
  }
  return 12 * 60 * 60 * 1000; // 12h long-range/default
}

// Transform OpenWeather data to our normalized format
function transformWeatherData(rawData: OpenWeatherOneCall3 | OpenWeatherForecast25, lat: number, lon: number, mode: string): UnifiedWeather {
  const current = (rawData as OpenWeatherOneCall3).current || {} as OpenWeatherCurrent;
  const city = (rawData as OpenWeatherForecast25).city ?? {};
  const isForecast25 = (rawData as OpenWeatherForecast25).source === 'forecast2.5';
  let currentWeather: OpenWeatherCurrent = current;
  if (isForecast25 && (rawData as OpenWeatherForecast25).list?.length) {
    const firstItem = (rawData as OpenWeatherForecast25).list[0];
    currentWeather = {
      temp: firstItem.main?.temp,
      feels_like: firstItem.main?.feels_like,
      humidity: firstItem.main?.humidity,
      pressure: firstItem.main?.pressure,
      wind_speed: firstItem.wind?.speed,
      wind_gust: firstItem.wind?.gust,
      wind_deg: firstItem.wind?.deg,
      visibility: firstItem.visibility,
      clouds: firstItem.clouds?.all,
      weather: firstItem.weather,
      dew_point: undefined,
      uvi: undefined,
      sunrise: city.sunrise,
      sunset: city.sunset,
    };
  }
  
  // Current weather data
  const result: UnifiedWeather = {
    name: city.name || 'Location',
    lat,
    lon,
    isMarine: mode === 'marine',
    temperatureC: currentWeather.temp,
    feelsLikeC: currentWeather.feels_like,
    dewPointC: currentWeather.dew_point,
    humidityPct: currentWeather.humidity,
    humidity: currentWeather.humidity,  // compatibility mapping for components
    pressureHpa: currentWeather.pressure,
    windSpeedMS: currentWeather.wind_speed,
    windGustMS: currentWeather.wind_gust,
    windDeg: currentWeather.wind_deg,
    visibilityKm: currentWeather.visibility ? currentWeather.visibility / 1000 : undefined,
    uvi: currentWeather.uvi,
    cloudsPct: currentWeather.clouds,
    description: currentWeather.weather?.[0]?.description,
    icon: currentWeather.weather?.[0]?.icon,
    // Handle sunrise/sunset for both structures
    // sunriseISO: (currentWeather.sunrise || city.sunrise) ? new Date((currentWeather.sunrise || city.sunrise) * 1000).toISOString() : undefined,
    // sunsetISO: (currentWeather.sunset || city.sunset) ? new Date((currentWeather.sunset || city.sunset) * 1000).toISOString() : undefined,
    sunriseISO: (() => {
      const sunriseUnix = (typeof currentWeather.sunrise === 'number' ? currentWeather.sunrise : undefined) ?? (typeof city.sunrise === 'number' ? city.sunrise : undefined);
      return typeof sunriseUnix === 'number' ? new Date(sunriseUnix * 1000).toISOString() : undefined;
    })(),
    sunsetISO: (() => {
      const sunsetUnix = (typeof currentWeather.sunset === 'number' ? currentWeather.sunset : undefined) ?? (typeof city.sunset === 'number' ? city.sunset : undefined);
      return typeof sunsetUnix === 'number' ? new Date(sunsetUnix * 1000).toISOString() : undefined;
    })(),
    hasMarineData: false, // default
  };

  // Transform hourly data
  if ((rawData as OpenWeatherOneCall3).hourly && Array.isArray((rawData as OpenWeatherOneCall3).hourly)) {
    const src = (((rawData as OpenWeatherOneCall3).hourly ?? []).slice(0,48)) as OpenWeatherHourly[];
    result.hourly = src.map((hour): Hour => ({
      timeISO: new Date(hour.dt * 1000).toISOString(),
      tempC: hour.temp,
      pop: hour.pop,
      windMS: hour.wind_speed,
      windDeg: hour.wind_deg,
      precipMM: hour.rain?.['1h'] || hour.snow?.['1h'] || 0,
      icon: hour.weather?.[0]?.icon,
      pressureHpa: hour.pressure,
      waveHeightM: undefined,
      // NEW: propagate gust from OpenWeather hourly
      windGustMS: hour.wind_gust,
      // NEW: include hourly UVI when available
      // Note: OneCall 3.0 includes uvi on hourly entries in some tiers; fallback handled upstream
      uvi: hour.uvi,
    }));
  } else if (isForecast25 && (rawData as OpenWeatherForecast25).list) {
    const list = (rawData as OpenWeatherForecast25).list.slice(0,16);
    result.hourly = list.map((item): Hour => ({
      timeISO: new Date(item.dt * 1000).toISOString(),
      tempC: item.main?.temp,
      pop: item.pop || 0,
      windMS: item.wind?.speed,
      windDeg: item.wind?.deg,
      precipMM: item.rain?.['3h'] || item.snow?.['3h'] || 0,
      icon: item.weather?.[0]?.icon,
      pressureHpa: item.main?.pressure,
      waveHeightM: undefined,
      // Include gust if present in 2.5 payload
      windGustMS: item.wind?.gust,
      // No hourly UVI in forecast2.5
    }));
  }

  // Fallback: if hourly still missing/empty but 2.5 list exists, derive hourly from list
  if ((!result.hourly || result.hourly.length === 0) && (rawData as { list?: OpenWeatherListItem[] }).list) {
    const list = ((rawData as { list?: OpenWeatherListItem[] }).list || []).slice(0,16);
    result.hourly = list.map((item): Hour => ({
      timeISO: new Date(item.dt * 1000).toISOString(),
      tempC: item.main?.temp,
      pop: item.pop || 0,
      windMS: item.wind?.speed,
      windDeg: item.wind?.deg,
      precipMM: item.rain?.['3h'] || item.snow?.['3h'] || 0,
      icon: item.weather?.[0]?.icon,
      pressureHpa: item.main?.pressure,
      waveHeightM: undefined,
      windGustMS: item.wind?.gust,
    }));
  }

  // Transform daily data
  if ((rawData as OpenWeatherOneCall3).daily && Array.isArray((rawData as OpenWeatherOneCall3).daily)) {
    const dailySrc = ((rawData as OpenWeatherOneCall3).daily ?? []).slice(0,8);
    result.daily = dailySrc.map((day): Day => ({
      dateISO: new Date(day.dt * 1000).toISOString().split('T')[0],
      minC: day.temp?.min,
      maxC: day.temp?.max,
      pop: day.pop,
      summary: day.weather?.[0]?.description,
      icon: day.weather?.[0]?.icon,
      windMS: day.wind_speed,
      windDeg: day.wind_deg,
      pressureHpa: day.pressure,
      uvi: day.uvi,
      // Map daily precipitation totals when present
      precipMM: (() => {
        const r = typeof day.rain === 'number' ? day.rain : 0;
        const s = typeof day.snow === 'number' ? day.snow : 0;
        const total = r + s;
        return Number.isFinite(total) ? total : undefined;
      })(),
      moonriseISO: day.moonrise ? new Date(day.moonrise * 1000).toISOString() : undefined,
      moonsetISO: day.moonset ? new Date(day.moonset * 1000).toISOString() : undefined,
      moonPhase: typeof day.moon_phase === 'number' ? day.moon_phase : undefined,
    }));
  } else if (isForecast25 && (rawData as OpenWeatherForecast25).list) {
    const list = (rawData as OpenWeatherForecast25).list;
    const dailyGroups: Record<string, OpenWeatherListItem[]> = {};
    list.forEach(item => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      (dailyGroups[date] ||= []).push(item);
    });
    result.daily = Object.entries(dailyGroups).slice(0,5).map(([date, items]): Day => {
      const temps = items.map(i => i.main?.temp).filter((t): t is number => t !== undefined);
      const pops = items.map(i => i.pop || 0);
      const pressures = items.map(i => i.main?.pressure).filter((p): p is number => p !== undefined);
      const winds = items.map(i => i.wind?.speed).filter((w): w is number => w !== undefined);
      const windDirs = items.map(i => i.wind?.deg).filter((d): d is number => d !== undefined);
      // Aggregate 3h precipitation totals across the day
      const precipSum = items.reduce((sum, i) => sum + (i.rain?.['3h'] || 0) + (i.snow?.['3h'] || 0), 0);
      const weatherCounts: Record<string, number> = {};
      items.forEach(i => {
        const desc = i.weather?.[0]?.description;
        if (desc) weatherCounts[desc] = (weatherCounts[desc] || 0) + 1;
      });
      const mostCommon = Object.entries(weatherCounts).sort((a,b)=>b[1]-a[1])[0];
      const dayWeather = items.find(i => i.weather?.[0]?.description === mostCommon?.[0])?.weather?.[0];
      return {
        dateISO: date,
        minC: temps.length ? Math.min(...temps) : undefined,
        maxC: temps.length ? Math.max(...temps) : undefined,
        pop: pops.length ? Math.max(...pops) : undefined,
        summary: dayWeather?.description,
        icon: dayWeather?.icon,
        windMS: winds.length ? winds.reduce((a,b)=>a+b,0)/winds.length : undefined,
        windDeg: windDirs.length ? windDirs.reduce((a,b)=>a+b,0)/windDirs.length : undefined,
        pressureHpa: pressures.length ? pressures.reduce((a,b)=>a+b,0)/pressures.length : undefined,
        uvi: undefined,
        // Provide daily precip total for forecast2.5 derived days
        precipMM: precipSum > 0 ? precipSum : undefined,
        moonriseISO: undefined,
        moonsetISO: undefined,
        moonPhase: undefined,
      };
    });
  }

  // Note: Marine & tides are not part of OpenWeather raw data.
  // They are enriched later via Stormglass.

  return result;
}

// Utility to advance hours
function addHours(base: Date, h: number) { return new Date(base.getTime() + h * 3600_000); }
function iso(d: Date) { return d.toISOString(); }
function todayISO() { return new Date().toISOString().split('T')[0]; }

function buildMockUnifiedWeather(lat: number, lon: number, variant: 'inland' | 'marine'): UnifiedWeather {
  const now = new Date();
  const sunrise = addHours(now, -6);
  const sunset = addHours(now, 6);
  const hourly: Hour[] = Array.from({ length: 24 }).map((_, i) => ({
    timeISO: iso(addHours(now, i)),
    tempC: 18 + Math.sin((i / 24) * Math.PI) * 6,
    pop: i % 3 === 0 ? 0.2 : 0,
    windMS: 3 + (i % 5) * 0.2,
    windDeg: 90,
    precipMM: i % 6 === 0 ? 0.5 : 0,
    icon: '01d',
    pressureHpa: 1015,
    waveHeightM: variant === 'marine' ? 1 + Math.sin((i / 24) * Math.PI) * 0.5 : undefined,
  }));
  const daily: Day[] = [
    { dateISO: todayISO(), minC: 15, maxC: 25, pop: 0.2, summary: 'sunny', icon: '01d', windMS: 4, windDeg: 100, pressureHpa: 1015, uvi: 6, moonriseISO: iso(addHours(now, 10)), moonsetISO: iso(addHours(now, -10)), moonPhase: 0.25 },
    { dateISO: todayISO(), minC: 16, maxC: 24, pop: 0.1, summary: 'partly cloudy', icon: '02d', windMS: 4, windDeg: 120, pressureHpa: 1016, uvi: 5 },
  ];

  const base: UnifiedWeather = {
    name: variant === 'marine' ? 'Mock Coast' : 'Mock Inland',
    lat, lon,
    isMarine: variant === 'marine',
    temperatureC: 20, feelsLikeC: 19, dewPointC: 12, humidityPct: 55,
    pressureHpa: 1015, windSpeedMS: 3.0, windGustMS: 5.5, windDeg: 90,
    visibilityKm: 10, uvi: 5, cloudsPct: 25,
    description: 'clear sky', icon: '01d',
    sunriseISO: iso(sunrise), sunsetISO: iso(sunset),
    hourly, daily,
    airQuality: { aqi: 2, components: { pm2_5: 5, pm10: 10, no2: 8, o3: 12, so2: 3, co: 0.3 } },
    pollen: { grass: 0.5, tree: 0.4, weed: 0.3, olive: 0.2, alder_pollen: 0.1, birch_pollen: 0.1, ragweed_pollen: 0.1, mugwort_pollen: 0.1 },
    soil: { temp0cm: 18, temp6cm: 17, temp18cm: 16, temp54cm: 15, moisture0to1: 0.2, moisture1to3: 0.25, moisture3to9: 0.3, moisture9to27: 0.35 },
    hasMarineData: variant === 'marine',
  };

  if (variant === 'marine') {
    (base as UnifiedWeather).seaTemp = 18;
    (base as UnifiedWeather).tides = [
      { time: iso(addHours(now, 1)), type: 'high', height: 3.1 },
      { time: iso(addHours(now, 7)), type: 'low', height: 0.6 },
    ];
    (base as UnifiedWeather).marineHourly = Array.from({ length: 24 }).map((_, i) => ({
      timeISO: iso(addHours(now, i)),
      waveHeightM: 1 + Math.sin((i / 24) * Math.PI) * 0.5,
      wavePeriodS: 8 + (i % 5),
      waveDirectionDeg: 270,
      swellHeightM: 0.8,
      swellPeriodS: 10,
      swellDirectionDeg: 280,
      waterTempC: 18,
      windSpeedMS: 5 + (i % 4),
      windDirectionDeg: 300,
      windGustMS: 8 + (i % 3),
    }));
  }
  return base;
}

// Canonical unified weather endpoint.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Parse request query early so we can set headers even if imports fail
  const { lat, lon, mode, coastal } = req.query as { 
    lat?: string; 
    lon?: string; 
    mode?: string; 
    coastal?: string; 
  };
  const activityId = Array.isArray(req.query.activityId) ? req.query.activityId[0] : (req.query.activityId as string | undefined);
  const includeBioFlag = Array.isArray(req.query.includeBio) ? req.query.includeBio[0] : (req.query.includeBio as string | undefined);
  const wantsBio = includeBioFlag === '1' || includeBioFlag === 'true';
  const isSeaFishing = activityId === 'sea_fishing_shore' || activityId === 'sea_fishing_boat';
  const mockParam = Array.isArray(req.query.mock) ? req.query.mock[0] : req.query.mock;
  const mock = (mockParam === 'inland' || mockParam === 'marine') ? mockParam : undefined;

  // Determine mode & options
  const weatherMode = mode || (coastal === 'true' ? 'marine' : 'land');
  const units = (req.query.units as string) || 'metric';
  const exclude = (req.query.exclude as string) || '';


  const apiKey = process.env.OPENWEATHER_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

  // Precompute region and intended provider order (for debug headers)
  const preRegion = detectRegion(Number(lat || 0), Number(lon || 0));
  const preDefaultOrder = planForRegion(preRegion);
  const envOrderRaw = (process.env.FREE_PROVIDER_ORDER || '').trim().toLowerCase();
  const preOrder = envOrderRaw && envOrderRaw !== 'auto'
    ? (envOrderRaw.split(',').map(s => s.trim()).filter(Boolean) as FreeProviderName[])
    : preDefaultOrder;

  // Attach debug headers as early as possible so even early failures include them
  try {
    res.setHeader('X-Mode', weatherMode);
    res.setHeader('X-Has-OW-Key', apiKey ? '1' : '0');
    const sgKeyEarly = process.env.STORMGLASS_SECRET_KEY || process.env.STORMGLASS_API_KEY;
    res.setHeader('X-Has-SG-Key', sgKeyEarly ? '1' : '0');
    res.setHeader('X-Region', preRegion);
    res.setHeader('X-Provider-Plan', preOrder.join(','));
    // Provide safe defaults so grepping works even on failures
    res.setHeader('X-Weather-Source', 'none');
    if (lat != null && lon != null) {
      const latNumEarly = Number(lat);
      const lonNumEarly = Number(lon);
      if (Number.isFinite(latNumEarly) && Number.isFinite(lonNumEarly)) {
        const { precision: owPrecE } = roundForProvider(latNumEarly, lonNumEarly, 'openweather');
        res.setHeader('X-OW-Precision-DP', String(owPrecE));
        res.setHeader('X-OW-Precision', String(owPrecE));
        res.setHeader('X-OW-Coord-Key', getCacheKey(latNumEarly, lonNumEarly, 'openweather'));
      }
    }
  } catch {
    // ignore header errors
    void 0;
  }

  // Early validation for coordinates before importing services
  if (lat === undefined || lon === undefined) {
    try { res.setHeader('X-Error-Reason', 'missing-params'); } catch { void 0; }
    return res.status(400).json({
      error: 'Missing parameters',
      received: { lat, lon }
    });
  }
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    try { res.setHeader('X-Error-Reason', 'invalid-coordinates'); } catch { void 0; }
    return res.status(400).json({ 
      error: 'Invalid coordinates',
      received: { lat: latNum, lon: lonNum }
    });
  }

  // Defer import until after headers and validation so failures still include headers
  let getFullWeather: WeatherServiceModule['getFullWeather'];
  let fetchStormglassTides: WeatherServiceModule['fetchStormglassTides'];
  let fetchStormglassMarine: WeatherServiceModule['fetchStormglassMarine'];
  let fetchStormglassBio: WeatherServiceModule['fetchStormglassBio'];
  let fetchMetNoMarineSeries: WeatherServiceModule['fetchMetNoMarineSeries'];
  let getAirPollution: WeatherServiceModule['getAirPollution'];
  let fetchOpenMeteoAirPollen: WeatherServiceModule['fetchOpenMeteoAirPollen'];
  let fetchOpenMeteoWeather: WeatherServiceModule['fetchOpenMeteoWeather'];
  try {
    const mod = await import('../../lib/services/weatherService');
    const svcModule = (mod as unknown as WeatherServiceModule);
    getFullWeather = svcModule.getFullWeather;
    fetchStormglassTides = svcModule.fetchStormglassTides;
    fetchStormglassMarine = svcModule.fetchStormglassMarine;
    fetchStormglassBio = svcModule.fetchStormglassBio;
    fetchMetNoMarineSeries = svcModule.fetchMetNoMarineSeries;
    getAirPollution = svcModule.getAirPollution;
    fetchOpenMeteoAirPollen = svcModule.fetchOpenMeteoAirPollen;
    fetchOpenMeteoWeather = svcModule.fetchOpenMeteoWeather;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      res.setHeader('X-Error-Reason', 'service-import-failed');
      res.setHeader('X-Error-Detail', msg.slice(0, 200));
      // Ensure our debug headers remain visible on error
      if (!res.getHeader('X-Weather-Source')) res.setHeader('X-Weather-Source', 'none');
    } catch { void 0; }
    return res.status(500).json({ error: `Failed to load weather service module: ${msg}` });
  }

  // Early return mock payloads if requested
  if (mock === 'inland' || mock === 'marine') {
    const payload = buildMockUnifiedWeather(latNum, lonNum, mock);
    return res.status(200).json(payload);
  }

  try {
    const latlonKey = keyLL(latNum, lonNum); // 3‑dp key for SG & others

    // First, attempt free providers if enabled
    let normalizedData: UnifiedWeather | null = null;
    if (FREE_PROVIDERS_ENABLED) {
      const region = detectRegion(latNum, lonNum);
      const defaultOrder = planForRegion(region);
      const configuredOrder = CONFIGURED_FREE_PROVIDER_ORDER;
      const order = configuredOrder ?? defaultOrder;
      const free = await tryFreeProvidersOrder(order, latNum, lonNum, units, weatherMode);
      if (free && free.unified) {
        normalizedData = free.unified;
        try {
          res.setHeader('X-Weather-Source', `free:${free.provider}`);
        } catch { /* noop */ }
      }
    }

    // Base weather (OpenWeather One Call) with provider-specific precision (fallback)
    if (!normalizedData) {
      if (!apiKey) {
        try {
          res.setHeader('X-Weather-Source', 'none');
          res.setHeader('X-Error-Reason', 'no-free-provider-and-no-ow-key');
        } catch { /* noop */ }
        return res.status(502).json({
          error: 'No free provider returned data and no OpenWeather API key is configured',
        });
      }

      // Always use 2dp for OpenWeather (maximum caching for fallback)
      const { lat: owLat, lon: owLon, precision: owPrecision } = roundForProvider(latNum, lonNum, 'openweather');
      const owCacheKey = `ow:${getCacheKey(latNum, lonNum, 'openweather')}_${units}_${exclude}`;
      const weatherCached = owWeatherCache.get(owCacheKey);
      let weatherData: OpenWeatherOneCall3 | OpenWeatherForecast25;

      if (weatherCached && Date.now() - weatherCached.ts < WEATHER_TTL_MS) {
        weatherData = weatherCached.data as OpenWeatherOneCall3 | OpenWeatherForecast25;
        try {
          res.setHeader('X-Cache-Hit', 'true');
          res.setHeader('X-OW-Precision', String(owPrecision));
          res.setHeader('X-OW-Precision-DP', String(owPrecision));
        } catch { /* noop */ }
        try { CacheMetrics.recordHit('openweather'); } catch {}
      } else {
        weatherData = await getFullWeather({
          lat: owLat,
          lon: owLon,
          apiKey,
          options: { units, exclude }
        });
        if (weatherData) {
          owWeatherCache.set(owCacheKey, { ts: Date.now(), data: weatherData });
          try {
            res.setHeader('X-Cache-Hit', 'false');
            res.setHeader('X-OW-Precision', String(owPrecision));
            res.setHeader('X-OW-Precision-DP', String(owPrecision));
          } catch { /* noop */ }
          try { CacheMetrics.recordMiss('openweather'); } catch {}
        }
      }
      // Attach minimal debug headers (no secrets)
      try {
        let src = (weatherData as { source?: string })?.source;
        if (!src) {
          if ((weatherData as OpenWeatherOneCall3)?.hourly || (weatherData as OpenWeatherOneCall3)?.daily) {
            src = 'onecall3';
          } else if ((weatherData as OpenWeatherForecast25)?.list) {
            src = 'forecast2.5';
          } else {
            src = 'openweather';
          }
        }
        res.setHeader('X-Weather-Source', src);
        res.setHeader('X-OW-Coord-Key', getCacheKey(latNum, lonNum, 'openweather'));
        // also echo precision for consistency
        res.setHeader('X-OW-Precision', String(owPrecision));
        res.setHeader('X-OW-Precision-DP', String(owPrecision));
      } catch { /* noop */ }

      normalizedData = transformWeatherData(weatherData, latNum, lonNum, weatherMode);
    }

    // Enrich with moon & sun metadata (cached via Supabase)
    try {
      const moonData = await getMoonSunData({ lat: latNum, lon: lonNum });
      if (moonData) {
        (normalizedData as UnifiedWeather).moon = {
          timezone: moonData.timezone,
          sunriseISO: moonData.sunriseISO,
          sunsetISO: moonData.sunsetISO,
          dayLengthMinutes: moonData.dayLengthMinutes,
          moonriseISO: moonData.moonriseISO,
          moonsetISO: moonData.moonsetISO,
          phaseName: moonData.moonPhaseName,
          phaseFraction: moonData.moonPhaseFraction,
          illuminationPct: moonData.moonIlluminationPct,
          source: moonData.source,
          cachedAt: moonData.cachedAt,
          expiresAt: moonData.expiresAt,
          latBucket: moonData.latBucket,
          lonBucket: moonData.lonBucket,
          localDate: moonData.localDate,
        } satisfies MoonSnapshot;

        if (moonData.sunriseISO) {
          (normalizedData as UnifiedWeather).sunriseISO = moonData.sunriseISO;
        }
        if (moonData.sunsetISO) {
          (normalizedData as UnifiedWeather).sunsetISO = moonData.sunsetISO;
        }
        if (typeof moonData.dayLengthMinutes === 'number') {
          (normalizedData as UnifiedWeather).dayLengthMinutes = moonData.dayLengthMinutes;
        }

        if (Array.isArray(normalizedData.daily) && normalizedData.daily.length) {
          const matchDateISO = (() => {
            if (moonData.localDate) return moonData.localDate;
            const isoFrom = (value?: string) => (value ? new Date(value).toISOString().split('T')[0] : undefined);
            return isoFrom(moonData.sunriseISO) ?? isoFrom(moonData.moonriseISO);
          })();

          let targetDay = matchDateISO
            ? normalizedData.daily.find((day) => day.dateISO === matchDateISO)
            : undefined;
          if (!targetDay) {
            targetDay = normalizedData.daily[0];
          }
          if (targetDay) {
            if (moonData.moonriseISO) targetDay.moonriseISO = moonData.moonriseISO;
            if (moonData.moonsetISO) targetDay.moonsetISO = moonData.moonsetISO;
            if (typeof moonData.moonPhaseFraction === 'number') {
              targetDay.moonPhase = moonData.moonPhaseFraction;
            } else if (targetDay.moonPhase == null && typeof moonData.moonIlluminationPct === 'number') {
              targetDay.moonPhase = Number((moonData.moonIlluminationPct / 100).toFixed(4));
            }
            if (moonData.sunriseISO) targetDay.sunriseISO = moonData.sunriseISO;
            if (moonData.sunsetISO) targetDay.sunsetISO = moonData.sunsetISO;
            if (typeof moonData.dayLengthMinutes === 'number') {
              targetDay.dayLengthMinutes = moonData.dayLengthMinutes;
            }
          }
        }

        try {
          if (moonData.source) {
            res.setHeader('X-Moon-Source', moonData.source);
          }
          if (moonData.latBucket != null) {
            res.setHeader('X-Moon-Lat-Bucket', String(moonData.latBucket));
          }
          if (moonData.lonBucket != null) {
            res.setHeader('X-Moon-Lon-Bucket', String(moonData.lonBucket));
          }
          if (moonData.expiresAt) {
            res.setHeader('X-Moon-Expires', moonData.expiresAt);
          }
        } catch { /* noop */ }
      }
    } catch (moonErr) {
      console.warn('Moon data fetch failed:', moonErr);
    }

    // Optional: Tides and Marine (Stormglass), if key available
    const sgKey = process.env.STORMGLASS_SECRET_KEY || process.env.STORMGLASS_API_KEY;
    // Only fetch Stormglass for explicit marine contexts (mode=marine or coastal=true)
    const shouldFetchMarine = (weatherMode === 'marine' || coastal === 'true');
    if (sgKey && shouldFetchMarine) {
      try {
        const rectangleResult = await getRectangleAnchorForLocation(latNum, lonNum, {
          includeNonCoastal: true,
        });
        const rectangleAnchor = rectangleResult?.anchor;
        const sgAnchorLat = rectangleAnchor?.anchorLat ?? latNum;
        const sgAnchorLon = rectangleAnchor?.anchorLon ?? lonNum;
        const rectangleCode = rectangleAnchor?.rectangleCode;
        const sgDayKey = getRectangleDayKey();

        if (rectangleCode) {
          try {
            res.setHeader('X-Rectangle-Code', rectangleCode);
            res.setHeader('X-Rectangle-Source', rectangleAnchor?.source ?? 'unknown');
          } catch { /* noop */ }
        }

        const { lat: sgLat, lon: sgLon } = roundForProvider(sgAnchorLat, sgAnchorLon, 'stormglass');
        if (rectangleAnchor) {
          (normalizedData as UnifiedWeather).marineAnchor = {
            rectangleCode,
            lat: sgLat,
            lon: sgLon,
            source: rectangleAnchor.source,
          };
        }
        const tideCacheKey = rectangleCode
          ? buildRectangleCacheKey(rectangleCode, 'tides', sgDayKey)
          : getCacheKey(latNum, lonNum, 'stormglass', 'tides');
        const marineCacheKey = rectangleCode
          ? buildRectangleCacheKey(rectangleCode, 'marine', sgDayKey)
          : getCacheKey(latNum, lonNum, 'stormglass', 'marine');
        // Tides with cache
        const tideCached = sgTideCache.get(tideCacheKey);
        let tidesRaw: StormglassTidesResponse | null = null;
        const tideTtl = rectangleCode ? RECT_TTL_MS : TIDE_TTL_MS;
        if (tideCached && Date.now() - tideCached.ts < tideTtl) {
          tidesRaw = tideCached.data as StormglassTidesResponse;
        } else {
          tidesRaw = await fetchStormglassTides(sgLat, sgLon, sgKey);
          if (tidesRaw) sgTideCache.set(tideCacheKey, { ts: Date.now(), data: tidesRaw });
        }
        if (tidesRaw && Array.isArray(tidesRaw.data)) {
          const tides = tidesRaw.data.map((t): { time: string; type: 'high' | 'low'; height: number | null } => ({
            time: new Date(t.time).toISOString(),
            type: String(t.type).toLowerCase().includes('high') ? 'high' : 'low',
            height: typeof t.height === 'number' ? t.height : (t.height != null ? Number(t.height) : null)
          }));
          normalizedData.tides = tides;
        }

  // Marine (multi-day) with MET Norway primary and Stormglass fallback
  const nowD = new Date();
  const MARINE_LOOKAHEAD_HOURS = 5 * 24;
  const end = new Date(nowD.getTime() + MARINE_LOOKAHEAD_HOURS * 60 * 60 * 1000);

        let marinePopulatedFromMet = false;
        try {
          const metMarine = await fetchMetNoMarineSeries(
            sgLat,
            sgLon,
            nowD.toISOString(),
            end.toISOString(),
            { maxHours: MARINE_LOOKAHEAD_HOURS }
          );
          if (metMarine && Array.isArray(metMarine.hours) && metMarine.hours.length) {
            const metMarineHourly = metMarine.hours.map(h => ({
              timeISO: h.timeISO,
              waveHeightM: h.waveHeightM ?? undefined,
              wavePeriodS: undefined,
              waveDirectionDeg: h.waveDirectionDeg ?? undefined,
              swellHeightM: undefined,
              swellPeriodS: undefined,
              swellDirectionDeg: undefined,
              waterTempC: h.seaTemperatureC ?? undefined,
              windSpeedMS: h.windSpeedMS ?? undefined,
              windDirectionDeg: h.windDirectionDeg ?? undefined,
              windGustMS: undefined,
              currentSpeedMS: h.currentSpeedMS ?? undefined,
              currentDirectionDeg: h.currentDirectionDeg ?? undefined,
            }));
            (normalizedData as UnifiedWeather).marineHourly = metMarineHourly;
            (normalizedData as UnifiedWeather).hasMarineData = metMarineHourly.some(m =>
              typeof m.waveHeightM === 'number' ||
              typeof m.waterTempC === 'number' ||
              typeof m.currentSpeedMS === 'number'
            );

            const first = metMarine.firstHour;
            if (first) {
              if (typeof first.seaTemperatureC === 'number') {
                (normalizedData as UnifiedWeather).seaTemp = first.seaTemperatureC;
              }
              if (!(normalizedData as UnifiedWeather).marine) {
                (normalizedData as UnifiedWeather).marine = {
                  waveHeight: first.waveHeightM,
                  waveDirection: first.waveDirectionDeg,
                  wavePeriod: null,
                  swellHeight: null,
                  swellDirection: null,
                  swellPeriod: null,
                };
              }
            }

            // Attach marine metrics to existing hourly by nearest-time match (<= 90 min)
            if (Array.isArray(normalizedData.hourly)) {
              const ms90 = 90 * 60 * 1000;
              for (const h of normalizedData.hourly) {
                const ht = new Date(h.timeISO).getTime();
                let best: MetNoMarineSeriesHour | null = null;
                let bestDiff = Infinity;
                for (const metHour of metMarine.hours) {
                  const diff = Math.abs(new Date(metHour.timeISO).getTime() - ht);
                  if (diff < bestDiff) { bestDiff = diff; best = metHour; }
                }
                if (best && bestDiff <= ms90) {
                  if (typeof best.waveHeightM === 'number') h.waveHeightM = best.waveHeightM;
                  if (typeof best.seaTemperatureC === 'number' && (normalizedData.seaTemp == null)) {
                    (normalizedData as UnifiedWeather).seaTemp = best.seaTemperatureC;
                  }
                }
              }
            }

            marinePopulatedFromMet = true;
          }
        } catch (metErr) {
          console.warn('MET Norway marine enrich failed:', metErr);
        }

        let marineRaw: StormglassMarineResponse | null = null;
        if (!marinePopulatedFromMet) {
          const marineCached = sgMarineCache.get(marineCacheKey);
          const marineTtl = rectangleCode ? RECT_TTL_MS : MARINE_TTL_MS;
          if (marineCached && Date.now() - marineCached.ts < marineTtl) {
            marineRaw = marineCached.data as StormglassMarineResponse;
          } else {
            marineRaw = await fetchStormglassMarine(
              sgLat,
              sgLon,
              nowD.toISOString(),
              end.toISOString(),
              undefined,
              sgKey
            );
            if (marineRaw) sgMarineCache.set(marineCacheKey, { ts: Date.now(), data: marineRaw });
          }

          const firstHour = marineRaw?.hours?.[0];
          if (firstHour) {
            const hours = marineRaw?.hours as StormglassMarineHour[];
            const sgVal = (obj: StormglassMarineHour, key: keyof StormglassMarineHour): number | null => {
              const raw = obj[key] as unknown;
              if (typeof raw === 'number') return raw as number;
              if (raw && typeof (raw as { sg?: unknown }).sg === 'number') return (raw as { sg?: number }).sg!;
              return null;
            };
            const marineSeries = hours.map(h => ({
              timeISO: new Date(h.time).toISOString(),
              waveHeightM: sgVal(h, 'waveHeight'),
              wavePeriodS: sgVal(h, 'wavePeriod'),
              waveDirectionDeg: sgVal(h, 'waveDirection'),
              swellHeightM: sgVal(h, 'swellHeight'),
              swellPeriodS: sgVal(h, 'swellPeriod'),
              swellDirectionDeg: sgVal(h, 'swellDirection'),
              waterTempC: sgVal(h, 'waterTemperature'),
              windSpeedMS: sgVal(h, 'windSpeed'),
              windDirectionDeg: sgVal(h, 'windDirection'),
              windGustMS: sgVal(h, 'gust'),
              currentSpeedMS: sgVal(h, 'currentSpeed'),
              currentDirectionDeg: sgVal(h, 'currentDirection'),
            }));
            if (marineSeries.length) {
              (normalizedData as UnifiedWeather).marineHourly = marineSeries;
              const firstTemp = marineSeries.find(m => typeof m.waterTempC === 'number')?.waterTempC ?? null;
              if (firstTemp != null) (normalizedData as UnifiedWeather).seaTemp = firstTemp;
              (normalizedData as UnifiedWeather).hasMarineData = marineSeries.some(m => typeof m.waveHeightM === 'number' || typeof m.swellHeightM === 'number' || typeof m.waterTempC === 'number');
            } else {
              (normalizedData as UnifiedWeather).hasMarineData = false;
            }

            const sgNumber = (k: keyof StormglassMarineHour) => sgVal(firstHour, k);
            if (!(normalizedData as UnifiedWeather).marine) {
              normalizedData.marine = {
                waveHeight: sgNumber('waveHeight'),
                waveDirection: sgNumber('waveDirection'),
                wavePeriod: sgNumber('wavePeriod'),
                swellHeight: sgNumber('swellHeight'),
                swellDirection: sgNumber('swellDirection'),
                swellPeriod: sgNumber('swellPeriod'),
              };
            }

            if (Array.isArray(normalizedData.hourly) && Array.isArray(hours)) {
              for (const h of normalizedData.hourly) {
                const ht = new Date(h.timeISO).getTime();
                let best: StormglassMarineHour | null = null;
                let bestDiff = Infinity;
                for (const sgHour of hours) {
                  const diff = Math.abs(new Date(sgHour.time).getTime() - ht);
                  if (diff < bestDiff) { bestDiff = diff; best = sgHour; }
                }
                if (best && bestDiff <= 90 * 60 * 1000) {
                  const waveH = sgVal(best, 'waveHeight'); if (waveH != null) h.waveHeightM = waveH;
                  const waveP = sgVal(best, 'wavePeriod'); if (waveP != null) h.wavePeriodS = waveP;
                  const waterT = sgVal(best, 'waterTemperature');
                  if (waterT != null && (normalizedData.seaTemp == null)) normalizedData.seaTemp = waterT;
                  const wavePer = sgVal(best, 'wavePeriod'); if (wavePer != null && (h.wavePeriodS == null)) h.wavePeriodS = wavePer;
                }
              }
            }
          }
        }

        const marineHourlySeries = (normalizedData as UnifiedWeather).marineHourly;
        if (!Array.isArray(marineHourlySeries) || marineHourlySeries.length === 0) {
          (normalizedData as UnifiedWeather).hasMarineData = false;
        }

        // --- Conditional Stormglass Bio (only for sea fishing or explicit flag) ---
        try {
          const shouldFetchBio = (weatherMode === 'marine' || coastal === 'true') && (isSeaFishing || wantsBio);
          if (shouldFetchBio) {
            const startISO = nowD.toISOString();
            const endISO = end.toISOString();
            const bioParams = 'chlorophyll,turbidity,dissolvedOxygen,seaTemperature';
            const bioKeyBase = rectangleCode
              ? buildRectangleCacheKey(rectangleCode, 'bio', sgDayKey)
              : getCacheKey(latNum, lonNum, 'stormglass', 'marine');
            const bioKey = `${bioKeyBase}|bio|${bioParams}|${startISO}|${endISO}`;
            const bioTtlBase = computeBioTTLMs(startISO, endISO);
            const bioTtl = rectangleCode ? Math.max(bioTtlBase, RECT_TTL_MS) : bioTtlBase;

            let bioRaw: StormglassBioResponse | null = null;
            const cachedBio = sgBioCache.get(bioKey);
            if (cachedBio && Date.now() - cachedBio.ts < bioTtl) {
              bioRaw = cachedBio.data;
            } else {
              bioRaw = await fetchStormglassBio(
                sgLat,
                sgLon,
                startISO,
                endISO,
                bioParams,
                sgKey as string
              );
              if (bioRaw) sgBioCache.set(bioKey, { ts: Date.now(), data: bioRaw });
            }

            const pick = (v: unknown): number | null => {
              if (typeof v === 'number') return v;
              if (v && typeof (v as { sg?: unknown }).sg === 'number') return (v as { sg?: number }).sg!;
              return null;
            };

            const latest = Array.isArray(bioRaw?.hours) && bioRaw!.hours.length ? bioRaw!.hours[bioRaw!.hours.length - 1] : undefined;
            (normalizedData as UnifiedWeather).bio = {
              chlorophyll: latest ? pick(latest.chlorophyll) : null,
              turbidity: latest ? pick(latest.turbidity) : null,
              dissolvedOxygen: latest ? pick(latest.dissolvedOxygen) : null,
              seaTemperature: latest ? pick(latest.seaTemperature) : null,
              nitrate: latest ? pick(latest.nitrate) : null,
              phosphate: latest ? pick(latest.phosphate) : null,
              updatedAt: latest?.time ? new Date(latest.time).toISOString() : undefined,
              missing: !latest,
            };
          }
        } catch (bioErr) {
          console.warn('Stormglass Bio enrich skipped/failed:', bioErr);
        }
      } catch (e) {
        // Swallow marine/tide errors gracefully
        console.warn('Stormglass enrich failed:', e);
      }
    }
    else {
      // Not a marine context: ensure marine fields are absent/false
      (normalizedData as UnifiedWeather).hasMarineData = false;
      delete (normalizedData as UnifiedWeather).tides;
      delete (normalizedData as UnifiedWeather).marineHourly;
      delete (normalizedData as UnifiedWeather).seaTemp;
      delete (normalizedData as UnifiedWeather).marine;
    }

    // Optional: Air Quality (OpenWeather) with cache
    try {
      const aqCacheKey = getCacheKey(latNum, lonNum, 'openweather', 'air');
      let aq: OpenWeatherAirQuality | null = null;
      const aqCached = owAirQualityCache.get(aqCacheKey);
      
      if (aqCached && Date.now() - aqCached.ts < AIR_QUALITY_TTL_MS) {
        aq = aqCached.data as OpenWeatherAirQuality;
      } else if (apiKey) {
        const { lat: aqLat, lon: aqLon } = roundForProvider(latNum, lonNum, 'openweather');
        const safeApiKey = apiKey;
        const raw = await getAirPollution({ lat: aqLat, lon: aqLon, apiKey: safeApiKey });
        aq = (raw || {}) as OpenWeatherAirQuality;
        if (aq) owAirQualityCache.set(aqCacheKey, { ts: Date.now(), data: aq });
      } else {
        console.warn('Skipping air quality fetch: missing OpenWeather API key');
      }
      
      const list = aq?.list;
      if (Array.isArray(list) && list.length) {
        const first = list[0];
        normalizedData.airQuality = {
          aqi: first?.main?.aqi ?? null,
          components: first?.components ?? undefined,
        };
      }
    } catch (e) {
      // Optional, ignore errors
      console.warn('Air quality fetch failed:', e);
    }

    // Optional: Pollen (Open-Meteo) aggregated to daily maxima
    try {
      // Determine date window from available daily entries, else next 7 days
      const dates = Array.isArray(normalizedData.daily) && normalizedData.daily.length
        ? normalizedData.daily.map(d => d.dateISO)
        : (() => {
            const arr: string[] = [];
            const start = new Date();
            for (let i = 0; i < 7; i++) {
              const dt = new Date(start.getTime());
              dt.setDate(start.getDate() + i);
              arr.push(dt.toISOString().split('T')[0]);
            }
            return arr;
          })();

      const startDate = dates[0];
      let endDate = dates[dates.length - 1];
      
      // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
      // CRITICAL: Open-Meteo API has a strict 5-day limit for forecasts
      // NEVER change this to request more than 5 days or the API will return errors
      // This has been fixed multiple times - DO NOT REVERT to 7 days
      // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▼
      if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        // Calculate maximum end date (start date + 4 days = 5 days total)
        const maxEnd = new Date(s.getTime() + 4 * 24 * 60 * 60 * 1000); 
        if (e.getTime() > maxEnd.getTime()) {
          endDate = maxEnd.toISOString().split('T')[0];
          console.log(`Limiting Open-Meteo forecast window to 5 days: ${startDate} to ${endDate}`);
        }
      }
      if (startDate && endDate) {
        const { lat: pollenLat, lon: pollenLon } = roundForProvider(latNum, lonNum, 'openweather'); // environmental precision (2dp)
        const pollenCacheKey = `${getCacheKey(latNum, lonNum, 'openmeteo', 'pollen')}_${startDate}_${endDate}`;
        const pollenCached = omPollenCache.get(pollenCacheKey);
        let polRaw: OpenMeteoPollenHourly;
        
        if (pollenCached && Date.now() - pollenCached.ts < POLLEN_TTL_MS) {
          polRaw = pollenCached.data as OpenMeteoPollenHourly;
        } else {
          const raw = await fetchOpenMeteoAirPollen(pollenLat, pollenLon, startDate, endDate);
          polRaw = (raw || {}) as OpenMeteoPollenHourly;
          if (polRaw) omPollenCache.set(pollenCacheKey, { ts: Date.now(), data: polRaw });
        }
        
        const times: string[] = polRaw?.hourly?.time || [];
        const grassArr: number[] = polRaw?.hourly?.grass_pollen || [];
        const alderArr: number[] = polRaw?.hourly?.alder_pollen || [];
        const birchArr: number[] = polRaw?.hourly?.birch_pollen || [];
        const ragweedArr: number[] = polRaw?.hourly?.ragweed_pollen || [];
        const mugwortArr: number[] = polRaw?.hourly?.mugwort_pollen || [];
        const oliveArr: number[] = polRaw?.hourly?.olive_pollen || [];

        // Expose raw hourly pollen arrays for per-hour icon rendering in UI
        (normalizedData as UnifiedWeather).pollenHourly = {
          time: times,
          grass_pollen: grassArr,
          alder_pollen: alderArr,
          birch_pollen: birchArr,
          ragweed_pollen: ragweedArr,
          mugwort_pollen: mugwortArr,
          olive_pollen: oliveArr,
        };

        // Also expose hourly AQI arrays if present in Open-Meteo payload
        const usAQI: number[] = polRaw?.hourly?.us_aqi || [];
        const euAQI: number[] = polRaw?.hourly?.european_aqi || [];
        const pm25: number[] = polRaw?.hourly?.pm2_5 || [];
        const pm10: number[] = polRaw?.hourly?.pm10 || [];
        const no2: number[] = polRaw?.hourly?.nitrogen_dioxide || [];
        const o3: number[] = polRaw?.hourly?.ozone || [];
        const so2: number[] = polRaw?.hourly?.sulphur_dioxide || [];
        const co: number[] = polRaw?.hourly?.carbon_monoxide || [];
        if (times.length && (usAQI.length || euAQI.length || pm25.length || pm10.length || no2.length || o3.length || so2.length || co.length)) {
          (normalizedData as UnifiedWeather).aqiHourly = {
            time: times,
            us_aqi: usAQI.length ? usAQI : undefined,
            european_aqi: euAQI.length ? euAQI : undefined,
            pm2_5: pm25.length ? pm25 : undefined,
            pm10: pm10.length ? pm10 : undefined,
            nitrogen_dioxide: no2.length ? no2 : undefined,
            ozone: o3.length ? o3 : undefined,
            sulphur_dioxide: so2.length ? so2 : undefined,
            carbon_monoxide: co.length ? co : undefined,
          };
        }

        const byDate: Record<string, { 
          grass?: number; 
          tree?: number; 
          weed?: number; 
          olive?: number;
          // Individual subcategories
          alder_pollen?: number;
          birch_pollen?: number;
          ragweed_pollen?: number;
          mugwort_pollen?: number;
        }> = {};
        for (let i = 0; i < times.length; i++) {
          const dateKey = String(times[i]).slice(0, 10);
          const bucket = (byDate[dateKey] ||= {});
          const g = Number(grassArr[i]);
          const a = Number(alderArr[i]);
          const b = Number(birchArr[i]);
          const r = Number(ragweedArr[i]);
          const m = Number(mugwortArr[i]);
          const o = Number(oliveArr[i]);
          if (Number.isFinite(g)) bucket.grass = Math.max(bucket.grass ?? -Infinity, g);
          const treeNow = Math.max(Number.isFinite(a) ? a : -Infinity, Number.isFinite(b) ? b : -Infinity);
          if (Number.isFinite(treeNow)) bucket.tree = Math.max(bucket.tree ?? -Infinity, treeNow);
          const weedNow = Math.max(Number.isFinite(r) ? r : -Infinity, Number.isFinite(m) ? m : -Infinity);
          if (Number.isFinite(weedNow)) bucket.weed = Math.max(bucket.weed ?? -Infinity, weedNow);
          if (Number.isFinite(o)) bucket.olive = Math.max(bucket.olive ?? -Infinity, o);
          
          // Store individual subcategories
          if (Number.isFinite(a)) bucket.alder_pollen = Math.max(bucket.alder_pollen ?? -Infinity, a);
          if (Number.isFinite(b)) bucket.birch_pollen = Math.max(bucket.birch_pollen ?? -Infinity, b);
          if (Number.isFinite(r)) bucket.ragweed_pollen = Math.max(bucket.ragweed_pollen ?? -Infinity, r);
          if (Number.isFinite(m)) bucket.mugwort_pollen = Math.max(bucket.mugwort_pollen ?? -Infinity, m);
        }

        if (Array.isArray(normalizedData.daily)) {
          for (const d of normalizedData.daily) {
            const pol = byDate[d.dateISO];
            if (pol) {
              d.pollen = {
                grass: pol.grass === -Infinity ? undefined : pol.grass,
                tree: pol.tree === -Infinity ? undefined : pol.tree,
                weed: pol.weed === -Infinity ? undefined : pol.weed,
                olive: pol.olive === -Infinity ? undefined : pol.olive,
                // Individual subcategories
                alder_pollen: pol.alder_pollen === -Infinity ? undefined : pol.alder_pollen,
                birch_pollen: pol.birch_pollen === -Infinity ? undefined : pol.birch_pollen,
                ragweed_pollen: pol.ragweed_pollen === -Infinity ? undefined : pol.ragweed_pollen,
                mugwort_pollen: pol.mugwort_pollen === -Infinity ? undefined : pol.mugwort_pollen,
              };
            }
          }
        }

        // Add current day's pollen data to main response for frontend access
        const todayISO = new Date().toISOString().split('T')[0];
        const todayPollen = byDate[todayISO];
        if (todayPollen) {
          normalizedData.pollen = {
            grass: todayPollen.grass === -Infinity ? undefined : todayPollen.grass,
            tree: todayPollen.tree === -Infinity ? undefined : todayPollen.tree,
            weed: todayPollen.weed === -Infinity ? undefined : todayPollen.weed,
            olive: todayPollen.olive === -Infinity ? undefined : todayPollen.olive,
            // Individual subcategories for detailed display
            alder_pollen: todayPollen.alder_pollen === -Infinity ? undefined : todayPollen.alder_pollen,
            birch_pollen: todayPollen.birch_pollen === -Infinity ? undefined : todayPollen.birch_pollen,
            ragweed_pollen: todayPollen.ragweed_pollen === -Infinity ? undefined : todayPollen.ragweed_pollen,
            mugwort_pollen: todayPollen.mugwort_pollen === -Infinity ? undefined : todayPollen.mugwort_pollen,
          };
        }
      }
    } catch (err) {
      console.warn('Pollen fetch failed:', err);
    }

    // Optional: Hourly pressure supplement (Open-Meteo pressure_msl)
    try {
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];
      const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = next.toISOString().split('T')[0];

      const omKey = `${latlonKey}_${startDate}_${endDate}_weather`;
      const cached = omWeatherCache.get(omKey);
      let omRaw: OpenMeteoGeneralHourly;
      if (cached && Date.now() - cached.ts < SOIL_TTL_MS) {
        omRaw = cached.data as OpenMeteoGeneralHourly;
      } else {
        const raw = await fetchOpenMeteoWeather(latNum, lonNum, startDate, endDate);
        omRaw = (raw || {}) as OpenMeteoGeneralHourly;
        if (omRaw) omWeatherCache.set(omKey, { ts: Date.now(), data: omRaw });
      }

      const offset = typeof omRaw?.utc_offset_seconds === 'number' ? omRaw.utc_offset_seconds : 0;
      const H = omRaw?.hourly || {} as NonNullable<OpenMeteoGeneralHourly['hourly']>;
      const t: string[] = H.time || [];
      const p: number[] = H.pressure_msl || [];
      const tc: number[] = H.temperature_2m || [];
      // NEW: snow arrays (Open-Meteo units: snowfall is cm over last hour; snow_depth is cm)
      const snowDepth: number[] = H.snow_depth || [];
      const snowfallCm: number[] = H.snowfall || [];

      // Build UTC ms for OM times by subtracting offset from the naive-UTC parse
      const omSamples: Array<{ ms: number; pressure?: number; temp?: number; snowDepthCm?: number; snowfallRateMmH?: number }> = [];
      for (let i = 0; i < t.length; i++) {
        const parsed = Date.parse(String(t[i]) + 'Z'); // interpret string as UTC first
        const utcMs = Number.isFinite(parsed) ? (parsed - offset * 1000) : NaN;
        const pr = typeof p[i] === 'number' ? Number(p[i]) : undefined;
        const tm = typeof tc[i] === 'number' ? Number(tc[i]) : undefined;
        const sd = typeof snowDepth[i] === 'number' ? Number(snowDepth[i]) : undefined;
        const sfCm = typeof snowfallCm[i] === 'number' ? Number(snowfallCm[i]) : undefined;
        // Convert snowfall cm to mm/h for unified naming consistency
        const sfMmH = typeof sfCm === 'number' && Number.isFinite(sfCm) ? sfCm * 10 : undefined;
        if (Number.isFinite(utcMs)) omSamples.push({ ms: utcMs, pressure: pr, temp: tm, snowDepthCm: sd, snowfallRateMmH: sfMmH });
      }

      if (omSamples.length) {
        // Helper to find nearest OM sample to a given ms
        const nearestOM = (ms: number) => {
          let bestIdx = -1; let best = Infinity;
          for (let i = 0; i < omSamples.length; i++) {
            const d = Math.abs(omSamples[i].ms - ms);
            if (d < best) { best = d; bestIdx = i; }
          }
          return bestIdx >= 0 ? omSamples[bestIdx] : undefined;
        };

        // Prefer OM pressure and enrich snow fields for hourly series
        if (Array.isArray(normalizedData.hourly) && normalizedData.hourly.length) {
          for (const h of normalizedData.hourly) {
            const ht = Date.parse(h.timeISO);
            if (!Number.isFinite(ht)) continue;
            const nearest = nearestOM(ht);
            if (!nearest) continue;
            if (typeof nearest.pressure === 'number' && Number.isFinite(nearest.pressure)) {
              h.pressureHpa = nearest.pressure;
            }
            if (typeof nearest.snowDepthCm === 'number') {
              (h as Hour).snowDepthCm = nearest.snowDepthCm;
            }
            if (typeof nearest.snowfallRateMmH === 'number') {
              (h as Hour).snowfallRateMmH = nearest.snowfallRateMmH;
            }
          }
        } else {
          // If we don't have any hourly yet, synthesize minimal series from OM (including snow)
          const hours: Hour[] = omSamples.map(s => ({
            timeISO: new Date(s.ms).toISOString(),
            tempC: typeof s.temp === 'number' ? s.temp : undefined,
            pressureHpa: typeof s.pressure === 'number' ? s.pressure : undefined,
            snowDepthCm: typeof s.snowDepthCm === 'number' ? s.snowDepthCm : undefined,
            snowfallRateMmH: typeof s.snowfallRateMmH === 'number' ? s.snowfallRateMmH : undefined,
          }));
          if (hours.length) (normalizedData as UnifiedWeather).hourly = hours;
        }

        // Also set current pressure if missing, using nearest OM sample to now
        if (normalizedData.pressureHpa == null) {
          const nowMs = Date.now();
          const nearest = nearestOM(nowMs);
          const prNow = nearest?.pressure;
          if (typeof prNow === 'number' && Number.isFinite(prNow)) {
            (normalizedData as UnifiedWeather).pressureHpa = prNow;
          }
        }
      }
    } catch (e) {
      console.warn('Open-Meteo hourly pressure/snow supplement failed:', e);
    }

    // Optional: Soil snapshot (Open-Meteo) — take a midday snapshot to avoid night-bias
    try {
      const today = new Date();
      
      // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
      // IMPORTANT: We only request the current day's soil data
      // Open-Meteo API has a strict 5-day limit for all forecasts
      // Keep this as a single day request to avoid API errors
      // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
      const startDate = today.toISOString().split('T')[0];
      const endDate = startDate; // same-day window is sufficient for latest snapshot
      
      const soilCacheKey = `${latlonKey}_${startDate}`;
      const soilCached = omSoilCache.get(soilCacheKey);
      let om: OpenMeteoSoilHourly;
      
      if (soilCached && Date.now() - soilCached.ts < SOIL_TTL_MS) {
        om = soilCached.data as OpenMeteoSoilHourly;
      } else {
        const raw = await fetchOpenMeteoWeather(latNum, lonNum, startDate, endDate);
        om = (raw || {}) as OpenMeteoSoilHourly;
        if (om) omSoilCache.set(soilCacheKey, { ts: Date.now(), data: om });
      }
      
      const H = om?.hourly || {} as NonNullable<OpenMeteoSoilHourly['hourly']>;
      const times: string[] = H.time || [];
      let idx = -1;
      if (times.length) {
        // Pick the entry closest to 12:00 local on the same local date
        const todayY = today.getFullYear();
        const todayM = today.getMonth();
        const todayD = today.getDate();
        let bestDiff = Number.POSITIVE_INFINITY;
        for (let i = 0; i < times.length; i++) {
          const dt = new Date(times[i]); // parsed as local time
          if (dt.getFullYear() === todayY && dt.getMonth() === todayM && dt.getDate() === todayD) {
            const diff = Math.abs(dt.getHours() + dt.getMinutes() / 60 - 12);
            if (diff < bestDiff) {
              bestDiff = diff;
              idx = i;
            }
          }
        }
        // Fallback: if we didn't find a same-day entry, pick the last available reading
        if (idx < 0) idx = times.length - 1;
      }

      if (idx >= 0) {
        const valueAt = (arr: number[] | undefined) => {
          if (!Array.isArray(arr)) return undefined;
          const raw = arr[idx];
          return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
        };

        const snapshot = {
          temp0cm: valueAt(H.soil_temperature_0cm),
          temp6cm: valueAt(H.soil_temperature_6cm),
          temp18cm: valueAt(H.soil_temperature_18cm),
          temp54cm: valueAt(H.soil_temperature_54cm),
          moisture0to1: valueAt(H.soil_moisture_0_to_1cm),
          moisture1to3: valueAt(H.soil_moisture_1_to_3cm),
          moisture3to9: valueAt(H.soil_moisture_3_to_9cm),
          moisture9to27: valueAt(H.soil_moisture_9_to_27cm)
        };

        const hasData = Object.values(snapshot).some(v => typeof v === 'number');
        if (hasData) {
          (normalizedData as UnifiedWeather).soil = snapshot;
          const rawTime = times[idx];
          if (rawTime) {
            const parsed = new Date(rawTime);
            if (!Number.isNaN(parsed.getTime())) {
              (normalizedData as UnifiedWeather).soilTimeISO = parsed.toISOString();
            }
          }
        }
      }
    } catch (err) {
      console.warn('Open-Meteo soil snapshot request failed', err);
    }

    return res.status(200).json(normalizedData);
  } catch (err: unknown) {
    console.error('Unified Weather API error (/api/unified-weather):', err);
    // Provide detailed error info instead of [object Object]
    let message = 'unknown error';
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      const status = typeof e.status === 'number' ? e.status : undefined;
      const statusText = typeof e.statusText === 'string' ? e.statusText : '';
      const data = e.data as unknown;
      if (typeof status === 'number') {
        try {
          message = `status=${status}${statusText ? ` ${statusText}` : ''} body=${JSON.stringify(data)}`;
        } catch {
          message = `status=${status}${statusText ? ` ${statusText}` : ''}`;
        }
      } else {
        try { message = JSON.stringify(err); } catch { message = String(err); }
      }
    } else {
      message = String(err);
    }
    // Attach minimal diagnostics for clients (no secrets)
    try {
      res.setHeader('X-Error-Reason', 'internal-error');
      res.setHeader('X-Error-Detail', String(message).slice(0, 200));
    } catch { void 0; }
    return res.status(500).json({ error: `Failed to fetch weather data: ${message}` });
  }
}
