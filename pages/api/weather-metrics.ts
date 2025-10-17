import type { NextApiRequest, NextApiResponse } from 'next';
import { weatherMetrics } from '../../lib/monitoring/weatherMetrics';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST' && (req.query.reset === 'true' || req.body?.reset === true)) {
    weatherMetrics.reset();
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(weatherMetrics.snapshot(provider));
}

