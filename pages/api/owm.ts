import type { NextApiRequest, NextApiResponse } from 'next';
import { getFullWeather } from '../../lib/weatherServices';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query as { lat?: string; lon?: string };
  const units = (req.query.units as string) || 'metric';
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
  } catch (err: any) {
    console.error('Unified Weather API error (/api/owm):', err);
    const message = typeof err?.message === 'string' ? err.message : String(err);
    return res.status(500).json({ error: `Failed to fetch weather data: ${message}` });
  }
}