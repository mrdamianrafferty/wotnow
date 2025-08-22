// /pages/api/tides.ts
import type { NextApiRequest, NextApiResponse } from 'next';

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
    console.log('🌊 Fetching tide data from Stormglass');
    const response = await fetch(url, {
      headers: { Authorization: apiKey }
    });

    if (!response.ok) {
      console.error('🌊 Tide API response not OK:', response.status);
      return res.status(response.status).json({ 
        success: false,
        error: 'Stormglass API error',
        status: response.status
      });
    }

    const data = await response.json();
    console.log('🌊 Tide data received', { count: data?.data?.length || 0 });

    if (data && Array.isArray(data.data)) {
      return res.status(200).json({ success: true, data: data.data });
    } else {
      return res.status(500).json({ success: false, error: 'Invalid tide data from Stormglass', details: data });
    }
  } catch (err: any) {
    console.error('🌊 Tide fetch failed', err);
    return res.status(500).json({ success: false, error: 'Tide fetch failed', details: String(err?.message || err) });
  }
}
