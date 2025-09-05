import type { NextApiRequest, NextApiResponse } from 'next';

// Reuse existing OpenWeather helpers
import {
  fetchOpenWeatherOneCall,
} from '../../lib/services/weatherService';

// Stormglass weather endpoint supports visibility directly
const STORMGLASS_WEATHER_API = 'https://api.stormglass.io/v2/weather/point';

/**
 * Compare visibility from OpenWeather (One Call) vs Stormglass for a given point.
 * - OpenWeather visibility is in meters (typically capped at 10,000m = 10 km).
 * - Stormglass visibility is reported per-hour; provider units are km (common) but we normalize defensively.
 *
 * Query: ?lat=..&lon=..
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query as { lat?: string; lon?: string };
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ error: 'Invalid or missing lat/lon' });
  }

  const owmKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  const sgKey = process.env.STORMGLASS_SECRET_KEY;
  if (!owmKey) return res.status(500).json({ error: 'Missing OpenWeather API key' });
  if (!sgKey) return res.status(500).json({ error: 'Missing Stormglass API key' });

  try {
    // OpenWeather current visibility (meters)
    const owm = await fetchOpenWeatherOneCall(latNum, lonNum, owmKey, { units: 'metric' });
    const owmVisM: number | null = typeof owm?.current?.visibility === 'number'
      ? owm.current.visibility
      : (Array.isArray(owm?.hourly) && typeof owm.hourly[0]?.visibility === 'number' ? owm.hourly[0].visibility : null);
    const owmVisKm = owmVisM != null ? owmVisM / 1000 : null;

    // Stormglass weather/point with visibility, take the next hour matching now
    const now = new Date();
    const startISO = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const endISO = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
    const params = ['visibility'].join(',');
    const sgUrl = `${STORMGLASS_WEATHER_API}?lat=${latNum}&lng=${lonNum}&params=${params}&start=${startISO}&end=${endISO}`;
    const sgRes = await fetch(sgUrl, { headers: { Authorization: sgKey } });
    const sgJson: any = await sgRes.json();
    if (!sgRes.ok) throw new Error(`Stormglass error ${sgRes.status}: ${JSON.stringify(sgJson)}`);
    const hours: any[] = Array.isArray(sgJson?.hours) ? sgJson.hours : [];
    const pickNum = (v: any) => (typeof v === 'number' ? v : Number(v));

    // Choose the first hour >= now
    let sgEntry: any = null;
    for (const h of hours) {
      const ht = new Date(h.time);
      if (ht >= now) { sgEntry = h; break; }
    }
    if (!sgEntry && hours.length) sgEntry = hours[0];

    // Prefer 'sg' then 'noaa'
    const rawSg = sgEntry?.visibility;
    const sgProvider = rawSg?.sg != null ? 'sg' : (rawSg?.noaa != null ? 'noaa' : null);
    const sgVisRaw: number | null = sgProvider ? pickNum(rawSg[sgProvider]) : null;
    // Normalize to km: if clearly meters, convert; otherwise assume km
    const sgVisKm: number | null = sgVisRaw != null
      ? (sgVisRaw > 200 ? sgVisRaw / 1000 : sgVisRaw)
      : null;

    return res.status(200).json({
      lat: latNum,
      lon: lonNum,
      openWeather: {
        rawMeters: owmVisM,
        km: owmVisKm,
        capHint: 'OpenWeather current.visibility is capped at 10 km',
      },
      stormglass: {
        raw: sgVisRaw,
        assumedUnit: sgVisRaw != null && sgVisRaw > 200 ? 'm' : 'km',
        km: sgVisKm,
        providerField: sgProvider,
        sampleTime: sgEntry?.time || null,
        capHint: 'Stormglass visibility often reaches ~24 km',
      },
      note: 'Values normalized to km where possible; units inferred when ambiguous.'
    });
  } catch (err: any) {
    console.error('visibility-compare error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

