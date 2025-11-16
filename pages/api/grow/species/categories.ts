import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../../lib/supabase/serverClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('plant_species')
    .select('category')
    .not('category', 'is', null);

  if (error) {
    console.error('Failed to load plant categories:', error);
    return res.status(500).json({ error: 'Failed to load plant categories' });
  }

  const categories = Array.from(
    new Set(
      (data ?? [])
        .map((row) => typeof row.category === 'string' ? row.category.trim() : '')
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return res.status(200).json({ categories });
}
