/**
 * @jest-environment node
 */
/**
 * The admin dashboard's pure pieces: RevenueCat chart folding, GA4 and Sentry
 * summaries, the not-configured paths, and the endpoint's token check.
 */

import type { NextApiRequest } from 'next';
import { chartQuery, fetchRevenueSummary, summariseRevenueCharts } from '../revenuecat';
import { fetchGa4Summary, summariseGa4 } from '../ga4';
import { fetchSentrySummary, projectIdFromDsn, summariseSentry } from '../sentry';
import { adminEmails, hasDashboardToken, secretsMatch } from '../auth';
import { pctDelta, weekMetric } from '../types';

const now = new Date('2026-10-27T07:00:00Z');
const DAY = 86_400;

describe('summariseRevenueCharts', () => {
  const points = (values: number[], start = 1_790_000_000) => ({
    values: values.map((value, i) => ({ cohort: start + i * DAY, measure: 0, value })),
  });

  it('takes the newest day for MRR, actives and trials and sums revenue and new customers', () => {
    const data = summariseRevenueCharts({
      // Out of order on purpose: sorted by cohort before taking the newest
      mrr: {
        values: [
          { cohort: 3 * DAY, measure: 0, value: 42 },
          { cohort: DAY, measure: 0, value: 10 },
        ],
      },
      actives: points([5, 6, 7]),
      trials: points([2, 1]),
      revenue: { values: [...points([1.5, 2.25]).values, { cohort: 1_790_000_000, measure: 1, value: 99 }] },
      customers_new: points([3, 4, 5]),
    });
    expect(data).toEqual({
      source: 'revenuecat',
      currency: 'GBP',
      mrr: 42,
      activeSubscriptions: 7,
      activeTrials: 1,
      revenue28d: 3.75, // the transactions measure (1) is not revenue
      newCustomers28d: 12,
    });
  });

  it('reports null, not zero, for a chart with no values', () => {
    const data = summariseRevenueCharts({ mrr: { values: [] }, actives: null });
    expect(data.mrr).toBeNull();
    expect(data.activeSubscriptions).toBeNull();
    expect(data.revenue28d).toBeNull();
  });

  it('asks for the last 28 complete days of Go Daisy’s app only', () => {
    const q = chartQuery('app7b23f455ba', now);
    expect(q.get('start_date')).toBe('2026-09-29');
    expect(q.get('end_date')).toBe('2026-10-26');
    expect(q.get('resolution')).toBe('0');
    expect(JSON.parse(q.get('filters')!)).toEqual([{ name: 'app_id', values: ['app7b23f455ba'] }]);
  });
});

describe('summariseGa4', () => {
  it('fills missing days with zeros and splits the weeks', () => {
    const data = summariseGa4(
      {
        reports: [
          {
            rows: [
              { dimensionValues: [{ value: '20261026' }], metricValues: [{ value: '10' }, { value: '4' }, { value: '30' }, { value: '0.5' }] },
              { dimensionValues: [{ value: '20261013' }], metricValues: [{ value: '5' }, { value: '5' }, { value: '9' }, { value: '0.7' }] },
            ],
          },
          { rows: [{ dimensionValues: [{ value: '/call' }], metricValues: [{ value: '120' }] }] },
          { rows: [{ dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '80' }, { value: '100' }, { value: '0.61' }] }] },
          {
            rows: [
              { dimensionValues: [{ value: 'mobile' }], metricValues: [{ value: '75' }] },
              { dimensionValues: [{ value: 'desktop' }], metricValues: [{ value: '25' }] },
            ],
          },
        ],
      },
      now,
    );
    expect(data.days).toHaveLength(14);
    expect(data.days[0]).toBe('2026-10-13');
    expect(data.activeUsers).toMatchObject({ value: 10, previous: 5, delta: 100 });
    expect(data.activeUsers.daily).toHaveLength(14);
    expect(data.pageViews.value).toBe(30);
    expect(data.topPages).toEqual([{ path: '/call', views: 120 }]);
    expect(data.channels[0]).toEqual({ channel: 'Organic Search', users: 80, sessions: 100, engagementRate: 61 });
    expect(data.devices).toEqual([
      { device: 'Mobile', users: 75, percent: 75 },
      { device: 'Desktop', users: 25, percent: 25 },
    ]);
  });
});

describe('Sentry', () => {
  it('reads the project id from a DSN', () => {
    expect(projectIdFromDsn('https://abc123@o450000.ingest.de.sentry.io/4508000000000001')).toBe('4508000000000001');
    expect(projectIdFromDsn('https://abc@sentry.example.com/sub/path/42/')).toBe('42');
    expect(projectIdFromDsn('https://your-godaisy-dsn@sentry.io/godaisy-project')).toBeNull();
    expect(projectIdFromDsn(undefined)).toBeNull();
  });

  it('drops today’s partial bucket and rounds the crash-free rate', () => {
    const data = summariseSentry(
      {
        intervals: Array.from({ length: 15 }, (_, i) => new Date(now.getTime() - (14 - i) * DAY * 1000).toISOString().slice(0, 10) + 'T00:00:00Z'),
        groups: [{ series: { 'sum(quantity)': [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 500] } }],
      },
      { groups: [{ totals: { 'crash_free_rate(session)': 0.99876 } }] },
      [{ id: '1', title: 'TypeError', count: '12', lastSeen: '2026-10-27T06:00:00Z', permalink: 'https://x/1' }],
      now,
    );
    expect(data.errors).toMatchObject({ value: 14, previous: 7, delta: 100 });
    expect(data.crashFreeRate).toBe(99.88);
    expect(data.topIssues[0]).toMatchObject({ level: 'error', count: 12 });
  });

  it('has no crash-free rate without session data', () => {
    expect(summariseSentry(null, null, [], now).crashFreeRate).toBeNull();
  });
});

describe('not configured', () => {
  it('names the env vars each source is missing, without calling out', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(fetchRevenueSummary({})).resolves.toEqual({ state: 'not_configured', missing: ['REVENUECAT_METRICS_API_KEY'] });
    await expect(fetchGa4Summary({})).resolves.toEqual({ state: 'not_configured', missing: ['GA_PROPERTY_ID', 'GOOGLE_ANALYTICS_CREDENTIALS'] });
    await expect(fetchSentrySummary({})).resolves.toEqual({
      state: 'not_configured',
      missing: ['SENTRY_ADMIN_TOKEN', 'NEXT_PUBLIC_SENTRY_DSN_GODAISY'],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('auth', () => {
  const req = (authorization?: string) => ({ headers: { authorization } }) as unknown as NextApiRequest;

  it('accepts only the exact dashboard token', () => {
    const env = { DASHBOARD_READ_TOKEN: 's3cret-token' };
    expect(hasDashboardToken(req('Bearer s3cret-token'), env)).toBe(true);
    expect(hasDashboardToken(req('Bearer s3cret-toke'), env)).toBe(false);
    expect(hasDashboardToken(req('s3cret-token'), env)).toBe(false);
    expect(hasDashboardToken(req(), env)).toBe(false);
  });

  it('fails closed when the token is unset or blank', () => {
    expect(hasDashboardToken(req('Bearer '), {})).toBe(false);
    expect(hasDashboardToken(req('Bearer x'), { DASHBOARD_READ_TOKEN: '  ' })).toBe(false);
  });

  it('compares secrets of different lengths without throwing', () => {
    expect(secretsMatch('a', 'abc')).toBe(false);
    expect(secretsMatch('abc', 'abc')).toBe(true);
  });

  it('normalises the admin email list', () => {
    expect([...adminEmails({ GODAISY_ADMIN_EMAILS: ' A@x.io, ,b@y.io ' })]).toEqual(['a@x.io', 'b@y.io']);
    expect(adminEmails({}).size).toBe(0);
  });
});

describe('weekMetric', () => {
  it('compares the last 7 values with the 7 before', () => {
    expect(weekMetric([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2])).toMatchObject({ value: 14, previous: 7, delta: 100 });
    expect(pctDelta(5, 0)).toBeNull();
  });
});
