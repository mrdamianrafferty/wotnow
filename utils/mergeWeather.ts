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
 * • Soil: gardening (sowing windows, soil ‘workability’) & trail ‘muddy/firm’.
 * • Winter: ski/board suitability (snowfall, freezing level, snow depth).
 * • Astronomy: night hikes, astro, fishing by moon/tide windows.
 * • Elevation: trout/river gradient logic, temperature regime by altitude.
 * • Marine Bio: ‘where fish might be’ – chlorophyll fronts + SST, DO comfort.
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
 *   salinity PSU; SST °C. Some responses are per-source; we pre-average per-source first.
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
  [key: string]: unknown;
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
  elevationM?: number;
  marineBio?: MarineBioSummary; // daily averages of chlorophyll, DO, nutrients, salinity, SST
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
export type SoilSummary = { temp0cm?: number; moisture0to1?: number; moisture1to3?: number };
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
  sstAvg?: number;              // °C (some bio models expose sst)
};

// ---- Provider response types (minimal, focused on used fields) ----
interface StormglassAstronomyRow {
  time?: string;
  date?: string;
  datetime?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  moonPhase?: string;
  sun?: { rise?: string; set?: string };
  moon?: { rise?: string; set?: string; phase?: string };
}
interface StormglassAstronomyResponse { data?: StormglassAstronomyRow[] }

interface OpenMeteoAirHourly {
  time?: string[];
  alder_pollen?: Array<number | null>;
  birch_pollen?: Array<number | null>;
  grass_pollen?: Array<number | null>;
  ragweed_pollen?: Array<number | null>;
  pm2_5?: Array<number | null>;
  pm10?: Array<number | null>;
  o3?: Array<number | null>;
  no2?: Array<number | null>;
  so2?: Array<number | null>;
  co?: Array<number | null>;
  european_aqi?: Array<number | null>;
  us_aqi?: Array<number | null>;
}
interface OpenMeteoAirResponse { hourly?: OpenMeteoAirHourly }

interface OpenMeteoForecastHourly {
  time?: string[];
  uv_index?: Array<number | null>;
  uv_index_clear_sky?: Array<number | null>;
  soil_temperature_0cm?: Array<number | null>;
  soil_moisture_0_to_1cm?: Array<number | null>;
  soil_moisture_1_to_3cm?: Array<number | null>;
  snowfall?: Array<number | null>;
  freezing_level_height?: Array<number | null>;
  snow_depth?: Array<number | null>;
}
interface OpenMeteoForecastResponse { hourly?: OpenMeteoForecastHourly }

interface StormglassBioHour {
  time?: string;
  [k: string]: number | string | Record<string, number> | undefined;
}
interface StormglassBioResponse { hours?: StormglassBioHour[] }

/**
 * Fetch Stormglass Bio (biogeochemical) variables for a window.
 * Docs: https://docs.stormglass.io/#/bio
 * `params` is a comma-separated list like: 'chlorophyll,dissolvedOxygen,nitrate,phosphate,salinity,sst'
 */
async function fetchStormglassBio(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  params: string
) {
  const key = process.env?.STORMGLASS_API_KEY;
  if (!key) throw new Error('Missing STORMGLASS_API_KEY in environment');
  const url = new URL('https://api.stormglass.io/v2/bio/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('params', params);
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);
  const res = await fetch(url.toString(), { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Stormglass bio ${res.status}`);
  return res.json() as Promise<StormglassBioResponse>;
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
  const key = process.env?.STORMGLASS_API_KEY;
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
  return res.json() as Promise<StormglassAstronomyResponse>;
}

/**
 * Fetch Open-Meteo Air Quality & Pollen (hourly) for the forecast window.
 * Note: Pollen variables live on the Air Quality endpoint. UV is on the Forecast endpoint.
 */
async function fetchOpenMeteoAirPollen(lat: number, lon: number, startDate: string, endDate: string) {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('hourly', [
    'alder_pollen',
    'birch_pollen',
    'grass_pollen',
    'ragweed_pollen',
    'pm2_5',
    'pm10',
    'o3',
    'no2',
    'so2',
    'co',
    'european_aqi',
    'us_aqi'
  ].join(','));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo air/pollen ${res.status}`);
  return res.json() as Promise<OpenMeteoAirResponse>;
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
    'soil_temperature_0cm',
    'soil_moisture_0_to_1cm',
    'soil_moisture_1_to_3cm',
    // Winter activity helpers:
    'snowfall',              // unit per hour as provided by Open-Meteo
    'freezing_level_height', // metres
    'snow_depth'             // metres
  ].join(','));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo forecast ${res.status}`);
  return res.json() as Promise<OpenMeteoForecastResponse>;
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
    const maybeHours = (marineData as { hours?: MarineHour[] } | null | undefined)?.hours;
    hours = Array.isArray(maybeHours) ? maybeHours : [];
  } catch (err) {
    // Keep things resilient—log and continue with empty marine arrays.
    console.error('[attachMarineToForecast] Failed to fetch marine data', err);
    hours = [];
  }

  // Bucket marine hours by local day key so we can attach to each forecast day.
  const byDate: Record<string, MarineHour[]> = {};
  for (const h of hours) {
    const key = toDateKey(h.time, timeZone);
    (byDate[key] ||= []).push(h);
  }

  // Return a new array with `marine` attached per day.
  return forecast.map((f) => ({
    ...f,
    marine: byDate[f.date] || [],
  }));
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

// ---- aggregation helper types to avoid `any` ----
interface AirAgg {
  pm25Arr?: number[];
  pm10Arr?: number[];
  o3Arr?: number[];
  no2Arr?: number[];
  so2Arr?: number[];
  coArr?: number[];
  euAqiMax?: number;
  usAqiMax?: number;
}
interface SoilAgg extends SoilSummary {
  temp0Arr?: number[];
  m01Arr?: number[];
  m13Arr?: number[];
}
interface WinterAgg extends WinterSummary {
  snowfallArr?: number[];
  frzLvlArr?: number[];
  snowDepthArr?: number[];
}
interface DayAgg {
  uvIndex?: number;
  uvIndexMax?: number;
  uvArr?: number[];
  pollen?: PollenSummary;
  air?: AirAgg;
  soil?: SoilAgg;
  winter?: WinterAgg;
}

export async function attachOpenMeteoToForecast(
  forecast: WeatherForecastDay[],
  opts: AttachOpenMeteoOpts
): Promise<WeatherForecastDay[]> {
  if (!forecast?.length) return forecast;
  const { lat, lon, timeZone } = opts;
  const { start, end } = dateRangeFromForecast(forecast);

  let airPollen: OpenMeteoAirResponse | null = null;
  let uvSoilWin: OpenMeteoForecastResponse | null = null;

  try {
    [airPollen, uvSoilWin] = await Promise.all([
      fetchOpenMeteoAirPollen(lat, lon, start, end),
      fetchOpenMeteoUVSoilWinter(lat, lon, start, end),
    ]);
  } catch (e) {
    console.error('[attachOpenMeteoToForecast] fetch failed', e);
  }

  const byDate: Record<string, DayAgg> = {};

  // --- Pollen & Air Quality (hourly → day aggregates) ---
  try {
    const H = airPollen?.hourly;
    const times = H?.time || [];
    const toNum = (v: number | null | undefined) => (v == null ? NaN : Number(v));
    for (let i = 0; i < times.length; i++) {
      const t = String(times[i]);
      const key = toDateKey(t, timeZone);
      const bucket = (byDate[key] ||= {});

      // --- Pollen daily maxima ---
      const pol = (bucket.pollen ||= {} as PollenSummary);
      const grass = toNum(H?.grass_pollen?.[i]);
      const alder = toNum(H?.alder_pollen?.[i]);
      const birch = toNum(H?.birch_pollen?.[i]);
      const ragweed = toNum(H?.ragweed_pollen?.[i]);
      if (!Number.isNaN(grass)) pol.grass = Math.max(pol.grass ?? -Infinity, grass);
      const treeNow = Math.max(alder, birch);
      if (Number.isFinite(treeNow)) pol.tree = Math.max(pol.tree ?? -Infinity, treeNow);
      if (!Number.isNaN(ragweed)) pol.weed = Math.max(pol.weed ?? -Infinity, ragweed);

      // --- Air quality: arrays to average later; AQI daily max ---
      const air = (bucket.air ||= {});
      const pm25 = toNum(H?.pm2_5?.[i]); if (!Number.isNaN(pm25)) air.pm25Arr = [ ...(air.pm25Arr || []), pm25 ];
      const pm10 = toNum(H?.pm10?.[i]);  if (!Number.isNaN(pm10)) air.pm10Arr = [ ...(air.pm10Arr || []), pm10 ];
      const o3   = toNum(H?.o3?.[i]);    if (!Number.isNaN(o3))   air.o3Arr   = [ ...(air.o3Arr   || []), o3   ];
      const no2  = toNum(H?.no2?.[i]);   if (!Number.isNaN(no2))  air.no2Arr  = [ ...(air.no2Arr  || []), no2  ];
      const so2  = toNum(H?.so2?.[i]);   if (!Number.isNaN(so2))  air.so2Arr  = [ ...(air.so2Arr  || []), so2  ];
      const co   = toNum(H?.co?.[i]);    if (!Number.isNaN(co))   air.coArr   = [ ...(air.coArr   || []), co   ];
      const euAqi = toNum(H?.european_aqi?.[i]);
      const usAqi = toNum(H?.us_aqi?.[i]);
      if (!Number.isNaN(euAqi)) air.euAqiMax = Math.max(air.euAqiMax ?? -Infinity, euAqi);
      if (!Number.isNaN(usAqi)) air.usAqiMax = Math.max(air.usAqiMax ?? -Infinity, usAqi);
    }
  } catch {
    // Non-fatal
  }

  // --- UV, soil, and winter vars (hourly → daily summaries) ---
  try {
    const H = uvSoilWin?.hourly || {};
    const times: string[] = H.time || [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const key = toDateKey(t, timeZone);
      const bucket = (byDate[key] ||= {});

      const uv = Number(H.uv_index?.[i]);
      // const uvClear = Number(H.uv_index_clear_sky?.[i]); // currently unused but available
      const soilT = Number(H.soil_temperature_0cm?.[i]);
      const sm01 = Number(H.soil_moisture_0_to_1cm?.[i]);
      const sm13 = Number(H.soil_moisture_1_to_3cm?.[i]);
      const snowfall = Number(H.snowfall?.[i]);
      const frzLvl = Number(H.freezing_level_height?.[i]);
      const snowDepth = Number(H.snow_depth?.[i]);

      // UV: keep max and collect values for average later
      if (!Number.isNaN(uv)) {
        bucket.uvIndexMax = Math.max(bucket.uvIndexMax ?? -Infinity, uv);
        bucket.uvArr = [ ...(bucket.uvArr || []), uv ];
      }

      // Soil summary: running arrays for averages
      const soil = (bucket.soil ||= {});
      if (!Number.isNaN(soilT)) soil.temp0Arr = [ ...(soil.temp0Arr || []), soilT ];
      if (!Number.isNaN(sm01))  soil.m01Arr   = [ ...(soil.m01Arr   || []), sm01  ];
      if (!Number.isNaN(sm13))  soil.m13Arr   = [ ...(soil.m13Arr   || []), sm13  ];

      // Winter summary arrays
      const win = (bucket.winter ||= {});
      if (!Number.isNaN(snowfall))  win.snowfallArr  = [ ...(win.snowfallArr  || []), snowfall  ];
      if (!Number.isNaN(frzLvl))    win.frzLvlArr    = [ ...(win.frzLvlArr    || []), frzLvl    ];
      if (!Number.isNaN(snowDepth)) win.snowDepthArr = [ ...(win.snowDepthArr || []), snowDepth ];
    }
  } catch {
    // Non-fatal
  }

  // Finalise per-day aggregates
  const result = forecast.map(day => {
    const extra = byDate[day.date] || {};

    // Compute UV representative value (midday-ish average if available)
    if (extra.uvArr && extra.uvArr.length) {
      extra.uvIndex = avg(extra.uvArr);
      delete extra.uvArr;
    }

    // Soil averages
    if (extra.soil) {
      const s = extra.soil;
      if (s.temp0Arr && s.temp0Arr.length) { extra.soil.temp0cm = avg(s.temp0Arr); delete s.temp0Arr; }
      if (s.m01Arr && s.m01Arr.length)     { extra.soil.moisture0to1 = avg(s.m01Arr); delete s.m01Arr; }
      if (s.m13Arr && s.m13Arr.length)     { extra.soil.moisture1to3 = avg(s.m13Arr); delete s.m13Arr; }
    }

    // Winter totals/averages
    if (extra.winter) {
      const w = extra.winter;
      if (w.snowfallArr && w.snowfallArr.length) { extra.winter.snowfallTotal = sum(w.snowfallArr); delete w.snowfallArr; }
      if (w.frzLvlArr && w.frzLvlArr.length)     { extra.winter.freezingLevelAvg = avg(w.frzLvlArr); delete w.frzLvlArr; }
      if (w.snowDepthArr && w.snowDepthArr.length){ extra.winter.snowDepthAvg = avg(w.snowDepthArr); delete w.snowDepthArr; }
    }

    // Pollen: replace -Infinity placeholders with undefined
    if (extra.pollen) {
      if (extra.pollen.grass === -Infinity) extra.pollen.grass = undefined;
      if (extra.pollen.tree === -Infinity) extra.pollen.tree = undefined;
      if (extra.pollen.weed === -Infinity) extra.pollen.weed = undefined;
    }

    // Air quality: compute daily means and keep max AQI
    if (extra.air) {
      const a = extra.air;
      const out: AQSummary = {};
      if (a.pm25Arr && a.pm25Arr.length) out.pm2_5Avg = avg(a.pm25Arr);
      if (a.pm10Arr && a.pm10Arr.length) out.pm10Avg  = avg(a.pm10Arr);
      if (a.o3Arr   && a.o3Arr.length)   out.o3Avg    = avg(a.o3Arr);
      if (a.no2Arr  && a.no2Arr.length)  out.no2Avg   = avg(a.no2Arr);
      if (a.so2Arr  && a.so2Arr.length)  out.so2Avg   = avg(a.so2Arr);
      if (a.coArr   && a.coArr.length)   out.coAvg    = avg(a.coArr);
      if (Number.isFinite(a.euAqiMax)) out.euAqiMax = a.euAqiMax;
      if (Number.isFinite(a.usAqiMax)) out.usAqiMax = a.usAqiMax;
      extra.air = out;
    }

    return { ...day, ...extra } as WeatherForecastDay;
  });

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

  let astro: StormglassAstronomyResponse | null = null;
  try {
    astro = await fetchStormglassAstronomy(lat, lon, start, end);
  } catch (e) {
    console.error('[attachAstronomyToForecast] fetch failed', e);
    return forecast; // non-fatal
  }

  const byDate: Record<string, AstronomySummary> = {};
  const rows: StormglassAstronomyRow[] = Array.isArray(astro?.data) ? astro!.data! : [];
  for (const r of rows) {
    const t = r.time || r.date || r.datetime;
    if (!t) continue;
    const key = toDateKey(String(t), timeZone);
    const entry: AstronomySummary = {
      sunrise: r.sunrise || r.sun?.rise,
      sunset: r.sunset || r.sun?.set,
      moonrise: r.moonrise || r.moon?.rise,
      moonset: r.moonset || r.moon?.set,
      moonPhase: r.moonPhase || (r as unknown as Record<string, unknown>)["moon_phase"] as string | undefined || r.moon?.phase,
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
  vars?: string[]; // e.g., ['chlorophyll','dissolvedOxygen','nitrate','phosphate','salinity','sst']
}

export async function attachMarineBioToForecast(
  forecast: WeatherForecastDay[],
  opts: AttachBioOpts
): Promise<WeatherForecastDay[]> {
  if (!forecast?.length) return forecast;
  const { lat, lon, timeZone } = opts;
  const vars = (opts.vars && opts.vars.length)
    ? opts.vars
    : ['chlorophyll','dissolvedOxygen','nitrate','phosphate','salinity','sst'];

  // Build an ISO window covering the forecast (use full-day bounds in UTC for safety)
  const { start, end } = dateRangeFromForecast(forecast);
  const startISO = `${start}T00:00:00Z`;
  const endISO = `${end}T23:59:59Z`;

  let data: StormglassBioResponse | null = null;
  try {
    data = await fetchStormglassBio(lat, lon, startISO, endISO, vars.join(','));
  } catch (e) {
    console.error('[attachMarineBioToForecast] fetch failed', e);
    return forecast;
  }

  const rows: StormglassBioHour[] = Array.isArray(data?.hours) ? data!.hours! : [];
  const byDate: Record<string, { _chl: number[]; _do: number[]; _no3: number[]; _po4: number[]; _sal: number[]; _sst: number[] }> = {};
  for (const h of rows) {
    const key = toDateKey(String(h.time ?? ''), timeZone);
    const bucket = (byDate[key] ||= { _chl: [], _do: [], _no3: [], _po4: [], _sal: [], _sst: [] });
    // Each variable may be nested per model source; Stormglass usually returns the numeric at top level or per source key.
    const v = (name: string): number | undefined => {
      const val = h?.[name];
      if (typeof val === 'number') return val;
      // if per-source object, take mean of numeric entries
      if (val && typeof val === 'object') {
        const nums = Object.values(val as Record<string, unknown>).filter((x): x is number => typeof x === 'number');
        if (nums.length) return nums.reduce((a,b)=>a+b,0)/nums.length;
      }
      return undefined;
    };
    const chl = v('chlorophyll'); if (Number.isFinite(chl)) bucket._chl.push(Number(chl));
    const dio = v('dissolvedOxygen'); if (Number.isFinite(dio)) bucket._do.push(Number(dio));
    const no3 = v('nitrate'); if (Number.isFinite(no3)) bucket._no3.push(Number(no3));
    const po4 = v('phosphate'); if (Number.isFinite(po4)) bucket._po4.push(Number(po4));
    const sal = v('salinity'); if (Number.isFinite(sal)) bucket._sal.push(Number(sal));
    const sst = v('sst') ?? v('seaSurfaceTemperature') ?? v('waterTemperature');
    if (Number.isFinite(sst)) bucket._sst.push(Number(sst));
  }

  return forecast.map(day => {
    const b = byDate[day.date];
    if (!b) return day;
    const marineBio: MarineBioSummary = {
      chlorophyllAvg: b._chl.length ? avg(b._chl) : undefined,
      dissolvedOxygenAvg: b._do.length ? avg(b._do) : undefined,
      nitrateAvg: b._no3.length ? avg(b._no3) : undefined,
      phosphateAvg: b._po4.length ? avg(b._po4) : undefined,
      salinityAvg: b._sal.length ? avg(b._sal) : undefined,
      sstAvg: b._sst.length ? avg(b._sst) : undefined,
    };
    return { ...day, marineBio } as WeatherForecastDay;
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