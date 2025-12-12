import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../../lib/supabase/serverClient';
import {
  serializePlantSpecies,
  type PlantSpeciesRow,
  type PlantSpecies,
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

interface BatchResponse {
  species: Record<string, PlantSpecies>;
  notFound: string[];
}

/**
 * Batch lookup for plant species by name.
 * POST /api/grow/species/batch
 * Body: { names: string[] }
 * Returns: { species: { [name]: PlantSpecies }, notFound: string[] }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<BatchResponse | { error: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { names } = req.body as { names?: string[] };

  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: 'names array is required' });
  }

  // Limit batch size to prevent abuse
  const MAX_BATCH_SIZE = 100;
  if (names.length > MAX_BATCH_SIZE) {
    return res.status(400).json({ error: `Maximum batch size is ${MAX_BATCH_SIZE}` });
  }

  const supabase = getSupabaseServerClient();
  const results: Record<string, PlantSpecies> = {};
  const notFound: string[] = [];

  // Normalize names for lookup
  const normalizedNames = names.map(n => n.trim().toLowerCase());
  const uniqueNames = [...new Set(normalizedNames)];

  // Strategy 1: Fetch all by exact slug match (most efficient)
  const { data: slugMatches } = await supabase
    .from('plant_species')
    .select(BASE_SELECT)
    .in('slug', uniqueNames);

  if (slugMatches) {
    for (const row of slugMatches) {
      const typedRow = row as unknown as PlantSpeciesRow;
      const species = serializePlantSpecies(typedRow);
      results[typedRow.slug] = species;
    }
  }

  // Find names that weren't matched by slug
  const unmatchedBySlug = uniqueNames.filter(name => !results[name]);

  if (unmatchedBySlug.length > 0) {
    // Strategy 2: Try various matching strategies for each unmatched name
    for (const name of unmatchedBySlug) {
      // Skip if already found
      if (results[name]) continue;

      // Extract base name (before parentheses or slashes) for fallback matching
      // e.g., "bean (bush)" -> "bean", "broad bean / fava bean" -> "broad bean"
      const baseName = name.split(/[\(/]/)[0].trim();

      // Try base name as slug (e.g., "bean (bush)" -> slug "bean")
      if (baseName !== name) {
        const baseSlug = baseName.replace(/\s+/g, '-');
        const { data: baseSlugMatches } = await supabase
          .from('plant_species')
          .select(BASE_SELECT)
          .eq('slug', baseSlug)
          .limit(1);

        if (baseSlugMatches && baseSlugMatches.length > 0) {
          const species = serializePlantSpecies(baseSlugMatches[0] as unknown as PlantSpeciesRow);
          results[name] = species;
          continue;
        }
      }

      // Try partial name match (e.g., "tomato" matches "Tomato (slicer)")
      const { data: nameMatches } = await supabase
        .from('plant_species')
        .select(BASE_SELECT)
        .ilike('name', `${name}%`)
        .limit(1);

      if (nameMatches && nameMatches.length > 0) {
        const species = serializePlantSpecies(nameMatches[0] as unknown as PlantSpeciesRow);
        results[name] = species;
        continue;
      }

      // Try partial match with base name (e.g., "bean" matches "Bean (Bush)")
      if (baseName !== name) {
        const { data: baseNameMatches } = await supabase
          .from('plant_species')
          .select(BASE_SELECT)
          .ilike('name', `${baseName}%`)
          .limit(1);

        if (baseNameMatches && baseNameMatches.length > 0) {
          const species = serializePlantSpecies(baseNameMatches[0] as unknown as PlantSpeciesRow);
          results[name] = species;
          continue;
        }
      }

      // Try "contains" search in name
      const { data: containsMatches } = await supabase
        .from('plant_species')
        .select(BASE_SELECT)
        .ilike('name', `%${baseName}%`)
        .limit(1);

      if (containsMatches && containsMatches.length > 0) {
        const species = serializePlantSpecies(containsMatches[0] as unknown as PlantSpeciesRow);
        results[name] = species;
        continue;
      }

      // Try search_terms array
      const { data: searchTermMatches } = await supabase
        .from('plant_species')
        .select(BASE_SELECT)
        .contains('search_terms', [name])
        .limit(1);

      if (searchTermMatches && searchTermMatches.length > 0) {
        const species = serializePlantSpecies(searchTermMatches[0] as unknown as PlantSpeciesRow);
        results[name] = species;
        continue;
      }

      // Try name_en_aliases array
      const { data: aliasMatches } = await supabase
        .from('plant_species')
        .select(BASE_SELECT)
        .contains('name_en_aliases', [name])
        .limit(1);

      if (aliasMatches && aliasMatches.length > 0) {
        const species = serializePlantSpecies(aliasMatches[0] as unknown as PlantSpeciesRow);
        results[name] = species;
        continue;
      }

      // Not found by any method
      notFound.push(name);
    }
  }

  // Cache for 5 minutes
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  return res.status(200).json({ species: results, notFound });
}
