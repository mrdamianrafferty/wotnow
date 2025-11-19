import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchGardenAlerts, defaultGardenProfile } from '../../../lib/gardening/getGardenAlerts';
import type { GardenProfile } from '../../../lib/gardening/gardenAlerts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { lat, lon, soilType, shade } = req.query;
  const latNum = typeof lat === 'string' ? Number(lat) : Number(Array.isArray(lat) ? lat[0] : undefined);
  const lonNum = typeof lon === 'string' ? Number(lon) : Number(Array.isArray(lon) ? lon[0] : undefined);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ error: 'Invalid lat/lon values' });
  }

  const profile: GardenProfile = {
    soilType: (typeof soilType === 'string' && isSoilType(soilType)) ? soilType : defaultGardenProfile.soilType,
    shade: (typeof shade === 'string' && isShade(shade)) ? shade : defaultGardenProfile.shade,
  };

  const forwarded = req.headers['x-forwarded-proto'];
  const host = req.headers.host || 'localhost:3000';
  const guessedProto = typeof forwarded === 'string' ? forwarded.split(',')[0] : undefined;
  const protocol = guessedProto || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${protocol}://${host}`;

  try {
    const alerts = await fetchGardenAlerts({ baseUrl, lat: latNum, lon: lonNum, profile });
    return res.status(200).json({ alerts });
  } catch (error) {
    console.error('[GardenAlerts] Failed to build alerts', error);
    return res.status(500).json({ error: 'Failed to generate garden alerts' });
  }
}

function isSoilType(value: string): value is GardenProfile['soilType'] {
  return ['sandy', 'loam', 'clay', 'peat', 'chalk'].includes(value);
}

function isShade(value: string): value is GardenProfile['shade'] {
  return ['full_sun', 'part_shade', 'full_shade'].includes(value);
}
