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
  'description',
  'advice',
  'category',
  'sun_requirements',
  'soil_type',
  'plant_size',
  'usda_zone_min',
  'usda_zone_max',
  'image_key',
  'name_en_aliases',
  'search_terms',
  // Perenual fields
  'perenual_id',
  'perenual_family',
  'perenual_other_names',
  'growth_rate',
  'maintenance',
  'watering',
  'watering_general_benchmark',
  'watering_period',
  'drought_tolerant',
  'salt_tolerant',
  'thorny',
  'invasive',
  'tropical',
  'indoor',
  'care_level',
  'dimension',
  'dimensions',
  'average_height_cm',
  'maximum_height_cm',
  'average_spread_cm',
  'maximum_spread_cm',
  'sunlight',
  'soil',
  'hardiness_min',
  'hardiness_max',
  'flowers',
  'flowering_season',
  'flower_color',
  'cones',
  'fruits',
  'edible_fruit',
  'edible_fruit_taste_profile',
  'fruit_nutritional_value',
  'fruit_color',
  'harvest_season',
  'harvest_method',
  'leaf',
  'leaf_color',
  'edible_leaf',
  'edible_leaf_taste_profile',
  'leaf_nutritional_value',
  'cuisine',
  'cuisine_list',
  'medicinal',
  'medicinal_use',
  'medicinal_method',
  'poisonous_to_humans',
  'poisonous_to_pets',
  'poison_effects_to_humans',
  'poison_effects_to_pets',
  'poison_to_humans_cure',
  'poison_to_pets_cure',
  'attracts',
  'pest_susceptibility',
  'propagation',
  'seeds',
  'perenual_default_image',
  'care_guides',
  'perenual_last_synced_at',
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
  
  // Extract base name (before parentheses or slashes) for fallback matching
  // e.g., "Bean (Bush)" -> "bean", "Broad bean / fava bean" -> "broad bean"
  const baseName = slug.trim().split(/[\(/]/)[0].trim().toLowerCase();

  // Try exact slug match first
  let { data, error } = await supabase
    .from('plant_species')
    .select(BASE_SELECT)
    .eq('slug', normalizedSlug)
    .single();

  // If not found by slug, try the base name as slug (e.g., "bean (bush)" -> slug "bean")
  if (!data && !error?.message?.includes('multiple') && baseName !== normalizedSlug) {
    const baseSlugResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .eq('slug', baseName.replace(/\s+/g, '-'))
      .single();
    
    data = baseSlugResult.data;
    error = baseSlugResult.error;
  }

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

  // If still not found, try partial match with base name (e.g., "bean" matches "Bean (Bush)")
  if (!data && !error?.message?.includes('multiple') && baseName) {
    const basePartialResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .ilike('name', `${baseName}%`)
      .limit(1)
      .single();
    
    data = basePartialResult.data;
    error = basePartialResult.error;
  }

  // If still not found, try "contains" search in name (e.g., "bush bean" might match)
  if (!data && !error?.message?.includes('multiple')) {
    const containsResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .ilike('name', `%${baseName}%`)
      .limit(1)
      .single();
    
    data = containsResult.data;
    error = containsResult.error;
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

  // If still not found, try searching in name_en_aliases array
  if (!data && !error?.message?.includes('multiple')) {
    const aliasResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .contains('name_en_aliases', [slug.trim()])
      .limit(1)
      .single();
    
    data = aliasResult.data;
    error = aliasResult.error;
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
