import type { NextApiRequest, NextApiResponse } from 'next';
import { getElevationFromGoogle } from '../../../lib/grow/elevation';

interface ElevationResponse {
  elevation?: number;
  error?: string;
}

/**
 * GET /api/grow/elevation?lat=51.5&lon=-0.12
 *
 * Looks up elevation from Google Maps Elevation API.
 * Returns elevation in meters (rounded to nearest 10m).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ElevationResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lon } = req.query;

  if (!lat || !lon || typeof lat !== 'string' || typeof lon !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid lat/lon query parameters' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'lat and lon must be valid numbers' });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Coordinates out of valid range' });
  }

  try {
    const elevation = await getElevationFromGoogle(latitude, longitude);
    return res.status(200).json({ elevation });
  } catch (error) {
    console.error('[grow/elevation] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
