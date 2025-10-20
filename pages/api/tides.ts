// /pages/api/tides.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { weatherMetrics } from '../../lib/monitoring/weatherMetrics';
import { round1dp, round3dp } from '../../lib/utils/coordinates';
import { fetchWorldTides, type WorldTidesResponse } from '../../lib/services/weatherService';

// Simple in-memory cooldown to avoid hammering Stormglass when quota is hit
let lastLimitedAt: number | null = null;
// Basic in-memory cache to reduce duplicate requests during fast reloads
const tideCache = new Map<string, { ts: number; data: unknown }>();
const worldTidesCache = new Map<string, { ts: number; data: WorldTidesResponse }>();
const noaaTidesCache = new Map<string, { ts: number; data: unknown }>();
const TIDE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for all tide sources (astronomically predictable)
function cacheKey(lat: number, lon: number, precision: number) {
  const roundedLat = precision === 1 ? round1dp(lat) : round3dp(lat);
  const roundedLon = precision === 1 ? round1dp(lon) : round3dp(lon);
  return `${roundedLat.toFixed(precision)},${roundedLon.toFixed(precision)}`;
}

// Helper to check if location is in US/North America for NOAA
function isNorthAmericanCoast(lat: number, lon: number): boolean {
  // US coasts, Canada, Mexico, Caribbean
  // Atlantic: 25°N-50°N, 100°W-60°W
  // Pacific: 25°N-60°N, 135°W-115°W
  // Gulf: 18°N-31°N, 98°W-80°W
  // Caribbean: 10°N-27°N, 90°W-60°W
  return (
    (lat >= 25 && lat <= 50 && lon >= -100 && lon <= -60) || // Atlantic
    (lat >= 25 && lat <= 60 && lon >= -135 && lon <= -115) || // Pacific
    (lat >= 18 && lat <= 31 && lon >= -98 && lon <= -80) || // Gulf
    (lat >= 10 && lat <= 27 && lon >= -90 && lon <= -60)    // Caribbean
  );
}

// Fetch NOAA tides (free for US/North America)
async function fetchNOAATides(lat: number, lon: number): Promise<unknown | null> {
  try {
    // Use 3dp for NOAA (free API, same as WorldTides)
    const rlat = round3dp(lat);
    const rlon = round3dp(lon);
    
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 7);
    
    const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter');
    url.searchParams.set('product', 'predictions');
    url.searchParams.set('application', 'WotNow');
    url.searchParams.set('begin_date', now.toISOString().split('T')[0].replace(/-/g, ''));
    url.searchParams.set('end_date', endDate.toISOString().split('T')[0].replace(/-/g, ''));
    url.searchParams.set('datum', 'MLLW');
    url.searchParams.set('time_zone', 'gmt');
    url.searchParams.set('units', 'metric');
    url.searchParams.set('interval', 'hilo');
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', String(rlat));
    url.searchParams.set('lon', String(rlon));

    const span = weatherMetrics.start('noaa', 'tides', JSON.stringify({ lat: rlat, lon: rlon }));
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      span.failure(new Error(`HTTP ${response.status}`), { status: response.status });
      return null;
    }
    
    const data = await response.json() as { predictions?: Array<{ t: string; v: string; type: string }> };
    
    if (!data.predictions || data.predictions.length === 0) {
      span.failure(new Error('No NOAA tide predictions'), { status: response.status });
      return null;
    }
    
    span.success({ status: response.status });
    console.log(`✅ NOAA: Tide data found (${data.predictions.length} predictions)`);
    
    // Transform to Stormglass format for compatibility
    const items = data.predictions.map((p: { t: string; v: string; type: string }) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: p.type === 'H' ? 'high' : 'low'
    }));
    
    return { success: true, data: items, source: 'noaa' };
  } catch (error) {
    console.warn('[NOAA] Tide fetch failed:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query;

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ success: false, error: 'Invalid coordinates' });
  }

  const now = Date.now();
  
  // Try WorldTides first (global, free, 3dp, 24h cache)
  const wtKey = cacheKey(latNum, lonNum, 3);
  const wtCached = worldTidesCache.get(wtKey);
  if (wtCached && now - wtCached.ts < TIDE_TTL_MS) {
    console.log('🌊 WorldTides cache hit');
    // Transform to Stormglass format
    const items = wtCached.data.extremes.map(e => ({
      time: e.date,
      height: e.height,
      type: e.type.toLowerCase()
    }));
    return res.status(200).json({ success: true, data: items, source: 'worldtides', cached: true });
  }
  
  const wtData = await fetchWorldTides(latNum, lonNum, 7);
  if (wtData && wtData.extremes && wtData.extremes.length > 0) {
    worldTidesCache.set(wtKey, { ts: now, data: wtData });
    console.log('✅ [Tides] Using WorldTides (FREE)');
    const items = wtData.extremes.map(e => ({
      time: e.date,
      height: e.height,
      type: e.type.toLowerCase()
    }));
    return res.status(200).json({ success: true, data: items, source: 'worldtides' });
  }
  
  // Try NOAA for US/North American coasts (free, 3dp, 24h cache)
  if (isNorthAmericanCoast(latNum, lonNum)) {
    const noaaKey = cacheKey(latNum, lonNum, 3);
    const noaaCached = noaaTidesCache.get(noaaKey);
    if (noaaCached && now - noaaCached.ts < TIDE_TTL_MS) {
      console.log('🌊 NOAA tides cache hit');
      return res.status(200).json(noaaCached.data);
    }
    
    const noaaData = await fetchNOAATides(latNum, lonNum);
    if (noaaData) {
      noaaTidesCache.set(noaaKey, { ts: now, data: noaaData });
      console.log('✅ [Tides] Using NOAA (FREE)');
      return res.status(200).json(noaaData);
    }
  }
  
  // Emergency fallback to Stormglass (paid, 1dp, 24h cache)
  const apiKey = process.env.STORMGLASS_SECRET_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'No tide data available and Stormglass key not configured' });
  }
  
  const sgKey = cacheKey(latNum, lonNum, 1);
  const sgCached = tideCache.get(sgKey);
  if (sgCached && now - sgCached.ts < TIDE_TTL_MS) {
    console.log('🌊 Stormglass tide cache hit');
    return res.status(200).json(sgCached.data);
  }
  
  // If we recently saw a limit, short-circuit for 15 minutes
  if (lastLimitedAt && Date.now() - lastLimitedAt < 15 * 60 * 1000) {
    return res.status(200).json({ success: true, data: [], limited: true, status: 402, cached: true });
  }
  
  const rlat = round1dp(latNum);
  const rlon = round1dp(lonNum);
  const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${rlat}&lng=${rlon}`;
  
  console.log('⚠️  [Tides] Falling back to Stormglass (PAID - EMERGENCY)');
  const span = weatherMetrics.start('stormglass', 'tides', JSON.stringify({ lat: rlat, lon: rlon }));
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: apiKey }
    });

    if (!response.ok) {
      // Gracefully degrade on quota/rate errors
      console.warn('🌊 Stormglass API response not OK:', response.status);
      if (response.status === 402 || response.status === 429) {
        lastLimitedAt = Date.now();
      }
      span?.failure(new Error(`HTTP ${response.status}`), { status: response.status });
      const payload = { success: true, data: [] as unknown[], limited: true as const, status: response.status, source: 'stormglass' };
      tideCache.set(sgKey, { ts: now, data: payload });
      return res.status(200).json(payload);
    }

    const data: unknown = await response.json();
    const items = (data as { data?: unknown[] })?.data;
    console.log('🌊 Stormglass tide data received', { count: Array.isArray(items) ? items.length : 0 });

    if (Array.isArray(items)) {
      const payload = { success: true, data: items, source: 'stormglass' };
      tideCache.set(sgKey, { ts: now, data: payload });
      span?.success({ status: response.status });
      return res.status(200).json(payload);
    } else {
      span?.failure(new Error('Invalid tide data payload'), { status: response.status });
      return res.status(500).json({ success: false, error: 'Invalid tide data from Stormglass', details: data });
    }
  } catch (err: unknown) {
    console.error('🌊 Stormglass tide fetch failed', err);
    span?.failure(err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: 'Tide fetch failed', details: message });
  }
}
