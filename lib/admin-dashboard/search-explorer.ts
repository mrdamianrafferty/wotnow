/**
 * Search Console, deeper than the family dashboard's top five: for one site,
 * its top pages and queries ranked by impressions, the pages that are showing
 * but not being clicked (what is worth rewriting first), the queries behind a
 * single page, and an indexing check on a sample of its sitemap.
 *
 * Reads with the same service account as search-console.ts (GA4 credentials,
 * webmasters.readonly) and resolves each site's property the same way. Admin
 * only (pages/api/admin/search-explorer.ts); nothing here is cached, because a
 * person asked for it.
 *
 * THE INDEXING CHECK is the URL Inspection API: Google's own answer, per URL,
 * to "are you in the index, and if not, why not". It is limited to 2,000
 * inspections a day per property, so a check is a sample (default 20, at most
 * 50) taken evenly across the sitemap so that every kind of page is hit, not
 * just the first hundred of one kind.
 */

import { decodeServiceAccountKey, getServiceAccountToken, type ServiceAccountKey } from '@/lib/google/service-account-token';
import { cleanMessage, type FamilyAppId } from './family';
import {
  CREDENTIALS_VAR,
  GoogleError,
  SEARCH_CONSOLE_SCOPE,
  SEARCH_SITES,
  google,
  grantHint,
  readRows,
  readSiteList,
  searchWindows,
  type SearchRow,
  type SiteConfig,
} from './search-console';
import { errorMessage } from './types';

const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const TIMEOUT_MS = 15_000;
const PAGE_ROWS = 500;
const QUERY_ROWS = 500;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;
export const DEFAULT_INSPECT = 20;
export const MAX_INSPECT = 50;
const INSPECT_CONCURRENCY = 4;
/** Below this many impressions a page's CTR says nothing: one click moves it a point. */
export const MIN_IMPRESSIONS = 30;

/** Where each site's sitemap is. A sitemap index is followed one level down. */
export const SITEMAPS: Record<FamilyAppId, string | null> = {
  godaisy: 'https://godaisy.io/sitemap.xml',
  growdaisy: 'https://grow.godaisy.io/sitemap.xml',
  risedaisy: 'https://www.risedaisy.com/sitemap.xml',
  hungerford: null,
  findr: 'https://fishfindr.eu/sitemap.xml',
  flycast: 'https://flycastcoach.com/sitemap.xml',
  grewp: 'https://grewp.org/sitemap.xml',
};

// ─── What a page "should" get ────────────────────────────────────────

/**
 * Rough share of impressions that become clicks at each average position, in
 * %. A blend of published organic-CTR studies, deliberately round: it exists to
 * rank "this page is under-performing its position" against its neighbours,
 * not to forecast clicks. A page far below it at position 9 has a snippet
 * problem (title, description, or something above it on the results page).
 */
const CTR_BY_POSITION = [0, 28, 15, 11, 8, 6.5, 5, 4, 3.2, 2.8, 2.4];

export function expectedCtr(position: number): number {
  if (!(position > 0)) return 0;
  const p = Math.round(position);
  if (p <= 10) return CTR_BY_POSITION[p];
  if (p <= 20) return Math.max(0.6, Math.round((2.4 - (p - 10) * 0.18) * 10) / 10);
  return 0.3;
}

export interface ExplorerRow extends SearchRow {
  /** %, from the position alone. */
  expectedCtr: number;
  /** Clicks the position would usually earn, less the clicks it got; never below 0. */
  missedClicks: number;
}

export function withExpectation(row: SearchRow): ExplorerRow {
  const expected = expectedCtr(row.position);
  const missed = Math.max(0, Math.round((row.impressions * expected) / 100 - row.clicks));
  return { ...row, expectedCtr: expected, missedClicks: missed };
}

/** Pages worth rewriting first: enough impressions to mean something, most clicks left on the table. */
export function opportunities(rows: SearchRow[], minImpressions = MIN_IMPRESSIONS, top = 15): ExplorerRow[] {
  return rows
    .filter((r) => r.impressions >= minImpressions)
    .map(withExpectation)
    .filter((r) => r.missedClicks >= 1 && r.ctr < r.expectedCtr * 0.6)
    .sort((a, b) => b.missedClicks - a.missedClicks || b.impressions - a.impressions)
    .slice(0, top);
}

const byImpressions = (a: SearchRow, b: SearchRow) => b.impressions - a.impressions || b.clicks - a.clicks;

// ─── Resolving a site ────────────────────────────────────────────────

export interface ExplorerDeps {
  fetchImpl?: typeof fetch;
  getToken?: (key: ServiceAccountKey, scope: string) => Promise<string>;
  now?: () => Date;
}

export type Resolved = { ok: true; site: SiteConfig; property: string; token: string; account: string } | { ok: false; status: 'not_configured' | 'error'; message: string };

export async function resolveSite(
  siteId: string,
  env: Record<string, string | undefined>,
  { fetchImpl = fetch, getToken = getServiceAccountToken }: ExplorerDeps = {},
): Promise<Resolved> {
  const site = SEARCH_SITES.find((s) => s.id === siteId);
  if (!site) return { ok: false, status: 'error', message: `Unknown site "${siteId}". Try one of: ${SEARCH_SITES.map((s) => s.id).join(', ')}.` };
  const credentials = env[CREDENTIALS_VAR]?.trim();
  if (!credentials) return { ok: false, status: 'not_configured', message: `${CREDENTIALS_VAR} is not set.` };
  try {
    const key = decodeServiceAccountKey(credentials, CREDENTIALS_VAR);
    const token = await getToken(key, SEARCH_CONSOLE_SCOPE);
    const visible = readSiteList(await google('/sites', token, fetchImpl));
    const property = site.properties.find((p) => visible.has(p));
    if (!property) return { ok: false, status: 'not_configured', message: grantHint(key.clientEmail, site.properties[0]) };
    return { ok: true, site, property, token, account: key.clientEmail };
  } catch (err) {
    return { ok: false, status: 'error', message: errorMessage(err) };
  }
}

// ─── Deeper view ─────────────────────────────────────────────────────

export interface ExplorerView {
  site: FamilyAppId;
  name: string;
  property: string;
  window: { from: string; to: string };
  pages: ExplorerRow[];
  queries: SearchRow[];
  /** Pages showing a lot and clicked little for where they rank, most clicks missed first. */
  opportunities: ExplorerRow[];
  totals: { pages: number; queries: number };
}

export type ExplorerResult = { state: 'ok'; data: ExplorerView } | { state: 'not_configured' | 'error'; message: string };

const clampLimit = (n: number | undefined) => Math.min(MAX_LIMIT, Math.max(1, Math.floor(n ?? DEFAULT_LIMIT)));

export async function exploreSite(
  siteId: string,
  { limit, minImpressions = MIN_IMPRESSIONS }: { limit?: number; minImpressions?: number } = {},
  env: Record<string, string | undefined> = process.env,
  deps: ExplorerDeps = {},
): Promise<ExplorerResult> {
  const r = await resolveSite(siteId, env, deps);
  if (!r.ok) return { state: r.status, message: r.message };
  const { fetchImpl = fetch, now = () => new Date() } = deps;
  const windows = searchWindows(now());
  const pageFilter = r.site.page && r.property.startsWith('sc-domain:') ? [{ filters: [{ dimension: 'page', ...r.site.page }] }] : undefined;
  const query = (dimension: 'page' | 'query', rowLimit: number) =>
    google(`/sites/${encodeURIComponent(r.property)}/searchAnalytics/query`, r.token, fetchImpl, {
      startDate: windows.current.from,
      endDate: windows.current.to,
      dimensions: [dimension],
      rowLimit,
      ...(pageFilter ? { dimensionFilterGroups: pageFilter } : {}),
    });
  try {
    const [pagesBody, queriesBody] = await Promise.all([query('page', PAGE_ROWS), query('query', QUERY_ROWS)]);
    const pages = readRows(pagesBody).sort(byImpressions);
    const queries = readRows(queriesBody).sort(byImpressions);
    const n = clampLimit(limit);
    return {
      state: 'ok',
      data: {
        site: r.site.id,
        name: r.site.name,
        property: r.property,
        window: windows.current,
        pages: pages.slice(0, n).map(withExpectation),
        queries: queries.slice(0, n),
        opportunities: opportunities(pages, minImpressions),
        totals: { pages: pages.length, queries: queries.length },
      },
    };
  } catch (err) {
    if (err instanceof GoogleError && err.status === 403) return { state: 'not_configured', message: grantHint(r.account, r.property) };
    return { state: 'error', message: errorMessage(err) };
  }
}

/** The queries that brought people to one page. */
export async function queriesForPage(
  siteId: string,
  pageUrl: string,
  env: Record<string, string | undefined> = process.env,
  deps: ExplorerDeps = {},
): Promise<{ state: 'ok'; data: { page: string; window: { from: string; to: string }; queries: SearchRow[] } } | { state: 'not_configured' | 'error'; message: string }> {
  if (!/^https:\/\/[^\s]+$/.test(pageUrl)) return { state: 'error', message: 'page must be a full https URL.' };
  const r = await resolveSite(siteId, env, deps);
  if (!r.ok) return { state: r.status, message: r.message };
  const { fetchImpl = fetch, now = () => new Date() } = deps;
  const windows = searchWindows(now());
  try {
    const body = await google(`/sites/${encodeURIComponent(r.property)}/searchAnalytics/query`, r.token, fetchImpl, {
      startDate: windows.current.from,
      endDate: windows.current.to,
      dimensions: ['query'],
      rowLimit: 100,
      dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'equals', expression: pageUrl }] }],
    });
    return { state: 'ok', data: { page: pageUrl, window: windows.current, queries: readRows(body).sort(byImpressions) } };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}

// ─── Indexing check ──────────────────────────────────────────────────

/** `<loc>` values of a sitemap or sitemap index, and which of the two it is. */
export function parseSitemap(xml: string): { index: boolean; urls: string[] } {
  const urls = [...xml.matchAll(/<loc>\s*([^<\s][^<]*?)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  return { index: /<sitemapindex[\s>]/.test(xml), urls };
}

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store', headers: { Accept: 'application/xml,text/xml' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

/** Every page URL the site's sitemap lists, following an index one level down (capped, so a huge index cannot run away). */
export async function sitemapUrls(sitemap: string, fetchImpl: typeof fetch, maxChildren = 12): Promise<string[]> {
  const top = parseSitemap(await fetchText(sitemap, fetchImpl));
  if (!top.index) return top.urls;
  const children = await Promise.all(
    top.urls.slice(0, maxChildren).map((u) =>
      fetchText(u, fetchImpl)
        .then((x) => parseSitemap(x).urls)
        .catch(() => [] as string[]),
    ),
  );
  return children.flat();
}

/** `count` URLs spread evenly over the list, so every kind of page the sitemap holds is sampled. Deterministic: the same check twice looks at the same pages. */
export function sampleEvenly<T>(items: T[], count: number): T[] {
  if (count <= 0 || items.length === 0) return [];
  if (items.length <= count) return [...items];
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(items[Math.floor(((i + 0.5) * items.length) / count)]);
  return out;
}

export interface InspectedUrl {
  url: string;
  /** Google's own words: "Submitted and indexed", "Crawled - currently not indexed", "URL is unknown to Google". */
  coverage: string;
  /** PASS (indexed), NEUTRAL (excluded on purpose), FAIL (not indexed), or UNKNOWN. */
  verdict: string;
  indexed: boolean;
  lastCrawl: string | null;
  /** Google's chosen canonical when it differs from the one the page declares. */
  canonicalMismatch: string | null;
  robots: string | null;
  fetchState: string | null;
  error?: string;
}

export function readInspection(url: string, body: unknown): InspectedUrl {
  const r = (body as { inspectionResult?: { indexStatusResult?: Record<string, unknown> } } | null)?.inspectionResult?.indexStatusResult ?? {};
  const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null);
  const verdict = str(r.verdict) ?? 'UNKNOWN';
  const google = str(r.googleCanonical);
  const user = str(r.userCanonical);
  return {
    url,
    coverage: str(r.coverageState) ?? 'No answer from Google',
    verdict,
    indexed: verdict === 'PASS',
    lastCrawl: str(r.lastCrawlTime),
    canonicalMismatch: google && user && google !== user ? google : null,
    robots: str(r.robotsTxtState),
    fetchState: str(r.pageFetchState),
  };
}

export interface IndexingReport {
  site: FamilyAppId;
  name: string;
  property: string;
  sitemap: string;
  sitemapUrls: number;
  checked: number;
  indexed: number;
  /** Counts by Google's coverage wording, biggest first. */
  byCoverage: { coverage: string; count: number }[];
  /** Not indexed first, then by URL. */
  urls: InspectedUrl[];
  /** URLs that Google could not be asked about (quota, errors). */
  failed: number;
}

export type IndexingResult = { state: 'ok'; data: IndexingReport } | { state: 'not_configured' | 'error'; message: string };

export function summariseIndexing(base: Pick<IndexingReport, 'site' | 'name' | 'property' | 'sitemap' | 'sitemapUrls'>, inspected: InspectedUrl[]): IndexingReport {
  const answered = inspected.filter((u) => !u.error);
  const counts = new Map<string, number>();
  for (const u of answered) counts.set(u.coverage, (counts.get(u.coverage) ?? 0) + 1);
  return {
    ...base,
    checked: answered.length,
    indexed: answered.filter((u) => u.indexed).length,
    byCoverage: [...counts].map(([coverage, count]) => ({ coverage, count })).sort((a, b) => b.count - a.count),
    urls: [...inspected].sort((a, b) => Number(a.indexed) - Number(b.indexed) || a.url.localeCompare(b.url)),
    failed: inspected.length - answered.length,
  };
}

export async function checkIndexing(
  siteId: string,
  { count = DEFAULT_INSPECT }: { count?: number } = {},
  env: Record<string, string | undefined> = process.env,
  deps: ExplorerDeps = {},
): Promise<IndexingResult> {
  const r = await resolveSite(siteId, env, deps);
  if (!r.ok) return { state: r.status, message: r.message };
  const sitemap = SITEMAPS[r.site.id];
  if (!sitemap) return { state: 'error', message: `${r.site.name} has no public sitemap to sample.` };
  const { fetchImpl = fetch } = deps;

  let urls: string[];
  try {
    urls = await sitemapUrls(sitemap, fetchImpl);
  } catch (err) {
    return { state: 'error', message: `Could not read the sitemap: ${errorMessage(err)}` };
  }
  // Grow Daisy shares a Domain property with Go Daisy: inspect only its own host's pages
  if (r.site.page?.operator === 'contains') urls = urls.filter((u) => u.includes(r.site.page!.expression));
  if (urls.length === 0) return { state: 'error', message: 'The sitemap lists no pages.' };

  const sample = sampleEvenly(urls, Math.min(MAX_INSPECT, Math.max(1, Math.floor(count))));
  const inspected: InspectedUrl[] = new Array(sample.length);
  let next = 0;
  let quotaHit = false;
  await Promise.all(
    Array.from({ length: Math.min(INSPECT_CONCURRENCY, sample.length) }, async () => {
      while (next < sample.length) {
        const i = next++;
        const url = sample[i];
        try {
          const res = await fetchImpl(INSPECT_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${r.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ inspectionUrl: url, siteUrl: r.property, languageCode: 'en-GB' }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: 'no-store',
          });
          if (res.status === 429) quotaHit = true;
          if (!res.ok) throw new GoogleError(res.status, `URL Inspection ${res.status}: ${cleanMessage((await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200))}`);
          inspected[i] = readInspection(url, await res.json());
        } catch (err) {
          inspected[i] = { url, coverage: 'Could not be inspected', verdict: 'UNKNOWN', indexed: false, lastCrawl: null, canonicalMismatch: null, robots: null, fetchState: null, error: errorMessage(err) };
        }
      }
    }),
  );

  const report = summariseIndexing({ site: r.site.id, name: r.site.name, property: r.property, sitemap, sitemapUrls: urls.length }, inspected);
  // Every URL refused with the same status means access, not the pages: say so rather than showing N identical failures
  if (report.checked === 0) {
    const first = inspected.find((u) => u.error)?.error ?? 'No answer.';
    const hint = /403/.test(first) ? ` The URL Inspection API needs ${r.account} to be a Full user on ${r.property}, not Restricted.` : quotaHit ? ' The daily inspection quota may be used up.' : '';
    return { state: 'error', message: `${first}${hint}` };
  }
  return { state: 'ok', data: report };
}

