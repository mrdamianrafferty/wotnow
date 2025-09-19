import type { NextApiRequest, NextApiResponse } from 'next';
import { getFullWeather } from '../../lib/services/weatherService';

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

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

  if (!lat || !lon || !apiKey) {
    return res.status(400).json({ error: 'Missing parameters or API key' });
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    // getFullWeather comes from the unified weatherServices module (OpenWeather + Open-Meteo + Stormglass)
    const weatherData = await getFullWeather({
      lat: latNum,
      lon: lonNum,
      apiKey,
      options: { units, exclude }
    });

    return res.status(200).json(weatherData);
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message?: unknown }).message) : String(err);
    console.error('Unified Weather API error (/api/owm):', err);
    return res.status(500).json({ error: `Failed to fetch weather data: ${message}` });
  }
}
