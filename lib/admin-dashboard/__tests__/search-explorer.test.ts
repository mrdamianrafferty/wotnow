/**
 * @jest-environment node
 *
 * The deeper Search Console view and the indexing check behind /admin/search.
 */

import { generateKeyPairSync } from 'node:crypto';
import { CREDENTIALS_VAR, SEARCH_SITES } from '../search-console';
import { SEARCH_SITE_LIST } from '../search-site-list';
import {
  SITEMAPS,
  checkIndexing,
  exploreSite,
  expectedCtr,
  opportunities,
  parseSitemap,
  queriesForPage,
  readInspection,
  sampleEvenly,
  sitemapUrls,
  summariseIndexing,
  withExpectation,
} from '../search-explorer';

const now = new Date('2026-10-28T10:00:00Z');
const ACCOUNT = 'reader@example.iam.gserviceaccount.com';
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
const env = { [CREDENTIALS_VAR]: Buffer.from(JSON.stringify({ client_email: ACCOUNT, private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) })).toString('base64') };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const getToken = async () => 'tok';
const row = (key: string, impressions: number, clicks: number, position: number) => ({ key, impressions, clicks, ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0, position });
const g = (key: string, impressions: number, clicks: number, position: number) => ({ keys: [key], impressions, clicks, ctr: clicks / impressions, position });

describe('the site list the page offers', () => {
  it('is the server’s own list: same sites, same names, same order', () => {
    expect(SEARCH_SITE_LIST).toEqual(SEARCH_SITES.map((s) => ({ id: s.id, name: s.name })));
  });
});

describe('what a page should earn', () => {
  it('falls with position, in steps a reader would recognise', () => {
    expect(expectedCtr(1)).toBeGreaterThan(expectedCtr(3));
    expect(expectedCtr(3)).toBeGreaterThan(expectedCtr(9));
    expect(expectedCtr(9.4)).toBe(expectedCtr(9));
    expect(expectedCtr(15)).toBeLessThan(expectedCtr(10));
    expect(expectedCtr(80)).toBeLessThan(1);
    expect(expectedCtr(0)).toBe(0);
  });

  it('counts the clicks a page left on the table, never below zero', () => {
    // position 9.5 rounds to 10, where 2.4% of 569 is 13.7 clicks; it got 2
    expect(withExpectation(row('/a', 569, 2, 9.5)).missedClicks).toBe(12);
    expect(withExpectation(row('/b', 100, 50, 9)).missedClicks).toBe(0);
  });

  it('lists the under-performers by clicks missed, and ignores pages too small to judge', () => {
    const rows = [row('/london', 614, 12, 8.2), row('/manchester', 569, 2, 9.5), row('/glasgow', 550, 4, 12.2), row('/tiny', 10, 0, 5), row('/fine', 400, 40, 5)];
    const out = opportunities(rows);
    // London is a little under its rank (1.95% against 3.2%) but not far enough under to flag: it is a normal page
    expect(out.map((r) => r.key)).toEqual(['/manchester', '/glasgow']);
    expect(out.find((r) => r.key === '/london')).toBeUndefined();
    expect(out.find((r) => r.key === '/tiny')).toBeUndefined();
    expect(out.find((r) => r.key === '/fine')).toBeUndefined();
  });
});

describe('sitemaps and sampling', () => {
  it('reads urls from a sitemap and says whether it is an index', () => {
    const urlset = '<urlset><url><loc>https://a.test/x?a=1&amp;b=2</loc></url><url><loc> https://a.test/y </loc></url></urlset>';
    expect(parseSitemap(urlset)).toEqual({ index: false, urls: ['https://a.test/x?a=1&b=2', 'https://a.test/y'] });
    expect(parseSitemap('<sitemapindex><sitemap><loc>https://a.test/s1.xml</loc></sitemap></sitemapindex>').index).toBe(true);
  });

  it('follows a sitemap index one level down and survives a child that fails', async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/index.xml')) return new Response('<sitemapindex><loc>https://a.test/s1.xml</loc><loc>https://a.test/s2.xml</loc></sitemapindex>');
      if (url.endsWith('/s1.xml')) return new Response('<urlset><loc>https://a.test/1</loc><loc>https://a.test/2</loc></urlset>');
      return new Response('', { status: 500 });
    }) as typeof fetch;
    expect(await sitemapUrls('https://a.test/index.xml', fetchImpl)).toEqual(['https://a.test/1', 'https://a.test/2']);
  });

  it('samples evenly across the list, the same way twice, and returns all of a short one', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const s = sampleEvenly(items, 10);
    expect(s).toHaveLength(10);
    expect(s[0]).toBeLessThan(10);
    expect(s[9]).toBeGreaterThan(89);
    expect(sampleEvenly(items, 10)).toEqual(s);
    expect(sampleEvenly([1, 2, 3], 10)).toEqual([1, 2, 3]);
    expect(sampleEvenly([], 5)).toEqual([]);
  });

  it('has a sitemap for every site that has a public one', () => {
    expect(SITEMAPS.godaisy).toBe('https://godaisy.io/sitemap.xml');
    expect(SITEMAPS.hungerford).toBeNull();
  });
});

describe('reading Google’s inspection', () => {
  const answer = (indexStatusResult: object) => ({ inspectionResult: { indexStatusResult } });

  it('calls a PASS indexed and keeps Google’s words', () => {
    expect(readInspection('https://a.test/1', answer({ verdict: 'PASS', coverageState: 'Submitted and indexed', lastCrawlTime: '2026-10-20T01:00:00Z', robotsTxtState: 'ALLOWED' }))).toMatchObject({
      indexed: true,
      coverage: 'Submitted and indexed',
      lastCrawl: '2026-10-20T01:00:00Z',
    });
  });

  it('calls anything else not indexed, and notices when Google chose a different canonical', () => {
    const r = readInspection('https://a.test/1', answer({ verdict: 'NEUTRAL', coverageState: 'Crawled - currently not indexed', googleCanonical: 'https://a.test/other', userCanonical: 'https://a.test/1' }));
    expect(r.indexed).toBe(false);
    expect(r.canonicalMismatch).toBe('https://a.test/other');
  });

  it('copes with an answer that says nothing', () => {
    expect(readInspection('https://a.test/1', {})).toMatchObject({ indexed: false, verdict: 'UNKNOWN', coverage: 'No answer from Google' });
  });

  it('counts by coverage wording, not-indexed first, and keeps failures out of the denominator', () => {
    const mk = (url: string, coverage: string, indexed: boolean, error?: string) => ({ url, coverage, verdict: indexed ? 'PASS' : 'NEUTRAL', indexed, lastCrawl: null, canonicalMismatch: null, robots: null, fetchState: null, ...(error ? { error } : {}) });
    const rep = summariseIndexing({ site: 'godaisy', name: 'Go Daisy', property: 'sc-domain:godaisy.io', sitemap: 's', sitemapUrls: 4420 }, [
      mk('/a', 'Submitted and indexed', true),
      mk('/b', 'Discovered - currently not indexed', false),
      mk('/c', 'Discovered - currently not indexed', false),
      mk('/d', 'Could not be inspected', false, '429'),
    ]);
    expect(rep).toMatchObject({ checked: 3, indexed: 1, failed: 1 });
    expect(rep.byCoverage[0]).toEqual({ coverage: 'Discovered - currently not indexed', count: 2 });
    expect(rep.urls[rep.urls.length - 1].url).toBe('/a');
  });
});

/** A fake Google: sites.list, searchAnalytics, URL Inspection, and the sitemap, recording the calls. */
function fake({ visible = [{ siteUrl: 'sc-domain:godaisy.io', permissionLevel: 'siteRestrictedUser' }], inspect = 'indexed' as 'indexed' | 'unknown' | 'forbidden' } = {}) {
  const calls: { url: string; body: Record<string, unknown> | null }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ url, body });
    if (url.endsWith('/sitemap.xml')) return new Response(`<urlset>${Array.from({ length: 100 }, (_, i) => `<url><loc>https://godaisy.io/spot/${i}</loc></url>`).join('')}</urlset>`);
    if (url.endsWith('/webmasters/v3/sites')) return json({ siteEntry: visible });
    if (url.includes('/searchAnalytics/query')) {
      const dim = (body?.dimensions as string[] | undefined)?.[0];
      if (dim === 'page') return json({ rows: [g('https://godaisy.io/a', 40, 0, 6), g('https://godaisy.io/b', 300, 12, 6)] });
      return json({ rows: [g('go daisy', 6, 0, 3.7), g('weather', 90, 3, 7)] });
    }
    if (url.includes('urlInspection')) {
      if (inspect === 'forbidden') return new Response('{"error":{"message":"forbidden"}}', { status: 403 });
      const verdict = inspect === 'indexed' ? 'PASS' : 'NEUTRAL';
      return json({ inspectionResult: { indexStatusResult: { verdict, coverageState: inspect === 'indexed' ? 'Submitted and indexed' : 'URL is unknown to Google' } } });
    }
    return new Response('', { status: 404 });
  }) as typeof fetch;
  return { calls, impl };
}

describe('the deeper view', () => {
  it('ranks pages and queries by impressions and picks out the under-performer', async () => {
    const f = fake();
    const out = await exploreSite('godaisy', { limit: 10 }, env, { fetchImpl: f.impl, getToken, now: () => now });
    expect(out.state).toBe('ok');
    if (out.state !== 'ok') return;
    expect(out.data.pages.map((p) => p.key)).toEqual(['https://godaisy.io/b', 'https://godaisy.io/a']);
    expect(out.data.queries[0].key).toBe('weather');
    expect(out.data.opportunities.map((p) => p.key)).toEqual(['https://godaisy.io/a']);
    expect(out.data.property).toBe('sc-domain:godaisy.io');
    // Go Daisy shares a Domain property with Grow Daisy: its own queries must exclude Grow's host
    const q = f.calls.find((c) => c.url.includes('searchAnalytics'))!;
    expect(JSON.stringify(q.body)).toContain('notContains');
  });

  it('asks for one page’s queries by exact URL, and refuses anything that is not a URL', async () => {
    const f = fake();
    const ok = await queriesForPage('godaisy', 'https://godaisy.io/b', env, { fetchImpl: f.impl, getToken, now: () => now });
    expect(ok.state).toBe('ok');
    expect(JSON.stringify(f.calls.at(-1)!.body)).toContain('"operator":"equals"');
    expect((await queriesForPage('godaisy', 'javascript:alert(1)', env, { fetchImpl: f.impl, getToken })).state).toBe('error');
  });

  it('says what is missing rather than showing nothing', async () => {
    expect(await exploreSite('godaisy', {}, {}, { fetchImpl: fake().impl, getToken })).toMatchObject({ state: 'not_configured', message: expect.stringContaining(CREDENTIALS_VAR) });
    expect(await exploreSite('nope', {}, env, { fetchImpl: fake().impl, getToken })).toMatchObject({ state: 'error', message: expect.stringContaining('Unknown site') });
    const none = await exploreSite('godaisy', {}, env, { fetchImpl: fake({ visible: [] }).impl, getToken });
    expect(none).toMatchObject({ state: 'not_configured', message: expect.stringContaining(ACCOUNT) });
  });
});

describe('the indexing check', () => {
  it('inspects an even sample of the sitemap against the site’s own property', async () => {
    const f = fake();
    const out = await checkIndexing('godaisy', { count: 10 }, env, { fetchImpl: f.impl, getToken });
    expect(out.state).toBe('ok');
    if (out.state !== 'ok') return;
    expect(out.data).toMatchObject({ checked: 10, indexed: 10, sitemapUrls: 100 });
    const inspections = f.calls.filter((c) => c.url.includes('urlInspection'));
    expect(inspections).toHaveLength(10);
    expect(inspections.every((c) => c.body?.siteUrl === 'sc-domain:godaisy.io')).toBe(true);
    const urls = inspections.map((c) => String(c.body?.inspectionUrl));
    expect(new Set(urls).size).toBe(10);
  });

  it('reports pages Google does not know about', async () => {
    const out = await checkIndexing('godaisy', { count: 5 }, env, { fetchImpl: fake({ inspect: 'unknown' }).impl, getToken });
    expect(out).toMatchObject({ state: 'ok', data: { checked: 5, indexed: 0, byCoverage: [{ coverage: 'URL is unknown to Google', count: 5 }] } });
  });

  it('never inspects more than the cap, however many are asked for', async () => {
    const f = fake();
    await checkIndexing('godaisy', { count: 500 }, env, { fetchImpl: f.impl, getToken });
    expect(f.calls.filter((c) => c.url.includes('urlInspection')).length).toBeLessThanOrEqual(50);
  });

  it('explains a refusal as an access problem, once, not as fifty failures', async () => {
    const out = await checkIndexing('godaisy', { count: 5 }, env, { fetchImpl: fake({ inspect: 'forbidden' }).impl, getToken });
    expect(out.state).toBe('error');
    expect(out).toMatchObject({ message: expect.stringMatching(/Full user/) });
  });

  it('says so when a site has no sitemap to sample', async () => {
    const out = await checkIndexing('hungerford', {}, env, { fetchImpl: fake().impl, getToken });
    expect(out.state === 'error' || out.state === 'not_configured').toBe(true);
  });
});
