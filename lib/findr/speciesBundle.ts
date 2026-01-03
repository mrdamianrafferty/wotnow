/**
 * Species Bundle Loader
 *
 * Loads the static species bundle for offline access.
 * Pre-caches species images in the background.
 */

import type { SpeciesBundle, BundledSpecies } from '@/types/speciesBundle';

let bundleCache: SpeciesBundle | null = null;
let loadPromise: Promise<SpeciesBundle> | null = null;

/**
 * Load the species bundle (cached after first load)
 */
export async function loadSpeciesBundle(): Promise<SpeciesBundle> {
  // Return cached bundle if available
  if (bundleCache) return bundleCache;

  // Return existing load promise if in progress
  if (loadPromise) return loadPromise;

  // Start loading
  loadPromise = (async () => {
    try {
      // Try to load from local bundle first (faster)
      const response = await fetch('/data/species-bundle.min.json');
      if (!response.ok) throw new Error('Failed to load species bundle');

      const bundle = await response.json() as SpeciesBundle;
      bundleCache = bundle;
      return bundle;
    } catch (error) {
      console.error('[speciesBundle] Failed to load bundle:', error);
      // Return empty bundle on error
      return {
        version: '0.0.0',
        generatedAt: new Date().toISOString(),
        count: 0,
        species: [],
        byCode: {},
        bySlug: {},
        imageUrls: [],
        byGuild: {},
      };
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Get species by code (synchronous if bundle already loaded)
 */
export function getSpeciesByCode(code: string): BundledSpecies | null {
  if (!bundleCache) return null;
  return bundleCache.byCode[code] || null;
}

/**
 * Get species by slug (synchronous if bundle already loaded)
 */
export function getSpeciesBySlug(slug: string): BundledSpecies | null {
  if (!bundleCache) return null;
  return bundleCache.bySlug[slug] || null;
}

/**
 * Get all species (synchronous if bundle already loaded)
 */
export function getAllSpecies(): BundledSpecies[] {
  return bundleCache?.species || [];
}

/**
 * Get species by guild
 */
export function getSpeciesByGuild(guild: string): BundledSpecies[] {
  if (!bundleCache) return [];
  const codes = bundleCache.byGuild[guild] || [];
  return codes.map(code => bundleCache!.byCode[code]).filter(Boolean);
}

/**
 * Search species by name (case-insensitive)
 */
export function searchSpecies(query: string): BundledSpecies[] {
  if (!bundleCache || !query.trim()) return [];

  const lowerQuery = query.toLowerCase().trim();

  return bundleCache.species.filter(species => {
    // Search in common name
    if (species.name_en?.toLowerCase().includes(lowerQuery)) return true;

    // Search in scientific name
    if (species.scientific_name?.toLowerCase().includes(lowerQuery)) return true;

    // Search in localized names
    if (species.name_fr?.toLowerCase().includes(lowerQuery)) return true;
    if (species.name_es?.toLowerCase().includes(lowerQuery)) return true;
    if (species.name_de?.toLowerCase().includes(lowerQuery)) return true;
    if (species.name_it?.toLowerCase().includes(lowerQuery)) return true;
    if (species.name_pt?.toLowerCase().includes(lowerQuery)) return true;

    // Search in aliases
    if (species.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))) return true;

    return false;
  });
}

/**
 * Check if bundle is loaded
 */
export function isBundleLoaded(): boolean {
  return bundleCache !== null;
}

/**
 * Get bundle metadata
 */
export function getBundleMetadata(): { version: string; generatedAt: string; count: number } | null {
  if (!bundleCache) return null;
  return {
    version: bundleCache.version,
    generatedAt: bundleCache.generatedAt,
    count: bundleCache.count,
  };
}

/**
 * Pre-cache all species images
 * Returns progress callback for UI updates
 */
export async function preCacheSpeciesImages(
  onProgress?: (loaded: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const bundle = await loadSpeciesBundle();

  if (bundle.imageUrls.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;
  const total = bundle.imageUrls.length;

  // Pre-cache images in batches to avoid overwhelming the browser
  const BATCH_SIZE = 10;

  for (let i = 0; i < bundle.imageUrls.length; i += BATCH_SIZE) {
    const batch = bundle.imageUrls.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (url) => {
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = url;
          });
          success++;
        } catch {
          failed++;
        }
      })
    );

    // Report progress
    if (onProgress) {
      onProgress(success + failed, total);
    }

    // Small delay between batches to keep UI responsive
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`[speciesBundle] Pre-cached ${success}/${total} images (${failed} failed)`);

  return { success, failed };
}

/**
 * Pre-cache a single species image
 */
export async function preCacheSpeciesImage(slug: string): Promise<boolean> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = `/PNGS/${slug}.webp`;
    });
    return true;
  } catch {
    return false;
  }
}
