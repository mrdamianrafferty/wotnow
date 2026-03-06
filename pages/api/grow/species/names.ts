import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../../lib/supabase/serverClient';

/**
 * Lightweight endpoint that maps an array of slugs to their common names.
 * POST { slugs: ["tomato", "basil"] }
 * Returns { names: { "tomato": "Tomato", "basil": "Basil" } }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slugs } = req.body;
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return res.status(400).json({ error: 'slugs array required' });
  }

  // Cap at 50 to prevent abuse
  const limitedSlugs = slugs.slice(0, 50);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('plant_species')
    .select('slug, name')
    .in('slug', limitedSlugs);

  if (error) {
    return res.status(500).json({ error: 'Database error' });
  }

  const names: Record<string, string> = {};
  for (const row of data ?? []) {
    names[row.slug] = row.name;
  }

  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ names });
}
