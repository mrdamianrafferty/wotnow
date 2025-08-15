// /pages/api/tides.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query;
  const apiKey = process.env.STORMGLASS_SECRET_KEY;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lon}`;

  try {
    console.log('🌊 Fetching tide data from Stormglass');
    const response = await fetch(url, {
      headers: {
        'Authorization': `${apiKey}` // Fixed format
      }
    });
    
    if (!response.ok) {
      console.error('🌊 Tide API response not OK:', response.status);
      return res.status(response.status).json({ 
        error: 'Stormglass API error', 
        status: response.status 
      });
    }
    
    const data = await response.json();
    console.log('🌊 Tide data received', { count: data?.data?.length || 0 });

    if (data && Array.isArray(data.data)) {
      return res.status(200).json(data);
    } else {
      return res.status(500).json({ error: 'Invalid tide data from Stormglass', details: data });
    }
  } catch (err) {
    console.error('🌊 Tide fetch failed', err);
    return res.status(500).json({ error: 'Tide fetch failed', details: err });
  }
}
