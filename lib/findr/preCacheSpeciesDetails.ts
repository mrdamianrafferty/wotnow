/**
 * Pre-cache species details for offline access
 *
 * Fetches species details (bios, techniques, baits) for predicted species
 * and caches them for offline viewing.
 */

import {
  cacheSpeciesDetails,
  getCachedSpeciesAdvice,
  type CachedSpeciesDetails,
} from '@/lib/offline/speciesAdviceCache';
import { SPECIES_IMAGE_MAP } from '@/data/speciesImageMap';
import { getFindrFishBio } from '@/data/findrFishBios';

interface PredictedSpecies {
  species_id?: string;
  species_code?: string;
  species_common_name?: string;
}

/**
 * Look up bio for a species by name
 * Uses the existing getFindrFishBio function which handles normalization
 */
function getBioForSpecies(name: string): string | undefined {
  return getFindrFishBio(name);
}

/**
 * Pre-cache species details for all predicted species
 *
 * This is called after predictions are loaded to cache species text
 * (bios, names, etc.) for offline access.
 *
 * @param rectangleCode - The ICES rectangle code
 * @param predictions - Array of predicted species
 * @param forceRefresh - Force refresh even if cache exists
 */
export async function preCacheSpeciesDetails(
  rectangleCode: string,
  predictions: PredictedSpecies[],
  forceRefresh = false
): Promise<void> {
  if (!rectangleCode || predictions.length === 0) {
    return;
  }

  // Check if we already have cached data for this rectangle
  if (!forceRefresh) {
    const existing = await getCachedSpeciesAdvice(rectangleCode);
    if (existing && existing.species.length > 0) {
      console.log('[preCacheSpeciesDetails] Cache exists for', rectangleCode, '- skipping');
      return;
    }
  }

  console.log('[preCacheSpeciesDetails] Caching', predictions.length, 'species for', rectangleCode);

  // Build species details from predictions + local data
  const speciesDetails: CachedSpeciesDetails[] = [];

  for (const prediction of predictions) {
    const speciesCode = prediction.species_code || prediction.species_id;
    const speciesName = prediction.species_common_name;

    if (!speciesCode || !speciesName) continue;

    // Get image info from local map
    const imageInfo = SPECIES_IMAGE_MAP[speciesCode];

    // Get bio from local bios data
    const playfulBio = getBioForSpecies(speciesName);

    const details: CachedSpeciesDetails = {
      species_id: prediction.species_id || speciesCode,
      species_code: speciesCode,
      name_en: speciesName,
      scientific_name: imageInfo?.scientificName || undefined,
      playful_bio: playfulBio,
      // Note: techniques, baits, and habitats would require API calls
      // We cache these when the user views species details or advice
    };

    speciesDetails.push(details);
  }

  // Cache the species details
  if (speciesDetails.length > 0) {
    await cacheSpeciesDetails(rectangleCode, speciesDetails);
    console.log('[preCacheSpeciesDetails] Cached', speciesDetails.length, 'species for', rectangleCode);
  }
}

/**
 * Fetch and cache detailed species info from API
 * (Called when user views species details to get techniques/baits)
 */
export async function fetchAndCacheSpeciesDetails(
  rectangleCode: string,
  speciesCode: string
): Promise<CachedSpeciesDetails | null> {
  try {
    const url = `/api/findr/species-details?species_code=${encodeURIComponent(speciesCode)}&rectangle_code=${encodeURIComponent(rectangleCode)}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn('[fetchAndCacheSpeciesDetails] API error:', response.status);
      return null;
    }

    const data = await response.json();

    // Build cached species details
    const details: CachedSpeciesDetails = {
      species_id: data.species_id,
      species_code: data.species_code,
      name_en: data.name_en,
      scientific_name: data.scientific_name,
      playful_bio: getBioForSpecies(data.name_en),
      fun_fact: data.fun_fact,
      techniques: data.techniques?.map((t: { technique_name: string }) => t.technique_name) || [],
      baits: data.bait?.map((b: { bait_name: string }) => b.bait_name) || [],
      guild: data.guild,
      eating_quality: data.eating_quality,
      conservation_status: data.conservation_status,
    };

    // Get existing cached species and update with new details
    const existing = await getCachedSpeciesAdvice(rectangleCode);
    if (existing) {
      const updatedSpecies = existing.species.map((s) =>
        s.species_code === speciesCode ? { ...s, ...details } : s
      );

      // If not found, add it
      if (!updatedSpecies.find((s) => s.species_code === speciesCode)) {
        updatedSpecies.push(details);
      }

      await cacheSpeciesDetails(rectangleCode, updatedSpecies);
    } else {
      await cacheSpeciesDetails(rectangleCode, [details]);
    }

    return details;
  } catch (error) {
    console.error('[fetchAndCacheSpeciesDetails] Error:', error);
    return null;
  }
}

export default preCacheSpeciesDetails;
