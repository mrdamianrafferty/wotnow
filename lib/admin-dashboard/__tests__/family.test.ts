/**
 * @jest-environment node
 */
/**
 * The family dashboard's merge and totals: every app's response shape, the
 * malformed and missing ones, and the fetcher's failure paths.
 */

import { FAMILY_APPS, familyTotals, readAppSummary, readTrend, unavailableSnapshot, type AppSnapshot } from '../family';
import { fetchAppSnapshot } from '../family-fetch';
import { sampleFamilyBodies, sampleFamilySummary } from '../family-sample';

jest.mock('../metrics', () => ({ getMetricsSummary: jest.fn(async () => ({ generatedAt: 'x' })) }));

const app = (id: string) => FAMILY_APPS.find((a) => a.id === id)!;
const now = new Date('2026-10-27T07:00:00Z');
const bodies = sampleFamilyBodies(now);

describe('readTrend', () => {
  it('reads a WeekMetric and a PlatformDownloads alike', () => {
    expect(readTrend({ value: 14, previous: 7, daily: [1, 2] })).toEqual({ value: 14, previous: 7, delta: 100, daily: [1, 2] });
    expect(readTrend({ week: 3, previousWeek: 0, sparkline: [{ date: 'a', downloads: 1 }, { date: 'b', downloads: 2 }] })).toEqual({
      value: 3,
      previous: 0,
      delta: null,
      daily: [1, 2],
    });
  });

  it('is null for anything without a number', () => {
    expect(readTrend(null)).toBeNull();
    expect(readTrend({ value: '12' })).toBeNull();
    expect(readTrend([1, 2])).toBeNull();
  });
});

describe('readAppSummary', () => {
  it('reads Go Daisy’s own response', () => {
    const s = readAppSummary(app('godaisy'), bodies.godaisy);
    expect(s.status).toBe('ok');
    expect(s.downloads.state).toBe('ok');
    expect(s.revenue).toMatchObject({ state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 41.5, activeSubscriptions: 17 } });
    expect(s.health).toMatchObject({ state: 'ok', data: { crashFreeRate: 99.42, topIssues: 2 } });
  });

  it('ignores extra keys (Rise’s webRevenue, Fly Cast’s alerts) and an object app id', () => {
    expect(readAppSummary(app('risedaisy'), bodies.risedaisy).revenue).toMatchObject({ state: 'ok', data: { mrr: 286.4 } });
    const fly = readAppSummary(app('flycast'), bodies.flycast);
    expect(fly.status).toBe('ok');
    expect(fly.health).toEqual({ state: 'not_configured', missing: ['SENTRY_AUTH_TOKEN', 'SENTRY_PROJECT'] });
  });

  it('reads Grewp’s Stripe revenue and the legacy {configured:false}', () => {
    const g = readAppSummary(app('grewp'), bodies.grewp);
    expect(g.revenue).toMatchObject({ state: 'ok', data: { source: 'stripe', currency: 'EUR', mrr: 1240, activeSubscriptions: 48, activeTrials: 6 } });
    expect(g.analytics).toEqual({ state: 'not_configured', missing: [] });
    expect(g.health).toEqual({ state: 'error', message: 'Sentry 500' });
  });

  it('says "no store data yet" rather than unreadable when an app has no rows', () => {
    const s = readAppSummary(app('godaisy'), { storeDownloads: { state: 'ok', data: { hasData: false, ios: { week: 0 } } } });
    expect(s.downloads).toEqual({ state: 'not_configured', missing: [], note: 'No store data yet' });
  });

  it('tolerates missing, malformed and hostile parts without throwing', () => {
    const s = readAppSummary(app('findr'), {
      storeDownloads: { state: 'ok', data: 'nope' },
      revenue: { state: 'weird' },
      analytics: { state: 'error', message: 'GA4 401: Bearer abc.def leaked' },
    });
    expect(s.downloads).toEqual({ state: 'error', message: 'Unreadable response' });
    expect(s.revenue).toEqual({ state: 'error', message: 'Unreadable response' });
    expect(s.analytics).toEqual({ state: 'error', message: 'GA4 401: [redacted] leaked' });
    expect(s.health).toMatchObject({ state: 'not_configured', note: 'Not reported by this app' });
    expect(readAppSummary(app('findr'), [1, 2]).status).toBe('unavailable');
    expect(readAppSummary(app('findr'), 'html').status).toBe('unavailable');
  });
});

describe('familyTotals', () => {
  it('adds up the reporting apps only', () => {
    const { apps, totals } = sampleFamilySummary(now);
    const okDownloads = apps.filter((a) => a.downloads.state === 'ok');
    expect(totals.downloads.apps).toBe(okDownloads.length);
    expect(totals.downloads.value).toBe(
      okDownloads.reduce((a, x) => a + (x.downloads.state === 'ok' ? x.downloads.data.total.value : 0), 0),
    );
    expect(totals.downloads.daily).toHaveLength(14);
    // Findr is unavailable and counts nowhere
    expect(totals.downloadShare.map((s) => s.id)).not.toContain('findr');
  });

  it('sums MRR within a currency only and counts subscriptions across sources', () => {
    const { totals } = sampleFamilySummary(now);
    expect(totals.mrr).toEqual([
      { currency: 'GBP', value: 327.9, apps: 3 },
      { currency: 'EUR', value: 1240, apps: 1 },
    ]);
    expect(totals.activeSubscriptions).toEqual({ value: 17 + 61 + 0 + 48, apps: 4 });
    expect(totals.activeTrials).toEqual({ value: 4 + 9 + 0 + 6, apps: 4 });
  });

  it('is all zeros with nothing reporting', () => {
    const apps: AppSnapshot[] = FAMILY_APPS.map((a) => unavailableSnapshot(a, 'not_configured', 'x'));
    const t = familyTotals(apps);
    expect(t.downloads).toEqual({ value: 0, previous: 0, delta: null, daily: [], apps: 0 });
    expect(t.mrr).toEqual([]);
    expect(t.downloadShare).toEqual([]);
  });

  it('drops the daily series when apps cover different numbers of days', () => {
    const mk = (daily: number[]): AppSnapshot => ({
      ...readAppSummary(app('godaisy'), {}),
      downloads: { state: 'ok', data: { ios: null, android: null, latestDate: null, total: { value: 1, previous: 1, delta: 0, daily } } },
    });
    expect(familyTotals([mk([1, 2]), mk([1, 2, 3])]).downloads.daily).toEqual([]);
  });
});

describe('fetchAppSnapshot', () => {
  const ok = (body: unknown, status = 200) => jest.fn(async () => new Response(JSON.stringify(body), { status }));

  it('names the env vars an app is missing, without calling out', async () => {
    const f = jest.fn();
    const s = await fetchAppSnapshot(app('risedaisy'), {}, f);
    expect(s).toMatchObject({ status: 'not_configured', missing: ['METRICS_RISEDAISY_URL', 'METRICS_RISEDAISY_TOKEN'] });
    expect(f).not.toHaveBeenCalled();
  });

  it('refuses a plain-http URL, so the token is never sent in the clear', async () => {
    const f = jest.fn();
    const s = await fetchAppSnapshot(app('findr'), { METRICS_FINDR_URL: 'http://fishfindr.eu/x', METRICS_FINDR_TOKEN: 't' }, f);
    expect(s.status).toBe('not_configured');
    expect(f).not.toHaveBeenCalled();
  });

  it('sends the app’s own token and reads the answer', async () => {
    const f = ok(bodies.flycast);
    const s = await fetchAppSnapshot(app('flycast'), { METRICS_FLYCAST_URL: 'https://flycast.example/api/admin/metrics-summary', METRICS_FLYCAST_TOKEN: 'tok' }, f);
    expect(s.status).toBe('ok');
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('turns refusals, errors, non-JSON and timeouts into one unavailable card', async () => {
    const env = { METRICS_GREWP_URL: 'https://grewp.example/m', METRICS_GREWP_TOKEN: 't' };
    expect(await fetchAppSnapshot(app('grewp'), env, ok({}, 403))).toMatchObject({ status: 'unavailable', message: expect.stringContaining('METRICS_GREWP_TOKEN') });
    expect(await fetchAppSnapshot(app('grewp'), env, ok({}, 502))).toMatchObject({ status: 'unavailable', message: 'HTTP 502' });
    const html = jest.fn(async () => new Response('<html>', { status: 200 }));
    expect(await fetchAppSnapshot(app('grewp'), env, html)).toMatchObject({ status: 'unavailable', message: 'Response was not JSON' });
    const timeout = jest.fn(async () => {
      throw Object.assign(new Error('aborted'), { name: 'TimeoutError' });
    });
    expect(await fetchAppSnapshot(app('grewp'), env, timeout)).toMatchObject({ status: 'unavailable', message: 'No answer within 8 s' });
  });

  it('reads Go Daisy in-process', async () => {
    const f = jest.fn();
    expect((await fetchAppSnapshot(app('godaisy'), {}, f)).status).toBe('ok');
    expect(f).not.toHaveBeenCalled();
  });
});
