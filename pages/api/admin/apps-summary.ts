/**
 * GET /api/admin/apps-summary → FamilySummary for /admin/apps: all five
 * apps' metrics side by side, with family totals. See
 * lib/admin-dashboard/family-fetch.ts.
 *
 * Admins only (GODAISY_ADMIN_EMAILS). Unlike metrics-summary, the dashboard
 * read token does not open this: it is the family view, not one app's.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminEmail } from '@/lib/admin-dashboard/auth';
import { getFamilySummary } from '@/lib/admin-dashboard/family-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'private, no-store');

  if (!(await getAdminEmail(req, res))) return res.status(403).json({ error: 'Admin access required' });
  return res.status(200).json(await getFamilySummary());
}
