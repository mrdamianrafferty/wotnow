/**
 * Made-up responses from all five apps, in the slightly different shapes
 * they really send, for previewing /admin/apps (`?sample=1`, development
 * only) and for the tests. They go through the same readers as live data.
 *
 * Shaped like a real week (late October 2026), so every attention rule has
 * something to say: Go Daisy's errors rising on one GA4 user, Findr's Sentry
 * not connected, Singapore traffic with no Singapore downloads, no Android
 * rows anywhere.
 */

import { utcDay } from '@/lib/store-stats/summary';
import { FAMILY_APPS, familyTotals, readAppSummary, type FamilyAppId, type FamilySummary } from './family';

/** A WeekMetric with these weekly totals, spread over 14 days. */
function week(value: number, previous: number) {
  const spread = (total: number) => Array.from({ length: 7 }, (_, i) => Math.floor(total / 7) + (i < total % 7 ? 1 : 0));
  const daily = [...spread(previous), ...spread(value)];
  return { value, previous, delta: previous ? Math.round(((value - previous) / previous) * 100) : null, daily };
}

function platform(value: number, previous: number) {
  const w = week(value, previous);
  return { week: w.value, previousWeek: w.previous, delta: w.delta, sparkline: w.daily.map((downloads, i) => ({ date: `d${i}`, downloads })) };
}

function downloads(ios: [number, number], countries30d: { country: string; downloads: number }[]) {
  return { state: 'ok', data: { ios: platform(...ios), android: platform(0, 0), hasData: true, latestDate: '2026-10-26', countries30d } };
}

function audience(now: Date, countries: [string | null, string, number][], devices: [number, number, number]) {
  return {
    state: 'ok',
    data: {
      window: { from: utcDay(now, 7), to: utcDay(now, 1) },
      countries: countries.map(([code, name, activeUsers]) => ({ code, name, activeUsers })),
      devices: [
        { category: 'desktop', activeUsers: devices[0] },
        { category: 'mobile', activeUsers: devices[1] },
        { category: 'tablet', activeUsers: devices[2] },
      ].filter((d) => d.activeUsers > 0),
      demographics: {
        available: false,
        age: [],
        gender: [],
        note: 'GA4 returned no age or gender rows: Google signals is off or the property is under its privacy thresholds.',
      },
    },
  };
}

const health = (value: number, previous: number, crashFreeRate: number | null) => ({
  state: 'ok',
  data: { errors: week(value, previous), crashFreeRate, topIssues: [{ id: 'a' }, { id: 'b' }] },
});

/** Raw bodies, keyed by app, as each endpoint returns them. */
export function sampleFamilyBodies(now = new Date()): Record<FamilyAppId, unknown> {
  const generatedAt = now.toISOString();
  return {
    godaisy: {
      app: 'go_daisy',
      generatedAt,
      storeDownloads: downloads(
        [0, 2],
        [
          { country: 'DE', downloads: 1 },
          { country: 'BR', downloads: 1 },
        ],
      ),
      revenue: {
        state: 'ok',
        data: { source: 'revenuecat', currency: 'GBP', mrr: 0, revenue28d: 0, activeSubscriptions: 0, activeTrials: 0, newCustomers28d: 0 },
      },
      analytics: { state: 'ok', data: { activeUsers: week(1, 2), newUsers: week(1, 1), pageViews: week(3, 5) } },
      platformHealth: { state: 'ok', data: { errors: week(3539, 1843), crashFreeRate: null, topIssues: [{ id: 'a' }] } },
      audience: audience(now, [['US', 'United States', 1]], [1, 0, 0]),
    },
    risedaisy: {
      app: 'rise_daisy',
      generatedAt,
      storeDownloads: downloads(
        [2, 8],
        [
          { country: 'US', downloads: 6 },
          { country: 'FR', downloads: 5 },
          { country: 'GB', downloads: 5 },
          { country: 'CA', downloads: 4 },
          { country: 'CL', downloads: 2 },
          { country: 'DE', downloads: 2 },
          { country: 'BE', downloads: 1 },
        ],
      ),
      revenue: {
        state: 'ok',
        data: { source: 'revenuecat', currency: 'GBP', mrr: 7, revenue28d: 5, activeSubscriptions: 3, activeTrials: 0, newCustomers28d: 40 },
      },
      analytics: { state: 'ok', data: { activeUsers: week(1049, 1566), newUsers: week(900, 1300), pageViews: week(1529, 2210) } },
      platformHealth: health(1908, 1631, 100),
      audience: audience(
        now,
        [
          ['SG', 'Singapore', 663],
          ['GB', 'United Kingdom', 109],
          ['US', 'United States', 85],
          ['CA', 'Canada', 41],
          ['CN', 'China', 30],
          ['ES', 'Spain', 22],
          ['NL', 'Netherlands', 12],
          ['IE', 'Ireland', 9],
          [null, '(not set)', 6],
        ],
        [757, 282, 10],
      ),
      webRevenue: { state: 'ok', data: { activeSubscriptions: 1 } },
    },
    findr: {
      app: 'findr',
      generatedAt,
      storeDownloads: downloads(
        [3, 0],
        [
          { country: 'FR', downloads: 3 },
          { country: 'GB', downloads: 2 },
          { country: 'BR', downloads: 1 },
        ],
      ),
      revenue: {
        state: 'ok',
        data: { source: 'revenuecat', currency: 'EUR', mrr: 0, revenue28d: 0, activeSubscriptions: 0, activeTrials: 0, newCustomers28d: 2 },
      },
      analytics: { state: 'ok', data: { activeUsers: week(34, 30), pageViews: week(95, 80) } },
      platformHealth: { state: 'error', message: 'Sentry 404: project “findr” not found' },
      audience: audience(
        now,
        [
          ['SG', 'Singapore', 19],
          ['GB', 'United Kingdom', 4],
          ['DE', 'Germany', 3],
          ['CN', 'China', 2],
        ],
        [25, 8, 1],
      ),
    },
    flycast: {
      app: { id: 'fly_cast', name: 'Fly Cast' },
      generatedAt,
      storeDownloads: {
        state: 'ok',
        data: {
          ios: platform(1, 2),
          android: platform(0, 0),
          hasData: true,
          latestDate: '2026-10-26',
          configured: { ios: true, android: true },
          countries30d: [
            { country: 'US', downloads: 2 },
            { country: 'CL', downloads: 1 },
            { country: 'HU', downloads: 1 },
          ],
        },
      },
      revenue: {
        state: 'ok',
        data: { source: 'revenuecat', currency: 'GBP', mrr: 0, revenue28d: 0, activeSubscriptions: 0, activeTrials: 0, newCustomers28d: 3, activeUsers28d: 66 },
      },
      analytics: { state: 'ok', data: { activeUsers: week(59, 64), pageViews: week(62, 70) } },
      platformHealth: { state: 'ok', data: { errors: week(0, 0), crashFreeRate: null, topIssues: [] } },
      audience: audience(
        now,
        [
          ['SG', 'Singapore', 42],
          ['GB', 'United Kingdom', 8],
          ['CN', 'China', 2],
          ['ES', 'Spain', 2],
          ['CA', 'Canada', 2],
        ],
        [40, 17, 2],
      ),
      alerts: [],
    },
    grewp: {
      app: 'grewp',
      generatedAt,
      storeDownloads: downloads([1, 1], [{ country: 'ES', downloads: 1 }]),
      revenue: {
        state: 'ok',
        data: { source: 'stripe', currency: 'EUR', mrr: 207, revenue28d: null, activeSubscriptions: 3, activeTrials: null, newCustomers28d: null },
      },
      analytics: { state: 'ok', data: { activeUsers: week(542, 88), pageViews: week(1566, 300), sessions: week(700, 120) } },
      platformHealth: health(679, 659, 99.89),
      audience: audience(
        now,
        [
          ['ES', 'Spain', 371],
          ['US', 'United States', 92],
          ['GB', 'United Kingdom', 17],
          ['CA', 'Canada', 9],
          ['NL', 'Netherlands', 7],
          ['IE', 'Ireland', 6],
        ],
        [168, 368, 6],
      ),
    },
  };
}

export function sampleFamilySummary(now = new Date()): FamilySummary {
  const bodies = sampleFamilyBodies(now);
  const apps = FAMILY_APPS.map((a) => readAppSummary(a, bodies[a.id]));
  return { generatedAt: now.toISOString(), apps, totals: familyTotals(apps) };
}
