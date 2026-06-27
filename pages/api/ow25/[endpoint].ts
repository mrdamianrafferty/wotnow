import type { NextApiRequest, NextApiResponse } from 'next';
import { getOpenWeatherKey } from '../../../lib/utils/openWeatherKey';

/**
 * Server-side passthrough proxy for OpenWeather Data 2.5 endpoints, so client
 * code stops embedding the API key. Whitelisted to the two endpoints the app
 * actually uses from the browser:
 *   - GET /api/ow25/weather?lat&lon&units    (current conditions)
 *   - GET /api/ow25/forecast?lat&lon&units   (5-day / 3-hour forecast)
 * Returns the raw OpenWeather JSON unchanged so consumers need no logic changes.
 * Cached in-memory at ~1km + units (short TTL — current/forecast move slowly).
 */

const ALLOWED = new Set(['weather', 'forecast']);
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
// CDN cache (shared across serverless instances/users, unlike the in-memory Map).
const CDN_CACHE = 'public, s-maxage=600, stale-while-revalidate=1800';
const cache = new Map<string, { data: unknown; expires: number }>();

const round2dp = (n: number) => Math.round(n * 1e2) / 1e2;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const endpoint = Array.isArray(req.query.endpoint) ? req.query.endpoint[0] : req.query.endpoint;
  if (!endpoint || !ALLOWED.has(endpoint)) {
    return res.status(404).json({ error: 'Unknown endpoint' });
  }

  const apiKey = getOpenWeatherKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'Weather unavailable' });
  }

  const lat = Number(Array.isArray(req.query.lat) ? req.query.lat[0] : req.query.lat);
  const lon = Number(Array.isArray(req.query.lon) ? req.query.lon[0] : req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  const unitsParam = Array.isArray(req.query.units) ? req.query.units[0] : req.query.units;
  const units = unitsParam === 'imperial' || unitsParam === 'standard' ? unitsParam : 'metric';

  const cacheKey = `${endpoint}:${round2dp(lat)}:${round2dp(lon)}:${units}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('x-cache', 'HIT');
    res.setHeader('Cache-Control', CDN_CACHE);
    return res.status(200).json(cached.data);
  }

  const url = `https://api.openweathermap.org/data/2.5/${endpoint}?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;

  try {
    const owRes = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await owRes.json();
    if (!owRes.ok) {
      return res.status(owRes.status).json(data);
    }
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    res.setHeader('x-cache', 'MISS');
    res.setHeader('Cache-Control', CDN_CACHE);
    return res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ow25/${endpoint}] proxy error:`, message);
    return res.status(502).json({ error: 'Weather upstream error' });
  }
}
