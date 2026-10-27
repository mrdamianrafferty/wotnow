/**
 * GET /api/cron/godaisy/store-stats — daily App Store and Google Play download
 * counts into store_stats_daily (see lib/store-stats/).
 *
 * Called daily by Vercel Cron (vercel.json), which sends
 * `Authorization: Bearer $CRON_SECRET`. Add ?days=60 to backfill by hand
 * (default 4, max 90); re-syncing a day overwrites it.
 *
 * Returns 502 only when a configured platform failed outright. A few iOS days
 * Apple keeps 500ing are logged as skipped and picked up by tomorrow's run.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { secretsMatch } from '@/lib/admin-dashboard/auth';
import { syncStoreStats } from '@/lib/store-stats/sync';

export const config = {
  maxDuration: 300,
};

const DEFAULT_DAYS = 4;
const MAX_DAYS = 90;

function authorised(req: NextApiRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Timing-safe, unlike lib/cron-auth.ts's ===
  return secretsMatch(req.headers.authorization ?? '', `Bearer ${secret}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  const raw = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
  const requested = parseInt(raw ?? '', 10);
  const days = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), MAX_DAYS) : DEFAULT_DAYS;

  const result = await syncStoreStats(days);
  const failed = Boolean(result.ios.error || result.android.error);
  if (failed) console.error('[store-stats] sync errors:', result);
  else if (result.ios.skipped?.length) console.warn('[store-stats] skipped iOS days:', result.ios.skipped);

  return res.status(failed ? 502 : 200).json(result);
}
