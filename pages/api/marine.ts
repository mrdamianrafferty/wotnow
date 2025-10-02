// /pages/api/marine.ts

import type { NextApiRequest, NextApiResponse } from 'next';

// Snap coordinates to 3 decimal places (~110 m) to align with server cache + quotas
const round3dp = (n: number) => Math.round(n * 1e3) / 1e3;
const coordKey3dp = (lat: number, lon: number) => `${round3dp(lat).toFixed(3)}_${round3dp(lon).toFixed(3)}`;

const STORMGLASS_API = 'https://api.stormglass.io/v2/weather/point';

// In-memory cache: key = lat_lon_bucket, for up to 12hrs, split into AM/PM
const cache = new Map<string, { timestamp: number; ttlMs: number; data: unknown }>();
// Returns "am" or "pm" to split bucket windows
const getTimeBucket = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'am' : 'pm';
};

// --- TTL helpers ------------------------------------------------------------
const MIN_TTL_MS = 30 * 60 * 1000; // 30 min guardrail

function msUntilNextGlobalCycle(now = new Date()): number {
  // Global model cycles typically start 00, 06, 12, 18 UTC
  const utcHours = now.getUTCHours();
  const nextCycleHour = [0, 6, 12, 18].find(h => h > utcHours) ?? 24; // wrap to next day
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), nextCycleHour, 0, 0));
  if (nextCycleHour === 24) next.setUTCDate(next.getUTCDate() + 1);
  const ms = next.getTime() - now.getTime();
  // small buffer to avoid thundering herd right on the boundary
  return ms + 5 * 60 * 1000; // +5 min
}

function computeOptimalTTL(startISO: string, endISO: string): number {
  const now = Date.now();
  const end = Date.parse(endISO);
  if (isNaN(end)) return 2 * 60 * 60 * 1000; // default 2h on parse issues
  const hoursUntilEnd = (end - now) / (60 * 60 * 1000);

  // Base TTL by horizon
  let base = 6 * 60 * 60 * 1000; // 6h default
  if (hoursUntilEnd <= 24) base = 90 * 60 * 1000; // 1.5h for near-term
  else if (hoursUntilEnd <= 72) base = 3 * 60 * 60 * 1000; // 3h mid-term

  // Don’t refresh more often than the next likely global cycle
  const untilCycle = msUntilNextGlobalCycle(new Date());
  const ttl = Math.max(MIN_TTL_MS, Math.min(base, untilCycle));
  return ttl;
}
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon, start, end } = req.query;
  const apiKey = process.env.STORMGLASS_SECRET_KEY;

  // Parse + snap to 3dp
  const latNum = typeof lat === 'string' ? parseFloat(lat) : Array.isArray(lat) ? parseFloat(lat[0]!) : NaN;
  const lonNum = typeof lon === 'string' ? parseFloat(lon) : Array.isArray(lon) ? parseFloat(lon[0]!) : NaN;
  const rlat = round3dp(latNum);
  const rlon = round3dp(lonNum);

  // Normalise start/end to strings
  const startISO = typeof start === 'string' ? start : Array.isArray(start) ? start[0]! : '';
  const endISO = typeof end === 'string' ? end : Array.isArray(end) ? end[0]! : '';

  console.log('🌍 Incoming request (rounded):', { lat: rlat, lon: rlon, start: startISO, end: endISO });

  if (!apiKey) {
    console.error('❌ Missing Stormglass API key');
    return res.status(500).json({ error: 'Missing Stormglass API key' });
  }

  if (!isFinite(rlat) || !isFinite(rlon) || !startISO || !endISO) {
    return res.status(400).json({ error: 'Missing or invalid lat/lon/start/end params' });
  }

  // Cache key now includes rounded coord key + time bucket + time range
  const locationKey = `${coordKey3dp(rlat, rlon)}_${getTimeBucket()}_${startISO}_${endISO}`;
  const now = Date.now();

  // ✅ Return cached response if fresh
  const cached = cache.get(locationKey);
  if (cached && now - cached.timestamp < cached.ttlMs) {
    console.log(`✅ Cache hit for ${coordKey3dp(rlat, rlon)} (${getTimeBucket()}) ttl=${Math.round(cached.ttlMs/60000)}m`);
    return res.status(200).json(cached.data);
  }

  // 🛰️ Fetch from Stormglass
  try {
    const params = [
      'windSpeed',
      'windDirection',
      'gust',
      'currentSpeed',
      'currentDirection',
      'waveHeight',
      'waveDirection',
      'wavePeriod',
      'swellHeight',
      'swellDirection',
      'swellPeriod',
      'waterTemperature',
      'visibility'
    ].join(',');
    
    const ttlMs = computeOptimalTTL(startISO, endISO);
    
    // Build the URL with all parameters
    const url = `${STORMGLASS_API}?lat=${rlat}&lng=${rlon}&params=${params}&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`;
    
    // Make the request to Stormglass
    const sgRes = await fetch(url, {
      headers: {
        'Authorization': apiKey
      }
    });
    
    if (!sgRes.ok) {
      const errorText = await sgRes.text();
      console.error('❌ Stormglass API Response:', errorText);
      return res.status(sgRes.status).json({ error: errorText });
    }

    const data = await sgRes.json();

    if ((data as { errors?: unknown; message?: unknown })?.errors || (data as { message?: unknown })?.message) {
      console.error('❌ Stormglass API returned an error:', (data as { errors?: unknown; message?: unknown }).errors || (data as { message?: unknown }).message);
      return res.status(500).json({ error: (data as { errors?: unknown; message?: unknown }).errors || (data as { message?: unknown }).message });
    }

    // ✅ Cache and return
    cache.set(locationKey, { timestamp: now, ttlMs, data });
    console.log(`🌊 Cached Stormglass data for ${coordKey3dp(rlat, rlon)} (${getTimeBucket()}), ttl=${Math.round(ttlMs/60000)}m`);

    return res.status(200).json(data);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Stormglass API Error:', err.stack || String(error));
    return res.status(500).json({
      error: 'Fetch error contacting Stormglass',
      details: err.message || String(error),
    });
  }
}
