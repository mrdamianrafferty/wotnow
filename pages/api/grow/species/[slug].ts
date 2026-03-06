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
  
  // Convert slug back to search term (replace hyphens with spaces)
  // e.g., "ilex-aquifolium" -> "ilex aquifolium"
  const searchTerm = normalizedSlug.replace(/-/g, ' ');
  
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

  // Try scientific name match early (for Plant.id API slugified names like "ilex-aquifolium")
  if (!data && !error?.message?.includes('multiple') && searchTerm.includes(' ')) {
    const scientificEarlyResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .ilike('scientific_name', searchTerm)
      .limit(1)
      .single();
    
    data = scientificEarlyResult.data;
    error = scientificEarlyResult.error;
  }

  // Try partial scientific name match (e.g., "daucus carota" matches "Daucus carota subsp. sativus")
  if (!data && !error?.message?.includes('multiple') && searchTerm.includes(' ')) {
    const scientificPartialResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .ilike('scientific_name', `${searchTerm}%`)
      .limit(1)
      .single();
    
    data = scientificPartialResult.data;
    error = scientificPartialResult.error;
  }

  // Also try perenual_scientific_name early (it's an array, so use contains)
  if (!data && !error?.message?.includes('multiple') && searchTerm.includes(' ')) {
    const perenualSciEarlyResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .contains('perenual_scientific_name', [searchTerm])
      .limit(1)
      .single();
    
    data = perenualSciEarlyResult.data;
    error = perenualSciEarlyResult.error;
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

  // Try scientific name match (Latin binomial from Plant.id API)
  if (!data && !error?.message?.includes('multiple')) {
    const scientificResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .ilike('scientific_name', slug.trim())
      .limit(1)
      .single();
    
    data = scientificResult.data;
    error = scientificResult.error;
  }

  // Try partial scientific name match (genus match)
  if (!data && !error?.message?.includes('multiple')) {
    // Extract genus (first word) for broader matching
    const genus = slug.trim().split(' ')[0];
    if (genus && genus.length > 2) {
      const genusResult = await supabase
        .from('plant_species')
        .select(BASE_SELECT)
        .ilike('scientific_name', `${genus}%`)
        .limit(1)
        .single();
      
      data = genusResult.data;
      error = genusResult.error;
    }
  }

  // Try perenual_scientific_name field (it's an array, so use contains)
  if (!data && !error?.message?.includes('multiple')) {
    const perenualSciResult = await supabase
      .from('plant_species')
      .select(BASE_SELECT)
      .contains('perenual_scientific_name', [slug.trim()])
      .limit(1)
      .single();
    
    data = perenualSciResult.data;
    error = perenualSciResult.error;
  }

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to query plant_species by slug:', error);
    return res.status(500).json({ error: 'Failed to load plant species' });
  }

  if (!data) {
    // Fallback: Check custom_species_suggestions for user-contributed species
    // The slug could be:
    // 1. URL-encoded common name: "Small-leaved%20Gentian" -> "Small-leaved Gentian"
    // 2. Slugified scientific name: "gentiana-brachyphylla" -> "gentiana brachyphylla"
    const decodedSlug = decodeURIComponent(slug.trim());
    const scientificSearchTerm = normalizedSlug.replace(/-/g, ' ');
    
    // Try common name match first - convert slug back to spaces for matching
    // e.g., "small-leaved-gentian" -> "small-leaved gentian"
    const commonNameSearch = decodedSlug.replace(/-/g, ' ');
    const { data: customByName, error: customError } = await supabase
      .from('custom_species_suggestions')
      .select('*')
      .ilike('common_name', commonNameSearch)
      .limit(1)
      .single();
    
    // If not found, try scientific name
    let customData = customByName;
    if (!customData && customError?.code === 'PGRST116') {
      const sciResult = await supabase
        .from('custom_species_suggestions')
        .select('*')
        .ilike('scientific_name', scientificSearchTerm)
        .limit(1)
        .single();
      customData = sciResult.data;
    }
    
    if (customData) {
      // Build a synthetic PlantSpecies object from custom suggestion data
      
      // Extract best available wiki URL (prefer en, then global, then any available)
      const wikiUrlData = customData.wiki_data?.wikiUrl;
      let bestWikiUrl: string | null = null;
      if (wikiUrlData && typeof wikiUrlData === 'object') {
        bestWikiUrl = wikiUrlData.en || wikiUrlData.global || 
          Object.values(wikiUrlData).find((v): v is string => typeof v === 'string' && v !== null) || null;
      } else if (typeof wikiUrlData === 'string') {
        bestWikiUrl = wikiUrlData;
      }
      
      const syntheticSpecies = {
        slug: customData.scientific_name?.toLowerCase().replace(/\s+/g, '-') || slugify(customData.common_name),
        name: customData.common_name,
        scientificName: customData.scientific_name,
        description: customData.wiki_data?.wikiDescription || null,
        advice: null,
        category: null,
        sunRequirements: null,
        soilType: null,
        plantSize: null,
        usdaZoneMin: null,
        usdaZoneMax: null,
        imageKey: null,
        nameEnAliases: customData.common_names || [],
        searchTerms: [],
        // Wiki data
        wikiUrl: bestWikiUrl,
        wikiImageUrl: customData.wiki_image_url,
        wikiImageLicense: customData.wiki_image_license,
        // Mark as custom/community species
        isCustomSpecies: true,
        suggestionCount: customData.suggestion_count || 1,
        // Include any additional wiki data
        watering: customData.wiki_data?.watering || null,
        edibleParts: customData.wiki_data?.edibleParts || null,
        propagationMethods: customData.wiki_data?.propagationMethods || null,
      };
      
      return res.status(200).json({ species: syntheticSpecies, isCustomSpecies: true });
    }
    
    return res.status(404).json({ error: 'Plant species not found' });
  }

  const species = serializePlantSpecies(data as unknown as PlantSpeciesRow);

  return res.status(200).json({ species });
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
