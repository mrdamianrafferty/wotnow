/**
 * GET /api/admin/metrics-summary → MetricsSummary
 * { app, generatedAt, storeDownloads, revenue, analytics, platformHealth, audience },
 * each a Section: { state: 'ok', data } | 'not_configured' | 'error'.
 *
 * Read by /admin/dashboard and by the multi-app dashboard, which sends
 * `Authorization: Bearer $DASHBOARD_READ_TOKEN`. Admins sign in as usual and
 * must be in GODAISY_ADMIN_EMAILS. See lib/admin-dashboard/auth.ts.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminEmail, hasDashboardToken } from '@/lib/admin-dashboard/auth';
import { getMetricsSummary } from '@/lib/admin-dashboard/metrics';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'private, no-store');

  if (!hasDashboardToken(req) && !(await getAdminEmail(req, res))) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return res.status(200).json(await getMetricsSummary());
}
