/**
 * API endpoint to fetch recent catches in a rectangle
 * Used to provide AI context about what's been caught recently
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rectangleCode, since } = req.query;

  if (!rectangleCode || typeof rectangleCode !== 'string') {
    return res.status(400).json({ error: 'rectangleCode is required' });
  }

  try {
    const supabase = getSupabaseServerClient(req, res);

    // Default to last 30 days if since not provided
    const sinceDate = since
      ? new Date(since as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Query recent catches, group by species name and count
    const { data, error } = await supabase
      .from('findr_catch_entries')
      .select('species_common_name, quantity')
      .eq('rectangle_code', rectangleCode)
      .gte('caught_at', sinceDate.toISOString())
      .order('caught_at', { ascending: false });

    if (error) {
      console.error('[recent-catches] Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({ species: [] });
    }

    // Aggregate by species name and count total quantity
    const speciesMap = new Map<string, number>();

    for (const catch_ of data) {
      const name = catch_.species_common_name;
      const qty = catch_.quantity || 1;
      speciesMap.set(name, (speciesMap.get(name) || 0) + qty);
    }

    // Sort by quantity (most caught first) and extract names
    const sortedSpecies = Array.from(speciesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    return res.status(200).json({
      species: sortedSpecies,
      count: data.length,
      since: sinceDate.toISOString()
    });
  } catch (error) {
    console.error('[recent-catches] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
