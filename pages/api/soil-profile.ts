import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchOpenMeteoWeather } from '../../lib/services/weatherService';

/**
 * Returns the full hourly soil temperature and moisture profile for a date (default: today, local timezone).
 * Query: ?lat=..&lon=..[&date=YYYY-MM-DD]
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon, date } = req.query as { lat?: string; lon?: string; date?: string };
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ error: 'Invalid or missing lat/lon' });
  }
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const localDate = date || `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  try {
    const om: any = await fetchOpenMeteoWeather(latNum, lonNum, localDate, localDate);
    const H = om?.hourly || {};
    return res.status(200).json({
      date: localDate,
      time: H.time || [],
      soil_temperature_0cm: H.soil_temperature_0cm || [],
      soil_temperature_6cm: H.soil_temperature_6cm || [],
      soil_temperature_18cm: H.soil_temperature_18cm || [],
      soil_temperature_54cm: H.soil_temperature_54cm || [],
      soil_moisture_0_to_1cm: H.soil_moisture_0_to_1cm || [],
      soil_moisture_1_to_3cm: H.soil_moisture_1_to_3cm || [],
      soil_moisture_3_to_9cm: H.soil_moisture_3_to_9cm || [],
      soil_moisture_9_to_27cm: H.soil_moisture_9_to_27cm || [],
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}

