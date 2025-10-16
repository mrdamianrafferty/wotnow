import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

interface TechniqueData {
  technique_id: number;
  technique_code: string;
  technique_name: string;
  effectiveness: number;
  notes: string | null;
  beginner_tips: string | null;
}

interface BaitData {
  bait_id: number;
  bait_name: string;
  effectiveness: number;
  notes: string | null;
}

interface SubstrateData {
  name_en: string;
  has_sand: boolean;
  has_gravel: boolean;
  has_rock: boolean;
  has_mud: boolean;
  has_mixed: boolean;
}

interface SpeciesDetailResponse {
  species_id: string;
  species_code: string;
  name_en: string;
  scientific_name: string | null;
  inaturalist_url: string | null;
  techniques: TechniqueData[];
  bait: BaitData[];
  substrates: SubstrateData | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { species_id, species_code } = req.query;

  if (!species_id && !species_code) {
    return res.status(400).json({ 
      error: 'Missing required parameter: species_id or species_code' 
    });
  }

  try {
    const supabase = getSupabaseServerClient();

    // Build the base query
    let query = supabase
      .from('species')
      .select(`
        id,
        species_code,
        name_en,
        scientific_name,
        inaturalist_url
      `)
      .limit(1);

    // Filter by either species_id or species_code
    if (species_id) {
      query = query.eq('id', species_id);
    } else if (species_code) {
      query = query.eq('species_code', species_code);
    }

    const { data: speciesData, error: speciesError } = await query.single();

    if (speciesError || !speciesData) {
      console.error('[species-details] Species not found:', speciesError);
      return res.status(404).json({ error: 'Species not found' });
    }

    // Fetch techniques for this species
    const { data: techniquesData, error: techniquesError } = await supabase
      .from('species_technique')
      .select(`
        technique_id,
        effectiveness,
        notes,
        beginner_tips,
        technique!inner (
          id,
          technique_code,
          name_en
        )
      `)
      .eq('species_id', speciesData.id)
      .order('effectiveness', { ascending: false });

    if (techniquesError) {
      console.error('[species-details] Error fetching techniques:', techniquesError);
    }

    // Fetch bait for this species
    const { data: baitData, error: baitError } = await supabase
      .from('species_bait')
      .select(`
        bait_id,
        effectiveness,
        notes,
        bait!inner (
          id,
          name_en
        )
      `)
      .eq('species_id', speciesData.id)
      .order('effectiveness', { ascending: false });

    if (baitError) {
      console.error('[species-details] Error fetching bait:', baitError);
    }

    // Fetch substrates for this species
    const { data: substratesData, error: substratesError } = await supabase
      .from('species_substrates')
      .select(`
        name_en,
        has_sand,
        has_gravel,
        has_rock,
        has_mud,
        has_mixed
      `)
      .eq('id', speciesData.id)
      .single();

    if (substratesError) {
      console.error('[species-details] Error fetching substrates:', substratesError);
    }

    // Format the response
    const techniques: TechniqueData[] = (techniquesData || []).map((t) => {
      const techniqueData = Array.isArray(t.technique) ? t.technique[0] : t.technique;
      return {
        technique_id: t.technique_id,
        technique_code: techniqueData?.technique_code || '',
        technique_name: techniqueData?.name_en || '',
        effectiveness: t.effectiveness,
        notes: t.notes,
        beginner_tips: t.beginner_tips,
      };
    });

    const bait: BaitData[] = (baitData || []).map((b) => {
      const baitInfo = Array.isArray(b.bait) ? b.bait[0] : b.bait;
      return {
        bait_id: b.bait_id,
        bait_name: baitInfo?.name_en || '',
        effectiveness: b.effectiveness,
        notes: b.notes,
      };
    });

    const response: SpeciesDetailResponse = {
      species_id: speciesData.id,
      species_code: speciesData.species_code,
      name_en: speciesData.name_en,
      scientific_name: speciesData.scientific_name,
      inaturalist_url: speciesData.inaturalist_url,
      techniques,
      bait,
      substrates: substratesData || null,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('[species-details] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
