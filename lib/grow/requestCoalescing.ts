/**
 * Request Coalescing Utility
 *
 * Deduplicates parallel requests to the same endpoint.
 * When multiple components request the same data simultaneously,
 * only one network request is made and all callers receive the same result.
 *
 * Usage:
 * ```typescript
 * import { coalesceRequest } from './requestCoalescing';
 *
 * // Multiple concurrent calls to the same endpoint will share one request
 * const data = await coalesceRequest(
 *   'planting-calendar',
 *   () => fetch('/api/grow/planting-calendar')
 * );
 * ```
 */

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

// Map of pending requests by key
const pendingRequests = new Map<string, PendingRequest<unknown>>();

// Cleanup interval to prevent memory leaks from stale entries
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
const MAX_PENDING_AGE = 30 * 1000; // 30 seconds

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval || typeof window === 'undefined') return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, request] of pendingRequests.entries()) {
      if (now - request.timestamp > MAX_PENDING_AGE) {
        pendingRequests.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Coalesce parallel requests to the same key
 *
 * @param key Unique identifier for this request type
 * @param fetcher Function that performs the actual fetch
 * @returns Promise that resolves to the fetched data
 */
export async function coalesceRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request for this key
  const existing = pendingRequests.get(key) as PendingRequest<T> | undefined;
  if (existing) {
    console.log(`[Coalesce] Reusing pending request: ${key}`);
    return existing.promise;
  }

  // Start cleanup if not running
  startCleanup();

  // Create new request
  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      // Remove from pending after completion
      pendingRequests.delete(key);
    }
  })();

  // Track the pending request
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
  });

  return promise;
}

/**
 * Create a coalesced version of a fetch function
 *
 * Usage:
 * ```typescript
 * const fetchCalendar = createCoalescedFetcher(
 *   (lat, lon) => `calendar:${lat}:${lon}`,
 *   (lat, lon) => api.getPlantingCalendar(lat, lon)
 * );
 *
 * // These will share one request
 * const data1 = await fetchCalendar(53.35, -6.26);
 * const data2 = await fetchCalendar(53.35, -6.26);
 * ```
 */
export function createCoalescedFetcher<TArgs extends unknown[], TResult>(
  keyFn: (...args: TArgs) => string,
  fetcher: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => {
    const key = keyFn(...args);
    return coalesceRequest(key, () => fetcher(...args));
  };
}

/**
 * Batch multiple requests and execute them together
 *
 * Usage:
 * ```typescript
 * const batcher = createRequestBatcher(
 *   async (ids: string[]) => {
 *     const response = await fetch(`/api/species?ids=${ids.join(',')}`);
 *     return response.json();
 *   },
 *   { maxBatchSize: 10, maxWaitMs: 50 }
 * );
 *
 * // These will be batched into one request
 * const [species1, species2] = await Promise.all([
 *   batcher.get('tomato'),
 *   batcher.get('basil')
 * ]);
 * ```
 */
export function createRequestBatcher<TKey, TResult>(
  batchFetcher: (keys: TKey[]) => Promise<Map<TKey, TResult>>,
  options: { maxBatchSize?: number; maxWaitMs?: number } = {}
) {
  const { maxBatchSize = 20, maxWaitMs = 50 } = options;

  let pendingKeys: TKey[] = [];
  let pendingResolvers: Map<TKey, { resolve: (v: TResult) => void; reject: (e: Error) => void }> = new Map();
  let batchTimeout: ReturnType<typeof setTimeout> | null = null;

  async function executeBatch() {
    const keysToFetch = pendingKeys;
    const resolvers = pendingResolvers;

    pendingKeys = [];
    pendingResolvers = new Map();
    batchTimeout = null;

    try {
      const results = await batchFetcher(keysToFetch);

      for (const [key, resolver] of resolvers.entries()) {
        const result = results.get(key);
        if (result !== undefined) {
          resolver.resolve(result);
        } else {
          resolver.reject(new Error(`No result for key: ${String(key)}`));
        }
      }
    } catch (error) {
      for (const resolver of resolvers.values()) {
        resolver.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  function scheduleBatch() {
    if (batchTimeout) return;

    batchTimeout = setTimeout(() => {
      executeBatch();
    }, maxWaitMs);
  }

  return {
    get(key: TKey): Promise<TResult> {
      // Check if key is already pending
      const existing = pendingResolvers.get(key);
      if (existing) {
        return new Promise((resolve, reject) => {
          const original = existing;
          pendingResolvers.set(key, {
            resolve: (v) => {
              original.resolve(v);
              resolve(v);
            },
            reject: (e) => {
              original.reject(e);
              reject(e);
            },
          });
        });
      }

      return new Promise((resolve, reject) => {
        pendingKeys.push(key);
        pendingResolvers.set(key, { resolve, reject });

        // Execute immediately if batch is full
        if (pendingKeys.length >= maxBatchSize) {
          if (batchTimeout) {
            clearTimeout(batchTimeout);
            batchTimeout = null;
          }
          executeBatch();
        } else {
          scheduleBatch();
        }
      });
    },
  };
}

/**
 * Statistics for debugging
 */
export function getCoalescingStats() {
  return {
    pendingRequestCount: pendingRequests.size,
    pendingKeys: Array.from(pendingRequests.keys()),
  };
}
