/**
 * @jest-environment node
 */
/**
 * The two fixes from the dashboard's first live morning (2026-10-28):
 * GA4's thresholded quota (per-app cache, Refresh cooldown, age/gender only
 * while they answer) and RevenueCat's per-chart filters.
 */

import type { RuntimeCache } from '@vercel/functions';
import { FAILED_TTL_S, GOOD_TTL_S, cachedSnapshot, claimRefresh, isFailedSnapshot } from '../family-cache';
import { FAMILY_APPS, familyTotals, readAppSummary, unavailableSnapshot, type AppSnapshot } from '../family';
import { DEMOGRAPHICS_QUOTA_NOTE, DEMOGRAPHICS_SKIPPED_NOTE, fetchAudienceSummary, isThresholdedQuota } from '../ga4';
import { fetchRevenueSummary, isFilterRejection } from '../revenuecat';

jest.mock('@/lib/google/service-account-token', () => ({
  decodeServiceAccountKey: () => ({}),
  getServiceAccountToken: async () => 'token',
}));

/** A Map standing in for Vercel's Runtime Cache, recording each set's TTL. */
function fakeCache() {
  const store = new Map<string, unknown>();
  const ttls = new Map<string, number | undefined>();
  const cache: RuntimeCache = {
    get: async (k) => (store.has(k) ? store.get(k)! : null),
    set: async (k, v, o) => {
      store.set(k, v);
      ttls.set(k, o?.ttl);
    },
    delete: async (k) => {
      store.delete(k);
    },
    expireTag: async () => undefined,
  };
  return { cache, store, ttls };
}

const app = FAMILY_APPS.find((a) => a.id === 'risedaisy')!;
const okSnapshot = (): AppSnapshot =>
  readAppSummary(app, {
    generatedAt: '2026-10-28T08:00:00Z',
    analytics: {
      state: 'ok',
      data: { activeUsers: { value: 5, previous: 4 } },
    },
  });

describe('per-app cache', () => {
  const at = (iso: string) => () => new Date(iso);

  it('asks the app once, then serves the cached snapshot with the time it was fetched', async () => {
    const { cache, ttls } = fakeCache();
    const fetch = jest.fn(async () => okSnapshot());
    const first = await cachedSnapshot(app, fetch, {
      cache,
      now: at('2026-10-28T09:00:00Z'),
    });
    const second = await cachedSnapshot(app, fetch, {
      cache,
      now: at('2026-10-28T09:30:00Z'),
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first.fetchedAt).toBe('2026-10-28T09:00:00.000Z');
    expect(second.fetchedAt).toBe('2026-10-28T09:00:00.000Z');
    expect([...ttls.values()]).toEqual([GOOD_TTL_S]);
  });

  it('keeps a failed app for five minutes only', async () => {
    const { cache, ttls } = fakeCache();
    await cachedSnapshot(app, async () => unavailableSnapshot(app, 'unavailable', 'HTTP 502'), { cache });
    expect([...ttls.values()]).toEqual([FAILED_TTL_S]);
  });

  it('counts a section in error as a failure, so a GA4 429 is retried soon', () => {
    const s = readAppSummary(app, {
      audience: {
        state: 'error',
        message: 'GA4 429: Exhausted potentially thresholded requests quota',
      },
    });
    expect(isFailedSnapshot(s)).toBe(true);
    expect(isFailedSnapshot(okSnapshot())).toBe(false);
  });

  it('bypasses the cache on refresh', async () => {
    const { cache } = fakeCache();
    const fetch = jest.fn(async () => okSnapshot());
    await cachedSnapshot(app, fetch, { cache });
    await cachedSnapshot(app, fetch, { cache, bypass: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('asks once for a burst of simultaneous loads', async () => {
    const { cache } = fakeCache();
    let release!: () => void;
    const fetch = jest.fn(() => new Promise<AppSnapshot>((r) => (release = () => r(okSnapshot()))));
    const both = Promise.all([cachedSnapshot(app, fetch, { cache }), cachedSnapshot(app, fetch, { cache })]);
    await new Promise((r) => setImmediate(r));
    release();
    await both;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('still answers when the cache itself fails', async () => {
    const broken: RuntimeCache = {
      get: async () => Promise.reject(new Error('down')),
      set: async () => Promise.reject(new Error('down')),
      delete: async () => undefined,
      expireTag: async () => undefined,
    };
    await expect(cachedSnapshot(app, async () => okSnapshot(), { cache: broken })).resolves.toMatchObject({ id: 'risedaisy', status: 'ok' });
  });
});

describe('Refresh cooldown', () => {
  it('allows one refresh every five minutes, across admins', async () => {
    const { cache } = fakeCache();
    const t0 = () => new Date('2026-10-28T09:00:00Z');
    expect(await claimRefresh(false, { cache, now: t0 })).toEqual({
      refreshed: false,
      nextRefreshAt: null,
    });
    expect(await claimRefresh(true, { cache, now: t0 })).toEqual({
      refreshed: true,
      nextRefreshAt: '2026-10-28T09:05:00.000Z',
    });
    expect(
      await claimRefresh(true, {
        cache,
        now: () => new Date('2026-10-28T09:04:00Z'),
      }),
    ).toEqual({
      refreshed: false,
      nextRefreshAt: '2026-10-28T09:05:00.000Z',
    });
    expect(
      (
        await claimRefresh(true, {
          cache,
          now: () => new Date('2026-10-28T09:05:01Z'),
        })
      ).refreshed,
    ).toBe(true);
  });
});

// ─── GA4 demographics ──────────────────────────────────────────────

const GA_ENV = { GA_PROPERTY_ID: '123', GOOGLE_ANALYTICS_CREDENTIALS: 'x' };
const row = (v: string, n: number) => ({
  dimensionValues: [{ value: v }, { value: v }],
  metricValues: [{ value: String(n) }],
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const reportCount = (init?: RequestInit) => (JSON.parse(String(init?.body)) as { requests: unknown[] }).requests.length;

describe('GA4 age and gender', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('stops asking once they come back empty, and says why', async () => {
    const { cache, ttls } = fakeCache();
    const calls: number[] = [];
    global.fetch = jest.fn(async (_u: unknown, init?: RequestInit) => {
      calls.push(reportCount(init));
      return json({
        reports: [{ rows: [row('GB', 4)] }, { rows: [row('mobile', 4)] }, {}, {}],
      });
    }) as typeof fetch;

    const first = await fetchAudienceSummary(GA_ENV, cache);
    expect(first.state === 'ok' && first.data.demographics.available).toBe(false);
    expect([...ttls.values()]).toEqual([7 * 86_400]);

    const second = await fetchAudienceSummary(GA_ENV, cache);
    expect(calls).toEqual([4, 2]);
    expect(second).toMatchObject({
      state: 'ok',
      data: {
        demographics: { available: false, note: DEMOGRAPHICS_SKIPPED_NOTE },
      },
    });
    expect(second.state === 'ok' && second.data.countries[0].code).toBe('GB');
  });

  it('keeps asking while they answer', async () => {
    const { cache, store } = fakeCache();
    global.fetch = jest.fn(async () =>
      json({
        reports: [{ rows: [row('GB', 4)] }, {}, { rows: [row('25-34', 3)] }, { rows: [row('female', 2)] }],
      }),
    ) as typeof fetch;
    const r = await fetchAudienceSummary(GA_ENV, cache);
    expect(r.state === 'ok' && r.data.demographics.available).toBe(true);
    expect(store.size).toBe(0);
  });

  it('on a thresholded 429, still returns countries and devices without them', async () => {
    const { cache, store } = fakeCache();
    global.fetch = jest.fn(async (_u: unknown, init?: RequestInit) =>
      reportCount(init) === 4
        ? json(
            {
              error: {
                code: 429,
                message: 'Exhausted potentially thresholded requests quota.',
              },
            },
            429,
          )
        : json({
            reports: [{ rows: [row('SG', 9)] }, { rows: [row('desktop', 9)] }],
          }),
    ) as typeof fetch;
    const r = await fetchAudienceSummary(GA_ENV, cache);
    expect(r).toMatchObject({
      state: 'ok',
      data: {
        demographics: { available: false, note: DEMOGRAPHICS_QUOTA_NOTE },
      },
    });
    expect(r.state === 'ok' && r.data.countries[0].code).toBe('SG');
    // A quota miss says nothing about the property, so it is not remembered as empty
    expect(store.size).toBe(0);
  });

  it('recognises the thresholded 429 and nothing else', () => {
    expect(isThresholdedQuota('GA4 429: {"error":{"code":429,"message":"Exhausted potentially thresholded requests quota.')).toBe(true);
    expect(isThresholdedQuota('GA4 429: Exhausted concurrent requests quota')).toBe(false);
    expect(isThresholdedQuota('GA4 400: thresholded')).toBe(false);
  });
});

// ─── RevenueCat ────────────────────────────────────────────────────

describe('RevenueCat per-app split', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  const chartBody = { values: [{ cohort: 1, measure: 0, value: 3 }] };
  const chartOf = (url: string) => url.match(/charts\/(\w+)\?/)![1];
  const filtersOf = (url: string) => new URL(url).searchParams.get('filters');

  it('filters each chart by the dimension it accepts', async () => {
    const urls: string[] = [];
    global.fetch = jest.fn(async (u: unknown) => {
      urls.push(String(u));
      return json(chartBody);
    }) as typeof fetch;
    const r = await fetchRevenueSummary({ REVENUECAT_METRICS_API_KEY: 'k' });
    expect(r.state).toBe('ok');
    expect(r.state === 'ok' && r.data.projectTotal).toBeUndefined();
    const byChart = Object.fromEntries(urls.map((u) => [chartOf(u), JSON.parse(filtersOf(u)!)[0].name]));
    expect(byChart).toEqual({
      mrr: 'app_id',
      actives: 'app_id',
      trials: 'app_id',
      revenue: 'app_id',
      customers_new: 'first_app_id',
    });
  });

  it('shows a chart that will not split as the project total instead of failing the section', async () => {
    global.fetch = jest.fn(async (u: unknown) => {
      const url = String(u);
      if (chartOf(url) === 'customers_new' && filtersOf(url)) {
        return json(
          {
            message: 'Invalid filter: first_app_id. Supported filters for chart "customers_new": country',
            type: 'parameter_error',
          },
          400,
        );
      }
      return json(chartBody);
    }) as typeof fetch;
    const r = await fetchRevenueSummary({ REVENUECAT_METRICS_API_KEY: 'k' });
    expect(r).toMatchObject({
      state: 'ok',
      data: { mrr: 3, newCustomers28d: 3, projectTotal: ['newCustomers28d'] },
    });
  });

  it('only treats a 400 naming the filter as a filter rejection', () => {
    expect(isFilterRejection(400, '{"message":"Invalid filter: app_id. Supported filters …"}')).toBe(true);
    expect(isFilterRejection(400, '{"message":"Invalid start_date"}')).toBe(false);
    expect(isFilterRejection(500, 'Invalid filter')).toBe(false);
  });

  it('keeps project-total figures out of family totals, where both Daisy apps would count them', () => {
    const body = (projectTotal?: string[]) => ({
      revenue: {
        state: 'ok',
        data: {
          source: 'revenuecat',
          currency: 'GBP',
          mrr: 10,
          activeSubscriptions: 2,
          revenue28d: 5,
          ...(projectTotal ? { projectTotal } : {}),
        },
      },
    });
    const go = readAppSummary(
      FAMILY_APPS.find((a) => a.id === 'godaisy')!,
      body(['mrr', 'activeSubscriptions']),
    );
    const grow = readAppSummary(
      FAMILY_APPS.find((a) => a.id === 'growdaisy')!,
      body(['mrr', 'activeSubscriptions']),
    );
    const rise = readAppSummary(app, body());
    expect(go.revenue.state === 'ok' && go.revenue.data.projectTotal).toEqual(['mrr', 'activeSubscriptions']);
    const t = familyTotals([go, grow, rise]);
    expect(t.mrr).toEqual([{ currency: 'GBP', value: 10, apps: 1 }]);
    expect(t.activeSubscriptions).toEqual({ value: 2, apps: 1 });
  });
});
