/**
 * Findr Species API
 *
 * GET /api/findr/species - Returns all species for offline caching
 * GET /api/findr/species?code=BSS - Returns single species by code
 * GET /api/findr/species?slug=sea-bass - Returns single species by slug
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS on species table
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, slug } = req.query;

    // Single species by code
    if (code && typeof code === 'string') {
      const { data, error } = await supabase
        .from('species')
        .select('*')
        .eq('species_code', code.toUpperCase())
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Species not found' });
      }

      return res.status(200).json({ species: data });
    }

    // Single species by slug
    if (slug && typeof slug === 'string') {
      const { data, error } = await supabase
        .from('species')
        .select('*')
        .eq('slug', slug.toLowerCase())
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Species not found' });
      }

      return res.status(200).json({ species: data });
    }

    // All species for offline cache
    // Only select columns that exist in the species table
    const { data, error } = await supabase
      .from('species')
      .select(`
        id,
        species_code,
        slug,
        scientific_name,
        name_en,
        name_fr,
        name_es,
        name_de,
        name_it,
        name_pt,
        playful_bio_en,
        fun_fact,
        eating_quality,
        conservation_status,
        guild,
        min_depth,
        max_depth,
        temp_opt_c,
        aliases,
        advice,
        best_times,
        recommended_baits,
        species_badges
      `)
      .order('name_en');

    if (error) {
      console.error('[Species API] Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch species' });
    }

    // Add cache headers for 1 hour (species data rarely changes)
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=14400');

    return res.status(200).json({
      species: data || [],
      count: data?.length || 0,
      cachedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Species API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
