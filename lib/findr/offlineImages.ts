/**
 * Offline Image Pre-loading for Findr
 *
 * Pre-caches species images for offline access using the Cache API.
 * Works with Next.js Image optimization - caches the optimized versions.
 *
 * Features:
 * - Progressive loading: thumbnails first, then mobile, then full
 * - Respects user's connection (only pre-loads on good connections)
 * - Background loading that doesn't block the UI
 * - Tracks which images are cached
 *
 * Usage:
 * ```typescript
 * import { preloadTopSpeciesImages, isImageCached } from '@/lib/findr/offlineImages';
 *
 * // Pre-load images for predictions
 * preloadTopSpeciesImages(predictions, 10);
 *
 * // Check if a specific image is cached
 * const cached = await isImageCached('/webp/cod.webp');
 * ```
 */

import { SPECIES_IMAGE_MAP, SpeciesImageInfo } from '@/data/speciesImageMap';

const CACHE_NAME = 'findr-species-images-v1';
const PRELOAD_STORAGE_KEY = 'findr_preloaded_images';

interface PreloadProgress {
  total: number;
  loaded: number;
  failed: number;
  timestamp: string;
}

/**
 * Check if the Cache API is available
 */
function isCacheAvailable(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/**
 * Check if we should pre-load images based on network conditions
 */
function shouldPreload(): boolean {
  if (typeof navigator === 'undefined') return false;

  // Check network information API (if available)
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  };

  if (nav.connection) {
    // Don't pre-load on slow connections or data-saver mode
    if (nav.connection.saveData) return false;
    if (nav.connection.effectiveType === 'slow-2g' || nav.connection.effectiveType === '2g') {
      return false;
    }
  }

  // Default to true if we can't determine connection quality
  return true;
}

/**
 * Get the optimized image URL from Next.js
 * Next.js serves optimized images at /_next/image with width/quality params
 */
function getOptimizedImageUrl(imagePath: string, width: number = 500): string {
  if (typeof window === 'undefined') return imagePath;

  // For local development or if the path is already absolute
  if (imagePath.startsWith('http')) return imagePath;

  // Use Next.js image optimization endpoint
  const params = new URLSearchParams({
    url: imagePath,
    w: String(width),
    q: '75', // Quality
  });

  return `/_next/image?${params.toString()}`;
}

/**
 * Pre-load a single image into the cache
 */
async function preloadImage(imagePath: string, width: number = 500): Promise<boolean> {
  if (!isCacheAvailable()) return false;

  try {
    const url = getOptimizedImageUrl(imagePath, width);
    const cache = await caches.open(CACHE_NAME);

    // Check if already cached
    const existing = await cache.match(url);
    if (existing) return true;

    // Fetch and cache
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      await cache.put(url, response);
      return true;
    }
    return false;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[offlineImages] Failed to preload: ${imagePath}`, error);
    }
    return false;
  }
}

/**
 * Get the list of species codes from predictions
 */
export function getSpeciesCodesFromPredictions(
  predictions: Array<{ speciesCode?: string; species_code?: string }>
): string[] {
  return predictions
    .map(p => p.speciesCode || p.species_code)
    .filter((code): code is string => !!code);
}

/**
 * Get image info for a species by code
 */
export function getSpeciesImageInfo(speciesCode: string): SpeciesImageInfo | null {
  return SPECIES_IMAGE_MAP[speciesCode] || null;
}

/**
 * Pre-load images for the top N species from predictions
 * Loads thumbnails first for quick display, then mobile versions
 */
export async function preloadTopSpeciesImages(
  predictions: Array<{ speciesCode?: string; species_code?: string }>,
  limit: number = 10
): Promise<PreloadProgress> {
  const progress: PreloadProgress = {
    total: 0,
    loaded: 0,
    failed: 0,
    timestamp: new Date().toISOString(),
  };

  if (!isCacheAvailable() || !shouldPreload()) {
    return progress;
  }

  const speciesCodes = getSpeciesCodesFromPredictions(predictions).slice(0, limit);
  const imagesToLoad: Array<{ path: string; width: number; priority: number }> = [];

  // Build list of images to load with priorities
  // Priority 1: Thumbnails (smallest, fastest)
  // Priority 2: Mobile versions
  // Priority 3: Full images (optional, larger)
  for (const code of speciesCodes) {
    const imageInfo = getSpeciesImageInfo(code);
    if (!imageInfo) continue;

    if (imageInfo.thumb) {
      imagesToLoad.push({ path: imageInfo.thumb, width: 100, priority: 1 });
    }
    if (imageInfo.mobile) {
      imagesToLoad.push({ path: imageInfo.mobile, width: 400, priority: 2 });
    }
    // Only load full images if on very good connection
    if (imageInfo.image && shouldPreload()) {
      imagesToLoad.push({ path: imageInfo.image, width: 800, priority: 3 });
    }
  }

  // Sort by priority
  imagesToLoad.sort((a, b) => a.priority - b.priority);
  progress.total = imagesToLoad.length;

  // Load images sequentially to avoid overwhelming the network
  for (const img of imagesToLoad) {
    const success = await preloadImage(img.path, img.width);
    if (success) {
      progress.loaded++;
    } else {
      progress.failed++;
    }
  }

  // Save progress to localStorage
  savePreloadProgress(progress);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[offlineImages] Pre-loaded ${progress.loaded}/${progress.total} images`);
  }

  return progress;
}

/**
 * Pre-load images for user's favorite species
 */
export async function preloadFavoriteImages(
  favoriteCodes: string[]
): Promise<PreloadProgress> {
  const predictions = favoriteCodes.map(code => ({ speciesCode: code }));
  return preloadTopSpeciesImages(predictions, favoriteCodes.length);
}

/**
 * Pre-load images for all species in a region (background task)
 * Call this when the app is idle
 */
export async function preloadRegionSpecies(
  regionSpeciesCodes: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<PreloadProgress> {
  const progress: PreloadProgress = {
    total: 0,
    loaded: 0,
    failed: 0,
    timestamp: new Date().toISOString(),
  };

  if (!isCacheAvailable() || !shouldPreload()) {
    return progress;
  }

  // Only load thumbnails for bulk pre-loading
  const imagesToLoad: string[] = [];
  for (const code of regionSpeciesCodes) {
    const imageInfo = getSpeciesImageInfo(code);
    if (imageInfo?.thumb) {
      imagesToLoad.push(imageInfo.thumb);
    }
  }

  progress.total = imagesToLoad.length;

  // Load in batches to avoid blocking
  const batchSize = 5;
  for (let i = 0; i < imagesToLoad.length; i += batchSize) {
    const batch = imagesToLoad.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(path => preloadImage(path, 100)));

    results.forEach(success => {
      if (success) progress.loaded++;
      else progress.failed++;
    });

    onProgress?.(progress.loaded, progress.total);

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  savePreloadProgress(progress);
  return progress;
}

/**
 * Check if a specific image is cached
 */
export async function isImageCached(imagePath: string, width: number = 500): Promise<boolean> {
  if (!isCacheAvailable()) return false;

  try {
    const url = getOptimizedImageUrl(imagePath, width);
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    return !!response;
  } catch {
    return false;
  }
}

/**
 * Get cached image as blob URL (for offline display)
 */
export async function getCachedImageUrl(imagePath: string, width: number = 500): Promise<string | null> {
  if (!isCacheAvailable()) return null;

  try {
    const url = getOptimizedImageUrl(imagePath, width);
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);

    if (!response) return null;

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Clear all cached images
 */
export async function clearImageCache(): Promise<void> {
  if (!isCacheAvailable()) return;

  try {
    await caches.delete(CACHE_NAME);
    localStorage.removeItem(PRELOAD_STORAGE_KEY);
  } catch (error) {
    console.warn('[offlineImages] Failed to clear cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ count: number; sizeEstimate: string } | null> {
  if (!isCacheAvailable()) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    // Estimate size (rough calculation)
    let totalSize = 0;
    for (const request of keys.slice(0, 20)) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    const avgSize = keys.length > 0 ? totalSize / Math.min(keys.length, 20) : 0;
    const estimatedTotal = avgSize * keys.length;

    return {
      count: keys.length,
      sizeEstimate: formatBytes(estimatedTotal),
    };
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Save preload progress to localStorage
 */
function savePreloadProgress(progress: PreloadProgress): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PRELOAD_STORAGE_KEY, JSON.stringify(progress));
}

/**
 * Get last preload progress
 */
export function getLastPreloadProgress(): PreloadProgress | null {
  if (typeof localStorage === 'undefined') return null;
  const data = localStorage.getItem(PRELOAD_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export default {
  preloadTopSpeciesImages,
  preloadFavoriteImages,
  preloadRegionSpecies,
  isImageCached,
  getCachedImageUrl,
  clearImageCache,
  getCacheStats,
  getLastPreloadProgress,
  getSpeciesImageInfo,
};
