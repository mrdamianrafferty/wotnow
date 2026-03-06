import type { NextApiRequest, NextApiResponse } from 'next';
import type { PostgrestResponse } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '../../../../lib/supabase/serverClient';
import {
  serializePlantSpecies,
  type PlantSpeciesRow,
  PLANT_SPECIES_LANGUAGE_FIELDS,
} from '../../../../lib/grow/species';

const MAX_LIMIT = 50;

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
  'pest_resilience_score',
  'pest_resilience_note',
  'propagation',
  'seeds',
  'perenual_default_image',
  'care_guides',
  'perenual_last_synced_at',
  // Companion planting
  'companions_with',
  'companions_avoid',
  // Rotation
  'rotation_group',
  // Maturity
  'days_to_maturity_min',
  'days_to_maturity_max',
  'maturity_basis',
  'maturity_notes',
  'years_to_first_crop',
  'years_to_full_production',
  'cropping_timeline_note',
  ...Object.keys(PLANT_SPECIES_LANGUAGE_FIELDS),
].join(',');

function normaliseLimit(value: unknown): number {
  if (typeof value !== 'string') {
    return 20;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function normaliseOffset(value: unknown): number {
  if (typeof value !== 'string') {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function sanitiseSearchTerm(term: string): string {
  return term
    .replace(/[,%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();

  const searchTermRaw = typeof req.query.q === 'string' ? req.query.q : '';
  const categoryRaw = typeof req.query.category === 'string' ? req.query.category : '';
  const limit = normaliseLimit(req.query.limit);
  const offset = normaliseOffset(req.query.offset);

  let query = supabase
    .from('plant_species')
    .select(BASE_SELECT, { count: 'exact' })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (categoryRaw.trim()) {
    query = query.eq('category', categoryRaw.trim());
  }

  const searchTerm = sanitiseSearchTerm(searchTermRaw);
  if (searchTerm) {
    const escaped = searchTerm.replace(/([%_])/g, '\\$1');
    const likePattern = `%${escaped}%`;
    const orFilters = [
      `name.ilike.${likePattern}`,
      `scientific_name.ilike.${likePattern}`,
    ];

    (Object.keys(PLANT_SPECIES_LANGUAGE_FIELDS) as Array<keyof typeof PLANT_SPECIES_LANGUAGE_FIELDS>)
      .forEach((fieldKey) => {
        orFilters.push(`${fieldKey}.ilike.${likePattern}`);
      });

    query = query.or(orFilters.join(','));
  }

  const { data, error, count } = await query as PostgrestResponse<PlantSpeciesRow>;

  if (error) {
    console.error('Failed to query plant_species:', error.message, error.code, error.details, error.hint);
    return res.status(500).json({ error: 'Failed to load plant species' });
  }

  const species = (data ?? []).map((row) => serializePlantSpecies(row));

  return res.status(200).json({
    species,
    total: count ?? species.length,
  });
}
