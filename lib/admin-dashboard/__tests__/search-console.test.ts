/**
 * @jest-environment node
 */
/**
 * Search Console on /admin/apps: windows, property choice from sites.list,
 * the per-site figures, and the states that must never read as zeros
 * (no credentials, API disabled, property not granted, refused, failed).
 */

import { generateKeyPairSync } from 'node:crypto';
import type { RuntimeCache } from '@vercel/functions';
import {
  CREDENTIALS_VAR,
  GOOD_TTL_S,
  PARTIAL_TTL_S,
  SEARCH_SITES,
  disabledApiHint,
  fetchSearchConsole,
  getSearchConsole,
  readSiteList,
  searchTtl,
  searchWindows,
  summariseSite,
} from '../search-console';
import { sampleSearchConsole } from '../search-console-sample';

const now = new Date('2026-10-28T10:00:00Z');
const ACCOUNT = 'grewp-analytics-reader@grewp-fdbd2.iam.gserviceaccount.com';
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
const env = {
  [CREDENTIALS_VAR]: Buffer.from(JSON.stringify({ client_email: ACCOUNT, private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) })).toString(
    'base64',
  ),
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const getToken = async () => 'tok';

interface Call {
  url: string;
  body: Record<string, unknown> | null;
}

/** A fake Search Console: sites.list from `visible`, queries answered by `answer`. */
function fakeGoogle(visible: { siteUrl: string; permissionLevel?: string }[], answer?: (site: string, body: Record<string, unknown>) => Response) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ url, body });
    if (url.endsWith('/webmasters/v3/sites')) return json({ siteEntry: visible.map((v) => ({ permissionLevel: 'siteRestrictedUser', ...v })) });
    const site = decodeURIComponent(url.match(/\/sites\/([^/]+)\/searchAnalytics/)![1]);
    if (answer) return answer(site, body!);
    const dims = body!.dimensions as string[] | undefined;
    if (!dims) return json({ rows: [{ clicks: body!.startDate === '2026-09-28' ? 100 : 80, impressions: 4000, ctr: 0.025, position: 12.34 }] });
    return json({ rows: [{ keys: [dims[0] === 'query' ? 'go daisy' : 'https://godaisy.io/'], clicks: 50, impressions: 900, ctr: 0.0556, position: 3.21 }] });
  }) as typeof fetch;
  return { calls, impl };
}

const site = (r: Awaited<ReturnType<typeof fetchSearchConsole>>, id: string) => {
  if (r.state !== 'ok') throw new Error(`not ok: ${JSON.stringify(r)}`);
  return r.data.sites.find((s) => s.id === id)!;
};

describe('windows', () => {
  it('is the 28 days ending three days ago, and the 28 before', () => {
    expect(searchWindows(now)).toEqual({ current: { from: '2026-09-28', to: '2026-10-25' }, previous: { from: '2026-08-31', to: '2026-09-27' } });
  });
});

describe('reading', () => {
  it('drops properties the account is only an unverified user of', () => {
    const v = readSiteList({
      siteEntry: [
        { siteUrl: 'sc-domain:a.com', permissionLevel: 'siteFullUser' },
        { siteUrl: 'https://b.com/', permissionLevel: 'siteUnverifiedUser' },
      ],
    });
    expect([...v]).toEqual(['sc-domain:a.com']);
    expect(readSiteList({})).toEqual(new Set());
  });

  it('summarises totals, change and the top rows', () => {
    const d = summariseSite(
      { rows: [{ clicks: 120, impressions: 4000, ctr: 0.03, position: 9.87 }] },
      { rows: [{ clicks: 100, impressions: 5000, ctr: 0.02, position: 12.1 }] },
      { rows: [{ keys: ['q'], clicks: 5, impressions: 50, ctr: 0.1, position: 2 }] },
      {},
    );
    expect(d.clicks).toEqual({ value: 120, previous: 100, delta: 20 });
    expect(d.impressions).toEqual({ value: 4000, previous: 5000, delta: -20 });
    expect(d.ctr).toEqual({ value: 3, previous: 2 });
    expect(d.position).toEqual({ value: 9.9, previous: 12.1 });
    expect(d.topQueries).toEqual([{ key: 'q', clicks: 5, impressions: 50, ctr: 10, position: 2 }]);
    expect(d.topPages).toEqual([]);
  });

  it('a readable property with no searches is a real zero, with no position', () => {
    const d = summariseSite({}, {}, {}, {});
    expect(d.clicks).toEqual({ value: 0, previous: 0, delta: null });
    expect(d.position).toEqual({ value: null, previous: null });
  });
});

describe('fetch', () => {
  it('is not configured without the credentials', async () => {
    expect(await fetchSearchConsole({}, { getToken })).toEqual({ state: 'not_configured', missing: [CREDENTIALS_VAR] });
  });

  it('names the property and the account for every site it cannot see — never zeros', async () => {
    const g = fakeGoogle([]);
    const r = await fetchSearchConsole(env, { fetchImpl: g.impl, getToken, now: () => now });
    if (r.state !== 'ok') throw new Error('expected ok');
    expect(r.data.account).toBe(ACCOUNT);
    for (const s of r.data.sites) {
      expect(s.result.state).toBe('not_configured');
      if (s.result.state === 'not_configured') expect(s.result.hint).toContain(`Add ${ACCOUNT} as a Restricted user on ${s.property}`);
    }
    expect(site(r, 'risedaisy').property).toBe('sc-domain:risedaisy.com');
    expect(site(r, 'findr').property).toBe('https://fishfindr.eu/');
    // Only sites.list was asked
    expect(g.calls).toHaveLength(1);
  });

  it('reads the first visible candidate, and splits godaisy.io between Go Daisy and Grow Daisy', async () => {
    const g = fakeGoogle([{ siteUrl: 'sc-domain:godaisy.io' }, { siteUrl: 'https://www.risedaisy.com/' }]);
    const r = await fetchSearchConsole(env, { fetchImpl: g.impl, getToken, now: () => now });

    const go = site(r, 'godaisy');
    expect(go.property).toBe('sc-domain:godaisy.io');
    if (go.result.state !== 'ok') throw new Error('expected ok');
    expect(go.result.data.clicks).toEqual({ value: 100, previous: 80, delta: 25 });
    expect(go.result.data.topQueries[0].key).toBe('go daisy');
    expect(site(r, 'risedaisy').property).toBe('https://www.risedaisy.com/');
    expect(site(r, 'flycast').result.state).toBe('not_configured');

    const filtersFor = (property: string) =>
      g.calls.filter((c) => c.url.includes(encodeURIComponent(property))).map((c) => JSON.stringify(c.body?.dimensionFilterGroups ?? null));
    const domain = filtersFor('sc-domain:godaisy.io');
    expect(domain).toHaveLength(8);
    expect(domain.filter((f) => f.includes('"notContains"'))).toHaveLength(4);
    expect(domain.filter((f) => f.includes('"contains"'))).toHaveLength(4);
    // A URL-prefix property is never filtered
    expect(filtersFor('https://www.risedaisy.com/').every((f) => f === 'null')).toBe(true);

    const totals = g.calls.find((c) => c.body && !c.body.dimensions);
    expect(totals?.body).toMatchObject({ startDate: '2026-09-28', endDate: '2026-10-25' });
  });

  it('a 403 on one site is that site not configured; a 500 is that site’s error', async () => {
    const g = fakeGoogle([{ siteUrl: 'sc-domain:grewp.org' }, { siteUrl: 'sc-domain:flycastcoach.com' }], (s) =>
      s === 'sc-domain:grewp.org' ? json({ error: { message: 'User does not have sufficient permission' } }, 403) : json({ error: 'Backend Error' }, 500),
    );
    const r = await fetchSearchConsole(env, { fetchImpl: g.impl, getToken, now: () => now });
    const grewp = site(r, 'grewp').result;
    expect(grewp.state).toBe('not_configured');
    if (grewp.state === 'not_configured') expect(grewp.hint).toContain('sc-domain:grewp.org');
    const fly = site(r, 'flycast').result;
    expect(fly.state).toBe('error');
    if (fly.state === 'error') expect(fly.message).toContain('Search Console 500');
  });

  it('says to enable the API when Google reports it disabled', async () => {
    const msg = 'Google Search Console API has not been used in project 123456 before or it is disabled. SERVICE_DISABLED';
    const impl = (async () => json({ error: { code: 403, message: msg } }, 403)) as typeof fetch;
    const r = await fetchSearchConsole(env, { fetchImpl: impl, getToken });
    expect(r.state).toBe('not_configured');
    if (r.state === 'not_configured') expect(r.hint).toMatch(/Enable it under APIs & Services.*\(123456\)|\(123456\).*Enable it/);
    expect(disabledApiHint('nope')).toBeNull();
  });

  it('a token failure is an error, not zeros', async () => {
    const r = await fetchSearchConsole(env, {
      getToken: async () => {
        throw new Error('Google token 400: invalid_grant');
      },
    });
    expect(r).toEqual({ state: 'error', message: 'Google token 400: invalid_grant' });
  });
});

describe('cache', () => {
  function memoryCache() {
    const store = new Map<string, unknown>();
    const ttls: number[] = [];
    return {
      store,
      ttls,
      cache: {
        get: async (k: string) => store.get(k) ?? null,
        set: async (k: string, v: unknown, o?: { ttl?: number }) => {
          store.set(k, v);
          ttls.push(o?.ttl ?? -1);
        },
        delete: async (k: string) => void store.delete(k),
        expireTag: async () => undefined,
      },
    };
  }

  it('keeps six hours when every site read, fifteen minutes otherwise', () => {
    const all = fakeGoogle(SEARCH_SITES.flatMap((s) => [{ siteUrl: s.properties[0] }]));
    return fetchSearchConsole(env, { fetchImpl: all.impl, getToken, now: () => now }).then((r) => {
      expect(searchTtl(r)).toBe(GOOD_TTL_S);
      expect(searchTtl(sampleSearchConsole(now))).toBe(PARTIAL_TTL_S);
      expect(searchTtl({ state: 'error', message: 'x' })).toBe(PARTIAL_TTL_S);
    });
  });

  it('serves the cached section without asking Google again', async () => {
    const m = memoryCache();
    const g = fakeGoogle([]);
    const cache = m.cache as unknown as RuntimeCache;
    const first = await getSearchConsole(env, { cache, fetchImpl: g.impl, getToken, now: () => now });
    const second = await getSearchConsole(env, { cache, fetchImpl: g.impl, getToken, now: () => now });
    expect(second).toEqual(first);
    expect(g.calls).toHaveLength(1);
    expect(m.ttls).toEqual([PARTIAL_TTL_S]);
  });
});
