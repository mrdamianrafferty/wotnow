import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

/**
 * GET /api/findr/regional
 * 
 * Returns species common to a given ICES rectangle.
 * No authentication required - public endpoint for species discovery.
 * 
 * Query params:
 * - rectangleCode: ICES rectangle code (e.g., "31F2")
 * - limit: Max number of species to return (default: 20)
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rectangleCode = req.query.rectangleCode as string | undefined;
  const limit = parseInt(req.query.limit as string || '20', 10);

  if (!rectangleCode) {
    return res.status(400).json({ error: 'rectangleCode query parameter required' });
  }

  try {
    const supabase = getSupabaseServerClient();

    // Query species_frequency table to get most common species in this rectangle
    const { data: frequencyData, error: freqError } = await supabase
      .from('species_frequency')
      .select(`
        species_id,
        frequency_score,
        species:species_id (
          id,
          species_code,
          scientific_name,
          name_en,
          eating_quality,
          conservation_status,
          typical_gear
        )
      `)
      .eq('rectangle_code', rectangleCode.toUpperCase())
      .order('frequency_score', { ascending: false })
      .limit(limit);

    if (freqError) {
      console.error('[regional] Error fetching species frequency:', freqError);
      throw freqError;
    }

    // If no species_frequency data, fall back to all species
    if (!frequencyData || frequencyData.length === 0) {
      console.warn(`[regional] No frequency data for ${rectangleCode}, returning default species`);
      
      const { data: allSpecies, error: speciesError } = await supabase
        .from('species')
        .select('id, species_code, scientific_name, name_en, eating_quality, conservation_status, typical_gear')
        .order('eating_quality', { ascending: false })
        .limit(limit);

      if (speciesError) throw speciesError;

      return res.status(200).json(allSpecies || []);
    }

    // Extract species from frequency data
    const species = frequencyData
      .map(row => {
        // Handle both direct species object and array format from Supabase JOIN
        const sp = Array.isArray(row.species) ? row.species[0] : row.species;
        return sp;
      })
      .filter(Boolean);

    return res.status(200).json(species);
  } catch (error) {
    console.error('[regional] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch regional species',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
