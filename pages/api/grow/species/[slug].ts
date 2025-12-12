import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../../lib/supabase/serverClient';
import {
  serializePlantSpecies,
  type PlantSpeciesRow,
  PLANT_SPECIES_LANGUAGE_FIELDS,
} from '../../../../lib/grow/species';

const BASE_SELECT = [
  'slug',
  'name',
  'scientific_name',
  'category',
  'sun_requirements',
  'soil_type',
  'plant_size',
  'usda_zone_min',
  'usda_zone_max',
  'name_en_aliases',
  'search_terms',
  ...Object.keys(PLANT_SPECIES_LANGUAGE_FIELDS),
].join(',');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  if (typeof slug !== 'string' || !slug.trim()) {
    return res.status(400).json({ error: 'Slug parameter is required' });
  }

  const supabase = getSupabaseServerClient();
  const normalizedSlug = slug.trim().toLowerCase();

  // Try exact slug match first
  let { data, error } = await supabase
    .from('plant_species')
    .select(BASE_SELECT)
    .eq('slug', normalizedSlug)
    .single();

  // If not found by slug, try exact name match (case-insensitive)
  if (!data && !error?.message?.includes('multiple')) {
    const nameResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .ilike('name', slug.trim())
      .limit(1)
      .single();
    
    data = nameResult.data;
    error = nameResult.error;
  }

  // If still not found, try partial name match (e.g., "Tomato" matches "Tomato (slicer)")
  if (!data && !error?.message?.includes('multiple')) {
    const partialResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .ilike('name', `${slug.trim()}%`)
      .limit(1)
      .single();
    
    data = partialResult.data;
    error = partialResult.error;
  }

  // If still not found, try searching in search_terms array
  if (!data && !error?.message?.includes('multiple')) {
    const searchTermsResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .contains('search_terms', [slug.trim()])
      .limit(1)
      .single();
    
    data = searchTermsResult.data;
    error = searchTermsResult.error;
  }

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to query plant_species by slug:', error);
    return res.status(500).json({ error: 'Failed to load plant species' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Plant species not found' });
  }

  const species = serializePlantSpecies(data as unknown as PlantSpeciesRow);

  return res.status(200).json({ species });
}
