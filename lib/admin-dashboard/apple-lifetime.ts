/**
 * Every app's first-time App Store downloads since launch, for the all-time
 * total on /admin/apps.
 *
 * Apple's Sales and Trends report covers the whole vendor account, so one
 * request returns every app on it, keyed by Apple identifier. Daily reports
 * are only kept for about a year and a year is hundreds of requests, so:
 *
 *   - YEARLY for each year before this one (none yet: every app launched in 2026),
 *   - MONTHLY for each completed month of this year,
 *   - DAILY for the last completed month, if Apple has not published its
 *     monthly yet, and for each day of this month so far.
 *
 * An error on any period fails the whole figure ("not reported") rather than
 * returning a total with a hole in it; a 404 is "nothing sold", which counts
 * as zero. The result is cached for twelve hours: it moves by a day's
 * downloads a day, and rebuilding it costs about forty requests.
 */

import { getCache, type RuntimeCache } from '@vercel/functions';
import { createAppleToken, fetchAppleReportText, getAppleConfig, parseFirstTimeByApp, type AppleConfig, type AppleFrequency } from '@/lib/store-stats/apple';

/** Year the first app shipped; reports before it are not asked for. */
export const LIFETIME_FROM_YEAR = 2026;
export const LIFETIME_TTL_S = 12 * 60 * 60;
export const LIFETIME_FAILED_TTL_S = 5 * 60;
const KEY = 'apple-lifetime:v1';
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;

export type AppleLifetime = { state: 'ok'; byApp: Record<string, number> } | { state: 'not_configured' } | { state: 'error'; message: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** The reports that together cover launch to yesterday, as [frequency, reportDate] pairs. */
export function lifetimePeriods(now: Date, monthlyPublished: boolean): [AppleFrequency, string][] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const periods: [AppleFrequency, string][] = [];
  for (let y = LIFETIME_FROM_YEAR; y < year; y++) periods.push(['YEARLY', String(y)]);

  const completed = month - 1;
  // Months before the last completed one are certain to be published; the last one may not be yet
  const monthlyThrough = monthlyPublished ? completed : completed - 1;
  for (let m = 1; m <= monthlyThrough; m++) periods.push(['MONTHLY', `${year}-${pad(m)}`]);
  const dailyFrom = monthlyThrough + 1;
  const dailyMonths = dailyFrom <= completed ? [completed, month] : [month];
  for (const m of dailyMonths) {
    const last = m === month ? now.getUTCDate() - 1 : new Date(Date.UTC(year, m, 0)).getUTCDate();
    for (let d = 1; d <= last; d++) periods.push(['DAILY', `${year}-${pad(m)}-${pad(d)}`]);
  }
  return periods;
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export async function fetchAppleLifetime(config: AppleConfig, now = new Date()): Promise<Record<string, number>> {
  const token = createAppleToken(config);
  const signal = AbortSignal.timeout(TIMEOUT_MS * 3);
  const get = (frequency: AppleFrequency, date: string) => fetchAppleReportText(config, token, frequency, date, signal);

  // Is the last completed month's monthly report out yet? A 404 or a 400 says not (Apple answers both)
  let monthlyPublished = true;
  const completed = now.getUTCMonth();
  if (completed >= 1) {
    const probe = `${now.getUTCFullYear()}-${pad(completed)}`;
    monthlyPublished = await get('MONTHLY', probe).then((t) => t !== null, () => false);
  }

  const reports = await pool(lifetimePeriods(now, monthlyPublished), CONCURRENCY, ([f, d]) => get(f, d));
  const total: Record<string, number> = {};
  for (const tsv of reports) {
    if (tsv === null) continue;
    for (const [id, units] of parseFirstTimeByApp(tsv)) total[id] = (total[id] ?? 0) + units;
  }
  return total;
}

const isStored = (v: unknown): v is AppleLifetime => typeof v === 'object' && v !== null && typeof (v as AppleLifetime).state === 'string';

/** In-flight on this instance, so a burst of page loads builds it once. */
let inflight: Promise<AppleLifetime> | null = null;

export async function getAppleLifetime(
  env: Record<string, string | undefined> = process.env,
  { bypass = false, cache = getCache(), now = () => new Date() }: { bypass?: boolean; cache?: RuntimeCache; now?: () => Date } = {},
): Promise<AppleLifetime> {
  if (!bypass) {
    const hit = await cache.get(KEY).catch(() => null);
    if (isStored(hit)) return hit;
  }
  if (inflight) return inflight;

  inflight = (async (): Promise<AppleLifetime> => {
    let result: AppleLifetime;
    try {
      const config = getAppleConfig(env);
      result = config ? { state: 'ok', byApp: await fetchAppleLifetime(config, now()) } : { state: 'not_configured' };
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      result = { state: 'error', message: timedOut ? 'Apple did not answer in time' : err instanceof Error ? err.message.slice(0, 200) : String(err) };
    }
    await cache.set(KEY, result, { ttl: result.state === 'ok' ? LIFETIME_TTL_S : LIFETIME_FAILED_TTL_S, name: KEY }).catch(() => undefined);
    return result;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
