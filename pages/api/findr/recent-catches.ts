/**
 * API endpoint to fetch recent catches in an ICES rectangle
 * Used to provide AI fish identification with local context
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';

interface RecentCatchesResponse {
  species: string[];
  rectangleCode: string;
  since: string;
  count?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecentCatchesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rectangleCode, since } = req.query;

  if (!rectangleCode || typeof rectangleCode !== 'string') {
    return res.status(400).json({ error: 'rectangleCode is required' });
  }

  try {
    const supabase = await createClient();

    // Default to last 30 days if since not provided
    const sinceDate = since
      ? new Date(since as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Query catches in this rectangle since the given date
    const { data, error } = await supabase
      .from('findr_catch_entries')
      .select('species_common_name')
      .eq('rectangle_code', rectangleCode)
      .gte('caught_at', sinceDate.toISOString())
      .not('species_common_name', 'is', null)
      .limit(50); // Limit to recent 50 catches for performance

    if (error) {
      console.error('[recent-catches] Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Extract unique species names (deduplicate)
    const speciesSet = new Set(data?.map(c => c.species_common_name) || []);
    const species = Array.from(speciesSet);

    // Cache for 5 minutes (catches don't change frequently)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      species,
      rectangleCode,
      since: sinceDate.toISOString(),
      count: species.length
    });

  } catch (error) {
    console.error('[recent-catches] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
