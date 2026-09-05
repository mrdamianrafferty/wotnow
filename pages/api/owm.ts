import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedFullWeather } from '../../lib/services/weatherService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use the unified weather service directly
  const { lat, lon } = req.query as { lat?: string; lon?: string };
  type Units = 'metric' | 'imperial' | 'standard';
  const unitsParam = Array.isArray(req.query.units) ? req.query.units[0] : req.query.units;
  const units: Units =
    unitsParam === 'metric' || unitsParam === 'imperial' || unitsParam === 'standard'
      ? unitsParam
      : 'metric';
  const exclude = (req.query.exclude as string) || '';

  /*
   * No API key any more. `getCachedFullWeather` reads Open-Meteo underneath, so
   * requiring a key here would have this endpoint 400 on a request it can
   * perfectly well serve — which is how a removal like this usually breaks
   * something days later.
   */
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    // Durable Supabase-cached wrapper around getFullWeather: collapses duplicate
    // One Call 3.0 calls for the same ~1km area + hour (the in-memory cache does not
    // survive serverless cold starts).
    const weatherData = await getCachedFullWeather({
      lat: latNum,
      lon: lonNum,
      apiKey: '',
      options: { units, exclude }
    });

    return res.status(200).json(weatherData);
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message?: unknown }).message) : String(err);
    console.error('Unified Weather API error (/api/owm):', err);
    return res.status(500).json({ error: `Failed to fetch weather data: ${message}` });
  }
}
