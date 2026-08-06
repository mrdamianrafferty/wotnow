import type { NextApiRequest, NextApiResponse } from 'next';
import { geocodeForward, geocodeReverse, type GeocodeResult } from '../../lib/utils/serverGeocode';

/**
 * Server-side geocoding proxy. Nominatim primary (free, no key), OpenWeather
 * Geocoding API as a fallback. Two modes:
 *   - Forward:  GET /api/geocode?q=Lisbon            -> place name -> coords
 *   - Reverse:  GET /api/geocode?lat=38.7&lon=-9.1   -> coords -> place name
 * Returns an OpenWeather-shaped array ({name, lat, lon, country, state}) so
 * existing callers (e.g. ModernLocationSearch.tsx) don't need to change.
 * Cached in-memory (place names are effectively static); survives within a
 * warm serverless instance.
 */

type OwShapedResult = { name: string; lat: number; lon: number; country?: string; state?: string };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — geocoding rarely changes
// CDN cache (shared across serverless instances/users, unlike the in-memory Map).
const CDN_CACHE = 'public, s-maxage=86400, stale-while-revalidate=604800';
const cache = new Map<string, { data: OwShapedResult[]; expires: number }>();

const round2dp = (n: number) => Math.round(n * 1e2) / 1e2;

function toOwShaped(result: GeocodeResult): OwShapedResult {
  return { name: result.name, lat: result.lat, lon: result.lon, country: result.country, state: result.state };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const latRaw = Array.isArray(req.query.lat) ? req.query.lat[0] : req.query.lat;
  const lonRaw = Array.isArray(req.query.lon) ? req.query.lon[0] : req.query.lon;
  const limit = Math.min(Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 5, 5);

  let cacheKey: string;
  let isForward: boolean;
  let lat = 0;
  let lon = 0;
  let query = '';

  if (q && q.trim()) {
    isForward = true;
    query = q.trim();
    cacheKey = `f:${query.toLowerCase()}:${limit}`;
  } else {
    lat = Number(latRaw);
    lon = Number(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'Provide ?q= (forward) or ?lat=&lon= (reverse)' });
    }
    isForward = false;
    cacheKey = `r:${round2dp(lat)}:${round2dp(lon)}`;
  }

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('x-cache', 'HIT');
    res.setHeader('Cache-Control', CDN_CACHE);
    return res.status(200).json(cached.data);
  }

  try {
    let results: OwShapedResult[];
    if (isForward) {
      results = (await geocodeForward(query, limit)).map(toOwShaped);
    } else {
      const reverseResult = await geocodeReverse(lat, lon);
      results = reverseResult ? [toOwShaped(reverseResult)] : [];
    }

    cache.set(cacheKey, { data: results, expires: Date.now() + CACHE_TTL_MS });
    res.setHeader('x-cache', 'MISS');
    res.setHeader('Cache-Control', CDN_CACHE);
    return res.status(200).json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[geocode] proxy error:', message);
    return res.status(502).json({ error: 'Geocoding upstream error' });
  }
}
