/**
 * /api/findr/species/regional
 * 
 * Get all species available in a given ICES rectangle
 * Returns species list with popularity data from community catches
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  try {
    const { icesSquare } = req.query;
    
    if (!icesSquare || typeof icesSquare !== 'string') {
      return res.status(400).json({ error: 'icesSquare parameter is required' });
    }
    
    // TODO: Need a species_data table with ICES region mapping
    // For now, return mock data based on catch history
    
    // Get species caught in this region (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data: recentCatches, error } = await supabase
      .from('findr_catch_entries')
      .select('species_id, species_common_name, scientific_name')
      .eq('rectangle_code', icesSquare)
      .gte('caught_at', ninetyDaysAgo.toISOString());
    
    if (error) {
      console.error('[regional-species] Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch regional species',
        details: error.message 
      });
    }
    
    // Aggregate by species
    const speciesMap = new Map<string, {
      id: string;
      commonName: string;
      scientificName?: string;
      catchCount: number;
    }>();
    
    recentCatches?.forEach(catch_ => {
      const key = catch_.species_id;
      if (speciesMap.has(key)) {
        speciesMap.get(key)!.catchCount++;
      } else {
        speciesMap.set(key, {
          id: catch_.species_id,
          commonName: catch_.species_common_name,
          scientificName: catch_.scientific_name || undefined,
          catchCount: 1
        });
      }
    });
    
    // Convert to array and sort by popularity
    const species = Array.from(speciesMap.values())
      .sort((a, b) => b.catchCount - a.catchCount);
    
    // Build popularity map (species_id -> catch count)
    const popularity: Record<string, number> = {};
    species.forEach(sp => {
      popularity[sp.id] = sp.catchCount;
    });
    
    return res.status(200).json({
      success: true,
      icesSquare,
      species: species.map(sp => ({
        id: sp.id,
        commonName: sp.commonName,
        scientificName: sp.scientificName
        // TODO: Add imageUrl, habitat, seasonal info from species_data table
      })),
      popularity,
      dataSource: 'community_catches',
      note: 'Species list derived from recent catches. Full species database coming soon.'
    });
    
  } catch (error) {
    console.error('[regional-species] API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
