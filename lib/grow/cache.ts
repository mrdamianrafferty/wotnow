/**
 * Stale-While-Revalidate Cache for Grow Daisy
 *
 * Provides instant UI by serving cached data immediately while
 * fetching fresh data in the background. Persists across sessions
 * for offline support.
 *
 * Usage:
 * ```typescript
 * import { swrCache } from './cache';
 *
 * // Wrap an async fetch function
 * const data = await swrCache.get(
 *   'planting-calendar',
 *   () => api.getPlantingCalendar(),
 *   { ttl: 5 * 60 * 1000, maxAge: 24 * 60 * 60 * 1000 }
 * );
 * ```
 */

import { recordCacheHit, recordStaleCacheHit } from '../performance/api-tracker';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  maxAge: number;
}

interface CacheOptions {
  /**
   * Time in ms before data is considered stale (default: 5 min)
   * Stale data is still returned immediately but triggers background refresh
   */
  ttl?: number;

  /**
   * Maximum time in ms to keep data (default: 24 hours)
   * Data older than this is not used at all
   */
  maxAge?: number;

  /**
   * Force a fresh fetch, ignoring cache
   */
  bypassCache?: boolean;

  /**
   * Callback when background revalidation completes
   */
  onRevalidate?: (data: unknown) => void;
}

// Default TTLs for different data types
export const CACHE_TTLS = {
  // Frequently changing data - short TTL
  weather: 15 * 60 * 1000, // 15 minutes
  tasks: 5 * 60 * 1000, // 5 minutes

  // Slower changing data - longer TTL
  plantingCalendar: 60 * 60 * 1000, // 1 hour
  species: 24 * 60 * 60 * 1000, // 24 hours
  userPlants: 10 * 60 * 1000, // 10 minutes

  // Reference data - very long TTL
  climateZones: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

const CACHE_PREFIX = 'grow:cache:';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

class SWRCache {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  /**
   * Get data with stale-while-revalidate strategy
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = DEFAULT_TTL,
      maxAge = DEFAULT_MAX_AGE,
      bypassCache = false,
      onRevalidate,
    } = options;

    const cacheKey = CACHE_PREFIX + key;

    // Check memory cache first, then localStorage
    let cached = this.memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

    if (!cached) {
      cached = this.loadFromStorage<T>(cacheKey);
      if (cached) {
        // Populate memory cache
        this.memoryCache.set(cacheKey, cached);
      }
    }

    const now = Date.now();

    // If cache exists and not too old
    if (cached && !bypassCache) {
      const age = now - cached.timestamp;
      const isStale = age > cached.ttl;
      const isTooOld = age > cached.maxAge;

      if (isTooOld) {
        // Data is too old, fetch fresh
        return this.fetchAndCache(key, cacheKey, fetcher, ttl, maxAge);
      }

      if (isStale) {
        // Data is stale but usable - return immediately, revalidate in background
        const ageSeconds = Math.floor(age / 1000);
        recordStaleCacheHit(key, ageSeconds, Math.floor(ttl / 1000));

        // Background revalidation
        this.revalidateInBackground(key, cacheKey, fetcher, ttl, maxAge, onRevalidate);

        return cached.data;
      }

      // Data is fresh
      recordCacheHit(key, Math.floor(ttl / 1000));
      return cached.data;
    }

    // No cache or bypass - fetch fresh
    return this.fetchAndCache(key, cacheKey, fetcher, ttl, maxAge);
  }

  /**
   * Fetch fresh data and update cache
   */
  private async fetchAndCache<T>(
    key: string,
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    maxAge: number
  ): Promise<T> {
    // Coalesce requests - if already fetching, wait for that
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending as Promise<T>;
    }

    const fetchPromise = (async () => {
      try {
        const data = await fetcher();
        this.setCache(cacheKey, data, ttl, maxAge);
        return data;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Revalidate in the background without blocking
   */
  private revalidateInBackground<T>(
    key: string,
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    maxAge: number,
    onRevalidate?: (data: unknown) => void
  ): void {
    // Don't start another revalidation if one is in progress
    if (this.pendingRequests.has(cacheKey)) {
      return;
    }

    const fetchPromise = (async () => {
      try {
        const data = await fetcher();
        this.setCache(cacheKey, data, ttl, maxAge);

        // Notify caller of fresh data
        if (onRevalidate) {
          onRevalidate(data);
        }

        console.log(`[SWR] Revalidated: ${key}`);
        return data;
      } catch (error) {
        console.warn(`[SWR] Background revalidation failed: ${key}`, error);
        throw error;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, fetchPromise);
  }

  /**
   * Set cache entry in both memory and localStorage
   */
  private setCache<T>(cacheKey: string, data: T, ttl: number, maxAge: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      maxAge,
    };

    // Memory cache
    this.memoryCache.set(cacheKey, entry);

    // Persist to localStorage
    try {
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('[SWR] Failed to persist cache:', error);
      // May fail due to quota - that's ok, memory cache still works
    }
  }

  /**
   * Load cache entry from localStorage
   */
  private loadFromStorage<T>(cacheKey: string): CacheEntry<T> | undefined {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        return JSON.parse(stored) as CacheEntry<T>;
      }
    } catch (error) {
      console.warn('[SWR] Failed to load from storage:', error);
    }
    return undefined;
  }

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): void {
    const cacheKey = CACHE_PREFIX + key;
    this.memoryCache.delete(cacheKey);
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      // Ignore
    }
  }

  /**
   * Invalidate all cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    const fullPrefix = CACHE_PREFIX + prefix;

    // Memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(fullPrefix)) {
        this.memoryCache.delete(key);
      }
    }

    // localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // Ignore
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // Ignore
    }
  }

  /**
   * Preload data into cache (useful for critical path data)
   */
  async preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    const cacheKey = CACHE_PREFIX + key;
    const cached = this.memoryCache.get(cacheKey) || this.loadFromStorage(cacheKey);

    // Only preload if not already cached
    if (!cached) {
      try {
        await this.get(key, fetcher, options);
      } catch {
        // Preload failures are not critical
      }
    }
  }
}

// Singleton instance
export const swrCache = new SWRCache();

/**
 * React hook for SWR cache with automatic revalidation updates
 *
 * Usage:
 * ```typescript
 * const { data, isLoading, isStale, error } = useSWRCache(
 *   'planting-calendar',
 *   () => api.getPlantingCalendar(),
 *   { ttl: CACHE_TTLS.plantingCalendar }
 * );
 * ```
 */
export function createSWRHook<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  return {
    async getData(): Promise<T> {
      return swrCache.get(key, fetcher, options);
    },
    invalidate(): void {
      swrCache.invalidate(key);
    },
  };
}
