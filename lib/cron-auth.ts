import type { NextApiRequest } from 'next';

/**
 * Verify that a cron/internal API request has a valid CRON_SECRET.
 * Fails closed: returns false when CRON_SECRET is not configured.
 */
export function verifyCronAuth(req: NextApiRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.authorization;
  return authHeader === `Bearer ${cronSecret}`;
}
