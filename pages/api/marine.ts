// /pages/api/marine.ts

import type { NextApiRequest, NextApiResponse } from 'next';

const STORMGLASS_API = 'https://api.stormglass.io/v2/weather/point';

// In-memory cache: key = lat_lon_bucket, for up to 12hrs, split into AM/PM
const cache = new Map<string, { timestamp: number;  any }>();

// Returns "am" or "pm" to split bucket windows
const getTimeBucket = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'am' : 'pm';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon, start, end } = req.query;
  const apiKey = process.env.STORMGLASS_SECRET_KEY;

  if (!apiKey) {
    console.error('❌ Missing Stormglass API key');
    return res.status(500).json({ error: 'Missing Stormglass API key' });
  }

  if (!lat || !lon || !start || !end) {
    return res.status(400).json({ error: 'Missing lat/lon/start/end params' });
  }

  const locationKey = `${lat}_${lon}_${getTimeBucket()}`;
  const now = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;

  // ✅ Return cached response if fresh
  const cached = cache.get(locationKey);
  if (cached && now - cached.timestamp < twelveHours) {
    console.log(`✅ Returning cached Stormglass data for ${lat},${lon} (${getTimeBucket()})`);
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


    const url = `${STORMGLASS_API}?lat=${lat}&lng=${lon}&params=${params}&start=${start}&end=${end}`;

    const sgRes = await fetch(url, {
      headers: {
        Authorization: apiKey
      }
    });

    const data = await sgRes.json();

    if (data.errors || data.message) {
      // Stormglass returned an error, not data
      console.warn('⚠️ Stormglass API error response:', data);
      return res.status(502).json({
        error: 'Stormglass API error',
        details: data
      });
    }

    if (!Array.isArray(data.hours)) {
      console.warn('⚠️ Stormglass response invalid format:', data);
      return res.status(500).json({
        error: 'Stormglass returned invalid format',
        details: data
      });
    }

    // ✅ Cache and return
    cache.set(locationKey, { timestamp: now, data });
    console.log(`🌊 Stormglass data fetched and cached for ${lat},${lon} (${getTimeBucket()})`);

    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Failed to fetch Stormglass ', error);
    return res.status(500).json({
      error: 'Fetch error contacting Stormglass',
      details: error
    });
  }
}
