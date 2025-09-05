/**
 * WotNow – Weather/Metrics Merge Utilities
 * ---------------------------------------
 * Enriches a per-day forecast (`WeatherForecastDay`) with:
 *   • Stormglass: marine forecast, astronomy, elevation, biogeochem (chlorophyll etc.)
 *   • Open-Meteo: air quality + pollen, UV, soil temp/moisture, winter vars
 *
 * Why this matters to WotNow
 * • Marine: fishing/surf/sailing scoring & safety gates.
 * • Pollen & AQ: health-aware suggestions (running/cycling/kids’ play).
 * • UV: sun-safety chips and time-of-day nudges.
 * • Soil: gardening (sowing windows, soil ‘workability’) & trail ‘muddy/firm’ (0–54 cm temps; 0–27 cm moisture layers).
 * • Winter: ski/board suitability (snowfall, freezing level, snow depth).
 * • Astronomy: night hikes, astro, fishing by moon/tide windows.
 * • Elevation: trout/river gradient logic, temperature regime by altitude.
 * • Marine Bio: ‘where fish might be’ – chlorophyll fronts, dissolved oxygen, nutrients.
 *
 * Units & conventions (summary)
 * • Times are ISO strings; days are bucketed with `toDateKey()` (IANA TZ aware).
 * • Waves: metres (m). Period: seconds (s). Wind: knots (kt) in app (convert from m/s if needed).
 * • UV index: unitless 0–11+ (WHO scale).
 * • Pollen: Open-Meteo indices (unitless, model-dependent) → use as relative exposure.
 * • Air quality: pollutants in µg/m³; AQI is index (EU/US scales).
 * • Soil temp: °C. Soil moisture: m³/m³ (0–1).
 * • Snowfall: provider-specific; treat as hourly values → daily total (check metadata).
 * • Freezing level height: metres (m). Snow depth: metres (m). Elevation: metres ASL.
 * • Marine biogeochem: chlorophyll mg/m³; dissolved oxygen mg/L; nutrients mmol/m³ (≈ µmol/L);
 *   salinity PSU. Some responses are per-source; we pre-average per-source first.
 *
 * Aggregation policy (daily)
 * • UV: mean of daylight hours; `uvIndexMax` = daily max.
 * • Pollen: daily max (exposure-risk oriented).
 * • AQ: pollutant daily means; AQI daily max (worst hour).
 * • Soil: daily means for temp & shallow moisture.
 * • Winter: snowfall daily total; freezing level & snow depth daily means.
 * • Marine Bio: daily means; per-source values averaged before day aggregation.
 */


/*
 * Example usage (do not execute at module scope):
 * When fetching land forecast, also fetch marine forecast for relevant locations/times.
 *
 * const marineData = await fetchMarineWithCache(lat, lon, startTime, endTime);
 * setForecastByDay(forecast.map(f => ({
 *   ...f,
 *   marine: marineData.hours?.filter(h => h.time.startsWith(f.date)) || []
 * })));
 */

import { fetchMarineWithCache } from '../utils/fetchStormglass';

// Lightweight types to avoid importing app-wide types.
// Extend in your codebase if you already have richer interfaces.
export type MarineHour = {
  time: string; // ISO timestamp from Stormglass
  [key: string]: any;
};

export type WeatherForecastDay = {
  date: string; // YYYY-MM-DD (local app date key)
  marine?: MarineHour[];
  // Open-Meteo daily summaries (computed from hourly)
  uvIndex?: number;         // representative daytime UV (e.g., midday average)
  uvIndexMax?: number;      // max UV that day
  pollen?: PollenSummary;   // grass/tree/weed max values for the day
  air?: AQSummary;        // daily pollutant means + max AQI
  soil?: SoilSummary;       // surface soil metrics
  winter?: WinterSummary;   // snowfall totals, freezing level, snow depth
  astronomy?: AstronomySummary;  // sunrise/sunset, moonrise/moonset, moon phase
  /** Count of hourly samples flagged as day/night by Open-Meteo (useful for ISS/astro). */
  daylightHours?: number;
  nightHours?: number;
  elevationM?: number;
  marineBio?: MarineBioSummary; // daily averages of chlorophyll, DO, nutrients, salinity, seaSurfaceTemperature
  bioNote?: string;
  // ...other properties you already have on a day
};

// ===== Open-Meteo integrations =====
export type OMHourly = {
  time: string; // Open-Meteo returns local time if timezone=auto
  [key: string]: number | string | null | undefined;
};

export type PollenSummary = { grass?: number; tree?: number; weed?: number };
export type AQSummary = {
  pm2_5Avg?: number; pm10Avg?: number; o3Avg?: number; no2Avg?: number; so2Avg?: number; coAvg?: number;
  euAqiMax?: number; usAqiMax?: number;
};
export type SoilSummary = {
  temp0cm?: number;
  temp6cm?: number;
  temp18cm?: number;
  temp54cm?: number;
  moisture0to1?: number;
  moisture1to3?: number;
  moisture3to9?: number;
  moisture9to27?: number;
};
export type WinterSummary = { snowfallTotal?: number; freezingLevelAvg?: number; snowDepthAvg?: number };

export type AstronomySummary = {
  sunrise?: string;  // ISO
  sunset?: string;   // ISO
  moonrise?: string; // ISO
  moonset?: string;  // ISO
  moonPhase?: string; // e.g., new, firstQuarter, full, lastQuarter
};

// Stormglass marine bio/biogeochemical daily summary
export type MarineBioSummary = {
  chlorophyllAvg?: number;      // mg/m^3
  dissolvedOxygenAvg?: number;  // mg/L
  nitrateAvg?: number;          // mmol/m^3 or µmol/L (display with unit hint)
  phosphateAvg?: number;        // mmol/m^3 or µmol/L
  salinityAvg?: number;         // PSU
  /** SST is sourced from Stormglass *weather* (`waterTemperature`), not the Bio endpoint. */
  seaSurfaceTemperatureAvg?: number;              // °C (populated from marine/weather elsewhere)
};
/**
 * Fetch Stormglass Bio (biogeochemical) variables for a window.
 * Docs: https://docs.stormglass.io/#/bio
 * `params` is a comma-separated list like: 'chlorophyll,oxygen,nitrate,phosphate,salinity'
 */
async function fetchStormglassBio(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  params: string
) {
  const key = (process as any)?.env?.STORMGLASS_API_KEY;
  if (!key) throw new Error('Missing STORMGLASS_API_KEY in environment');
  const url = new URL('https://api.stormglass.io/v2/bio/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('params', params);
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);
  const res = await fetch(url.toString(), { headers: { Authorization: key } });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Stormglass bio ${res.status} ${res.statusText}: ${text.slice(0,400)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Stormglass bio invalid JSON: ${text.slice(0,200)}`);
  }
}

/**
 * Fetch **Stormglass Bio – Soil** variables for a window (used as fallback only).
 * Variables & layers:
 *  - soilTemperature (0–10 cm)   → maps to SoilSummary.temp0cm
 *  - soilMoisture (0–10 cm)      → maps to SoilSummary.moisture0to1 (approximate)
 * NOTE: SG also provides deeper layers (10–40, 40–100, 100–200 cm) but we only
 * use shallow layers as a non-clobbering fallback when Open‑Meteo is missing.
 */
async function fetchStormglassBioSoil(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string
) {
  // Re-use the generic bio fetcher with a reduced param set
  const params = [
    'soilTemperature', // 0–10 cm
    'soilMoisture'     // 0–10 cm
  ].join(',');
  return fetchStormglassBio(lat, lon, startISO, endISO, params);
}

/** Aggregate SG Bio soil hours → daily shallow-layer means, bucketed by local date. */
function aggregateSGBioSoilByDate(data: any, timeZone?: string): Record<string, Partial<SoilSummary>> {
  const rows = Array.isArray(data?.hours) ? data.hours : [];
  const buckets: Record<string, { t0?: number[]; m01?: number[] }> = {};
  const asNum = (val: any): number | undefined => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object') {
      if (typeof val.sg === 'number') return val.sg;
      const nums = Object.values(val).filter(v => typeof v === 'number') as number[];
      if (nums.length) return nums.reduce((a,b)=>a+b,0)/nums.length;
    }
    return undefined;
  };

  for (const h of rows) {
    const key = toDateKey(String(h.time), timeZone);
    const b = (buckets[key] ||= {});
    const t0 = asNum(h.soilTemperature);
    const m01 = asNum(h.soilMoisture);
    if (Number.isFinite(t0 as number)) (b.t0 = b.t0 || []).push(Number(t0));
    if (Number.isFinite(m01 as number)) (b.m01 = b.m01 || []).push(Number(m01));
  }

  const byDate: Record<string, Partial<SoilSummary>> = {};
  for (const [key, b] of Object.entries(buckets)) {
    byDate[key] = {
      temp0cm: b.t0?.length ? avg(b.t0) : undefined,
      moisture0to1: b.m01?.length ? avg(b.m01) : undefined,
    };
  }
  return byDate;
}

function dateRangeFromForecast(days: WeatherForecastDay[]) {
  const dates = days.map(d => d.date).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];
  return { start, end };
}

function avg(nums: number[]): number | undefined {
  const arr = nums.filter(n => Number.isFinite(n));
  if (!arr.length) return undefined;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(nums: number[]): number | undefined {
  const arr = nums.filter(n => Number.isFinite(n));
  if (!arr.length) return undefined;
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * Convert an ISO timestamp to a YYYY-MM-DD key, respecting a provided IANA time zone.
 * Defaults to UTC if no timeZone is passed.
 */
function toDateKey(iso: string, timeZone?: string): string {
  try {
    if (!timeZone) {
      return iso.slice(0, 10); // quick path when you key days by UTC
    }
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(d)
      .reduce<Record<string, string>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
      }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    // Fallback: keep original behaviour
    return iso.slice(0, 10);
  }
}

/**
 * Fetch Stormglass Astronomy for a date window. Requires STORMGLASS_API_KEY in env.
 * Docs: https://docs.stormglass.io/#/astronomy
 */
async function fetchStormglassAstronomy(lat: number, lon: number, startDate: string, endDate: string) {
  const key = (process as any)?.env?.STORMGLASS_API_KEY;
  if (!key) {
    throw new Error('Missing STORMGLASS_API_KEY in environment');
  }
  const url = new URL('https://api.stormglass.io/v2/astronomy/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('start', `${startDate}T00:00:00Z`);
  url.searchParams.set('end', `${endDate}T23:59:59Z`);

  const res = await fetch(url.toString(), {
    headers: { Authorization: key },
  });
  if (!res.ok) throw new Error(`Stormglass astronomy ${res.status}`);
  return res.json();
}

/**
 * Fetch Open-Meteo Air Quality & Pollen (hourly) for the forecast window.
 * IMPORTANT:
 *   - Pollen indices are served by the pollen API:      https://pollen-api.open-meteo.com/v1/forecast
 *   - Pollutants & AQI are served by the air-quality API: https://air-quality-api.open-meteo.com/v1/air-quality
 * We call both and merge their hourly timelines. If one fails, we return the other.
 */
async function fetchOpenMeteoAirPollen(lat: number, lon: number, startDate: string, endDate: string) {
  const buildUrl = (base: string, hourly: string[]) => {
    const u = new URL(base);
    u.searchParams.set('latitude', String(lat));
    u.searchParams.set('longitude', String(lon));
    u.searchParams.set('start_date', startDate); // YYYY-MM-DD
    u.searchParams.set('end_date', endDate);     // YYYY-MM-DD
    u.searchParams.set('timezone', 'auto');
    u.searchParams.set('hourly', hourly.join(','));
    return u;
  };

  const pollenUrl = buildUrl('https://pollen-api.open-meteo.com/v1/forecast', [
    'alder_pollen','birch_pollen','grass_pollen','ragweed_pollen'
  ]);

  const aqUrl = buildUrl('https://air-quality-api.open-meteo.com/v1/air-quality', [
    'pm2_5','pm10','o3','no2','so2','co','european_aqi','us_aqi'
  ]);

  const fetchJson = async (u: URL) => {
    const resp = await fetch(u.toString());
    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`Open-Meteo ${u.hostname} ${resp.status} ${resp.statusText}: ${text.slice(0,200)}`);
    }
    try { return JSON.parse(text); }
    catch { throw new Error(`Open-Meteo ${u.hostname} invalid JSON: ${text.slice(0,120)}`); }
  };

  const [pollenRes, aqRes] = await Promise.allSettled([fetchJson(pollenUrl), fetchJson(aqUrl)]);

  const pollen = pollenRes.status === 'fulfilled' ? pollenRes.value : null;
  const aq = aqRes.status === 'fulfilled' ? aqRes.value : null;

  if (!pollen && !aq) {
    // Bubble up one of the errors to the caller
    throw (pollenRes.status === 'rejected' ? pollenRes.reason : aqRes as any);
  }

  // Build merged hourly record, preferring the pollen time vector if present
  const time: string[] = pollen?.hourly?.time || aq?.hourly?.time || [];
  const hourly: Record<string, any> = { time };

  const copy = (src: any, keys: string[]) => {
    if (!src?.hourly) return;
    for (const k of keys) {
      const arr = src.hourly[k];
      if (Array.isArray(arr)) hourly[k] = arr;
    }
  };

  copy(pollen, ['alder_pollen','birch_pollen','grass_pollen','ragweed_pollen']);
  copy(aq, ['pm2_5','pm10','o3','no2','so2','co','european_aqi','us_aqi']);

  return { hourly };
}

/**
 * Fetch Open-Meteo Forecast (hourly) for UV and soil variables, plus winter variables if desired.
 */
async function fetchOpenMeteoUVSoilWinter(lat: number, lon: number, startDate: string, endDate: string) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('hourly', [
    'uv_index',
    'uv_index_clear_sky',
    'is_day',
    // Soil temperatures (Open-Meteo supports multiple depths)
    'soil_temperature_0cm',
    'soil_temperature_6cm',
    'soil_temperature_18cm',
    'soil_temperature_54cm',
    // Soil moisture layers
    'soil_moisture_0_to_1cm',
    'soil_moisture_1_to_3cm',
    'soil_moisture_3_to_9cm',
    'soil_moisture_9_to_27cm',
    // Winter activity helpers:
    'snowfall',              // unit per hour as provided by Open-Meteo
    'freezing_level_height', // metres
    'snow_depth'             // metres
  ].join(','));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo forecast ${res.status}`);
  return res.json();
}

interface AttachMarineOpts {
  /** Land (home) lat/lon used for general weather. */
  lat: number;
  lon: number;
  /** Optional coastal coordinates. If provided, these are used for marine queries. */
  marineLat?: number;
  marineLon?: number;
  /** ISO range for the marine request (inclusive/exclusive as expected by your fetcher). */
  startTimeISO: string;
  endTimeISO: string;
  /** Your app's local time zone (e.g. 'Europe/Madrid'). Optional; falls back to UTC mapping. */
  timeZone?: string;
}

/**
 * Fetches Stormglass marine hours (using coastal coords if given) and returns a
 * new forecast array with a `marine` field per day. Pure function: it does not
 * mutate the input and does not touch React state.
 */
export async function attachMarineToForecast(
  forecast: WeatherForecastDay[],
  opts: AttachMarineOpts
): Promise<WeatherForecastDay[]> {
  const { lat, lon, marineLat, marineLon, startTimeISO, endTimeISO, timeZone } = opts;

  const queryLat = typeof marineLat === 'number' ? marineLat : lat;
  const queryLon = typeof marineLon === 'number' ? marineLon : lon;

  let hours: MarineHour[] = [];
  try {
    const marineData = await fetchMarineWithCache(queryLat, queryLon, startTimeISO, endTimeISO);
    hours = Array.isArray(marineData?.hours) ? (marineData.hours as MarineHour[]) : [];
  } catch (err) {
    // Keep things resilient—log and continue with empty marine arrays.
    console.error('[attachMarineToForecast] Failed to fetch marine data', err);
    hours = [];
  }

  // Bucket marine hours by local day key so we can attach to each forecast day.
  const byDate: Record<string, MarineHour[]> = {};
  // Also accumulate water temperature per day to synthesise SST daily averages.
  const sstNums: Record<string, number[]> = {};

  for (const h of hours) {
    const key = toDateKey(h.time, timeZone);
    (byDate[key] ||= []).push(h);

    // Stormglass marine `waterTemperature` may be nested or raw.
    const rawWT = (h as any).waterTemperature;
    let wt: number | undefined;
    if (typeof rawWT === 'number') wt = rawWT;
    else if (rawWT && typeof rawWT === 'object') {
      if (typeof rawWT.sg === 'number') wt = rawWT.sg;
      else {
        const vals = Object.values(rawWT).filter(v => typeof v === 'number') as number[];
        if (vals.length) wt = vals.reduce((a,b)=>a+b,0) / vals.length;
      }
    }
    if (Number.isFinite(wt)) (sstNums[key] ||= []).push(Number(wt));
  }

  // Return a new array with `marine` attached per day and `seaSurfaceTemperatureAvg` merged into `marineBio` when present.
  return forecast.map((f) => {
    const marine = byDate[f.date] || [];
    const sstArr = sstNums[f.date] || [];
    const sstAvg = sstArr.length ? avg(sstArr) : undefined;

    // Merge SST into marineBio without clobbering other bio fields.
    let marineBio = f.marineBio;
    if (sstAvg !== undefined) {
      marineBio = { ...(marineBio || {}), seaSurfaceTemperatureAvg: sstAvg } as MarineBioSummary;
    }

    return {
      ...f,
      marine,
      ...(marineBio ? { marineBio } : {}),
    };
  });
}

/**
 * Convenience helper if you prefer to update state in one call.
 * Pass your React setState to apply the merged result.
 */
export async function attachMarineAndSet(
  forecast: WeatherForecastDay[],
  opts: AttachMarineOpts,
  setForecastByDay: (days: WeatherForecastDay[]) => void
): Promise<void> {
  const merged = await attachMarineToForecast(forecast, opts);
  setForecastByDay(merged);
}

interface AttachOpenMeteoOpts {
  lat: number;
  lon: number;
  timeZone?: string; // used only for defensive date bucketing via toDateKey
}

export async function attachOpenMeteoToForecast(
  forecast: WeatherForecastDay[],
  opts: AttachOpenMeteoOpts
): Promise<WeatherForecastDay[]> {
  if (!forecast?.length) return forecast;
  const { lat, lon, timeZone } = opts;
  const { start, end } = dateRangeFromForecast(forecast);

  let airPollen: any | null = null;
  let uvSoilWin: any | null = null;

  try {
    [airPollen, uvSoilWin] = await Promise.all([
      fetchOpenMeteoAirPollen(lat, lon, start, end),
      fetchOpenMeteoUVSoilWinter(lat, lon, start, end),
    ]);
  } catch (e) {
    console.error('[attachOpenMeteoToForecast] fetch failed', e);
  }

  const byDate: Record<string, Partial<WeatherForecastDay>> = {};

  // --- Pollen & Air Quality (hourly → day aggregates) ---
  try {
    const hours = (airPollen?.hourly?.time || []).map((t: string, i: number) => ({
      time: t,
      alder: airPollen.hourly.alder_pollen?.[i],
      birch: airPollen.hourly.birch_pollen?.[i],
      grass: airPollen.hourly.grass_pollen?.[i],
      ragweed: airPollen.hourly.ragweed_pollen?.[i],
      pm25: airPollen.hourly.pm2_5?.[i],
      pm10: airPollen.hourly.pm10?.[i],
      o3: airPollen.hourly.o3?.[i],
      no2: airPollen.hourly.no2?.[i],
      so2: airPollen.hourly.so2?.[i],
      co: airPollen.hourly.co?.[i],
      euAqi: airPollen.hourly.european_aqi?.[i],
      usAqi: airPollen.hourly.us_aqi?.[i],
    }));
    for (const h of hours) {
      const key = toDateKey(h.time, timeZone);
      const day = (byDate[key] ||= {} as Partial<WeatherForecastDay>);

      // --- Pollen daily maxima ---
      const pol = (day.pollen ||= {} as PollenSummary);
      pol.grass = Math.max(pol.grass ?? -Infinity, Number(h.grass ?? -Infinity));
      const treeNow = Math.max(Number(h.alder ?? -Infinity), Number(h.birch ?? -Infinity));
      pol.tree = Math.max(pol.tree ?? -Infinity, treeNow);
      pol.weed = Math.max(pol.weed ?? -Infinity, Number(h.ragweed ?? -Infinity));

      // --- Air quality: store arrays to average later; AQI keep daily max ---
      const air = (day.air ||= {} as any);
      if (h.pm25 != null && !Number.isNaN(Number(h.pm25))) air._pm25 = [ ...(air._pm25 || []), Number(h.pm25) ];
      if (h.pm10 != null && !Number.isNaN(Number(h.pm10))) air._pm10 = [ ...(air._pm10 || []), Number(h.pm10) ];
      if (h.o3   != null && !Number.isNaN(Number(h.o3)))   air._o3   = [ ...(air._o3   || []), Number(h.o3)   ];
      if (h.no2  != null && !Number.isNaN(Number(h.no2)))  air._no2  = [ ...(air._no2  || []), Number(h.no2)  ];
      if (h.so2  != null && !Number.isNaN(Number(h.so2)))  air._so2  = [ ...(air._so2  || []), Number(h.so2)  ];
      if (h.co   != null && !Number.isNaN(Number(h.co)))   air._co   = [ ...(air._co   || []), Number(h.co)   ];
      if (h.euAqi!= null && !Number.isNaN(Number(h.euAqi))) air.euAqiMax = Math.max(air.euAqiMax ?? -Infinity, Number(h.euAqi));
      if (h.usAqi!= null && !Number.isNaN(Number(h.usAqi))) air.usAqiMax = Math.max(air.usAqiMax ?? -Infinity, Number(h.usAqi));
    }
  } catch (e) {
    // Non-fatal
  }

  // --- UV, soil, and winter vars (hourly → daily summaries) ---
  try {
    const H = uvSoilWin?.hourly || {};
    const times: string[] = H.time || [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const key = toDateKey(t, timeZone);
      const day = (byDate[key] ||= {});

      const uv = Number(H.uv_index?.[i]);

      // --- Day/night hour count accumulation ---
      const isDayVal = Number(H.is_day?.[i]);
      if (!Number.isNaN(isDayVal)) {
        if ((isDayVal | 0) === 1) {
          (day as any)._dayCount = ((day as any)._dayCount || 0) + 1;
        } else if ((isDayVal | 0) === 0) {
          (day as any)._nightCount = ((day as any)._nightCount || 0) + 1;
        }
      }

      // Soil temperatures
      const st0  = Number(H.soil_temperature_0cm?.[i]);
      const st6  = Number(H.soil_temperature_6cm?.[i]);
      const st18 = Number(H.soil_temperature_18cm?.[i]);
      const st54 = Number(H.soil_temperature_54cm?.[i]);

      // Soil moistures
      const sm01 = Number(H.soil_moisture_0_to_1cm?.[i]);
      const sm13 = Number(H.soil_moisture_1_to_3cm?.[i]);
      const sm39 = Number(H.soil_moisture_3_to_9cm?.[i]);
      const sm927 = Number(H.soil_moisture_9_to_27cm?.[i]);

      // Winter helpers
      const snowfall = Number(H.snowfall?.[i]);
      const frzLvl = Number(H.freezing_level_height?.[i]);
      const snowDepth = Number(H.snow_depth?.[i]);

      // UV: we'll keep max and also compute an average later when finalising
      if (!Number.isNaN(uv)) {
        day.uvIndexMax = Math.max(day.uvIndexMax ?? -Infinity, uv);
        // store rolling average basis via temporary array
        (day as any)._uvArr = [ ...(day as any)._uvArr || [], uv ];
      }

      // Soil summary: running averages
      const soil = (day.soil ||= {} as SoilSummary);
      if (!Number.isNaN(st0))  (soil as any)._t0  = [ ...(soil as any)._t0  || [], st0  ];
      if (!Number.isNaN(st6))  (soil as any)._t6  = [ ...(soil as any)._t6  || [], st6  ];
      if (!Number.isNaN(st18)) (soil as any)._t18 = [ ...(soil as any)._t18 || [], st18 ];
      if (!Number.isNaN(st54)) (soil as any)._t54 = [ ...(soil as any)._t54 || [], st54 ];
      if (!Number.isNaN(sm01)) (soil as any)._m01 = [ ...(soil as any)._m01 || [], sm01 ];
      if (!Number.isNaN(sm13)) (soil as any)._m13 = [ ...(soil as any)._m13 || [], sm13 ];
      if (!Number.isNaN(sm39)) (soil as any)._m39 = [ ...(soil as any)._m39 || [], sm39 ];
      if (!Number.isNaN(sm927)) (soil as any)._m927 = [ ...(soil as any)._m927 || [], sm927 ];

      // Winter summary
      const win = (day.winter ||= {} as WinterSummary);
      if (!Number.isNaN(snowfall)) (win as any)._sf = [ ...(win as any)._sf || [], snowfall ];
      if (!Number.isNaN(frzLvl)) (win as any)._fl = [ ...(win as any)._fl || [], frzLvl ];
      if (!Number.isNaN(snowDepth)) (win as any)._sd = [ ...(win as any)._sd || [], snowDepth ];
    }
  } catch (e) {
    // Non-fatal
  }

  // Finalise per-day aggregates
  const result = forecast.map(day => {
    const extra = byDate[day.date] || {};

    // Compute UV representative value (midday-ish average if available)
    if ((extra as any)._uvArr) {
      const arr = (extra as any)._uvArr as number[];
      extra.uvIndex = avg(arr);
      delete (extra as any)._uvArr;
    }

    // Daylight/night hour counts from Open-Meteo is_day
    if ((extra as any)._dayCount != null || (extra as any)._nightCount != null) {
      const dc = (extra as any)._dayCount; const nc = (extra as any)._nightCount;
      (extra as any).daylightHours = typeof dc === 'number' ? dc : undefined;
      (extra as any).nightHours    = typeof nc === 'number' ? nc : undefined;
      delete (extra as any)._dayCount;
      delete (extra as any)._nightCount;
    }

    // Soil averages
    if (extra.soil) {
      const s: any = extra.soil;
      if (s._t0)  { extra.soil.temp0cm   = avg(s._t0);  delete s._t0; }
      if (s._t6)  { extra.soil.temp6cm   = avg(s._t6);  delete s._t6; }
      if (s._t18) { extra.soil.temp18cm  = avg(s._t18); delete s._t18; }
      if (s._t54) { extra.soil.temp54cm  = avg(s._t54); delete s._t54; }
      if (s._m01) { extra.soil.moisture0to1  = avg(s._m01); delete s._m01; }
      if (s._m13) { extra.soil.moisture1to3  = avg(s._m13); delete s._m13; }
      if (s._m39) { extra.soil.moisture3to9  = avg(s._m39); delete s._m39; }
      if (s._m927){ extra.soil.moisture9to27 = avg(s._m927); delete s._m927; }
    }

    // Winter totals/averages
    if (extra.winter) {
      const w: any = extra.winter;
      if (w._sf) { extra.winter.snowfallTotal = sum(w._sf); delete w._sf; }
      if (w._fl) { extra.winter.freezingLevelAvg = avg(w._fl); delete w._fl; }
      if (w._sd) { extra.winter.snowDepthAvg = avg(w._sd); delete w._sd; }
    }

    // Pollen: replace -Infinity placeholders with undefined
    if (extra.pollen) {
      if (extra.pollen.grass === -Infinity) extra.pollen.grass = undefined;
      if (extra.pollen.tree === -Infinity) extra.pollen.tree = undefined;
      if (extra.pollen.weed === -Infinity) extra.pollen.weed = undefined;
    }

    // Air quality: compute daily means and keep max AQI
    if ((extra as any).air) {
      const a: any = (extra as any).air;
      const out: any = {};
      if (a._pm25) { out.pm2_5Avg = avg(a._pm25); }
      if (a._pm10) { out.pm10Avg  = avg(a._pm10); }
      if (a._o3)   { out.o3Avg    = avg(a._o3); }
      if (a._no2)  { out.no2Avg   = avg(a._no2); }
      if (a._so2)  { out.so2Avg   = avg(a._so2); }
      if (a._co)   { out.coAvg    = avg(a._co); }
      if (Number.isFinite(a.euAqiMax)) out.euAqiMax = a.euAqiMax;
      if (Number.isFinite(a.usAqiMax)) out.usAqiMax = a.usAqiMax;
      (extra as any).air = out as AQSummary;
    }

    return { ...day, ...extra } as WeatherForecastDay;
  });

  // ---- Fallback: Stormglass Bio (shallow soil) when Open‑Meteo soil is missing/failed ----
  try {
    const needFallback = result.some(d => !d.soil || (d.soil.temp0cm == null && d.soil.moisture0to1 == null));
    if (needFallback) {
      const { start, end } = dateRangeFromForecast(result);
      const startISO = `${start}T00:00:00Z`;
      const endISO = `${end}T23:59:59Z`;
      const sgSoil = await fetchStormglassBioSoil(lat, lon, startISO, endISO);
      const byDateSg = aggregateSGBioSoilByDate(sgSoil, timeZone);

      // Merge **without clobbering** any existing values populated from Open‑Meteo
      for (let i = 0; i < result.length; i++) {
        const day = result[i];
        const patch = byDateSg[day.date];
        if (!patch) continue;
        const soil = (day.soil ||= {});
        if (soil.temp0cm == null && patch.temp0cm != null) soil.temp0cm = patch.temp0cm;
        if (soil.moisture0to1 == null && patch.moisture0to1 != null) soil.moisture0to1 = patch.moisture0to1;
      }
    }
  } catch (e) {
    // Fallback is best-effort; never fail the merge because of it.
    console.warn('[attachOpenMeteoToForecast] SG Bio soil fallback failed', e);
  }

  return result;
}

/**
 * Convenience wrapper to set state, mirroring the marine helper.
 */
export async function attachOpenMeteoAndSet(
  forecast: WeatherForecastDay[],
  opts: AttachOpenMeteoOpts,
  setForecastByDay: (days: WeatherForecastDay[]) => void
): Promise<void> {
  const merged = await attachOpenMeteoToForecast(forecast, opts);
  setForecastByDay(merged);
}

interface AttachAstronomyOpts {
  lat: number;
  lon: number;
  timeZone?: string;
}

export async function attachAstronomyToForecast(
  forecast: WeatherForecastDay[],
  opts: AttachAstronomyOpts
): Promise<WeatherForecastDay[]> {
  if (!forecast?.length) return forecast;
  const { lat, lon, timeZone } = opts;
  const { start, end } = dateRangeFromForecast(forecast);

  let astro: any | null = null;
  try {
    astro = await fetchStormglassAstronomy(lat, lon, start, end);
  } catch (e) {
    console.error('[attachAstronomyToForecast] fetch failed', e);
    return forecast; // non-fatal
  }

  const byDate: Record<string, AstronomySummary> = {};
  const rows = Array.isArray(astro?.data) ? astro.data : [];
  for (const r of rows) {
    const t = r.time || r.date || r.datetime;
    if (!t) continue;
    const key = toDateKey(String(t), timeZone);
    const entry: AstronomySummary = {
      sunrise: r.sunrise || r.sun?.rise,
      sunset: r.sunset || r.sun?.set,
      moonrise: r.moonrise || r.moon?.rise,
      moonset: r.moonset || r.moon?.set,
      moonPhase: r.moonPhase || r.moon_phase || r.moon?.phase,
    };
    byDate[key] = { ...(byDate[key] || {}), ...entry };
  }

  return forecast.map(d => ({
    ...d,
    astronomy: byDate[d.date] ? { ...byDate[d.date] } : d.astronomy,
  }));
}

export async function attachAstronomyAndSet(
  forecast: WeatherForecastDay[],
  opts: AttachAstronomyOpts,
  setForecastByDay: (days: WeatherForecastDay[]) => void
): Promise<void> {
  const merged = await attachAstronomyToForecast(forecast, opts);
  setForecastByDay(merged);
}
// ---- Marine Bio (biogeochemical) attachment ----
interface AttachBioOpts {
  lat: number;
  lon: number;
  timeZone?: string;
  // You can override which variables to request; defaults are good for fishing/ecology.
  vars?: string[]; // e.g., ['chlorophyll','oxygen','nitrate','phosphate','salinity']
}

export async function attachMarineBioToForecast(
  forecast: WeatherForecastDay[],
  opts: AttachBioOpts
): Promise<WeatherForecastDay[]> {
  if (!forecast?.length) return forecast;
  const { lat, lon, timeZone } = opts;
  const vars = (opts.vars && opts.vars.length)
    ? opts.vars
    : ['chlorophyll','oxygen','nitrate','phosphate','salinity'];

  // Build an ISO window covering the forecast (use full-day bounds in UTC for safety)
  const { start, end } = dateRangeFromForecast(forecast);
  const startISO = `${start}T00:00:00Z`;
  const endISO = `${end}T23:59:59Z`;

  let data: any | null = null;
  try {
    data = await fetchStormglassBio(lat, lon, startISO, endISO, vars.join(','));
  } catch (e) {
    console.error('[attachMarineBioToForecast] fetch failed', e);
    return forecast;
  }

  // If bio is empty (often happens right at the coastline), nudge ~1 km offshore and retry once.
  let retriedOffshore = false;
  if (!data?.hours || data.hours.length === 0) {
    const lat2 = lat + 0.01; // north coast: move slightly north (~1 km)
    try {
      const data2 = await fetchStormglassBio(lat2, lon, startISO, endISO, vars.join(','));
      if (data2?.hours?.length) {
        data = data2;
        retriedOffshore = true;
      }
    } catch { /* ignore retry failure; keep empty */ }
  }

  const rows = Array.isArray(data?.hours) ? data.hours : [];
  const byDate: Record<string, any> = {};
  for (const h of rows) {
    const key = toDateKey(String(h.time), timeZone);
    const bucket = (byDate[key] ||= { _chl: [], _do: [], _no3: [], _po4: [], _sal: [] });
    // Each variable may be nested per model source; Stormglass usually returns the numeric at top level or per source key.
    const v = (name: string) => {
      const val = h?.[name] as any;
      if (typeof val === 'number') return val;
      if (val && typeof val === 'object') {
        // Prefer synthesised sg where present
        if (typeof val.sg === 'number') return val.sg;
        const nums = Object.values(val).filter(x => typeof x === 'number') as number[];
        if (nums.length) return nums.reduce((a,b)=>a+b,0)/nums.length;
      }
      return undefined;
    };
    const chl = v('chlorophyll'); if (Number.isFinite(chl)) bucket._chl.push(Number(chl));
    const dio = v('oxygen') ?? v('dissolvedOxygen'); if (Number.isFinite(dio)) bucket._do.push(Number(dio));
    const no3 = v('nitrate'); if (Number.isFinite(no3)) bucket._no3.push(Number(no3));
    const po4 = v('phosphate'); if (Number.isFinite(po4)) bucket._po4.push(Number(po4));
    const sal = v('salinity'); if (Number.isFinite(sal)) bucket._sal.push(Number(sal));
    // No seaSurfaceTemperature from bio endpoint.
  }

  return forecast.map(day => {
    const b = byDate[day.date];

    // If we retried offshore but still have no bio rows for this day,
    // keep existing values untouched but surface the note for diagnostics.
    if (!b) {
      return retriedOffshore ? { ...day, bioNote: 'bio retried offshore (+0.01° lat)' } : day;
    }

    // Compute daily averages from buckets
    const computedBio: MarineBioSummary = {
      chlorophyllAvg: b._chl.length ? avg(b._chl) : undefined,
      dissolvedOxygenAvg: b._do.length ? avg(b._do) : undefined,
      nitrateAvg: b._no3.length ? avg(b._no3) : undefined,
      phosphateAvg: b._po4.length ? avg(b._po4) : undefined,
      salinityAvg: b._sal.length ? avg(b._sal) : undefined,
      // NOTE: No SST here; it is populated from Stormglass weather (waterTemperature) in attachMarineToForecast.
    };

    // Merge with any pre-existing marineBio so we don't lose SST or other values.
    const mergedBio: MarineBioSummary = { ...(day.marineBio || {}), ...computedBio };

    const withBio = { ...day, marineBio: mergedBio } as WeatherForecastDay;
    return retriedOffshore ? { ...withBio, bioNote: 'bio retried offshore (+0.01° lat)' } : withBio;
  });
}

export async function attachMarineBioAndSet(
  forecast: WeatherForecastDay[],
  opts: AttachBioOpts,
  setForecastByDay: (days: WeatherForecastDay[]) => void
): Promise<void> {
  const merged = await attachMarineBioToForecast(forecast, opts);
  setForecastByDay(merged);
}
