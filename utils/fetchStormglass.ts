/**
 * utils/fetchStormglass.ts
 * Stormglass utility functions (ESM).
 * NOTE: Do not put any top-level "smoke" script logic in this file.
 */

import { weatherMetrics } from '../lib/monitoring/weatherMetrics';

// --- Types ---
export interface StormglassHour {
  time: string; // ISO
  [param: string]: unknown;
}

export interface StormglassResponse {
  hours?: StormglassHour[];
  meta?: Record<string, unknown>;
}

/**
 * Coordinate precision helpers (3 decimal places ~ 110 m).
 * We round both cache keys and outgoing requests to de-duplicate nearby points
 * and control Stormglass quota usage in the free tier.
 */
export const round3dp = (n: number) => Math.round(n * 1e3) / 1e3;
export function coordKey3dp(lat: number, lon: number) {
  return `${round3dp(lat).toFixed(3)},${round3dp(lon).toFixed(3)}`;
}

/**
 * Optional: group arbitrary spots by 3‑dp cell and cap the number of cells.
 * Use this upstream of these fetchers if you want to enforce a global
 * "max 3 unique cells per request" rule.
 */
export function groupAndLimitByCell<T extends { lat: number; lon: number }>(
  spots: T[],
  maxCells = 3
) {
  const byKey = new Map<string, { key: string; lat: number; lon: number; items: T[] }>();
  for (const s of spots) {
    const key = coordKey3dp(s.lat, s.lon);
    if (!byKey.has(key)) byKey.set(key, { key, lat: round3dp(s.lat), lon: round3dp(s.lon), items: [] });
    byKey.get(key)!.items.push(s);
  }
  // Keep the cells with the most items by default; adjust ordering as needed.
  return [...byKey.values()].sort((a, b) => b.items.length - a.items.length).slice(0, maxCells);
}

/** Cache TTLs */
const TTL_MARINE_MS = 5 * 60 * 1000;        // 5 minutes
const TTL_BIO_MS = 6 * 60 * 60 * 1000;      // 6 hours
const TTL_ASTRO_MS = 24 * 60 * 60 * 1000;   // 24 hours
const TTL_RECT_MARINE_MS = 24 * 60 * 60 * 1000; // 24 hours per rectangle/day
const TTL_RECT_BIO_MS = 24 * 60 * 60 * 1000;    // 24 hours per rectangle/day

type CacheEntry = {
  data: StormglassResponse;
  expires: number;
};

/** In-memory caches (declared BEFORE use). */
const marineCache: Record<string, CacheEntry> = {};
const bioCache: Record<string, CacheEntry> = {};
const astroCache: Record<string, CacheEntry> = {};

export interface StormglassCacheOptions {
  apiKey?: string;
  rectangleCode?: string;
  dayKey?: string;
  ttlMs?: number;
}

export interface StormglassBioOptions extends StormglassCacheOptions {
  params?: string[] | string;
}

const splitParamString = (value: string): string[] =>
  value
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment): segment is string => segment.length > 0);

/** Returns the first non-empty API key from env. */
function getStormglassKey(): string {
  const k =
    process.env.STORMGLASS_API_KEY ||
    process.env.STORMGLASS_SECRET_KEY ||
    process.env.NEXT_PUBLIC_STORMGLASS_KEY ||
    '';
  if (!k) throw new Error('Missing Stormglass API key (set STORMGLASS_API_KEY or STORMGLASS_SECRET_KEY)');
  return k;
}

/** Helper: fetch JSON and include a short text preview for non-200s. */
async function fetchJsonWithDetail<T = unknown>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const parsed = new URL(url);
  const endpoint = parsed.pathname.replace(/^\/+/, '') || 'stormglass';
  const note = parsed.searchParams.toString() ? parsed.searchParams.toString().slice(0, 200) : undefined;
  let recorded = false;
  const span = weatherMetrics.start('stormglass', endpoint, note);

  try {
    const resp = await fetch(url, { headers });
    const text = await resp.text();
    if (!resp.ok) {
      recorded = true;
      const preview = text.slice(0, 400);
      const error = new Error(`Stormglass ${resp.status} ${resp.statusText} @ ${url}\n${preview}`);
      span.failure(error, { status: resp.status });
      throw error;
    }

    try {
      const json = JSON.parse(text) as T;
      span.success({ status: resp.status });
      recorded = true;
      return json;
    } catch {
      const error = new Error(`Stormglass invalid JSON @ ${url}: ${text.slice(0, 200)}`);
      span.failure(error, { status: resp.status });
      recorded = true;
      throw error;
    }
  } catch (error) {
    if (!recorded) {
      span.failure(error);
    }
    throw error;
  }
}

/**
 * Fetch marine/weather timeseries (waves, wind, water temp, etc.) from Stormglass.
 * Endpoint: https://api.stormglass.io/v2/weather/point
 */
export async function fetchStormglassMarineForecast(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  apiKey: string = getStormglassKey()
): Promise<StormglassResponse> {
  const rlat = round3dp(lat);
  const rlon = round3dp(lon);
  const url = new URL('https://api.stormglass.io/v2/weather/point');
  url.searchParams.set('lat', String(rlat));
  url.searchParams.set('lng', String(rlon));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);
  url.searchParams.set(
    'params',
    [
      'waveHeight','waveDirection','wavePeriod',
      'swellHeight','swellDirection','swellPeriod',
      'windWaveHeight','windWaveDirection','windWavePeriod',
      'waterTemperature','currentSpeed','currentDirection',
      'windSpeed','windDirection','gust'
    ].join(',')
  );

  return fetchJsonWithDetail<StormglassResponse>(url.toString(), { Authorization: apiKey });
}

/**
 * Cached wrapper for marine forecast (5 min).
 */
export async function fetchMarineWithCache(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  apiKeyOrOptions?: string | StormglassCacheOptions,
  maybeOptions?: StormglassCacheOptions
): Promise<StormglassResponse> {
  let apiKey: string | undefined;
  let options: StormglassCacheOptions | undefined;

  if (typeof apiKeyOrOptions === 'object' && apiKeyOrOptions !== null) {
    options = apiKeyOrOptions;
  } else {
    apiKey = apiKeyOrOptions;
    options = maybeOptions;
  }

  const opts: StormglassCacheOptions = options ? { ...options } : {};
  const keyApi = apiKey ?? opts.apiKey ?? getStormglassKey();
  const rectCode = opts.rectangleCode;
  const dayKey = opts.dayKey ?? startISO.slice(0, 10);
  const ttlMs = opts.ttlMs ?? (rectCode ? TTL_RECT_MARINE_MS : TTL_MARINE_MS);

  const key = rectCode
    ? `rect:${rectCode}|marine|${dayKey}`
    : `marine|${coordKey3dp(lat, lon)}|${startISO}|${endISO}`;
  const now = Date.now();
  const hit = marineCache[key];
  if (hit && hit.expires > now) return hit.data;

  const data = await fetchStormglassMarineForecast(lat, lon, startISO, endISO, keyApi);
  marineCache[key] = { data, expires: now + ttlMs };
  return data;
}

/**
 * Stormglass Bio (chlorophyll, SST, etc.)
 * Endpoint: https://api.stormglass.io/v2/bio/point
 * IMPORTANT: Request `seaSurfaceTemperature` (NOT "sst").
 */
export async function fetchStormglassBio(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  paramsOrOptions?: string[] | StormglassBioOptions,
  maybeOptions?: StormglassBioOptions
): Promise<StormglassResponse> {
  let params: string[] | undefined;
  let options: StormglassBioOptions | undefined;

  if (typeof paramsOrOptions === 'string') {
    params = splitParamString(paramsOrOptions);
  } else if (Array.isArray(paramsOrOptions) || paramsOrOptions === undefined) {
    params = paramsOrOptions;
    options = maybeOptions;
  } else if (paramsOrOptions && typeof paramsOrOptions === 'object') {
    options = paramsOrOptions;
  }

  const opts: StormglassBioOptions = options ? { ...options } : {};
  const paramsFromOpts = typeof opts.params === 'string'
    ? splitParamString(opts.params)
    : opts.params;
  const finalParams = params ?? paramsFromOpts ?? [
    'chlorophyll',
    'oxygen',
    'nitrate',
    'phosphate',
    'salinity',
    'surfaceTemperature',
    'phytoplankton',
    'ph'
  ];

  const keyApi = opts.apiKey ?? getStormglassKey();
  const rectCode = opts.rectangleCode;
  const dayKey = opts.dayKey ?? startISO.slice(0, 10);
  const ttlMs = opts.ttlMs ?? (rectCode ? TTL_RECT_BIO_MS : TTL_BIO_MS);

  // Cache key includes params to avoid collisions across different requests.
  const cacheKey = rectCode
    ? `rect:${rectCode}|bio|${dayKey}|${finalParams.join(',')}`
    : `bio|${coordKey3dp(lat, lon)}|${startISO}|${endISO}|${finalParams.join(',')}`;
  const now = Date.now();
  const hit = bioCache[cacheKey];
  if (hit && hit.expires > now) return hit.data;

  const url = new URL('https://api.stormglass.io/v2/bio/point');
  url.searchParams.set('lat', String(round3dp(lat)));
  url.searchParams.set('lng', String(round3dp(lon)));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);
  url.searchParams.set('params', finalParams.join(','));

  const data = await fetchJsonWithDetail<StormglassResponse>(url.toString(), { Authorization: keyApi });
  bioCache[cacheKey] = { data, expires: now + ttlMs };
  return data;
}

/**
 * Stormglass Astronomy (sunrise, sunset, moon)
 * Endpoint: https://api.stormglass.io/v2/astronomy/point
 */
export async function fetchStormglassAstronomy(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  apiKey: string = getStormglassKey()
): Promise<StormglassResponse> {
  const cacheKey = `astro|${coordKey3dp(lat, lon)}|${startISO}|${endISO}`;
  const now = Date.now();
  const hit = astroCache[cacheKey];
  if (hit && hit.expires > now) return hit.data;

  const url = new URL('https://api.stormglass.io/v2/astronomy/point');
  url.searchParams.set('lat', String(round3dp(lat)));
  url.searchParams.set('lng', String(round3dp(lon)));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);

  const data = await fetchJsonWithDetail<StormglassResponse>(url.toString(), { Authorization: apiKey });
  astroCache[cacheKey] = { data, expires: now + TTL_ASTRO_MS };
  return data;
}
