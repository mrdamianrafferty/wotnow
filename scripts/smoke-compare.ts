import 'dotenv/config';
import fetch from 'node-fetch';
import { composeGoingOutTonight } from '../lib/services/goingOutTonight';
import {
  attachMarineToForecast,
  attachAstronomyToForecast,
  attachMarineBioToForecast,
  type WeatherForecastDay,
} from '../lib/services/weatherService';

// --- Helpers added: Open-Meteo weather (for UV) & OpenWeather AQ fallback ---
async function fetchOpenMeteoWeather(lat: number, lon: number, startDate: string, endDate: string): Promise<any> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  // keep lean: UV + is_day + soil temperature/moisture
  url.searchParams.set('hourly', [
    'uv_index','uv_index_clear_sky','is_day',
    'soil_temperature_0cm',
    'soil_moisture_0_to_1cm','soil_moisture_1_to_3cm','soil_moisture_3_to_9cm',
    'soil_moisture_9_to_27cm','soil_moisture_27_to_81cm'
  ].join(','));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Open-Meteo weather ${res.status} ${res.statusText}: ${text.slice(0,200)}`);
  }
  return res.json();
}

async function getOpenWeatherAirPollution(lat: number, lon: number, apiKey: string): Promise<any[]> {
  const url = new URL('https://api.openweathermap.org/data/2.5/air_pollution');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('appid', apiKey);
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenWeather air ${res.status} ${res.statusText}: ${JSON.stringify(data).slice(0,200)}`);
  return Array.isArray(data?.list) ? data.list : [];
}

function aggregateAirFromOW(list: any[]): {
  pm2_5Avg?: number;
  pm10Avg?: number;
  o3Avg?: number;
  no2Avg?: number;
  so2Avg?: number;
  coAvg?: number;
} | null {
  if (!Array.isArray(list) || !list.length) return null;
  const pick = (k: string) => list.map((e: any) => Number(e?.components?.[k])).filter((n) => Number.isFinite(n));
  const avg  = (arr: number[]) => (arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : undefined);
  return {
    pm2_5Avg: avg(pick('pm2_5')),
    pm10Avg:  avg(pick('pm10')),
    o3Avg:    avg(pick('o3')),
    no2Avg:   avg(pick('no2')),
    so2Avg:   avg(pick('so2')),
    coAvg:    avg(pick('co')),
  };
}

export async function fetchStormglassBio(lat: number, lon: number, startISO: string, endISO: string, params: string | undefined, apiKey: string) {
  const url = new URL('https://api.stormglass.io/v2/bio/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);
  url.searchParams.set('params', params ?? [
    'chlorophyll','oxygen','nitrate','phosphate','salinity','surfaceTemperature'
  ].join(','));
  const res = await fetch(url.toString(), {
    headers: { Authorization: apiKey }
  });
  if (!res.ok) throw new Error(`Stormglass bio ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchOpenMeteoAirPollen(lat: number, lon: number, startDate: string, endDate: string): Promise<any> {
  // Single Air-Quality endpoint for both AQI and Pollen, per docs:
  // https://open-meteo.com/en/docs/air-quality-api
  const hourlyVars = [
    // AQI
    'european_aqi','us_aqi',
    // Pollen groups (include mugwort)
    'alder_pollen','birch_pollen','grass_pollen','olive_pollen','ragweed_pollen','mugwort_pollen'
  ];
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('hourly', hourlyVars.join(','));

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  const fetchJson = async (tries = 3, backoffMs = 400): Promise<any> => {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const resp = await fetch(url.toString());
        const text = await resp.text();
        if (!resp.ok) {
          if (resp.status >= 500 && attempt < tries) {
            await sleep(backoffMs * attempt);
            continue;
          }
          throw new Error(`${url.hostname} ${resp.status} ${resp.statusText}: ${text.slice(0, 300)}`);
        }
        try {
          return JSON.parse(text);
        } catch {
          throw new Error(`${url.hostname} invalid JSON: ${text.slice(0, 200)}`);
        }
      } catch (e: any) {
        lastErr = e;
        if (attempt < tries) {
          await sleep(backoffMs * attempt);
          continue;
        }
      }
    }
    console.warn('[open-meteo] giving up on', url.hostname, '-', (lastErr?.message || lastErr) ?? 'unknown error');
    return {};
  };

  const res = await fetchJson();

  // Normalize to { hourly } or {}
  if (res && res.hourly && Array.isArray(res.hourly.time)) {
    return { hourly: res.hourly };
  }
  return {};
}

export async function attachOpenMeteoToForecast(days: Array<{ date: string }>, opts: { lat: number; lon: number; timeZone?: string }) {
  const { lat, lon } = opts;
  const start = days[0]?.date;
  const end   = days[days.length - 1]?.date;

  // Fetch general weather (for UV/soil/snow) and air+pollen in parallel, but non-fatal if one fails
  const [wxRes, apRes] = await Promise.allSettled([
    fetchOpenMeteoWeather(lat, lon, start, end),
    fetchOpenMeteoAirPollen(lat, lon, start, end)
  ]);

  const wx = wxRes.status === 'fulfilled' ? wxRes.value : undefined;
  const ap = apRes.status === 'fulfilled' ? apRes.value : undefined;

  // Convenience helpers
  const toNums = (arr: any) => Array.isArray(arr) ? arr.map(Number).filter(n => Number.isFinite(n)) : [];
  const avg = (arr: number[]) => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : undefined;
  const max = (arr: number[]) => arr.length ? Math.max(...arr) : undefined;
  const min = (arr: number[]) => arr.length ? Math.min(...arr) : undefined;

  // Index time by day key for joins
  const wxH = wx?.hourly || {};
  const apH = ap?.hourly || {};
  const wxTimes = Array.isArray(wxH.time) ? wxH.time : [];
  const apTimes = Array.isArray(apH.time) ? apH.time : [];

  const byDayKey = (iso: string, tz = opts.timeZone || 'UTC') => {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' })
      .formatToParts(d).reduce((a, p) => (p.type !== 'literal' ? (a[p.type] = p.value, a) : a), {} as any);
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  // Build day buckets
  const buckets: Record<string, {
    uv: number[];
    euAqi: Array<{ v: number; t: string }>;
    pollen: Record<string, number[]>;
    soilT0: number[];
    soilM01: number[]; soilM13: number[]; soilM39: number[]; soilM927: number[]; soilM2781: number[];
  }> = {};
  wxTimes.forEach((t: string, i: number) => {
    const k = byDayKey(t, opts.timeZone);
    const b = (buckets[k] ||= { uv: [], euAqi: [], pollen: {}, soilT0: [], soilM01: [], soilM13: [], soilM39: [], soilM927: [], soilM2781: [] });
    b.uv.push(Number(wxH.uv_index?.[i]));
    const n = (v: any) => Number(v);
    // Soil: guard NaNs
    const t0   = n(wxH.soil_temperature_0cm?.[i]);
    const m01  = n(wxH.soil_moisture_0_to_1cm?.[i]);
    const m13  = n(wxH.soil_moisture_1_to_3cm?.[i]);
    const m39  = n(wxH.soil_moisture_3_to_9cm?.[i]);
    const m927 = n(wxH.soil_moisture_9_to_27cm?.[i]);
    const m2781= n(wxH.soil_moisture_27_to_81cm?.[i]);
    if (Number.isFinite(t0))   b.soilT0.push(t0);
    if (Number.isFinite(m01))  b.soilM01.push(m01);
    if (Number.isFinite(m13))  b.soilM13.push(m13);
    if (Number.isFinite(m39))  b.soilM39.push(m39);
    if (Number.isFinite(m927)) b.soilM927.push(m927);
    if (Number.isFinite(m2781))b.soilM2781.push(m2781);
  });
  apTimes.forEach((t: string, i: number) => {
    const k = byDayKey(t, opts.timeZone);
    const b = (buckets[k] ||= { uv: [], euAqi: [], pollen: {} });
    const v = Number(apH.european_aqi?.[i]);
    if (Number.isFinite(v)) b.euAqi.push({ v, t });
    ['alder_pollen','birch_pollen','grass_pollen','ragweed_pollen','olive_pollen','mugwort_pollen'].forEach(key => {
      const val = Number(apH[key]?.[i]);
      if (Number.isFinite(val)) (b.pollen[key] ||= []).push(val);
    });
  });

  // Mutate each day
  for (const day of days as any[]) {
    const b = buckets[day.date] || { uv: [], euAqi: [], pollen: {}, soilT0: [], soilM01: [], soilM13: [], soilM39: [], soilM927: [], soilM2781: [] };

    // UV — from weather hourly only (independent of pollen/AQ)
    const uvVals = b.uv.filter(n => Number.isFinite(n));
    day.uvIndexMin  = min(uvVals);
    day.uvIndexMean = avg(uvVals);
    day.uvIndexMax  = max(uvVals);

    // Pollen — daily max per type, aggregate + dominant + severity
    const entries = Object.entries(b.pollen).map(([k, arr]) => [k, max(arr as number[])] as const).filter(([,v]) => Number.isFinite(v as number));
    if (entries.length) {
      const aggregate = Math.max(...entries.map(([,v]) => v as number));
      const dominant  = entries.reduce((a,b) => ((b[1] as number) > (a[1] as number) ? b : a))[0];
      const severity = (v: number) => v >= 200 ? 'very_high' : v >= 100 ? 'high' : v >= 30 ? 'moderate' : v > 0 ? 'low' : 'none';
      day.pollen = {
        aggregate, dominant: (dominant as any).replace('_pollen',''),
        severity: severity(aggregate), source: 'open-meteo', unit: 'index'
      };
    }

    // Air — prefer Open-Meteo EU AQI; include occurrence time
    if (b.euAqi.length) {
      const peak = b.euAqi.reduce((a, c) => (c.v > a.v ? c : a));
      day.air = {
        ...(day.air || {}),
        euAqiMax: peak.v,
        euAqiMaxTime: peak.t
      };
    } else {
      // Fallback to OpenWeather pollutants if key available
      const OWK = process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_KEY;
      if (OWK) {
        try {
          const owList = await getOpenWeatherAirPollution(lat, lon, OWK);
          const agg = aggregateAirFromOW(owList);
          if (agg) {
            day.air = { ...(day.air || {}), ...agg };
          }
        } catch { /* ignore */ }
      }
    }

    // Soil — daily min/mean/max where available
    const soil = (b: any[]) => ({ min: min(b), mean: avg(b), max: max(b) });
    const soilObj: any = {};
    if ((b as any).soilT0?.length)   soilObj.temp0cm = soil((b as any).soilT0);
    if ((b as any).soilM01?.length)  soilObj.moisture0to1 = soil((b as any).soilM01);
    if ((b as any).soilM13?.length)  soilObj.moisture1to3 = soil((b as any).soilM13);
    if ((b as any).soilM39?.length)  soilObj.moisture3to9 = soil((b as any).soilM39);
    if ((b as any).soilM927?.length) soilObj.moisture9to27 = soil((b as any).soilM927);
    if ((b as any).soilM2781?.length)soilObj.moisture27to81 = soil((b as any).soilM2781);
    if (Object.keys(soilObj).length) (day as any).soil = soilObj;
  }

  return days as any;
}

// =========================
// Runner & pretty printing
// =========================

const TZ = 'Europe/Madrid';

// Coords
const MADRID = { name: 'Madrid', lat: 40.4168, lon: -3.7038 };           // inland
const CARAVIA = { name: 'Caravia, Asturias', lat: 43.4738, lon: -5.2686 }; // coastal

// Utility: make YYYY-MM-DD in Europe/Madrid
function dateKeyPlus(i = 0) {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d)
   .reduce<Record<string, string>>((a, p) => (p.type !== 'literal' ? (a[p.type] = p.value, a) : a), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Make a base 3-day stub forecast
function makeBase(days = 3): WeatherForecastDay[] {
  return Array.from({ length: days }, (_, i) => ({ date: dateKeyPlus(i) } as WeatherForecastDay));
}

// Map EU AQI numeric max to a standard category label
function euAqiCategory(v?: number) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  if (v <= 20) return 'Good';
  if (v <= 40) return 'Fair';
  if (v <= 60) return 'Moderate';
  if (v <= 80) return 'Poor';
  if (v <= 100) return 'Very Poor';
  return 'Extremely Poor';
}

const fmt = (n: unknown, digits = 2) =>
  typeof n === 'number' && Number.isFinite(n) ? Number(n).toFixed(digits) : undefined;

async function enrich(place: { name: string; lat: number; lon: number }) {
  const base = makeBase(3);

  // Marine time window: now ➜ +48h (UTC ISO)
  const start = new Date();
  const end = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  let days: WeatherForecastDay[] = base;

  // 1) Marine
  try {
    days = await attachMarineToForecast(days, {
      lat: place.lat, lon: place.lon,
      startTimeISO: startISO, endTimeISO: endISO,
      timeZone: TZ
    });
  } catch (e: any) {
    console.warn('[smoke-compare] marine skipped:', e?.message || e);
  }

  // 2) Open-Meteo (UV, pollen, AQ, soil/winter) — use the resilient local version
  try {
    // Reuse the local helper that survives Open-Meteo partial outages
    days = await (async () => {
      const opts = { lat: place.lat, lon: place.lon, timeZone: TZ };
      // Build day array of {date} and let attachOpenMeteoToForecast mutate it
      return await (attachOpenMeteoToForecast as any)(days, opts);
    })();
  } catch (e: any) {
    console.warn('[smoke-compare] open-meteo skipped:', e?.message || e);
  }

  // 3) Astronomy
  try {
    days = await attachAstronomyToForecast(days, {
      lat: place.lat, lon: place.lon, timeZone: TZ
    });
  } catch (e: any) {
    console.warn('[smoke-compare] astronomy skipped:', e?.message || e);
  }

  // 4) Marine Bio
  try {
    days = await attachMarineBioToForecast(days, {
      lat: place.lat, lon: place.lon, timeZone: TZ
    });
  } catch (e: any) {
    console.warn('[smoke-compare] bio skipped:', e?.message || e);
  }

  return days;
}

function brief(day: WeatherForecastDay) {
  // ---- Marine snapshot (first hour) ----
  const snap = (day as any).marine?.[0];
  const snapWave = snap?.waveHeight?.sg ?? snap?.waveHeight;
  const snapSwell = snap?.swellHeight?.sg ?? snap?.swellHeight;
  const snapWaterT = snap?.waterTemperature?.sg ?? snap?.waterTemperature;

  // ---- Marine daily aggregates (if present) ----
  const md = (day as any).marineDaily;
  const mdWave = md?.waveHeight;
  const mdSwell = md?.swellHeight;
  const mdWaveDir = md?.waveDirection;
  const mdSwellDir = md?.swellDirection;
  const mdWindWave = md?.windWaveHeight;
  const mdWindWaveDir = md?.windWaveDirection;
  const mdWavePeriod = md?.wavePeriod;
  const mdSwellPeriod = md?.swellPeriod;
  const mdWaterT = md?.waterTemperature;
  const mdWind = md?.windSpeed;
  const mdWindDir = md?.windDirection;
  const mdGust = md?.gust;
  const mdCurrent = md?.currentSpeed;
  const mdCurrentDir = md?.currentDirection;

  // ---- SST (prefer Bio daily avg, else marine daily mean, else snapshot) ----
  const sstBio = (day as any).marineBio?.seaSurfaceTemperatureAvg;
  const sst =
    typeof sstBio === 'number' ? sstBio
      : typeof mdWaterT?.mean === 'number' ? mdWaterT.mean
      : typeof snapWaterT === 'number' ? snapWaterT
      : undefined;

  // ---- UV ----
  const uvMin  = (day as any).uvIndexMin ?? undefined;
  const uvMean = (day as any).uvIndexMean ?? (day as any).uvIndex ?? undefined;
  const uvMax  = (day as any).uvIndexMax ?? (day as any).uvIndex ?? undefined;

  // ---- Pollen ----
  const pol = (day as any).pollen;
  const pollenAggregate = pol?.aggregate;
  const pollenDominant  = pol?.dominant as ('alder'|'birch'|'grass'|'ragweed'|'olive'|undefined);
  const pollenSeverity  = pol?.severity;

  // ---- Air quality ----
  const euAqi = (day as any).air?.euAqiMax ?? (day as any).air?.usAqiMax;
  const aqiCategory = euAqiCategory((day as any).air?.euAqiMax);
  const euAqiTime = (day as any).air?.euAqiMaxTime;

  // ---- Astronomy ----
  const astro = (day as any).astronomy;

  return {
    date: (day as any).date,

    // Snapshot
    marine_snapshot_waveHeight_m: fmt(snapWave),
    marine_snapshot_swellHeight_m: fmt(snapSwell),
    marine_snapshot_waterTemp_C: fmt(snapWaterT, 1),

    // Marine daily aggregates
    marine_daily: md ? {
      waveHeight_m: { min: fmt(mdWave?.min), mean: fmt(mdWave?.mean), max: fmt(mdWave?.max) },
      waveDirection_deg: typeof mdWaveDir === 'number' ? mdWaveDir : undefined,
      wavePeriod_s: { min: fmt(mdWavePeriod?.min), mean: fmt(mdWavePeriod?.mean), max: fmt(mdWavePeriod?.max) },

      swellHeight_m: { min: fmt(mdSwell?.min), mean: fmt(mdSwell?.mean), max: fmt(mdSwell?.max) },
      swellDirection_deg: typeof mdSwellDir === 'number' ? mdSwellDir : undefined,
      swellPeriod_s: { min: fmt(mdSwellPeriod?.min), mean: fmt(mdSwellPeriod?.mean), max: fmt(mdSwellPeriod?.max) },

      windWaveHeight_m: { min: fmt(mdWindWave?.min), mean: fmt(mdWindWave?.mean), max: fmt(mdWindWave?.max) },
      windWaveDirection_deg: typeof mdWindWaveDir === 'number' ? mdWindWaveDir : undefined,
      windWavePeriod_s: { min: fmt(md?.windWavePeriod?.min), mean: fmt(md?.windWavePeriod?.mean), max: fmt(md?.windWavePeriod?.max) },

      waterTemperature_C: { min: fmt(mdWaterT?.min, 1), mean: fmt(mdWaterT?.mean, 1), max: fmt(mdWaterT?.max, 1) },

      windSpeed_mps: { min: fmt(mdWind?.min), mean: fmt(mdWind?.mean), max: fmt(mdWind?.max) },
      windDirection_deg: typeof mdWindDir === 'number' ? mdWindDir : undefined,
      gust_mps: { min: fmt(mdGust?.min), mean: fmt(mdGust?.mean), max: fmt(mdGust?.max) },

      currentSpeed_mps: { min: fmt(mdCurrent?.min), mean: fmt(mdCurrent?.mean), max: fmt(mdCurrent?.max) },
      currentDirection_deg: typeof mdCurrentDir === 'number' ? mdCurrentDir : undefined,
    } : undefined,

    // SST
    sst_C: typeof sst === 'number' ? Number(sst).toFixed(1) : undefined,

    // UV
    uvIndexMin: uvMin,
    uvIndexMean: uvMean,
    uvIndexMax: uvMax,

    // Soil (Open-Meteo)
    soil_temp0cm_mean_C: fmt((day as any).soil?.temp0cm?.mean, 1),
    soil_moisture_0_1cm_mean_m3m3: fmt((day as any).soil?.moisture0to1?.mean, 3),

    // Pollen
    pollen_aggregate: typeof pollenAggregate === 'number' ? pollenAggregate : undefined,
    pollen_dominant: pollenDominant,
    pollen_severity: pollenSeverity,

    // Air quality
    air_AQI_max: euAqi,
    air_AQI_category: aqiCategory,
    air_AQI_max_time: euAqiTime,

    // Astronomy
    sunrise: astro?.sunrise,
    sunset: astro?.sunset,
    moonPhase: astro?.moonPhase
  };
}

// ===============
// Astrocard AI test helpers
// ===============

// Small timeout helper (avoid hanging the smoke script)
const withTimeoutAI = <T>(p: Promise<T>, ms = 10000) => new Promise<T>((res, rej) => {
  const id = setTimeout(() => rej(new Error('timeout')), ms);
  p.then(v => { clearTimeout(id); res(v); }, e => { clearTimeout(id); rej(e); });
});

// Minimal OW Assistant call (start or resume when `sessionId` provided)
async function owAssistantAsk(prompt: string, apiKey: string, sessionId?: string) {
  const url = sessionId
    ? `https://api.openweathermap.org/assistant/session/${sessionId}`
    : `https://api.openweathermap.org/assistant/session`;
  const r = await withTimeoutAI(fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify({ prompt })
  }), 10000);
  if (!r.ok) throw new Error(`OW Assistant ${r.status}`);
  return r.json() as Promise<{ answer: string; data?: any; session_id: string }>;
}

// Build a tight prompt for astronomy (en-GB, sky-focused)
function buildAstroPromptEnGB(a: {
  place: string; lat: number; lon: number;
  windowStartISO: string; windowEndISO: string;
  cloudCoverPct?: number | null; precipProbPct?: number | null;
  windMps?: number | null; tempC?: number | null;
  moonPhaseName?: string; moonIllumPct?: number | null;
  bestHourLocal?: string | null;
}) {
  const bits = [
    'Reply in British English.',
    'Write two short sentences for an astronomy card.',
    `Location: ${a.place} (${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}).`,
    `Time window: ${a.windowStartISO} to ${a.windowEndISO} (local time).`,
    a.moonPhaseName && a.moonIllumPct!=null ? `Moon: ${a.moonPhaseName}, ~${Math.round(a.moonIllumPct)}% illuminated.` : '',
    a.cloudCoverPct!=null ? `Average cloud cover ~${Math.round(a.cloudCoverPct)}%.` : '',
    a.precipProbPct!=null ? `Max precipitation probability ~${Math.round(a.precipProbPct)}%.` : '',
    a.windMps!=null ? `Wind ~${Math.round(a.windMps)} m/s.` : '',
    a.tempC!=null ? `Temperature ~${Math.round(a.tempC)} °C.` : '',
    'Focus on sky transparency and cloud breaks. Avoid air quality and marine conditions.',
    'If conditions are mixed, suggest the best hour.'
  ].filter(Boolean);
  return bits.join(' ');
}

// Simple moon phase label from fraction [0..1]
function moonPhaseNameFromFrac(x?: number | null) {
  if (typeof x !== 'number') return undefined;
  const f = ((x % 1) + 1) % 1;
  const steps = [
    { t: 0.03, n: 'New Moon' },
    { t: 0.22, n: 'Waxing crescent' },
    { t: 0.28, n: 'First quarter' },
    { t: 0.47, n: 'Waxing gibbous' },
    { t: 0.53, n: 'Full Moon' },
    { t: 0.72, n: 'Waning gibbous' },
    { t: 0.78, n: 'Last quarter' },
    { t: 0.97, n: 'Waning crescent' }
  ];
  return (steps.find(s => f <= s.t) || steps[steps.length - 1]).n;
}

// Fetch a compact Open-Meteo hourly window for cloud/wind/temp/precip
async function fetchOpenMeteoWindow(lat: number, lon: number, startISO: string, endISO: string) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_hour', startISO);
  url.searchParams.set('end_hour', endISO);
  url.searchParams.set('hourly', [
    'cloudcover','precipitation_probability','temperature_2m','windspeed_10m',
  'precipitation','windgusts_10m','relative_humidity_2m'
  ].join(','));
  const r = await withTimeoutAI(fetch(url.toString()), 10000);
  if (!r.ok) return {};
  return r.json().catch(() => ({}));
}

// Compute a viewing window from nautical dusk to local midnight.
// Falls back to 22:00–00:00 local when nautical dusk is unavailable.
function computeNauticalToMidnightWindow(day: WeatherForecastDay, tz: string) {
  const astro = (day as any).astronomy || {};
  const startCand = [
    astro.nauticalDusk,
    astro.nautical_dusk,
    astro.nauticalTwilightEnd,
    astro.nautical_twilight_end,
    astro.twilightNauticalEnd,
    astro.nauticalEnd
  ].find(Boolean);

  let startISO: string;
  if (startCand) {
    // normalise to ISO in UTC
    startISO = new Date(startCand).toISOString();
  } else {
    // fallback: 22:00 local today (host tz)
    const base = new Date();
    base.setHours(22, 0, 0, 0);
    startISO = base.toISOString();
  }

  // End = local midnight following start
  const startLocal = new Date(startISO);
  const endLocal = new Date(startLocal);
  endLocal.setHours(24, 0, 0, 0);
  const endISO = endLocal.toISOString();

  return { startISO, endISO };
}

// Compute window metrics and ask OW Assistant (fallback if missing)
async function testAstroSummary(place: { name: string; lat: number; lon: number }, days: WeatherForecastDay[]) {
  const owKey = process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_KEY;
  const today = days[0];
  // Window: nautical dusk to local midnight (fallback to 22:00–00:00)
  const { startISO: windowStartISO, endISO: windowEndISO } = computeNauticalToMidnightWindow(today, TZ);

  // Pull astronomy from our day (Stormglass attach should have populated)
  const astro = (today as any).astronomy || {};
  const moonFrac = typeof astro.moonPhase === 'number' ? astro.moonPhase : undefined;
  const moonName = moonPhaseNameFromFrac(moonFrac);
  const illum = typeof moonFrac === 'number' && moonFrac >= 0 && moonFrac <= 1 ? Math.round(moonFrac * 100) : undefined;

  // Quick Open-Meteo window fetch
  let cloudMean: number | null = null, precipMax: number | null = null, windMean: number | null = null, tempMean: number | null = null;
  try {
    const w = await fetchOpenMeteoWindow(place.lat, place.lon, windowStartISO, windowEndISO) as any;
    const H = w?.hourly || {};
    const toNums = (arr: any) => Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
    const avg = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : null;
    cloudMean = avg(toNums(H.cloudcover));
    precipMax = max(toNums(H.precipitation_probability));
    windMean  = avg(toNums(H.windspeed_10m));
    tempMean  = avg(toNums(H.temperature_2m));
  } catch { /* ignore and leave nulls */ }

  const inputs = {
    place: place.name, lat: place.lat, lon: place.lon,
    windowStartISO, windowEndISO,
    cloudCoverPct: cloudMean, precipProbPct: precipMax,
    windMps: windMean, tempC: tempMean,
    moonPhaseName: moonName, moonIllumPct: illum,
    bestHourLocal: null
  };

  const prompt = buildAstroPromptEnGB(inputs);
  let answer = '';
  if (owKey) {
    try {
      const res = await owAssistantAsk(prompt, owKey);
      answer = (res.answer || '').trim();
    } catch (e: any) {
      answer = '';
      console.warn('[astrocard ai] OW Assistant failed:', e?.message || e);
    }
  }

  if (!answer) {
    // local fallback
    const okSky = cloudMean!=null ? (cloudMean < 40 ? 'promising' : cloudMean < 70 ? 'mixed' : 'poor') : 'mixed';
    answer = `Tonight in ${place.name}, sky conditions look ${okSky}${typeof illum==='number'?`, the moon is ~${illum}% lit`:''}. Watch for breaks in cloud.`;
  }

  console.log('\n— Astrocard AI summary —');
  console.log(answer);
}

// Compute TonightInputs from windowed Open‑Meteo + enriched day and print the line
async function testGoingOutTonight(place: { name: string; lat: number; lon: number }, day: WeatherForecastDay) {
  const { startISO, endISO } = computeNauticalToMidnightWindow(day, TZ);
  let H: any = {};
  try {
    const w = await fetchOpenMeteoWindow(place.lat, place.lon, startISO, endISO) as any;
    H = w?.hourly || {};
  } catch (_err) { void 0; }

  const toNums = (arr: any) => Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
  const avg = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
  const max = (arr: number[]) => arr.length ? Math.max(...arr) : null;

  // Peak gust time from hourly window
  const times: string[] = Array.isArray(H.time) ? H.time : [];
  const gusts = toNums(H.windgusts_10m);
  let gustPeakTimeISO: string | null = null;
  if (gusts.length && times.length === gusts.length) {
    const idx = gusts.indexOf(Math.max(...gusts));
    if (idx >= 0) gustPeakTimeISO = new Date(times[idx]).toISOString();
  }

  // From enriched day
  const pollenSeverity = (day as any).pollen?.severity as any;
  const airEuAqiMax = (day as any).air?.euAqiMax as number | undefined;

  // Marine snapshot/daily (optional)
  const waveMax = (day as any).marineDaily?.waveHeight?.max
    ?? (day as any).marine?.[0]?.waveHeight?.sg
    ?? (day as any).marine?.[0]?.waveHeight
    ?? null;
  const tides: Array<{ time: string; type: 'high'|'low' }> = Array.isArray((day as any).tides) ? (day as any).tides : [];
  const startMs = Date.parse(startISO); const endMs = Date.parse(endISO);
  const tideHit = tides.find(t => {
    const ms = Date.parse((t as any).time);
    return Number.isFinite(ms) && ms >= startMs && ms <= endMs && t.type === 'high';
  });

  const line = composeGoingOutTonight({
    tz: TZ,
    windowStartISO: startISO,
    windowEndISO: endISO,
    precipProbMax: max(toNums(H.precipitation_probability)),
    precipIntensityMaxMm: max(toNums(H.precipitation)),
    windGustMaxMps: max(gusts),
    windMeanMps: avg(toNums(H.windspeed_10m)),
    windPeakTimeISO: gustPeakTimeISO,
    tempEveC: avg(toNums(H.temperature_2m)),
    humidityMeanPct: avg(toNums(H.relative_humidity_2m)),
    airEuAqiMax,
    pollenSeverity,
    waveHeightMaxM: typeof waveMax === 'number' ? waveMax : null,
    tideWithinWindow: tideHit ? { type: tideHit.type, timeISO: (tideHit as any).time } : null
  }, 'short');

  console.log(`\n— Going out tonight (${place.name}) —`);
  console.log(line);
}

(async () => {
  try {
    console.log('[smoke-compare] start', new Date().toISOString(), 'TZ=' + TZ);

    const [madridDays, caraviaDays] = await Promise.all([
      enrich(MADRID),
      enrich(CARAVIA),
    ]);

    console.log('\n=== Madrid (inland) ===');
    (madridDays as any[]).forEach(d => console.log(brief(d)));

    console.log('\n=== Caravia, Asturias (coastal) ===');
    (caraviaDays as any[]).forEach(d => console.log(brief(d)));

    // Astrocard AI summary (Madrid)
    try {
      await testAstroSummary(MADRID, madridDays as any);
    } catch (e) {
      console.warn('[smoke-compare] astro summary skipped:', (e as any)?.message || e);
    }

    // Astrocard AI summary (Caravia) — only if marine present
    try {
      const hasMarine = (caraviaDays as any[]).some(d => (d as any).marine?.length || (d as any).marineDaily);
      if (hasMarine) {
        await testAstroSummary(CARAVIA, caraviaDays as any);
      }
    } catch (e) {
      console.warn('[smoke-compare] astro summary (Caravia) skipped:', (e as any)?.message || e);
    }

    // "Going out tonight" blurbs
    try {
      await testGoingOutTonight(MADRID, (madridDays as any)[0]);
    } catch (e) {
      console.warn('[smoke-compare] going-out (Madrid) skipped:', (e as any)?.message || e);
    }
    try {
      await testGoingOutTonight(CARAVIA, (caraviaDays as any)[0]);
    } catch (e) {
      console.warn('[smoke-compare] going-out (Caravia) skipped:', (e as any)?.message || e);
    }

    console.log('\nNotes: Madrid should show UV/pollen/AQ/soil/astronomy (no marine). Caravia should also include marine wave/SST alongside soil.');
    console.log('[smoke-compare] done', new Date().toISOString());
  } catch (err) {
    console.error('Smoke compare failed:', err);
    process.exitCode = 1;
  }
})();
