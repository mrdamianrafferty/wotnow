/**
 * Cache an upstream fetch across every function instance, with one in-flight
 * request per key.
 *
 * Built for paid upstreams billed per call (Open-Meteo, 2026-10: 9.1M calls in
 * 30 days against a 1M plan) and for free ones whose terms ask us to cache
 * (MET Norway). Per-lambda `Map` caches were the norm here, and on Vercel they
 * rarely hit: every cold instance starts empty, and a burst of parallel requests
 * all miss together. This adds the two layers those were missing.
 *
 *  1. In-memory per instance, plus in-flight de-duplication, so N concurrent
 *     callers for one key make ONE upstream request.
 *  2. Vercel Runtime Cache (`@vercel/functions` getCache), shared by every
 *     instance in the region and surviving deploys. Off Vercel it falls back to
 *     an in-memory store, so dev and tests behave the same.
 *
 * FAILURES ARE CACHED TOO, for `failureTtlS`. A fetcher that throws is
 * remembered as failed, and callers inside that window get a
 * `CachedFailureError` without a request; a value `isFailure` flags (an empty
 * forecast) is kept for that window only. Otherwise a rate limit
 * stays tripped: every request retries, and every retry is another call.
 *
 * Cache errors never fail a request. A broken cache only costs a fetch.
 *
 * Keys must already be normalised by the caller (rounded coordinates etc.);
 * this module never inspects them.
 */
import { getCache } from '@vercel/functions';

export interface SharedCacheOptions<T> {
  /** Seconds a good value is reused. */
  ttlS: number;
  /** Seconds a failure is remembered. */
  failureTtlS: number;
  /** Label for Vercel's Runtime Cache dashboard and the cache tag. */
  name: string;
  /** A returned value that should only be kept for `failureTtlS` (e.g. an empty forecast). */
  isFailure?: (value: T) => boolean;
}

type Stored<T> =
  | { ok: true; value: T; expiresAt: number }
  | { ok: false; message: string; expiresAt: number };

const MAX_MEMORY_ENTRIES = 5000;
const memory = new Map<string, Stored<unknown>>();
const inflight = new Map<string, Promise<Stored<unknown>>>();

export class CachedFailureError extends Error {
  constructor(message: string) {
    super(`cached upstream failure: ${message}`);
    this.name = 'CachedFailureError';
  }
}

function remember(key: string, entry: Stored<unknown>): void {
  if (memory.size >= MAX_MEMORY_ENTRIES) {
    const now = Date.now();
    for (const [k, e] of memory) if (e.expiresAt <= now) memory.delete(k);
    if (memory.size >= MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value as string);
  }
  memory.set(key, entry);
}

function unwrap<T>(entry: Stored<unknown>): T {
  if (entry.ok) return entry.value as T;
  throw new CachedFailureError(entry.message);
}

/**
 * Return `{ value, fresh }` for `key`, where `fresh` is true only for the caller
 * whose own fetch produced the value. Throws the fetcher's error on a fresh
 * failure, and a `CachedFailureError` while that failure is remembered.
 */
export async function sharedCached<T>(
  key: string,
  opts: SharedCacheOptions<T>,
  fetcher: () => Promise<T>,
): Promise<{ value: T; fresh: boolean }> {
  const hit = memory.get(key);
  if (hit && hit.expiresAt > Date.now()) return { value: unwrap<T>(hit), fresh: false };

  const pending = inflight.get(key);
  if (pending) return { value: unwrap<T>(await pending), fresh: false };

  let fresh = false;
  let freshError: unknown;
  const run = (async (): Promise<Stored<unknown>> => {
    const cache = getCache();
    try {
      const stored = (await cache.get(key)) as Stored<T> | undefined;
      if (stored && typeof stored === 'object' && 'ok' in stored && stored.expiresAt > Date.now()) {
        remember(key, stored);
        return stored;
      }
    } catch (err) {
      console.warn(`[sharedCache:${opts.name}] read failed:`, err instanceof Error ? err.message : err);
    }

    let entry: Stored<unknown>;
    try {
      const value = await fetcher();
      fresh = true;
      // A value `isFailure` rejects (an empty forecast) is still the value:
      // it is kept, just for the short failure window.
      const ttlS = opts.isFailure?.(value) ? opts.failureTtlS : opts.ttlS;
      entry = { ok: true, value, expiresAt: Date.now() + ttlS * 1000 };
    } catch (err) {
      fresh = true;
      freshError = err;
      const message = err instanceof Error ? err.message : String(err);
      entry = { ok: false, message: message.slice(0, 200), expiresAt: Date.now() + opts.failureTtlS * 1000 };
    }
    remember(key, entry);
    await write(cache, key, entry, opts);
    return entry;
  })();

  inflight.set(key, run);
  try {
    const entry = await run;
    if (fresh && freshError !== undefined) throw freshError;
    return { value: unwrap<T>(entry), fresh };
  } finally {
    inflight.delete(key);
  }
}

async function write(
  cache: ReturnType<typeof getCache>,
  key: string,
  entry: Stored<unknown>,
  opts: { name: string },
): Promise<void> {
  const ttl = Math.max(1, Math.round((entry.expiresAt - Date.now()) / 1000));
  try {
    await cache.set(key, entry, { ttl, tags: [opts.name], name: opts.name });
  } catch (err) {
    console.warn(`[sharedCache:${opts.name}] write failed:`, err instanceof Error ? err.message : err);
  }
}

/** Round a coordinate for a cache key / request. 2 dp ≈ 1 km, 1 dp ≈ 11 km. */
export function roundCoord(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** Test hook: forget everything held in this instance (not the Runtime Cache). */
export function __resetSharedMemoryCache(): void {
  memory.clear();
  inflight.clear();
}
