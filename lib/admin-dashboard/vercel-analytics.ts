/**
 * Vercel Web Analytics figures for /admin/apps: a consent-free cross-check
 * beside GA4 (which only counts people who accept cookies).
 *
 * Called from here, once per app, never from each app's own endpoint: one
 * token, one place. Each app reads its Vercel project over the same seven
 * complete UTC days GA4 uses, and the seven before for the change:
 *
 *   GET /v1/query/web-analytics/visits/count      → {data:{visitors,pageviews}}
 *   GET /v1/query/web-analytics/visits/aggregate  → by=country, top 10
 *
 * Rise Daisy and Hungerford share the rise-daisy project; Hungerford's
 * subdomain rewrites to /hungerford/*, so it is that path prefix and Rise is
 * everything else. Grow Daisy's project deploys from another repo: it is
 * shown only if the API answers for it.
 *
 * VERCEL_ANALYTICS_TOKEN unset → "not configured" and nothing else changes.
 * A failure is one error on that app's Vercel line, never a failed page.
 * Results ride in the app's snapshot, so the per-app cache (family-cache.ts)
 * keeps them for the same hour.
 */

import { utcDay } from '@/lib/store-stats/summary';
import { cleanMessage, pctDelta, type AppSnapshot, type FamilyApp, type FamilyAppId, type Part, type Trend, type VercelCountry, type VercelPart } from './family';

export const VERCEL_TEAM_ID = 'team_XCySSWWNBkon1NcvTI5cGGel';
export const VERCEL_TOKEN_VAR = 'VERCEL_ANALYTICS_TOKEN';
const API = 'https://api.vercel.com';
const TIMEOUT_MS = 8_000;
const HUNGERFORD_PREFIX = '/hungerford';

interface Source {
  project: string;
  /** OData filter narrowing the project to this app; none = the whole project. */
  filter?: string;
  /** The project is not this repo's: show its figures only if the API answers. */
  optional?: boolean;
}

export const VERCEL_SOURCES: Record<FamilyAppId, Source> = {
  godaisy: { project: 'wotnow' },
  growdaisy: { project: 'growdaisy', optional: true },
  risedaisy: { project: 'rise-daisy', filter: `not startswith(requestPath,'${HUNGERFORD_PREFIX}')` },
  hungerford: { project: 'rise-daisy', filter: `startswith(requestPath,'${HUNGERFORD_PREFIX}')` },
  findr: { project: 'findr' },
  flycast: { project: 'loop-lab' },
  grewp: { project: 'grewp' },
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();
const countryLabel = (code: string) => (/^[A-Z]{2}$/.test(code) ? (regionNames?.of(code) ?? code) : code);

/** Project ids by name, resolved once per instance. */
const projectIds = new Map<string, string>();

class VercelError extends Error {}

async function call(path: string, params: Record<string, string>, token: string, fetchImpl: typeof fetch): Promise<unknown> {
  const url = `${API}${path}?${new URLSearchParams({ ...params, teamId: VERCEL_TEAM_ID })}`;
  const res = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) throw new VercelError(`Vercel refused the token (${res.status}). Check ${VERCEL_TOKEN_VAR} is for the damians-projects team.`);
  if (res.status === 404) throw new VercelError('Vercel has no Web Analytics for that project (404).');
  if (!res.ok) throw new VercelError(`Vercel answered HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new VercelError('Vercel’s response was not JSON');
  }
}

async function projectId(name: string, token: string, fetchImpl: typeof fetch): Promise<string> {
  const known = projectIds.get(name);
  if (known) return known;
  const body = await call(`/v9/projects/${encodeURIComponent(name)}`, {}, token, fetchImpl);
  const id = isObj(body) && typeof body.id === 'string' ? body.id : null;
  if (!id) throw new VercelError(`Vercel project “${name}” has no id`);
  projectIds.set(name, id);
  return id;
}

/** Visitors and views from either spelling Vercel uses ("devices"/"total" are its own names for them). */
function readCounts(row: unknown): { visitors: number; pageviews: number } | null {
  if (!isObj(row)) return null;
  const visitors = num(row.visitors) ?? num(row.devices);
  const pageviews = num(row.pageviews) ?? num(row.total);
  return visitors === null || pageviews === null ? null : { visitors, pageviews };
}

export function readCount(body: unknown): { visitors: number; pageviews: number } | null {
  return isObj(body) ? readCounts(body.data) : null;
}

export function readCountries(body: unknown): VercelCountry[] {
  const rows = isObj(body) ? (Array.isArray(body.data) ? body.data : isObj(body.data) && Array.isArray(body.data.data) ? body.data.data : []) : [];
  return rows
    .flatMap((r): VercelCountry[] => {
      const counts = readCounts(r);
      const code = isObj(r) ? (typeof r.country === 'string' ? r.country : typeof r.key === 'string' ? r.key : null) : null;
      // Vercel groups the long tail as "Others": not a country
      if (!counts || !code || /^others?$/i.test(code)) return [];
      const c = code.toUpperCase();
      return [{ code: c, name: countryLabel(c), ...counts }];
    })
    .sort((a, b) => b.visitors - a.visitors);
}

const trend = (value: number, previous: number): Trend => ({ value, previous, delta: pctDelta(value, previous), daily: [] });

/** This week and the one before, the GA4 window: seven complete UTC days each. */
export function vercelWindows(now: Date) {
  const range = (fromBack: number, toBack: number) => ({
    from: utcDay(now, fromBack),
    to: utcDay(now, toBack),
  });
  return { current: range(7, 1), previous: range(14, 8) };
}

/**
 * `until` is the midnight after the last day. Vercel rounds an end-of-day
 * `until` down to that day's midnight on the count endpoint, which drops the
 * day itself (measured 28 Oct 2026: Grewp 1,035 visitors that way, 1,366 with
 * the next midnight).
 */
const iso = (w: { from: string; to: string }) => ({
  since: `${w.from}T00:00:00.000Z`,
  until: `${new Date(Date.parse(`${w.to}T00:00:00.000Z`) + 86_400_000).toISOString()}`,
});

async function readVercel(source: Source, token: string, fetchImpl: typeof fetch, now: Date): Promise<VercelPart> {
  const id = await projectId(source.project, token, fetchImpl);
  const { current, previous } = vercelWindows(now);
  const filter: Record<string, string> = source.filter ? { filter: source.filter } : {};
  const count = async (w: { from: string; to: string }) => {
    const c = readCount(await call('/v1/query/web-analytics/visits/count', { projectId: id, ...iso(w), ...filter }, token, fetchImpl));
    if (!c) throw new VercelError('Vercel’s count had no visitors or pageviews');
    return c;
  };
  const [now7, prev7, countryBody] = await Promise.all([
    count(current),
    count(previous),
    call('/v1/query/web-analytics/visits/aggregate', { projectId: id, by: 'country', limit: '10', ...iso(current), ...filter }, token, fetchImpl),
  ]);
  return {
    window: current,
    visitors: trend(now7.visitors, prev7.visitors),
    pageviews: trend(now7.pageviews, prev7.pageviews),
    countries: readCountries(countryBody),
  };
}

/** One app's Vercel figures; null when the app should simply not show any (an optional project that did not answer). */
export async function fetchVercelPart(
  app: FamilyApp,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<Part<VercelPart> | null> {
  const token = env[VERCEL_TOKEN_VAR]?.trim();
  if (!token) return { state: 'not_configured', missing: [VERCEL_TOKEN_VAR] };
  const source = VERCEL_SOURCES[app.id];
  try {
    return { state: 'ok', data: await readVercel(source, token, fetchImpl, now) };
  } catch (err) {
    if (source.optional) return null;
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return { state: 'error', message: cleanMessage(timedOut ? 'Vercel did not answer in time' : err instanceof Error ? err.message : String(err)) };
  }
}

/** The snapshot with its Vercel figures attached. */
export async function withVercel(snapshot: AppSnapshot, app: FamilyApp, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<AppSnapshot> {
  const vercel = await fetchVercelPart(app, env, fetchImpl);
  return vercel ? { ...snapshot, vercel } : snapshot;
}
