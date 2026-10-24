/**
 * One forecast per place, shared by every page, share image and cron that asks.
 *
 * WHY THIS EXISTS. `fetchForecastForLocation` had no cache at all, and it sits
 * under the whole SEO estate: 4,348 spot pages that each fetch their own place
 * plus up to 12 nearby ones on every hourly rebuild, 64 hubs that fetch one per
 * spot, the share images and `/call`. Behind all of it are only ~106 distinct
 * places, so the same forecast was bought thousands of times a day. Open-Meteo
 * weights each request (39 variables ≈ 3.9 calls), and in October 2026 the
 * shared paid key ran 9.1M calls in 30 days against a 1M plan, with Open-Meteo
 * warning it may suspend the key. Cached per place, the SEO estate's ceiling is
 * roughly places × (24h / TTL) fetches a day however hard crawlers hit it.
 *
 * TWO LAYERS.
 *  1. In-memory per function instance, which also de-duplicates concurrent
 *     requests: a hub rebuilding 106 spots in parallel, or a spot page and its
 *     12 neighbours, share one in-flight fetch per place.
 *  2. Vercel Runtime Cache (`@vercel/functions` getCache), shared by every
 *     instance in the region and surviving deploys. Outside Vercel it falls back
 *     to an in-memory store, so local dev and tests behave the same.
 *
 * FAILURES ARE CACHED TOO, briefly. A page that throws on a 429 stores nothing,
 * so the next request rebuilds and retries, which is the loop that keeps a rate
 * limit tripped. An empty result is remembered for FAILURE_TTL_S so a run of
 * failures costs one attempt per place per window, not one per request.
 *
 * STALENESS. The forecast is in UTC days (the adapter requests timezone=UTC).
 * A copy fetched at 23:00 still starts with yesterday at 01:00, so days that
 * have fully ended are dropped when a cached copy is served (a fresh fetch is
 * returned untouched). Every caller slices from the
 * front and treats [0] as today, which stays true.
 *
 * The key rounds to 2 decimals (~1 km): a cookie or onboarding location a few
 * metres from a seeded town shares its forecast, and arbitrary user coordinates
 * can't each mint a fresh entry.
 */
import { getCache } from '@vercel/functions';

/** A good forecast is reused for 3 hours. Open-Meteo's models update hourly at most; a 3 h old forecast is fine for a day-level activity score. */
export const SUCCESS_TTL_S = 3 * 60 * 60;
/** A failed fetch (empty result) is remembered for 10 minutes. */
export const FAILURE_TTL_S = 10 * 60;

/** Bump when the cached shape changes so old entries are ignored rather than misread. */
const KEY_VERSION = 'v1';
const MAX_MEMORY_ENTRIES = 2000;

type Entry<T> = { value: T[]; expiresAt: number };

const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown[]>>();

export function forecastCacheKey(lat: number, lon: number, coastal: boolean): string {
  return `seo-forecast:${KEY_VERSION}:${lat.toFixed(2)},${lon.toFixed(2)}:${coastal ? 'c' : 'i'}`;
}

/**
 * Drop days before today (UTC). `date` is a unix-seconds stamp inside the day;
 * the adapter stamps 12:00 UTC, so compare calendar days, not "24 h since".
 */
export function dropEndedDays<T extends { date: number }>(days: T[], nowMs = Date.now()): T[] {
  const today = Math.floor(nowMs / 86_400_000);
  const kept = days.filter((d) => Math.floor(d.date / 86_400) >= today);
  return kept.length === days.length ? days : kept;
}

function remember<T>(key: string, value: T[], ttlS: number): void {
  if (memory.size >= MAX_MEMORY_ENTRIES) {
    const now = Date.now();
    for (const [k, e] of memory) if (e.expiresAt <= now) memory.delete(k);
    // Still full of live entries: drop the oldest insertion.
    if (memory.size >= MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value as string);
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlS * 1000 });
}

/**
 * Return the cached forecast for `key`, or run `fetcher` once and cache what it
 * returns. Cache errors never fail the request: a broken cache only costs a fetch.
 */
export async function cachedForecast<T extends { date: number }>(
  key: string,
  fetcher: () => Promise<T[]>,
): Promise<T[]> {
  const hit = memory.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return dropEndedDays(hit.value);

  const pending = inflight.get(key) as Promise<T[]> | undefined;
  if (pending) return dropEndedDays(await pending);

  // `fresh` marks a result this call fetched itself: it is returned exactly as
  // the provider gave it, and only copies served from the cache are trimmed.
  let fresh = false;
  const run = (async (): Promise<T[]> => {
    const cache = getCache();
    try {
      const stored = (await cache.get(key)) as { value: T[]; expiresAt: number } | undefined;
      if (stored && Array.isArray(stored.value) && stored.expiresAt > Date.now()) {
        memory.set(key, stored);
        return stored.value;
      }
    } catch (err) {
      console.warn('[forecastCache] runtime cache read failed:', err instanceof Error ? err.message : err);
    }

    const value = await fetcher();
    fresh = true;
    const ttlS = value.length ? SUCCESS_TTL_S : FAILURE_TTL_S;
    remember(key, value, ttlS);
    try {
      await cache.set(
        key,
        { value, expiresAt: Date.now() + ttlS * 1000 },
        { ttl: ttlS, tags: ['seo-forecast'], name: 'seo-forecast' },
      );
    } catch (err) {
      console.warn('[forecastCache] runtime cache write failed:', err instanceof Error ? err.message : err);
    }
    return value;
  })();

  inflight.set(key, run);
  try {
    const value = await run;
    return fresh ? value : dropEndedDays(value);
  } finally {
    inflight.delete(key);
  }
}

/** Test hook: forget everything held in this instance. */
export function __resetForecastMemoryCache(): void {
  memory.clear();
  inflight.clear();
}
