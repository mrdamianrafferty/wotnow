/**
 * Google Search Console for /admin/apps: each family site's last 28 days of
 * Google search (impressions, clicks, CTR, average position) against the 28
 * before, with its top five queries and pages.
 *
 * Reads with the GA4 service account (GOOGLE_ANALYTICS_CREDENTIALS), scope
 * webmasters.readonly. That account sees a property only once it has been
 * added to it as a user ("Restricted" is enough), so:
 *
 *   1. sites.list says which properties the account can see;
 *   2. each site takes the first of its candidate properties on that list
 *      (a Domain property first, then URL prefixes);
 *   3. a site with none is `not_configured`, naming the property and the
 *      account to add. It never shows zeros it could not read.
 *
 * Two apps share a Domain property, so a page filter splits them: Grow Daisy
 * is the grow.godaisy.io pages of sc-domain:godaisy.io, and Go Daisy the rest.
 * With a page filter Google aggregates by page rather than by property, which
 * counts a search that showed two pages twice: those two sites' impressions
 * are a little higher than the property's own figure would be.
 *
 * Search data is final about three days after the fact, so the window ends
 * three days ago and the whole summary is kept for six hours (fifteen minutes
 * while any site is missing access or failed, so a new grant shows soon). One
 * cache entry for the family, separate from the per-app snapshots.
 */

import { getCache, type RuntimeCache } from '@vercel/functions';
import { decodeServiceAccountKey, getServiceAccountToken, type ServiceAccountKey } from '@/lib/google/service-account-token';
import { cleanMessage, pctDelta, type FamilyAppId } from './family';
import { errorMessage, type Section } from './types';

export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
export const CREDENTIALS_VAR = 'GOOGLE_ANALYTICS_CREDENTIALS';
const API = 'https://www.googleapis.com/webmasters/v3';
const TIMEOUT_MS = 10_000;
export const GOOD_TTL_S = 6 * 60 * 60;
export const PARTIAL_TTL_S = 15 * 60;
const CACHE_KEY = 'search-console:v1';
const DAY = 86_400_000;
/** Days from today back to the window's last day: Search data settles in about three. */
export const LAG_DAYS = 3;
export const WINDOW_DAYS = 28;
const TOP_N = 5;

// ─── Sites ───────────────────────────────────────────────────────────

interface PageFilter {
  operator: 'contains' | 'notContains';
  expression: string;
}

export interface SiteConfig {
  id: FamilyAppId;
  name: string;
  /** Property ids to try, in order. The first one the account can see is used. */
  properties: string[];
  /** Narrows a shared property to this app. */
  page?: PageFilter;
}

const GROW_HOST = '://grow.godaisy.io';

/**
 * The first candidate of each is the property that exists today, as far as
 * public verification shows (a DNS TXT record → Domain property; an HTML tag →
 * URL prefix). Hungerford lives at hungerford.risedaisy.com behind a sign-in,
 * so it is inside Rise Daisy's Domain property, not a site of its own.
 */
export const SEARCH_SITES: SiteConfig[] = [
  { id: 'godaisy', name: 'Go Daisy', properties: ['sc-domain:godaisy.io', 'https://godaisy.io/'], page: { operator: 'notContains', expression: GROW_HOST } },
  {
    id: 'growdaisy',
    name: 'Grow Daisy',
    properties: ['sc-domain:godaisy.io', 'https://grow.godaisy.io/'],
    page: { operator: 'contains', expression: GROW_HOST },
  },
  { id: 'risedaisy', name: 'Rise Daisy', properties: ['sc-domain:risedaisy.com', 'https://www.risedaisy.com/', 'https://risedaisy.com/'] },
  { id: 'findr', name: 'Findr', properties: ['https://fishfindr.eu/', 'sc-domain:fishfindr.eu'] },
  { id: 'flycast', name: 'Fly Cast', properties: ['sc-domain:flycastcoach.com', 'https://flycastcoach.com/'] },
  { id: 'grewp', name: 'Grewp', properties: ['sc-domain:grewp.org', 'https://grewp.org/'] },
];

// ─── Shapes ──────────────────────────────────────────────────────────

export interface SearchMetric {
  value: number;
  previous: number;
  /** % change; null when the previous period was 0. */
  delta: number | null;
}

export interface SearchRow {
  /** The query, or the page URL. */
  key: string;
  clicks: number;
  impressions: number;
  /** %, one decimal. */
  ctr: number;
  position: number;
}

export interface SiteSearch {
  clicks: SearchMetric;
  impressions: SearchMetric;
  /** Clicks ÷ impressions, %, one decimal. */
  ctr: { value: number; previous: number };
  /** Average position, one decimal; lower is better. Null with no impressions. */
  position: { value: number | null; previous: number | null };
  topQueries: SearchRow[];
  topPages: SearchRow[];
}

export interface SearchSite {
  id: FamilyAppId;
  name: string;
  /** The property read, or the one to grant when none is visible. */
  property: string;
  result: Section<SiteSearch>;
}

export interface SearchConsoleSummary {
  window: { from: string; to: string };
  previous: { from: string; to: string };
  /** The service account's email: the user to add in Search Console. */
  account: string;
  sites: SearchSite[];
  fetchedAt: string;
}

// ─── Windows ─────────────────────────────────────────────────────────

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** The 28 days ending LAG_DAYS ago (UTC), and the 28 before. */
export function searchWindows(now: Date) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - LAG_DAYS * DAY);
  const start = new Date(end.getTime() - (WINDOW_DAYS - 1) * DAY);
  const prevEnd = new Date(start.getTime() - DAY);
  const prevStart = new Date(prevEnd.getTime() - (WINDOW_DAYS - 1) * DAY);
  return { current: { from: isoDay(start), to: isoDay(end) }, previous: { from: isoDay(prevStart), to: isoDay(prevEnd) } };
}

// ─── Reading the API ─────────────────────────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Property ids the account can read. `siteUnverifiedUser` means it has no access. */
export function readSiteList(body: unknown): Set<string> {
  const entries = isObj(body) && Array.isArray(body.siteEntry) ? body.siteEntry : [];
  return new Set(
    entries.filter((e): e is Obj => isObj(e) && typeof e.siteUrl === 'string' && e.permissionLevel !== 'siteUnverifiedUser').map((e) => e.siteUrl as string),
  );
}

export function readRows(body: unknown): SearchRow[] {
  const rows = isObj(body) && Array.isArray(body.rows) ? body.rows : [];
  return rows
    .filter(isObj)
    .map((r) => ({
      key: Array.isArray(r.keys) && typeof r.keys[0] === 'string' ? r.keys[0] : '',
      clicks: num(r.clicks),
      impressions: num(r.impressions),
      ctr: round1(num(r.ctr) * 100),
      position: round1(num(r.position)),
    }));
}

/** A no-dimension query's single row; an empty answer is a real zero (access was checked first). */
function readTotals(body: unknown) {
  const [row] = readRows(body);
  return row ?? { key: '', clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

export function summariseSite(current: unknown, previous: unknown, queries: unknown, pages: unknown): SiteSearch {
  const c = readTotals(current);
  const p = readTotals(previous);
  const ctr = (t: SearchRow) => (t.impressions > 0 ? round1((t.clicks / t.impressions) * 100) : 0);
  return {
    clicks: { value: c.clicks, previous: p.clicks, delta: pctDelta(c.clicks, p.clicks) },
    impressions: { value: c.impressions, previous: p.impressions, delta: pctDelta(c.impressions, p.impressions) },
    ctr: { value: ctr(c), previous: ctr(p) },
    position: { value: c.impressions > 0 ? c.position : null, previous: p.impressions > 0 ? p.position : null },
    topQueries: readRows(queries).slice(0, TOP_N),
    topPages: readRows(pages).slice(0, TOP_N),
  };
}

class GoogleError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Google's 403 for an API not enabled on the key's Cloud project. */
export function disabledApiHint(message: string): string | null {
  if (!/SERVICE_DISABLED|has not been used in project|is disabled/i.test(message)) return null;
  const project = message.match(/project[ /]+([a-z0-9-]+)/i)?.[1];
  return `The Google Search Console API is not enabled on the service account's Cloud project${project ? ` (${project})` : ''}. Enable it under APIs & Services → Library → “Google Search Console API”.`;
}

export interface SearchConsoleDeps {
  fetchImpl?: typeof fetch;
  getToken?: (key: ServiceAccountKey, scope: string) => Promise<string>;
  now?: () => Date;
}

async function google(path: string, token: string, fetchImpl: typeof fetch, body?: object): Promise<unknown> {
  const res = await fetchImpl(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok)
    throw new GoogleError(res.status, `Search Console ${res.status}: ${cleanMessage((await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300))}`);
  return res.json();
}

export const grantHint = (account: string, property: string) =>
  `Add ${account} as a Restricted user on ${property} (Search Console → Settings → Users and permissions → Add user).`;

async function readSite(
  site: SiteConfig,
  visible: Set<string>,
  account: string,
  token: string,
  windows: ReturnType<typeof searchWindows>,
  fetchImpl: typeof fetch,
): Promise<SearchSite> {
  const property = site.properties.find((p) => visible.has(p));
  if (!property) {
    return {
      id: site.id,
      name: site.name,
      property: site.properties[0],
      result: { state: 'not_configured', missing: [], hint: grantHint(account, site.properties[0]) },
    };
  }
  const filters = site.page && property.startsWith('sc-domain:') ? [{ filters: [{ dimension: 'page', ...site.page }] }] : undefined;
  const query = (range: { from: string; to: string }, dimension?: 'query' | 'page') =>
    google(`/sites/${encodeURIComponent(property)}/searchAnalytics/query`, token, fetchImpl, {
      startDate: range.from,
      endDate: range.to,
      ...(dimension ? { dimensions: [dimension], rowLimit: TOP_N } : {}),
      ...(filters ? { dimensionFilterGroups: filters } : {}),
    });
  try {
    const [current, previous, queries, pages] = await Promise.all([
      query(windows.current),
      query(windows.previous),
      query(windows.current, 'query'),
      query(windows.current, 'page'),
    ]);
    return { id: site.id, name: site.name, property, result: { state: 'ok', data: summariseSite(current, previous, queries, pages) } };
  } catch (err) {
    if (err instanceof GoogleError && err.status === 403) {
      return { id: site.id, name: site.name, property, result: { state: 'not_configured', missing: [], hint: grantHint(account, property) } };
    }
    return { id: site.id, name: site.name, property, result: { state: 'error', message: errorMessage(err) } };
  }
}

/** Every site's figures, uncached. */
export async function fetchSearchConsole(
  env: Record<string, string | undefined> = process.env,
  { fetchImpl = fetch, getToken = getServiceAccountToken, now = () => new Date() }: SearchConsoleDeps = {},
): Promise<Section<SearchConsoleSummary>> {
  const credentials = env[CREDENTIALS_VAR]?.trim();
  if (!credentials) return { state: 'not_configured', missing: [CREDENTIALS_VAR] };

  try {
    const key = decodeServiceAccountKey(credentials, CREDENTIALS_VAR);
    const token = await getToken(key, SEARCH_CONSOLE_SCOPE);

    let visible: Set<string>;
    try {
      visible = readSiteList(await google('/sites', token, fetchImpl));
    } catch (err) {
      const hint = err instanceof GoogleError && err.status === 403 ? disabledApiHint(err.message) : null;
      if (hint) return { state: 'not_configured', missing: [], hint };
      throw err;
    }

    const at = now();
    const windows = searchWindows(at);
    const sites = await Promise.all(SEARCH_SITES.map((site) => readSite(site, visible, key.clientEmail, token, windows, fetchImpl)));
    return { state: 'ok', data: { window: windows.current, previous: windows.previous, account: key.clientEmail, sites, fetchedAt: at.toISOString() } };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}

/** Kept for six hours when every site read; fifteen minutes otherwise. */
export function searchTtl(section: Section<SearchConsoleSummary>): number {
  return section.state === 'ok' && section.data.sites.every((s) => s.result.state === 'ok') ? GOOD_TTL_S : PARTIAL_TTL_S;
}

const isSection = (v: unknown): v is Section<SearchConsoleSummary> =>
  isObj(v) && (v.state === 'ok' ? isObj(v.data) && Array.isArray(v.data.sites) : v.state === 'not_configured' || v.state === 'error');

/** The family's Search Console section, from the Runtime Cache when it has one. A cache error only costs a fetch. */
export async function getSearchConsole(
  env: Record<string, string | undefined> = process.env,
  { cache = getCache(), ...deps }: SearchConsoleDeps & { cache?: RuntimeCache } = {},
): Promise<Section<SearchConsoleSummary>> {
  const hit = await cache.get(CACHE_KEY).catch(() => null);
  if (isSection(hit)) return hit;
  const section = await fetchSearchConsole(env, deps);
  await cache.set(CACHE_KEY, section, { ttl: searchTtl(section), name: 'search-console' }).catch(() => undefined);
  return section;
}
