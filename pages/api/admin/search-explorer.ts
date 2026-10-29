/**
 * GET /api/admin/search-explorer: Search Console, deeper than the family
 * dashboard's top five. Admins only (GODAISY_ADMIN_EMAILS), never cached: a
 * person asked, and the indexing check spends a limited daily quota.
 *
 *   ?site=<id>                      top pages, top queries, and the pages
 *                                   showing a lot but clicked little
 *   ?site=<id>&limit=100            more rows (default 50, at most 200)
 *   ?site=<id>&page=<https url>     the queries behind one page
 *   ?site=<id>&view=indexing        URL Inspection on a sample of the sitemap
 *   ?site=<id>&view=indexing&count=30   a bigger sample (default 20, at most 50)
 *
 * See lib/admin-dashboard/search-explorer.ts.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminEmail } from '@/lib/admin-dashboard/auth';
import { checkIndexing, exploreSite, queriesForPage } from '@/lib/admin-dashboard/search-explorer';

export const config = { maxDuration: 60 };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const intOf = (v: string | undefined) => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'private, no-store');
  if (!(await getAdminEmail(req, res))) return res.status(403).json({ error: 'Admin access required' });

  const site = one(req.query.site);
  if (!site) return res.status(400).json({ error: 'site is required' });
  const view = one(req.query.view);
  const page = one(req.query.page);

  const result =
    view === 'indexing'
      ? await checkIndexing(site, { count: intOf(one(req.query.count)) })
      : page
        ? await queriesForPage(site, page)
        : await exploreSite(site, { limit: intOf(one(req.query.limit)) });

  // The section shape the rest of the admin uses, with a status a script can act on
  return res.status(result.state === 'error' ? 502 : 200).json(result);
}
