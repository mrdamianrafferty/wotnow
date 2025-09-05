// /pages/api/tides.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// Simple in-memory cooldown to avoid hammering Stormglass when quota is hit
let lastLimitedAt: number | null = null;
// Basic in-memory cache to reduce duplicate requests during fast reloads
const tideCache = new Map<string, { ts: number; data: any }>();
const TIDE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
function cacheKey(lat: number, lon: number) {
  // Round to ~100m to coalesce nearby points
  const la = lat.toFixed(3);
  const lo = lon.toFixed(3);
  return `${la},${lo}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query;
  const apiKey = process.env.STORMGLASS_SECRET_KEY;

  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'Missing Stormglass API key' });
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ success: false, error: 'Invalid coordinates' });
  }

  const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${latNum}&lng=${lonNum}`;

  try {
    const key = cacheKey(latNum, lonNum);
    const now = Date.now();
    const cached = tideCache.get(key);
    if (cached && now - cached.ts < TIDE_TTL_MS) {
      return res.status(200).json(cached.data);
    }
    // If we recently saw a limit, short-circuit for 15 minutes
    if (lastLimitedAt && Date.now() - lastLimitedAt < 15 * 60 * 1000) {
      return res.status(200).json({ success: true, data: [], limited: true, status: 402, cached: true });
    }
    console.log('🌊 Fetching tide data from Stormglass');
    const response = await fetch(url, {
      headers: { Authorization: apiKey }
    });

    if (!response.ok) {
      // Gracefully degrade on quota/rate errors: return empty data with 200
      console.warn('🌊 Tide API response not OK:', response.status);
      if (response.status === 402 || response.status === 429) {
        lastLimitedAt = Date.now();
      }
      const payload = { success: true, data: [], limited: true, status: response.status };
      tideCache.set(key, { ts: now, data: payload });
      return res.status(200).json(payload);
    }

    const data = await response.json();
    console.log('🌊 Tide data received', { count: data?.data?.length || 0 });

    if (data && Array.isArray(data.data)) {
      const payload = { success: true, data: data.data };
      tideCache.set(key, { ts: now, data: payload });
      return res.status(200).json(payload);
    } else {
      return res.status(500).json({ success: false, error: 'Invalid tide data from Stormglass', details: data });
    }
  } catch (err: any) {
    console.error('🌊 Tide fetch failed', err);
    return res.status(500).json({ success: false, error: 'Tide fetch failed', details: String(err?.message || err) });
  }
}
