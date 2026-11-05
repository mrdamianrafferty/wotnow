/**
 * GET /api/cron/godaisy/store-stats — daily App Store and Google Play download
 * counts into store_stats_daily (see lib/store-stats/).
 *
 * Called daily by Vercel Cron (vercel.json), which sends
 * `Authorization: Bearer $CRON_SECRET`. Add ?days=60 to backfill by hand
 * (default 4, max 90); re-syncing a day overwrites it. ?financePeriods=12 asks
 * for more Apple fiscal periods of finance reports (default 4, max 12).
 *
 * Returns 502 only when a configured platform failed outright. A few iOS days
 * Apple keeps 500ing are logged as skipped and picked up by tomorrow's run.
 * Finance reports never cause a 502: a key without the Finance role, a period
 * Apple has not published and a failure are all in the JSON (`finance`) and on
 * /admin/dashboard instead.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { secretsMatch } from '@/lib/admin-dashboard/auth';
import { syncStoreStats } from '@/lib/store-stats/sync';

export const config = {
  maxDuration: 300,
};

const DEFAULT_DAYS = 4;
const MAX_DAYS = 90;
const MAX_FINANCE_PERIODS = 12;

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

  const rawPeriods = Array.isArray(req.query.financePeriods) ? req.query.financePeriods[0] : req.query.financePeriods;
  const requestedPeriods = parseInt(rawPeriods ?? '', 10);
  const financePeriods = Number.isFinite(requestedPeriods) ? Math.min(Math.max(requestedPeriods, 1), MAX_FINANCE_PERIODS) : undefined;

  const result = await syncStoreStats(days, financePeriods);
  const failed = Boolean(result.ios.error || result.android.error || result.listing.error);
  if (failed) console.error('[store-stats] sync errors:', result);
  else if (result.ios.skipped?.length) console.warn('[store-stats] skipped iOS days:', result.ios.skipped);
  if (result.finance.error) console.error('[store-stats] finance error:', result.finance.error);

  return res.status(failed ? 502 : 200).json(result);
}
