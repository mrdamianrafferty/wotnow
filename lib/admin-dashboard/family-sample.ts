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
import { FAMILY_APPS, familyTotals, readAppSummary, type FamilyAppId, type FamilySummary, type Part, type VercelCountry, type VercelPart } from './family';

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
    growdaisy: {
      app: 'grow_daisy',
      generatedAt,
      storeDownloads: downloads(
        [4, 3],
        [
          { country: 'GB', downloads: 9 },
          { country: 'IE', downloads: 3 },
          { country: 'FR', downloads: 1 },
        ],
      ),
      revenue: {
        state: 'ok',
        data: { source: 'revenuecat', currency: 'GBP', mrr: 12.5, revenue28d: 18.97, activeSubscriptions: 4, activeTrials: 1, newCustomers28d: 20 },
      },
      analytics: { state: 'ok', data: { activeUsers: week(212, 240), pageViews: week(980, 1100) } },
      platformHealth: { state: 'not_configured', missing: [], hint: 'Grow Daisy has no Sentry project yet.' },
      audience: audience(
        now,
        [
          ['GB', 'United Kingdom', 150],
          ['IE', 'Ireland', 31],
          ['FR', 'France', 12],
          ['US', 'United States', 9],
        ],
        [70, 136, 6],
      ),
      webRevenue: {
        state: 'ok',
        data: { activeSubscriptions: 2, trialing: 0, cancellingAtPeriodEnd: 0, new28d: 1, mrrByCurrency: [{ currency: 'GBP', mrr: 6.99, subscriptions: 2 }] },
      },
    },
    hungerford: {
      app: 'hungerford',
      generatedAt,
      storeDownloads: {
        state: 'ok',
        data: {
          ios: platform(2, 1),
          android: { available: false, reason: 'No Android app' },
          configured: { ios: true },
          hasData: true,
          latestDate: '2026-10-26',
          countries30d: [{ country: 'GB', downloads: 6 }],
        },
      },
      revenue: { state: 'ok', data: { source: 'none', note: 'Private club app: no revenue.' } },
      analytics: { state: 'ok', data: { activeUsers: week(48, 41), pageViews: week(410, 380) } },
      platformHealth: { state: 'ok', data: { errors: week(12, 9), crashFreeRate: null, topIssues: [] } },
      audience: audience(
        now,
        [
          ['GB', 'United Kingdom', 46],
          ['IE', 'Ireland', 2],
        ],
        [20, 27, 1],
      ),
      club: {
        members: { total: 212, byStatus: [{ status: 'full', count: 180 }] },
        week: { from: '2026-10-20', to: '2026-10-26' },
        catchEntries7d: 37,
        fishLogged7d: 52,
        trips7d: 41,
        blankTrips7d: 9,
      },
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

function vercel(now: Date, visitors: [number, number], pageviews: [number, number], countries: [string, string, number, number][]): Part<VercelPart> {
  const trend = (v: [number, number]) => ({ value: v[0], previous: v[1], delta: v[1] ? Math.round(((v[0] - v[1]) / v[1]) * 100) : null, daily: [] });
  return {
    state: 'ok',
    data: {
      window: { from: utcDay(now, 7), to: utcDay(now, 1) },
      visitors: trend(visitors),
      pageviews: trend(pageviews),
      countries: countries.map(([code, name, v, p]): VercelCountry => ({ code, name, visitors: v, pageviews: p })),
    },
  };
}

/**
 * Vercel Web Analytics for the week of 21–27 Oct 2026, as the owner compared
 * it with GA4: Go Daisy's GA4 was blocked by its CSP (89 vs 1), Fly Cast's
 * Vercel script was not wired (3 vs 23), Grewp's US made 5,468 views from 125
 * visitors. Grow Daisy has no entry: its project is optional.
 */
export function sampleVercel(now = new Date()): Partial<Record<FamilyAppId, Part<VercelPart>>> {
  return {
    godaisy: vercel(now, [89, 70], [210, 160], [['GB', 'United Kingdom', 52, 120], ['US', 'United States', 21, 50], ['DE', 'Germany', 9, 24]]),
    risedaisy: vercel(now, [626, 590], [2100, 1900], [['GB', 'United Kingdom', 300, 1100], ['ES', 'Spain', 180, 600], ['US', 'United States', 70, 210]]),
    hungerford: vercel(now, [48, 40], [140, 120], [['GB', 'United Kingdom', 44, 130]]),
    findr: vercel(now, [31, 25], [90, 70], [['GB', 'United Kingdom', 19, 55], ['IE', 'Ireland', 6, 20]]),
    flycast: vercel(now, [3, 2], [6, 4], [['GB', 'United Kingdom', 3, 6]]),
    grewp: vercel(now, [1035, 880], [7400, 3100], [['US', 'United States', 125, 5468], ['GB', 'United Kingdom', 410, 900], ['IN', 'India', 160, 420]]),
  };
}

/** `withVercel` adds the Vercel figures (sampleVercel); off by default so the other tests' fixtures stay as they were. */
export function sampleFamilySummary(now = new Date(), { withVercel = false }: { withVercel?: boolean } = {}): FamilySummary {
  const bodies = sampleFamilyBodies(now);
  const extra = withVercel ? sampleVercel(now) : {};
  const apps = FAMILY_APPS.map((a) => ({ ...readAppSummary(a, bodies[a.id]), ...(extra[a.id] ? { vercel: extra[a.id] } : {}) }));
  return { generatedAt: now.toISOString(), apps, totals: familyTotals(apps) };
}
