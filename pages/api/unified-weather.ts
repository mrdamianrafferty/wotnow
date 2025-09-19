import type { NextApiRequest, NextApiResponse } from 'next';

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
const owWeatherCache = new Map<string, CacheEntry<OpenWeatherOneCall3 | OpenWeatherForecast25>>();
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
  };
}
const owAirQualityCache = new Map<string, CacheEntry<OpenWeatherAirQuality>>();
const omPollenCache = new Map<string, CacheEntry<OpenMeteoPollenHourly>>();
const omSoilCache = new Map<string, CacheEntry<OpenMeteoSoilHourly>>();
const omWeatherCache = new Map<string, CacheEntry<OpenMeteoGeneralHourly>>();

// Cache TTL settings
const TIDE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const MARINE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const WEATHER_TTL_MS = 5 * 60 * 1000;   // 5 minutes for main weather data
const AIR_QUALITY_TTL_MS = 15 * 60 * 1000; // 15 minutes for air quality
const POLLEN_TTL_MS = 60 * 60 * 1000;   // 1 hour for pollen data
const SOIL_TTL_MS = 30 * 60 * 1000;     // 30 minutes for soil data

const keyLL = (lat: number, lon: number) => `${lat.toFixed(3)},${lon.toFixed(3)}`;

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
}

interface StormglassMarineResponse {
  hours: StormglassMarineHour[];
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

  // series
  hourly?: Hour[]
  daily?: Day[]

  // marine
  marine?: Marine
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
  getAirPollution: (args: { lat: number; lon: number; apiKey: string }) => Promise<unknown>;
  fetchOpenMeteoAirPollen: (lat: number, lon: number, start: string, end: string) => Promise<unknown>;
  fetchOpenMeteoWeather: (lat: number, lon: number, start: string, end: string) => Promise<unknown>;
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
  const mod = await import('../../lib/services/weatherService');
  const svcModule = (mod as unknown as WeatherServiceModule);
  const {
    getFullWeather,
    fetchStormglassTides,
    fetchStormglassMarine,
    getAirPollution,
    fetchOpenMeteoAirPollen,
    fetchOpenMeteoWeather,
  } = svcModule;

  const { lat, lon, mode, coastal } = req.query as { 
    lat?: string; 
    lon?: string; 
    mode?: string; 
    coastal?: string; 
  };
  // Support mock fixtures for development/tests via ?mock=inland|marine
  const mockParam = Array.isArray(req.query.mock) ? req.query.mock[0] : req.query.mock;
  const mock = (mockParam === 'inland' || mockParam === 'marine') ? mockParam : undefined;

  // Determine mode: prefer explicit mode, fallback to coastal flag, default to land
  const weatherMode = mode || (coastal === 'true' ? 'marine' : 'land');
  const units = (req.query.units as string) || 'metric';
  const exclude = (req.query.exclude as string) || '';

  const apiKey = process.env.OPENWEATHER_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

  // Always attach minimal debug headers (no secrets) so failures still carry diagnostics
  try {
    res.setHeader('X-Mode', weatherMode);
    res.setHeader('X-Has-OW-Key', apiKey ? '1' : '0');
    const sgKeyEarly = process.env.STORMGLASS_SECRET_KEY || process.env.STORMGLASS_API_KEY;
    res.setHeader('X-Has-SG-Key', sgKeyEarly ? '1' : '0');
  } catch {
    // ignore
    void 0;
  }

  if (lat === undefined || lon === undefined || !apiKey) {
    try { res.setHeader('X-Error-Reason', 'missing-params-or-api-key'); } catch { void 0; }
    return res.status(400).json({ 
      error: 'Missing parameters or API key',
      received: { lat, lon, hasApiKey: !!apiKey }
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

  // Early return mock payloads if requested
  if (mock === 'inland' || mock === 'marine') {
    const payload = buildMockUnifiedWeather(latNum, lonNum, mock);
    return res.status(200).json(payload);
  }

  try {
    const latlonKey = keyLL(latNum, lonNum);
    
    // Base weather (OpenWeather One Call) with cache
    const weatherCacheKey = `${latlonKey}_${units}_${exclude}`;
    const weatherCached = owWeatherCache.get(weatherCacheKey);
    let weatherData: OpenWeatherOneCall3 | OpenWeatherForecast25;
    
    if (weatherCached && Date.now() - weatherCached.ts < WEATHER_TTL_MS) {
      weatherData = weatherCached.data as OpenWeatherOneCall3 | OpenWeatherForecast25;
    } else {
      weatherData = await getFullWeather({
        lat: latNum,
        lon: lonNum,
        apiKey,
        options: { units, exclude }
      });
      if (weatherData) owWeatherCache.set(weatherCacheKey, { ts: Date.now(), data: weatherData });
    }
    // Attach minimal debug headers (no secrets)
    try {
      // X-Mode/X-Has-* already set above; just set source once available
      const src = (weatherData as { source?: string })?.source;
      if (src) res.setHeader('X-Weather-Source', src);
    } catch {
      // ignore header set failures (e.g., during tests)
      void 0;
    }
    
    // Transform to normalized structure
    const normalizedData = transformWeatherData(weatherData, latNum, lonNum, weatherMode);

    // Optional: Tides and Marine (Stormglass), if key available
    const sgKey = process.env.STORMGLASS_SECRET_KEY || process.env.STORMGLASS_API_KEY;
    if (sgKey) {
      try {
        const latlonKey = keyLL(latNum, lonNum);
        // Tides with cache
        const tideCached = sgTideCache.get(latlonKey);
        let tidesRaw: StormglassTidesResponse | null = null;
        if (tideCached && Date.now() - tideCached.ts < TIDE_TTL_MS) {
          tidesRaw = tideCached.data as StormglassTidesResponse;
        } else {
          tidesRaw = await fetchStormglassTides(latNum, lonNum, sgKey);
          if (tidesRaw) sgTideCache.set(latlonKey, { ts: Date.now(), data: tidesRaw });
        }
        if (tidesRaw && Array.isArray(tidesRaw.data)) {
          const tides = tidesRaw.data.map((t): { time: string; type: 'high' | 'low'; height: number | null } => ({
            time: new Date(t.time).toISOString(),
            type: String(t.type).toLowerCase().includes('high') ? 'high' : 'low',
            height: typeof t.height === 'number' ? t.height : (t.height != null ? Number(t.height) : null)
          }));
          normalizedData.tides = tides;
        }

        // Marine (next ~24h) with cache
        const nowD = new Date();
        const end = new Date(nowD.getTime() + 24 * 60 * 60 * 1000);
        const marineCached = sgMarineCache.get(latlonKey);
        let marineRaw: StormglassMarineResponse | null = null;
        if (marineCached && Date.now() - marineCached.ts < MARINE_TTL_MS) {
          marineRaw = marineCached.data as StormglassMarineResponse;
        } else {
          marineRaw = await fetchStormglassMarine(
            latNum,
            lonNum,
            nowD.toISOString(),
            end.toISOString(),
            undefined,
            sgKey
          );
          if (marineRaw) sgMarineCache.set(latlonKey, { ts: Date.now(), data: marineRaw });
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
          // Build full marineHourly series
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
          normalizedData.marine = {
            waveHeight: sgNumber('waveHeight'),
            waveDirection: sgNumber('waveDirection'),
            wavePeriod: sgNumber('wavePeriod'),
            swellHeight: sgNumber('swellHeight'),
            swellDirection: sgNumber('swellDirection'),
            swellPeriod: sgNumber('swellPeriod'),
          };

          // Attach marine data to existing hourly by nearest-time match (<= 90 min)
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
      } catch (e) {
        // Swallow marine/tide errors gracefully
        console.warn('Stormglass enrich failed:', e);
      }
    }

    // Optional: Air Quality (OpenWeather) with cache
    try {
      const aqCached = owAirQualityCache.get(latlonKey);
      let aq: OpenWeatherAirQuality;
      
      if (aqCached && Date.now() - aqCached.ts < AIR_QUALITY_TTL_MS) {
        aq = aqCached.data as OpenWeatherAirQuality;
      } else {
        const raw = await getAirPollution({ lat: latNum, lon: lonNum, apiKey });
        aq = (raw || {}) as OpenWeatherAirQuality;
        if (aq) owAirQualityCache.set(latlonKey, { ts: Date.now(), data: aq });
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
        const pollenCacheKey = `${latlonKey}_${startDate}_${endDate}`;
        const pollenCached = omPollenCache.get(pollenCacheKey);
        let polRaw: OpenMeteoPollenHourly;
        
        if (pollenCached && Date.now() - pollenCached.ts < POLLEN_TTL_MS) {
          polRaw = pollenCached.data as OpenMeteoPollenHourly;
        } else {
          const raw = await fetchOpenMeteoAirPollen(latNum, lonNum, startDate, endDate);
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

      // Build UTC ms for OM times by subtracting offset from the naive-UTC parse
      const omSamples: Array<{ ms: number; pressure: number | undefined; temp: number | undefined }> = [];
      for (let i = 0; i < t.length; i++) {
        const parsed = Date.parse(String(t[i]) + 'Z'); // interpret string as UTC first
        const utcMs = Number.isFinite(parsed) ? (parsed - offset * 1000) : NaN;
        const pr = typeof p[i] === 'number' ? Number(p[i]) : undefined;
        const tm = typeof tc[i] === 'number' ? Number(tc[i]) : undefined;
        if (Number.isFinite(utcMs)) omSamples.push({ ms: utcMs, pressure: pr, temp: tm });
      }

      if (omSamples.length) {
        // Helper to find nearest OM sample to a given ms
        const nearestPressure = (ms: number): number | undefined => {
          let bestIdx = -1; let best = Infinity;
          for (let i = 0; i < omSamples.length; i++) {
            const d = Math.abs(omSamples[i].ms - ms);
            if (d < best) { best = d; bestIdx = i; }
          }
          return bestIdx >= 0 ? omSamples[bestIdx].pressure : undefined;
        };

        // Prefer OM pressure for hourly series
        if (Array.isArray(normalizedData.hourly) && normalizedData.hourly.length) {
          for (const h of normalizedData.hourly) {
            const ht = Date.parse(h.timeISO);
            if (!Number.isFinite(ht)) continue;
            const pr = nearestPressure(ht);
            if (typeof pr === 'number' && Number.isFinite(pr)) {
              h.pressureHpa = pr;
            }
          }
        } else {
          // If we don't have any hourly yet, synthesize minimal series from OM
          const hours: Hour[] = omSamples.map(s => ({
            timeISO: new Date(s.ms).toISOString(),
            tempC: typeof s.temp === 'number' ? s.temp : undefined,
            pressureHpa: typeof s.pressure === 'number' ? s.pressure : undefined,
          }));
          if (hours.length) (normalizedData as UnifiedWeather).hourly = hours;
        }

        // Also set current pressure if missing, using nearest OM sample to now
        if (normalizedData.pressureHpa == null) {
          const nowMs = Date.now();
          const prNow = nearestPressure(nowMs);
          if (typeof prNow === 'number' && Number.isFinite(prNow)) {
            (normalizedData as UnifiedWeather).pressureHpa = prNow;
          }
        }
      }
    } catch (e) {
      console.warn('Open-Meteo hourly pressure supplement failed:', e);
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
            const diff = Math.abs(dt.getHours() + dt.getMinutes()/60 - 12);
            if (diff < bestDiff) { bestDiff = diff; idx = i; }
          }
        }
        // Fallback: if none match today (edge case), use last index
        if (idx < 0) idx = times.length - 1;
      }
      if (idx >= 0) {
        const pickNum = (arr?: number[]) => (Array.isArray(arr) && typeof arr[idx] === 'number') ? Number(arr[idx]) : undefined;
        normalizedData.soil = {
          temp0cm: pickNum(H.soil_temperature_0cm),
          temp6cm: pickNum(H.soil_temperature_6cm),
          temp18cm: pickNum(H.soil_temperature_18cm),
          temp54cm: pickNum(H.soil_temperature_54cm),
          moisture0to1: pickNum(H.soil_moisture_0_to_1cm),
          moisture1to3: pickNum(H.soil_moisture_1_to_3cm),
          moisture3to9: pickNum(H.soil_moisture_3_to_9cm),
          moisture9to27: pickNum(H.soil_moisture_9_to_27cm),
        };
        const picked = times[idx];
        if (picked) {
          const d = new Date(picked);
          normalizedData.soilTimeISO = Number.isNaN(d.getTime()) ? String(picked) : d.toISOString();
        }
      }
    } catch (e) {
      console.warn('Soil fetch failed:', e);
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
