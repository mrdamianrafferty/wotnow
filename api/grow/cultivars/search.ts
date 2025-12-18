import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type CultivarRow = {
  cultivar_id: string;
  cultivar_name: string;
  species_slug: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Recommended: server-only key so you’re not fighting RLS during reads.
  // Make sure this is set in .env.local (and NEVER exposed client-side).
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = (req.query.q as string | undefined ?? '').trim();
  const species = (req.query.species as string | undefined ?? '').trim();
  const limitRaw = (req.query.limit as string | undefined) ?? '20';
  const limit = Math.max(1, Math.min(50, Number.parseInt(limitRaw, 10) || 20));

  // Don’t hammer the DB for empty/1-char queries
  if (q.length < 2) {
    return res.status(200).json({ cultivars: [] });
  }

  let query = supabase
    .from('cultivars')
    .select('cultivar_id, cultivar_name, species_slug')
    .ilike('cultivar_name', `%${q}%`)
    .order('cultivar_name', { ascending: true })
    .limit(limit);

  if (species) {
    query = query.eq('species_slug', species);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const rows = (data ?? []) as CultivarRow[];

  return res.status(200).json({
    cultivars: rows.map((r) => ({
      cultivarId: r.cultivar_id,
      cultivarName: r.cultivar_name,
      speciesSlug: r.species_slug ?? undefined,
    })),
  });
}