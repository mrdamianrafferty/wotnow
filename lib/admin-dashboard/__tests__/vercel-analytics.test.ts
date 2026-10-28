/**
 * @jest-environment node
 */
/**
 * Vercel Web Analytics beside GA4: the fetch (windows, project split,
 * tolerant parsing, failure handling) and the two Needs-attention rules.
 */

import { deriveAttention } from '../attention';
import { FAMILY_APPS, familyTotals, type AppSnapshot, type FamilySummary } from '../family';
import { sampleFamilySummary } from '../family-sample';
import { fetchVercelPart, readCount, readCountries, vercelWindows, VERCEL_TEAM_ID } from '../vercel-analytics';

const now = new Date('2026-10-28T10:00:00Z');
const app = (id: string) => FAMILY_APPS.find((a) => a.id === id)!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** A fake Vercel: records every URL and answers by path. */
function fakeVercel(answer: (url: URL) => Response) {
  const calls: URL[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    calls.push(url);
    return answer(url);
  }) as typeof fetch;
  return { calls, impl };
}

describe('windows', () => {
  it('is the 7 complete UTC days GA4 uses, and the 7 before', () => {
    expect(vercelWindows(now)).toEqual({
      current: { from: '2026-10-21', to: '2026-10-27' },
      previous: { from: '2026-10-14', to: '2026-10-20' },
      funnel: { from: '2026-09-30', to: '2026-10-27' },
    });
  });
});

describe('parsing', () => {
  it('reads the count in either of Vercel’s spellings', () => {
    expect(readCount({ data: { visitors: 5, pageviews: 9 } })).toEqual({ visitors: 5, pageviews: 9 });
    expect(readCount({ data: { devices: 5, total: 9 } })).toEqual({ visitors: 5, pageviews: 9 });
    expect(readCount({ data: { visitors: 5 } })).toBeNull();
    expect(readCount('nope')).toBeNull();
  });

  it('reads countries, drops "Others", names them and sorts by visitors', () => {
    const out = readCountries({
      data: [
        { key: 'US', devices: 3, total: 30 },
        { country: 'GB', visitors: 10, pageviews: 20 },
        { key: 'Others', devices: 99, total: 99 },
        { key: 'ZZ', devices: 'x', total: 1 },
      ],
    });
    expect(out.map((c) => [c.code, c.name, c.visitors, c.pageviews])).toEqual([
      ['GB', 'United Kingdom', 10, 20],
      ['US', 'United States', 3, 30],
    ]);
  });
});

describe('fetchVercelPart', () => {
  const ok = fakeVercel((url) => {
    if (url.pathname.startsWith('/v9/projects/')) return json({ id: 'prj_x' });
    if (url.pathname.endsWith('/count')) return json({ data: { visitors: url.searchParams.get('since')!.startsWith('2026-10-21') ? 100 : 80, pageviews: 400 } });
    return json({ data: [{ key: 'GB', devices: 60, total: 200 }] });
  });

  it('is "not configured" without a token and calls nothing', async () => {
    const f = fakeVercel(() => json({}));
    expect(await fetchVercelPart(app('godaisy'), {}, f.impl, now)).toEqual({ state: 'not_configured', missing: ['VERCEL_ANALYTICS_TOKEN'] });
    expect(f.calls).toHaveLength(0);
  });

  it('asks for this week and last, scoped to the team, and computes the change', async () => {
    const part = await fetchVercelPart(app('godaisy'), { VERCEL_ANALYTICS_TOKEN: 't' }, ok.impl, now);
    expect(part).toMatchObject({ state: 'ok', data: { visitors: { value: 100, previous: 80, delta: 25 }, pageviews: { value: 400 } } });
    const counts = ok.calls.filter((u) => u.pathname.endsWith('/count'));
    expect(counts.map((u) => u.searchParams.get('since'))).toEqual(['2026-10-21T00:00:00.000Z', '2026-10-14T00:00:00.000Z', '2026-09-30T00:00:00.000Z']);
    expect(counts[0].searchParams.get('until')).toBe('2026-10-27T23:59:59.999Z');
    expect(counts[0].searchParams.get('teamId')).toBe(VERCEL_TEAM_ID);
    expect(counts[0].searchParams.get('projectId')).toBe('prj_x');
    expect(counts[0].searchParams.has('filter')).toBe(false);
    expect(ok.calls.find((u) => u.pathname.endsWith('/aggregate'))!.searchParams.get('by')).toBe('country');
  });

  it('adds the 28-day visitors for the funnel, and losing only that count blanks only that figure', async () => {
    const part = await fetchVercelPart(app('godaisy'), { VERCEL_ANALYTICS_TOKEN: 't' }, ok.impl, now);
    expect(part).toMatchObject({ state: 'ok', data: { visitors28d: 80 } });
    const f = fakeVercel((url) => {
      if (url.pathname.startsWith('/v9/projects/')) return json({ id: 'prj_x' });
      if (url.pathname.endsWith('/count')) return url.searchParams.get('since')!.startsWith('2026-09-30') ? json({}, 500) : json({ data: { visitors: 5, pageviews: 9 } });
      return json({ data: [] });
    });
    expect(await fetchVercelPart(app('findr'), { VERCEL_ANALYTICS_TOKEN: 't' }, f.impl, now)).toMatchObject({ state: 'ok', data: { visitors: { value: 5 }, visitors28d: null } });
  });

  it('splits the Rise Daisy project by path: Hungerford is the prefix, Rise is everything else', async () => {
    const f = fakeVercel((url) => (url.pathname.startsWith('/v9/') ? json({ id: 'prj_rise' }) : url.pathname.endsWith('/count') ? json({ data: { visitors: 1, pageviews: 1 } }) : json({ data: [] })));
    await fetchVercelPart(app('hungerford'), { VERCEL_ANALYTICS_TOKEN: 't' }, f.impl, now);
    await fetchVercelPart(app('risedaisy'), { VERCEL_ANALYTICS_TOKEN: 't' }, f.impl, now);
    const filters = f.calls.filter((u) => u.pathname.endsWith('/count')).map((u) => u.searchParams.get('filter'));
    expect(filters).toContain("startswith(requestPath,'/hungerford')");
    expect(filters).toContain("not startswith(requestPath,'/hungerford')");
    expect(f.calls.filter((u) => u.pathname.startsWith('/v9/projects/rise-daisy')).length).toBeLessThanOrEqual(1);
  });

  it('turns a refusal into one error on that app, naming the env var', async () => {
    const f = fakeVercel(() => json({}, 403));
    const part = await fetchVercelPart(app('findr'), { VERCEL_ANALYTICS_TOKEN: 'secret-token' }, f.impl, now);
    expect(part).toMatchObject({ state: 'error' });
    expect(JSON.stringify(part)).toContain('VERCEL_ANALYTICS_TOKEN');
    expect(JSON.stringify(part)).not.toContain('secret-token');
  });

  it('shows Grow Daisy only if its project answers', async () => {
    const f = fakeVercel(() => json({}, 404));
    expect(await fetchVercelPart(app('growdaisy'), { VERCEL_ANALYTICS_TOKEN: 't' }, f.impl, now)).toBeNull();
  });
});

describe('Needs attention', () => {
  const part = (visitors: number, pageviews: number, countries: [string, number, number][] = []) =>
    ({
      state: 'ok' as const,
      data: {
        window: { from: '2026-10-21', to: '2026-10-27' },
        visitors: { value: visitors, previous: 0, delta: null, daily: [] },
        pageviews: { value: pageviews, previous: 0, delta: null, daily: [] },
        countries: countries.map(([code, v, p]) => ({ code, name: code, visitors: v, pageviews: p })),
      },
    });
  const withVercel = (id: string, vercel: AppSnapshot['vercel']): FamilySummary => {
    const base = sampleFamilySummary(now);
    const apps = base.apps.map((a) => ({ ...a, vercel: undefined }));
    const apps2 = apps.map((a) => (a.id === id ? { ...a, vercel } : a));
    return { ...base, apps: apps2, totals: familyTotals(apps2) };
  };
  const ga4Users = (id: string) => {
    const a = sampleFamilySummary(now).apps.find((x) => x.id === id)!;
    return a.analytics.state === 'ok' ? a.analytics.data.activeUsers!.value : 0;
  };
  const rules = (s: FamilySummary, rule: string) => deriveAttention(s).filter((i) => i.rule === rule);

  it('flags Go Daisy’s blocked GA4: Vercel 89, GA4 1', () => {
    const [item] = rules(withVercel('godaisy', part(89, 210)), 'analytics_disagree');
    expect(item).toMatchObject({ apps: ['godaisy'], title: 'Analytics disagree', level: 'check' });
    expect(item.body).toMatch(/GA4 tag/);
  });

  it('flags the other way: GA4 well above Vercel (Fly Cast 3 vs 23) points at the Vercel script', () => {
    const g = ga4Users('flycast');
    const [item] = rules(withVercel('flycast', part(1, 3)), 'analytics_disagree');
    expect(g).toBeGreaterThanOrEqual(20);
    expect(item.body).toMatch(/Vercel script/);
  });

  it('stays quiet when the two are close, when both are small, and without Vercel figures', () => {
    const g = ga4Users('findr');
    expect(rules(withVercel('findr', part(g + 3, 100)), 'analytics_disagree')).toHaveLength(0);
    expect(rules(withVercel('godaisy', part(19, 40)), 'analytics_disagree')).toHaveLength(0); // GA4 1 vs 19: under the 20 floor
    expect(rules(withVercel('findr', { state: 'not_configured', missing: ['VERCEL_ANALYTICS_TOKEN'] }), 'analytics_disagree')).toHaveLength(0);
    expect(rules(withVercel('findr', { state: 'error', message: 'x' }), 'analytics_disagree')).toHaveLength(0);
  });

  it('flags a country viewing 15+ pages a visitor: Grewp’s US, 125 visitors and 5,468 views', () => {
    const [item] = rules(withVercel('grewp', part(1035, 7400, [['US', 125, 5468], ['GB', 410, 900]])), 'automated_vercel');
    expect(item).toMatchObject({ apps: ['grewp'], title: 'Likely automated traffic from US', short: 'Bot traffic' });
    expect(item.body).toContain('5,468');
  });

  it('does not flag ordinary browsing, or a tiny country', () => {
    expect(rules(withVercel('grewp', part(500, 3000, [['GB', 400, 6000 - 1 - 3000 + 400]])), 'automated_vercel')).toHaveLength(0); // ~2,400 views / 400 = 6 each
    expect(rules(withVercel('grewp', part(20, 100, [['FR', 2, 40]])), 'automated_vercel')).toHaveLength(0); // 20 each but only 40 views and 2 visitors
    expect(rules(withVercel('grewp', part(20, 100, [['FR', 2, 50]])), 'automated_vercel')).toHaveLength(1); // 50 views reaches the floor
  });
});
