import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Redirect to the weather-with-pollen endpoint
  res.redirect(307, `/api/weather-with-pollen?${new URLSearchParams(req.query as Record<string, string>).toString()}`);
}
