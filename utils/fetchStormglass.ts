/**
 * utils/fetchStormglass.ts
 * Stormglass utility functions (ESM).
 * NOTE: Do not put any top-level "smoke" script logic in this file.
 */

// --- Types ---
export interface StormglassHour {
  time: string; // ISO
  [param: string]: unknown;
}

export interface StormglassResponse {
  hours?: StormglassHour[];
  meta?: Record<string, unknown>;
}

type CacheEntry = { data: StormglassResponse; expires: number };

/** Cache TTLs */
const TTL_MARINE_MS = 5 * 60 * 1000;        // 5 minutes
const TTL_BIO_MS = 6 * 60 * 60 * 1000;      // 6 hours
const TTL_ASTRO_MS = 24 * 60 * 60 * 1000;   // 24 hours

/** In-memory caches (declared BEFORE use). */
const marineCache: Record<string, CacheEntry> = {};
const bioCache: Record<string, CacheEntry> = {};
const astroCache: Record<string, CacheEntry> = {};

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
  const resp = await fetch(url, { headers });
  const text = await resp.text();
  if (!resp.ok) {
    const preview = text.slice(0, 400);
    throw new Error(`Stormglass ${resp.status} ${resp.statusText} @ ${url}\n${preview}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Stormglass invalid JSON @ ${url}: ${text.slice(0, 200)}`);
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
  const url = new URL('https://api.stormglass.io/v2/weather/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
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
  apiKey: string = getStormglassKey()
): Promise<StormglassResponse> {
  const key = `${lat},${lon},${startISO},${endISO}`;
  const now = Date.now();
  const hit = marineCache[key];
  if (hit && hit.expires > now) return hit.data;

  const data = await fetchStormglassMarineForecast(lat, lon, startISO, endISO, apiKey);
  marineCache[key] = { data, expires: now + TTL_MARINE_MS };
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
  params?: string[],
  apiKey: string = getStormglassKey()
): Promise<StormglassResponse> {
  const finalParams = params ?? [
    'chlorophyll',
    'dissolvedOxygen',
    'nitrate',
    'phosphate',
    'salinity',
    'seaSurfaceTemperature'
  ];

  // Cache key includes params to avoid collisions across different requests.
  const cacheKey = `bio|${lat},${lon},${startISO},${endISO}|${finalParams.join(',')}`;
  const now = Date.now();
  const hit = bioCache[cacheKey];
  if (hit && hit.expires > now) return hit.data;

  const url = new URL('https://api.stormglass.io/v2/bio/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);
  url.searchParams.set('params', finalParams.join(','));

  const data = await fetchJsonWithDetail<StormglassResponse>(url.toString(), { Authorization: apiKey });
  bioCache[cacheKey] = { data, expires: now + TTL_BIO_MS };
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
  const cacheKey = `astro|${lat},${lon},${startISO},${endISO}`;
  const now = Date.now();
  const hit = astroCache[cacheKey];
  if (hit && hit.expires > now) return hit.data;

  const url = new URL('https://api.stormglass.io/v2/astronomy/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);

  const data = await fetchJsonWithDetail<StormglassResponse>(url.toString(), { Authorization: apiKey });
  astroCache[cacheKey] = { data, expires: now + TTL_ASTRO_MS };
  return data;
}
