import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../../lib/supabase/serverClient';
import {
  serializePlantSpecies,
  type PlantSpeciesRow,
  type PlantSpecies,
  PLANT_SPECIES_LANGUAGE_FIELDS,
} from '../../../../lib/grow/species';

// Type for custom_species_suggestions table rows
type CustomSpeciesRow = {
  id: string;
  common_name: string;
  scientific_name: string | null;
  common_names: string[] | null;
  wiki_data: {
    wikiUrl?: Record<string, string> | string;
    wikiDescription?: string;
    watering?: unknown;
    edibleParts?: string[];
    propagationMethods?: string[];
  } | null;
  wiki_image_url: string | null;
  wiki_image_license: string | null;
  suggestion_count: number;
};

/**
 * Serialize a custom species suggestion into a PlantSpecies-like object
 * Note: Returns a partial PlantSpecies with only the fields we have data for
 */
function serializeCustomSpecies(row: CustomSpeciesRow): PlantSpecies {
  // Extract best available wiki URL (prefer en, then global, then any available)
  const wikiUrlData = row.wiki_data?.wikiUrl;
  let bestWikiUrl: string | null = null;
  if (wikiUrlData && typeof wikiUrlData === 'object') {
    bestWikiUrl = wikiUrlData.en || wikiUrlData.global || 
      Object.values(wikiUrlData).find((v): v is string => typeof v === 'string' && v !== null) || null;
  } else if (typeof wikiUrlData === 'string') {
    bestWikiUrl = wikiUrlData;
  }

  // Build slug from scientific name or common name
  const slug = row.scientific_name 
    ? row.scientific_name.toLowerCase().replace(/\s+/g, '-')
    : row.common_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Return a partial PlantSpecies object with defaults for missing fields
  // This is safe because the frontend handles null/undefined gracefully
  return {
    slug,
    name: row.common_name,
    scientificName: row.scientific_name,
    description: row.wiki_data?.wikiDescription || null,
    advice: null,
    category: null,
    sunRequirements: null,
    soilType: null,
    plantSize: null,
    usdaZoneMin: null,
    usdaZoneMax: null,
    imageKey: null,
    aliases: row.common_names || [],
    translations: {},
    searchTerms: [],
    // Perenual fields - not available for custom species
    perenualId: null,
    perenualFamily: null,
    otherNames: [],
    // Growth & Care
    growthRate: null,
    maintenance: null,
    watering: (row.wiki_data?.watering as string) || null,
    wateringBenchmark: null,
    wateringPeriod: null,
    droughtTolerant: false,
    saltTolerant: false,
    thorny: false,
    invasive: false,
    tropical: false,
    indoor: false,
    careLevel: null,
    // Dimensions
    dimension: null,
    dimensions: null,
    averageHeightCm: null,
    maximumHeightCm: null,
    averageSpreadCm: null,
    maximumSpreadCm: null,
    // Environmental
    sunlight: [],
    soil: [],
    hardinessMin: null,
    hardinessMax: null,
    // Flowering & Visual
    flowers: false,
    floweringSeason: null,
    flowerColor: null,
    cones: false,
    fruits: false,
    edibleFruit: false,
    edibleFruitTasteProfile: null,
    fruitNutritionalValue: null,
    fruitColor: [],
    harvestSeason: null,
    harvestMethod: null,
    leaf: false,
    leafColor: [],
    edibleLeaf: false,
    edibleLeafTasteProfile: null,
    leafNutritionalValue: null,
    cuisine: false,
    cuisineList: null,
    medicinal: false,
    medicinalUse: null,
    medicinalMethod: null,
    // Toxicity
    poisonousToHumans: 0,
    poisonousToPets: 0,
    poisonEffectsToHumans: null,
    poisonEffectsToPets: null,
    poisonToHumansCure: null,
    poisonToPetsCure: null,
    // Wildlife
    attracts: [],
    pestSusceptibility: [],
    // Propagation
    propagation: row.wiki_data?.propagationMethods || [],
    seeds: 0,
    // Images
    perenualImage: null,
    // Care guides
    careGuides: [],
    // Sync metadata
    perenualLastSyncedAt: null,
    // Custom species fields
    isCustomSpecies: true,
    suggestionCount: row.suggestion_count || 1,
    wikiUrl: bestWikiUrl,
    wikiImageUrl: row.wiki_image_url,
    wikiImageLicense: row.wiki_image_license,
    edibleParts: row.wiki_data?.edibleParts || null,
    propagationMethods: row.wiki_data?.propagationMethods || null,
  };
}

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
  'propagation',
  'seeds',
  'perenual_default_image',
  'care_guides',
  'perenual_last_synced_at',
  ...Object.keys(PLANT_SPECIES_LANGUAGE_FIELDS),
].join(',');

// ============================================================================
// Server-side Memory Cache
// Caches all species data in memory to avoid repeated DB queries.
// Cache persists for the lifetime of the serverless instance (typically 5-15 min).
// ============================================================================
interface SpeciesCache {
  data: PlantSpeciesRow[];
  bySlug: Map<string, PlantSpeciesRow>;
  byNameLower: Map<string, PlantSpeciesRow>;
  timestamp: number;
}

let speciesCache: SpeciesCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all species from cache or fetch from DB if cache is stale/empty.
 */
async function getAllSpeciesWithCache(): Promise<SpeciesCache | null> {
  // Return cached data if still fresh
  if (speciesCache && Date.now() - speciesCache.timestamp < CACHE_TTL_MS) {
    return speciesCache;
  }

  // Fetch fresh data from Supabase
  const supabase = getSupabaseServerClient();
  const { data: allSpecies, error } = await supabase
    .from('plant_species')
    .select(BASE_SELECT);

  if (error) {
    console.error('Failed to fetch plant species:', error);
    return null;
  }

  if (!allSpecies || allSpecies.length === 0) {
    return null;
  }

  // Build lookup indices
  const bySlug = new Map<string, PlantSpeciesRow>();
  const byNameLower = new Map<string, PlantSpeciesRow>();
  const rows: PlantSpeciesRow[] = [];

  for (const row of allSpecies) {
    const typedRow = row as unknown as PlantSpeciesRow;
    rows.push(typedRow);
    bySlug.set(typedRow.slug.toLowerCase(), typedRow);
    byNameLower.set(typedRow.name.toLowerCase(), typedRow);
  }

  // Update cache
  speciesCache = {
    data: rows,
    bySlug,
    byNameLower,
    timestamp: Date.now(),
  };

  console.log(`[Species Cache] Refreshed with ${rows.length} species`);
  return speciesCache;
}

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

  const results: Record<string, PlantSpecies> = {};
  const notFound: string[] = [];

  // Normalize names for lookup - keep original for result mapping
  const nameMap = new Map<string, string>(); // normalized -> original
  const uniqueNames: string[] = [];
  for (const n of names) {
    const normalized = n.trim().toLowerCase();
    if (!nameMap.has(normalized)) {
      nameMap.set(normalized, n);
      uniqueNames.push(normalized);
    }
  }

  // Extract base names for all lookups
  const baseNameMap = new Map<string, string>(); // normalized -> baseName
  for (const name of uniqueNames) {
    const baseName = name.split(/[\(/]/)[0].trim();
    baseNameMap.set(name, baseName);
  }

  // Helper to mark a name as found
  const foundNames = new Set<string>();
  const markFound = (searchName: string, row: PlantSpeciesRow) => {
    if (!foundNames.has(searchName)) {
      foundNames.add(searchName);
      results[searchName] = serializePlantSpecies(row);
    }
  };

  // Helper to mark custom species as found
  const markCustomFound = (searchName: string, customData: CustomSpeciesRow) => {
    if (!foundNames.has(searchName)) {
      foundNames.add(searchName);
      results[searchName] = serializeCustomSpecies(customData);
    }
  };

  // Get species data from cache (or fetch if cache is stale)
  const cache = await getAllSpeciesWithCache();

  if (!cache) {
    // No species in database or error
    return res.status(200).json({ species: {}, notFound: uniqueNames });
  }

  const { data: allRows, bySlug, byNameLower } = cache;

  // Match each requested name using multiple strategies
  for (const name of uniqueNames) {
    if (foundNames.has(name)) continue;

    const baseName = baseNameMap.get(name) || name;
    const baseSlug = baseName.replace(/\s+/g, '-');

    // Strategy 1: Exact slug match
    const slugMatch = bySlug.get(name);
    if (slugMatch) {
      markFound(name, slugMatch);
      continue;
    }

    // Strategy 2: Exact name match (case-insensitive)
    const nameMatch = byNameLower.get(name);
    if (nameMatch) {
      markFound(name, nameMatch);
      continue;
    }

    // Strategy 3: Base name as slug (e.g., "bean (bush)" -> slug "bean")
    if (baseName !== name) {
      const baseSlugMatch = bySlug.get(baseSlug);
      if (baseSlugMatch) {
        markFound(name, baseSlugMatch);
        continue;
      }
    }

    // Strategy 4: Search in all rows for partial matches
    let found = false;
    for (const row of allRows) {
      const rowNameLower = row.name.toLowerCase();

      // Partial name match (name starts with search term)
      if (rowNameLower.startsWith(name) || rowNameLower.startsWith(baseName)) {
        markFound(name, row);
        found = true;
        break;
      }

      // Name contains search term
      if (rowNameLower.includes(baseName)) {
        markFound(name, row);
        found = true;
        break;
      }

      // Check search_terms array
      if (row.search_terms && Array.isArray(row.search_terms)) {
        const searchTermsLower = row.search_terms.map((t: string) => t.toLowerCase());
        if (searchTermsLower.some((t: string) => t.includes(name) || t.includes(baseName))) {
          markFound(name, row);
          found = true;
          break;
        }
      }

      // Check name_en_aliases array
      if (row.name_en_aliases && Array.isArray(row.name_en_aliases)) {
        const aliasesLower = row.name_en_aliases.map((a: string) => a.toLowerCase());
        if (aliasesLower.some((a: string) => a.includes(name) || a.includes(baseName))) {
          markFound(name, row);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      notFound.push(name);
    }
  }

  // ========================================================================
  // FALLBACK: Check custom_species_suggestions for any not found in plant_species
  // ========================================================================
  if (notFound.length > 0) {
    const supabase = getSupabaseServerClient();
    
    // Helper function to generate slug (matches the database function)
    const generateSlug = (name: string): string => {
      return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
    };
    
    // Build search terms for custom species lookup
    const customSearchTerms = notFound.map(name => {
      const baseName = baseNameMap.get(name) || name;
      // Generate the expected slug format for direct lookup
      const slug = generateSlug(baseName);
      // For slug "small-leaved-gentian", we need to try multiple patterns:
      // 1. Direct slug match (fastest, most reliable)
      // 2. Replace all hyphens with spaces: "small leaved gentian"
      // 3. Keep hyphens (some names like "Small-leaved" have internal hyphens): "small-leaved-gentian"
      // 4. Use wildcard pattern for flexible matching
      const withSpaces = baseName.replace(/-/g, ' ');
      const withHyphens = baseName; // keep original
      return { original: name, slug, withSpaces, withHyphens };
    });

    // Query custom_species_suggestions for all not-found names
    for (const { original, slug, withSpaces, withHyphens } of customSearchTerms) {
      if (foundNames.has(original)) continue;

      let customData = null;

      // Strategy 1: Try exact slug match (most reliable, uses indexed column)
      const { data: matchSlug } = await supabase
        .from('custom_species_suggestions')
        .select('*')
        .eq('slug', slug)
        .limit(1)
        .single();
      customData = matchSlug;

      // Strategy 2: Try exact common name match with spaces
      if (!customData) {
        const { data: match1 } = await supabase
          .from('custom_species_suggestions')
          .select('*')
          .ilike('common_name', withSpaces)
          .limit(1)
          .single();
        customData = match1;
      }

      // Strategy 3: Try exact common name match with hyphens preserved
      if (!customData) {
        const { data: match2 } = await supabase
          .from('custom_species_suggestions')
          .select('*')
          .ilike('common_name', withHyphens)
          .limit(1)
          .single();
        customData = match2;
      }

      // Strategy 4: Try scientific name match (with spaces replacing hyphens)
      if (!customData) {
        const { data: match3 } = await supabase
          .from('custom_species_suggestions')
          .select('*')
          .ilike('scientific_name', withSpaces)
          .limit(1)
          .single();
        customData = match3;
      }

      // Strategy 5: Try wildcard partial match on common name
      // e.g., "%small%leaved%gentian%" matches "Small-leaved Gentian"
      if (!customData) {
        const wildcardPattern = `%${withSpaces.split(' ').join('%')}%`;
        const { data: match4 } = await supabase
          .from('custom_species_suggestions')
          .select('*')
          .ilike('common_name', wildcardPattern)
          .limit(1)
          .single();
        customData = match4;
      }

      // Strategy 6: Try slugified scientific name match
      // e.g., "gentiana-brachyphylla" -> "gentiana brachyphylla"
      if (!customData) {
        const scientificSearch = withHyphens.replace(/-/g, ' ');
        const { data: match5 } = await supabase
          .from('custom_species_suggestions')
          .select('*')
          .ilike('scientific_name', scientificSearch)
          .limit(1)
          .single();
        customData = match5;
      }

      if (customData) {
        markCustomFound(original, customData as CustomSpeciesRow);
        // Remove from notFound
        const idx = notFound.indexOf(original);
        if (idx !== -1) notFound.splice(idx, 1);
      }
    }
  }

  // Cache for 5 minutes
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  return res.status(200).json({ species: results, notFound });
}
