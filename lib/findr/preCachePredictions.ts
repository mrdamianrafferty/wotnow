/**
 * Pre-cache Predictions for Offline Access
 *
 * Pre-fetches fishing predictions for the next 7 days and stores them
 * in IndexedDB for offline access. Runs in the background after the
 * current day's predictions are loaded.
 *
 * Strategy:
 * - Triggered after successful prediction load
 * - Pre-caches days 1-6 ahead (today is already cached by main fetch)
 * - Respects network conditions (skips on slow connections)
 * - Rate-limited to avoid overwhelming the API
 * - Silent failures (pre-caching is best-effort)
 *
 * Usage:
 * ```typescript
 * import { preCachePredictions } from '@/lib/findr/preCachePredictions';
 *
 * // After loading today's predictions successfully
 * preCachePredictions(rectangleCode, latitude, longitude, language);
 * ```
 */

const PRECACHE_STORAGE_KEY = 'findr_precache_status';
const PRECACHE_DAYS = 6; // Days ahead to pre-cache (today is already cached)
const DELAY_BETWEEN_REQUESTS_MS = 1500; // Rate limiting

interface PreCacheStatus {
  rectangleCode: string;
  lastCached: string;
  daysCached: number;
  completedAt: string;
}

/**
 * Check if we should pre-cache based on network conditions
 */
function shouldPreCache(): boolean {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  };

  if (nav.connection) {
    // Don't pre-cache on slow connections or data-saver mode
    if (nav.connection.saveData) return false;
    if (nav.connection.effectiveType === 'slow-2g' || nav.connection.effectiveType === '2g') {
      return false;
    }
  }

  return true;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get dates to pre-cache (next N days, excluding today)
 */
function getDatesToPreCache(daysAhead: number = PRECACHE_DAYS): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(formatDate(date));
  }

  return dates;
}

/**
 * Check if we've recently pre-cached for this rectangle
 */
function getPreCacheStatus(rectangleCode: string): PreCacheStatus | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(PRECACHE_STORAGE_KEY);
    if (!raw) return null;

    const statuses = JSON.parse(raw) as Record<string, PreCacheStatus>;
    const status = statuses[rectangleCode];

    if (!status) return null;

    // Check if still valid (same day)
    const today = formatDate(new Date());
    if (status.lastCached !== today) return null;

    return status;
  } catch {
    return null;
  }
}

/**
 * Save pre-cache status
 */
function savePreCacheStatus(status: PreCacheStatus): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const raw = localStorage.getItem(PRECACHE_STORAGE_KEY);
    const statuses = raw ? (JSON.parse(raw) as Record<string, PreCacheStatus>) : {};

    // Keep only recent entries (clean up old rectangles)
    const today = formatDate(new Date());
    const cleaned = Object.fromEntries(
      Object.entries(statuses).filter(([_, s]) => s.lastCached === today)
    );

    cleaned[status.rectangleCode] = status;
    localStorage.setItem(PRECACHE_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch and cache predictions for a specific date
 */
async function fetchAndCacheDay(
  rectangleCode: string,
  predictionDate: string,
  language: string,
  latitude?: number,
  longitude?: number
): Promise<boolean> {
  try {
    // Build API URL
    const apiUrl = typeof window !== 'undefined' &&
      (window.location.hostname === 'fishfindr.eu' || window.location.hostname.includes('godaisy.io'))
      ? `${window.location.protocol}//${window.location.host}/api/findr/predictions`
      : '/api/findr/predictions';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rectangleCode,
        predictionDate,
        language,
        latitude,
        longitude,
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();

    // Cache to IndexedDB
    try {
      const { getStorage } = await import('@/lib/offline/storage');
      const storage = getStorage();
      await storage.cachePrediction({
        rectangleCode,
        date: predictionDate,
        data,
      });
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Pre-cache predictions for the next 7 days
 *
 * Call this after successfully loading today's predictions.
 * Runs in the background and doesn't block the UI.
 *
 * @param rectangleCode - ICES rectangle code
 * @param latitude - Optional latitude for enhanced predictions
 * @param longitude - Optional longitude for enhanced predictions
 * @param language - Language code (default: 'en')
 */
export async function preCachePredictions(
  rectangleCode: string,
  latitude?: number,
  longitude?: number,
  language: string = 'en'
): Promise<void> {
  // Skip if not in browser
  if (typeof window === 'undefined') return;

  // Check network conditions
  if (!shouldPreCache()) {
    console.log('[preCachePredictions] Skipping - poor network or data-saver mode');
    return;
  }

  // Check if we've already pre-cached today
  const existingStatus = getPreCacheStatus(rectangleCode);
  if (existingStatus && existingStatus.daysCached >= PRECACHE_DAYS) {
    console.log('[preCachePredictions] Already cached for today:', rectangleCode);
    return;
  }

  const dates = getDatesToPreCache();
  let daysCached = 0;

  console.log('[preCachePredictions] Starting pre-cache for', rectangleCode, dates);

  for (const date of dates) {
    // Check if already cached via IndexedDB
    try {
      const { getStorage } = await import('@/lib/offline/storage');
      const storage = getStorage();
      const existing = await storage.getPrediction(rectangleCode, date);
      if (existing && existing.freshness !== 'very-stale') {
        daysCached++;
        continue; // Already cached
      }
    } catch {
      // Continue with fetch
    }

    // Fetch and cache
    const success = await fetchAndCacheDay(rectangleCode, date, language, latitude, longitude);
    if (success) {
      daysCached++;
    }

    // Rate limiting - wait before next request
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
  }

  // Save status
  savePreCacheStatus({
    rectangleCode,
    lastCached: formatDate(new Date()),
    daysCached,
    completedAt: new Date().toISOString(),
  });

  console.log('[preCachePredictions] Completed:', {
    rectangleCode,
    daysCached,
    total: dates.length,
  });
}

/**
 * Get pre-cache progress for UI display
 */
export function getPreCacheProgress(rectangleCode: string): {
  cached: boolean;
  daysCached: number;
  totalDays: number;
} {
  const status = getPreCacheStatus(rectangleCode);
  return {
    cached: !!status,
    daysCached: status?.daysCached ?? 0,
    totalDays: PRECACHE_DAYS,
  };
}

/**
 * Clear pre-cache status (for testing or reset)
 */
export function clearPreCacheStatus(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(PRECACHE_STORAGE_KEY);
}

/**
 * Pre-cache predictions for all saved locations
 * Call this when the app comes online to ensure all locations have cached data.
 *
 * @param locations - Array of saved locations with rectangleCode, lat, lon
 * @param language - Language code (default: 'en')
 * @param onProgress - Optional callback for progress updates
 */
export async function preCacheAllLocations(
  locations: Array<{ rectangleCode: string | null | undefined; lat: number; lon: number }>,
  language: string = 'en',
  onProgress?: (current: number, total: number, rectangleCode: string) => void
): Promise<{ cached: number; skipped: number; failed: number }> {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return { cached: 0, skipped: 0, failed: 0 };
  }

  // Check network conditions
  if (!shouldPreCache()) {
    console.log('[preCacheAllLocations] Skipping - poor network or data-saver mode');
    return { cached: 0, skipped: 0, failed: 0 };
  }

  // Filter to only locations with rectangle codes
  const validLocations = locations.filter(loc => loc.rectangleCode);
  if (validLocations.length === 0) {
    return { cached: 0, skipped: 0, failed: 0 };
  }

  let cached = 0;
  let skipped = 0;
  let failed = 0;
  const total = validLocations.length;

  console.log('[preCacheAllLocations] Starting pre-cache for', validLocations.length, 'locations');

  for (let i = 0; i < validLocations.length; i++) {
    const loc = validLocations[i];
    const rectangleCode = loc.rectangleCode!;

    // Report progress
    if (onProgress) {
      onProgress(i + 1, total, rectangleCode);
    }

    // Check if already cached
    const existingStatus = getPreCacheStatus(rectangleCode);
    if (existingStatus && existingStatus.daysCached >= PRECACHE_DAYS) {
      skipped++;
      continue;
    }

    try {
      await preCachePredictions(rectangleCode, loc.lat, loc.lon, language);
      cached++;
    } catch {
      failed++;
    }

    // Delay between locations to avoid rate limiting
    if (i < validLocations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('[preCacheAllLocations] Completed:', { cached, skipped, failed });

  return { cached, skipped, failed };
}

/**
 * Get all pre-cached rectangles for today
 */
export function getPreCachedRectangles(): string[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(PRECACHE_STORAGE_KEY);
    if (!raw) return [];

    const statuses = JSON.parse(raw) as Record<string, PreCacheStatus>;
    const today = formatDate(new Date());

    return Object.entries(statuses)
      .filter(([_, s]) => s.lastCached === today && s.daysCached > 0)
      .map(([code]) => code);
  } catch {
    return [];
  }
}

const preCachePredictionsApi = {
  preCachePredictions,
  preCacheAllLocations,
  getPreCacheProgress,
  getPreCachedRectangles,
  clearPreCacheStatus,
};

export default preCachePredictionsApi;
