import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type CultivarSearchItem = {
  cultivarId: string;
  cultivarName: string;
  speciesSlug?: string;
};

type CultivarSearchResponse = {
  cultivars: CultivarSearchItem[];
};

function asString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CultivarSearchResponse | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = (asString(req.query.q) ?? '').trim();
  const species = (asString(req.query.species) ?? '').trim();
  const limitRaw = asString(req.query.limit);
  const limit = Math.max(1, Math.min(50, Number.parseInt(limitRaw ?? '20', 10) || 20));

  if (!q) {
    return res.status(200).json({ cultivars: [] });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role on the server (never exposed to client)
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase env vars missing' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Assumes your table is called "cultivars" and has:
  // - cultivar_id
  // - cultivar_name
  // - species_slug (optional but recommended)
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

  const cultivars: CultivarSearchItem[] = (data ?? []).map((row: { cultivar_id: string; cultivar_name: string; species_slug?: string }) => ({
    cultivarId: row.cultivar_id,
    cultivarName: row.cultivar_name,
    speciesSlug: row.species_slug ?? undefined,
  }));

  return res.status(200).json({ cultivars });
}