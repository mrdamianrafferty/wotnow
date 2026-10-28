/**
 * Each app's snapshot for /admin/apps, kept in Vercel's Runtime Cache so a
 * page load does not ask all seven apps again.
 *
 * Every metrics-summary call runs that app's GA4 reports, and age and gender
 * are "potentially thresholded" dimensions with a small hourly quota per
 * property. Asking on every page load exhausted it within the first morning
 * (429 "Exhausted potentially thresholded requests quota"). So:
 *
 *  - a good snapshot is reused for an hour; one where the app was unreachable
 *    or a section errored, for five minutes, so a fix shows up soon;
 *  - Refresh bypasses the cache for every app, but at most once every five
 *    minutes across all admins (the cooldown lives in the cache too);
 *  - every snapshot carries `fetchedAt`, shown as "as of HH:MM" on its card.
 *
 * The Runtime Cache is shared by every function instance in the region (an
 * in-memory Map would not be), and off Vercel it is an in-memory store, so
 * dev and tests behave the same. A cache error never fails the page: it only
 * costs a fetch. Bump KEY_VERSION when AppSnapshot's shape changes, so an
 * older deployment's entries are not read as the new shape.
 */

import { getCache, type RuntimeCache } from '@vercel/functions';
import type { AppSnapshot, FamilyApp } from './family';

const KEY_VERSION = 'v1';
export const GOOD_TTL_S = 60 * 60;
export const FAILED_TTL_S = 5 * 60;
export const REFRESH_COOLDOWN_S = 5 * 60;

const appKey = (app: FamilyApp) => `family-app:${KEY_VERSION}:${app.id}`;
const REFRESH_KEY = `family-refresh:${KEY_VERSION}`;

interface Stored {
  snapshot: AppSnapshot;
  fetchedAt: string;
}

/** Unreachable, unconfigured, or answering with a section in error: worth asking again soon. */
export function isFailedSnapshot(s: AppSnapshot): boolean {
  if (s.status !== 'ok') return true;
  const parts = [s.downloads, s.revenue, s.analytics, s.health, s.audience, s.webRevenue];
  return parts.some((p) => p?.state === 'error');
}

const isStored = (v: unknown): v is Stored =>
  typeof v === 'object' && v !== null && typeof (v as Stored).fetchedAt === 'string' && typeof (v as Stored).snapshot?.id === 'string';

/** In-flight fetches per app on this instance, so a burst of loads asks each app once. */
const inflight = new Map<string, Promise<AppSnapshot>>();

/** The app's snapshot from the cache, or fetched (and cached) when absent or `bypass` is set. */
export async function cachedSnapshot(
  app: FamilyApp,
  fetchSnapshot: () => Promise<AppSnapshot>,
  { bypass = false, cache = getCache(), now = () => new Date() }: { bypass?: boolean; cache?: RuntimeCache; now?: () => Date } = {},
): Promise<AppSnapshot> {
  const key = appKey(app);
  if (!bypass) {
    const hit = await cache.get(key).catch(() => null);
    if (isStored(hit)) return { ...hit.snapshot, fetchedAt: hit.fetchedAt };
  }

  const pending = inflight.get(key);
  if (pending) return pending;
  const run = (async () => {
    const snapshot = await fetchSnapshot();
    const fetchedAt = now().toISOString();
    const ttl = isFailedSnapshot(snapshot) ? FAILED_TTL_S : GOOD_TTL_S;
    await cache.set(key, { snapshot, fetchedAt } satisfies Stored, { ttl, name: key }).catch(() => undefined);
    return { ...snapshot, fetchedAt };
  })().finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}

export interface RefreshState {
  /** True when this request was allowed to bypass the cache. */
  refreshed: boolean;
  /** When Refresh may next be used; null when it may be used now. */
  nextRefreshAt: string | null;
}

/**
 * Claim the shared Refresh cooldown. Grants it (and starts a new cooldown)
 * only when none is running; otherwise reports when the current one ends.
 * Two admins pressing Refresh in the same instant may both get through,
 * which costs one extra round of fetches and nothing else.
 */
export async function claimRefresh(
  wanted: boolean,
  { cache = getCache(), now = () => new Date() }: { cache?: RuntimeCache; now?: () => Date } = {},
): Promise<RefreshState> {
  const last = await cache.get(REFRESH_KEY).catch(() => null);
  const lastAt = typeof last === 'string' ? Date.parse(last) : NaN;
  const t = now().getTime();
  const endsAt = Number.isFinite(lastAt) ? lastAt + REFRESH_COOLDOWN_S * 1000 : 0;
  if (endsAt > t) return { refreshed: false, nextRefreshAt: new Date(endsAt).toISOString() };
  if (!wanted) return { refreshed: false, nextRefreshAt: null };

  await cache
    .set(REFRESH_KEY, new Date(t).toISOString(), {
      ttl: REFRESH_COOLDOWN_S,
      name: 'family-refresh',
    })
    .catch(() => undefined);
  return {
    refreshed: true,
    nextRefreshAt: new Date(t + REFRESH_COOLDOWN_S * 1000).toISOString(),
  };
}
