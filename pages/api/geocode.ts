import type { NextApiRequest, NextApiResponse } from 'next';
import { getOpenWeatherKey } from '../../lib/utils/openWeatherKey';

/**
 * Server-side proxy for OpenWeather Geocoding (geo/1.0). Keeps the API key off
 * the client. Two modes:
 *   - Forward:  GET /api/geocode?q=Lisbon            -> geo/1.0/direct
 *   - Reverse:  GET /api/geocode?lat=38.7&lon=-9.1   -> geo/1.0/reverse
 * Returns the raw OpenWeather array unchanged so existing callers transform it
 * exactly as before. Cached in-memory (place names are effectively static);
 * survives within a warm serverless instance.
 */

type GeoResult = unknown[];

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — geocoding rarely changes
// CDN cache (shared across serverless instances/users, unlike the in-memory Map).
const CDN_CACHE = 'public, s-maxage=86400, stale-while-revalidate=604800';
const cache = new Map<string, { data: GeoResult; expires: number }>();

const round2dp = (n: number) => Math.round(n * 1e2) / 1e2;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = getOpenWeatherKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'Geocoding unavailable' });
  }

  const q = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const latRaw = Array.isArray(req.query.lat) ? req.query.lat[0] : req.query.lat;
  const lonRaw = Array.isArray(req.query.lon) ? req.query.lon[0] : req.query.lon;
  const limit = Math.min(Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 5, 5);

  let url: string;
  let cacheKey: string;

  if (q && q.trim()) {
    cacheKey = `f:${q.trim().toLowerCase()}:${limit}`;
    url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q.trim())}&limit=${limit}&appid=${apiKey}`;
  } else {
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'Provide ?q= (forward) or ?lat=&lon= (reverse)' });
    }
    cacheKey = `r:${round2dp(lat)}:${round2dp(lon)}`;
    url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
  }

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('x-cache', 'HIT');
    res.setHeader('Cache-Control', CDN_CACHE);
    return res.status(200).json(cached.data);
  }

  try {
    const owRes = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!owRes.ok) {
      // Surface the status so callers keep their existing fallback (Nominatim, etc.)
      return res.status(owRes.status).json({ error: `Geocoding failed: ${owRes.status}` });
    }
    const data = (await owRes.json()) as GeoResult;
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    res.setHeader('x-cache', 'MISS');
    res.setHeader('Cache-Control', CDN_CACHE);
    return res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[geocode] proxy error:', message);
    return res.status(502).json({ error: 'Geocoding upstream error' });
  }
}
