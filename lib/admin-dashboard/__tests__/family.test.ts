/**
 * @jest-environment node
 */
/**
 * The family dashboard's merge and totals: every app's response shape, the
 * malformed and missing ones, and the fetcher's failure paths.
 */

import {
  FAMILY_APPS,
  familyListing,
  familyTotals,
  listingWaiting,
  readAppSummary,
  readStoreListing,
  readTrend,
  unavailableSnapshot,
  type AppSnapshot,
  type FamilySummary,
  type StoreListingPart,
} from '../family';
import { fetchAppSnapshot } from '../family-fetch';
import { sampleFamilyBodies } from '../family-sample';
import { sampleMetrics } from '../sample';

jest.mock('../metrics', () => ({ getMetricsSummary: jest.fn(async () => ({ generatedAt: 'x' })) }));

const app = (id: string) => FAMILY_APPS.find((a) => a.id === id)!;
const now = new Date('2026-10-27T07:00:00Z');
const sample = sampleFamilyBodies(now) as Record<string, Record<string, unknown>>;

/**
 * The slightly different shapes the apps first shipped: Go Daisy's own
 * response, Rise's extra webRevenue, Fly Cast's object app id and alerts,
 * Grewp's Stripe mrrByCurrency and the legacy {configured:false}.
 */
const bodies = {
  godaisy: sampleMetrics(now),
  risedaisy: {
    ...sample.risedaisy,
    revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 286.4, revenue28d: 402.1, activeSubscriptions: 61, activeTrials: 9 } },
  },
  flycast: { ...sample.flycast, platformHealth: { state: 'not_configured', missing: ['SENTRY_AUTH_TOKEN', 'SENTRY_PROJECT'] } },
  grewp: {
    ...sample.grewp,
    revenue: {
      state: 'ok',
      data: { source: 'stripe', mrrByCurrency: [{ currency: 'EUR', mrr: 1240, subscriptions: 48 }], activeSubscriptions: 48, trialing: 6 },
    },
    analytics: { configured: false },
    platformHealth: { state: 'error', message: 'Sentry 500' },
  },
};

/** The legacy bodies, with Findr not answering. */
function legacySummary(): FamilySummary {
  const apps = FAMILY_APPS.map((a) =>
    a.id === 'findr' ? unavailableSnapshot(a, 'unavailable', 'No answer within 8 s') : readAppSummary(a, bodies[a.id as keyof typeof bodies]),
  );
  return { generatedAt: now.toISOString(), apps, totals: familyTotals(apps) };
}

describe('readTrend', () => {
  it('reads a WeekMetric and a PlatformDownloads alike', () => {
    expect(readTrend({ value: 14, previous: 7, daily: [1, 2] })).toEqual({ value: 14, previous: 7, delta: 100, daily: [1, 2] });
    expect(
      readTrend({
        week: 3,
        previousWeek: 0,
        sparkline: [
          { date: 'a', downloads: 1 },
          { date: 'b', downloads: 2 },
        ],
      }),
    ).toEqual({
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
    const { apps, totals } = legacySummary();
    const okDownloads = apps.filter((a) => a.downloads.state === 'ok');
    expect(totals.downloads.apps).toBe(okDownloads.length);
    expect(totals.downloads.value).toBe(okDownloads.reduce((a, x) => a + (x.downloads.state === 'ok' ? x.downloads.data.total.value : 0), 0));
    expect(totals.downloads.daily).toHaveLength(14);
    // Findr is unavailable and counts nowhere
    expect(totals.downloadShare.map((s) => s.id)).not.toContain('findr');
  });

  it('sums MRR within a currency only and counts subscriptions across sources', () => {
    const { totals } = legacySummary();
    expect(totals.mrr).toEqual([
      { currency: 'EUR', value: 1240, apps: 1 },
      { currency: 'GBP', value: 327.9, apps: 3 },
    ]);
    // Rise's Stripe web plans (webRevenue, 1) add to its RevenueCat 61: different books
    expect(totals.activeSubscriptions).toEqual({ value: 17 + 61 + 1 + 0 + 48, apps: 4 });
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

describe('storeListing', () => {
  const figures = (views: number, pageDownloads: number, extra: Record<string, unknown> = {}) => ({
    impressions: views * 9,
    productPageViews: views,
    firstTimeDownloads: pageDownloads + 2,
    productPageDownloads: pageDownloads,
    conversionRate: views ? Math.round((pageDownloads / views) * 1000) / 10 : null,
    pageViewRate: 11.1,
    ...extra,
  });
  const okBody = (views: number, pageDownloads: number, prev: [number, number] | null = [100, 5]) => ({
    storeListing: {
      state: 'ok',
      data: {
        window: { from: '2026-09-28', to: '2026-10-25', days: 28 },
        totals: figures(views, pageDownloads),
        previous: prev ? figures(...prev) : undefined,
        countries: [{ country: 'gb', ...figures(views, pageDownloads) }, { country: 'ZZ', ...figures(1, 0) }, { country: 'GB', productPageViews: 'x' }],
        daily: [{ date: '2026-10-25', productPageViews: 3, productPageDownloads: 1 }, { date: '2026-10-24' }],
        hasData: true,
        latestDate: '2026-10-27',
      },
    },
  });
  const listing = (body: unknown) => readAppSummary(app('risedaisy'), body).storeListing;
  const data = (body: unknown) => {
    const p = listing(body);
    if (p?.state !== 'ok') throw new Error(`expected ok, got ${JSON.stringify(p)}`);
    return p.data;
  };

  it('reads an ok section, dropping bad and unknown-territory rows', () => {
    const d = data(okBody(200, 12));
    expect(d.window).toEqual({ from: '2026-09-28', to: '2026-10-25', days: 28 });
    expect(d.totals).toEqual({ impressions: 1800, productPageViews: 200, firstTimeDownloads: 14, productPageDownloads: 12, conversionRate: 6, pageViewRate: 11.1 });
    expect(d.previous?.conversionRate).toBe(5);
    expect(d.countries.map((c) => c.country)).toEqual(['GB']);
    expect(d.daily).toEqual([{ date: '2026-10-25', productPageViews: 3, productPageDownloads: 1 }]);
    expect(d.latestDate).toBe('2026-10-27');
  });

  it('recomputes the rates from the counts, and null with no views', () => {
    expect(readStoreListing({ totals: figures(40, 3, { conversionRate: 99 }) })?.totals.conversionRate).toBe(7.5);
    expect(readStoreListing({ totals: figures(0, 0) })?.totals.conversionRate).toBeNull();
    expect(readStoreListing({ totals: figures(10, 1) })).toMatchObject({ window: null, previous: null, countries: [], daily: [] });
  });

  it('keeps not_configured with its hint as the quiet waiting state', () => {
    const p = listing({ storeListing: { state: 'not_configured', missing: [], hint: 'Apple credentials are set but no Analytics Reports instance has been synced yet.' } });
    expect(p).toEqual({ state: 'not_configured', missing: [], note: 'Apple credentials are set but no Analytics Reports instance has been synced yet.' });
    expect(listingWaiting(p)).toBe(true);
    // Missing credentials are not waiting: they need setting
    const unset = listing({ storeListing: { state: 'not_configured', missing: ['APP_STORE_VENDOR_NUMBER'] } });
    expect(unset).toEqual({ state: 'not_configured', missing: ['APP_STORE_VENDOR_NUMBER'] });
    expect(listingWaiting(unset)).toBe(false);
  });

  it('passes an error through, cleaned', () => {
    expect(listing({ storeListing: { state: 'error', message: 'Supabase: Bearer abc leaked' } })).toEqual({ state: 'error', message: 'Supabase: [redacted] leaked' });
  });

  it('reads a missing key as not reported, never zeros (Grewp, or an app not yet deployed)', () => {
    const p = listing({ generatedAt: 'x' });
    expect(p).toEqual({ state: 'not_configured', missing: [], note: 'Not reported by this app' });
    expect(listingWaiting(p)).toBe(false);
  });

  it('reads malformed data as unreadable, not as zeros', () => {
    expect(listing({ storeListing: { state: 'ok', data: { totals: { productPageViews: 'many' } } } })).toEqual({ state: 'error', message: 'Unreadable response' });
    expect(listing({ storeListing: { state: 'ok', data: { totals: figures(-5, 1) } } })).toEqual({ state: 'error', message: 'Unreadable response' });
    expect(listing({ storeListing: { state: 'ok', data: [] } })).toEqual({ state: 'error', message: 'Unreadable response' });
    expect(listing({ storeListing: 'yes' })).toEqual({ state: 'error', message: 'Unreadable response' });
    expect(listing({ storeListing: { state: 'ok', data: { hasData: false } } })).toEqual({ state: 'not_configured', missing: [], note: 'No listing data yet' });
  });

  it('weights the family rate by views, not by averaging the apps’ rates', () => {
    const snap = (id: string, body: unknown): AppSnapshot => readAppSummary(app(id), body);
    const apps = [
      snap('risedaisy', okBody(1000, 50, [800, 40])), // 5%
      snap('findr', okBody(10, 5, null)), // 50%
      snap('grewp', {}), // not reported
      snap('flycast', { storeListing: { state: 'not_configured', missing: [], hint: 'waiting' } }),
    ];
    const f = familyListing(apps);
    // (50 + 5) / (1000 + 10) = 5.4%, where an average of rates would say 27.5%
    expect(f).toMatchObject({ productPageViews: 1010, productPageDownloads: 55, conversionRate: 5.4, apps: 2, waiting: 1 });
    // Only Rise sent a previous window
    expect(f.previous).toEqual({ productPageViews: 800, productPageDownloads: 40, conversionRate: 5 });
    expect(familyTotals(apps).storeListing).toEqual(f);
  });

  it('is empty, not zero-rate, with nothing reporting', () => {
    const f = familyListing(FAMILY_APPS.map((a) => unavailableSnapshot(a, 'not_configured', 'x')));
    expect(f).toEqual({ productPageViews: 0, productPageDownloads: 0, firstTimeDownloads: 0, conversionRate: null, previous: null, apps: 0, waiting: 0 });
  });

  it('reads every sample app, Grewp as not reported, and the waiting sample as waiting', () => {
    const parts = FAMILY_APPS.map((a) => readAppSummary(a, sample[a.id]).storeListing);
    expect(parts.filter((p) => p?.state === 'ok')).toHaveLength(6);
    expect(readAppSummary(app('grewp'), sample.grewp).storeListing).toMatchObject({ note: 'Not reported by this app' });
    const waiting = sampleFamilyBodies(now, { listingWaiting: true }) as Record<string, unknown>;
    const w = FAMILY_APPS.map((a) => readAppSummary(a, waiting[a.id]));
    expect(familyListing(w)).toMatchObject({ apps: 0, waiting: 6, conversionRate: null });
    const rise = parts[FAMILY_APPS.findIndex((a) => a.id === 'risedaisy')] as { state: 'ok'; data: StoreListingPart };
    expect(rise.data.totals.productPageViews).toBeGreaterThan(0);
    expect(rise.data.totals.productPageDownloads).toBeLessThanOrEqual(rise.data.totals.productPageViews);
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
    const s = await fetchAppSnapshot(
      app('flycast'),
      { METRICS_FLYCAST_URL: 'https://flycast.example/api/admin/metrics-summary', METRICS_FLYCAST_TOKEN: 'tok' },
      f,
    );
    expect(s.status).toBe('ok');
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('turns refusals, errors, non-JSON and timeouts into one unavailable card', async () => {
    const env = { METRICS_GREWP_URL: 'https://grewp.example/m', METRICS_GREWP_TOKEN: 't' };
    expect(await fetchAppSnapshot(app('grewp'), env, ok({}, 403))).toMatchObject({
      status: 'unavailable',
      message: expect.stringContaining('METRICS_GREWP_TOKEN'),
    });
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
