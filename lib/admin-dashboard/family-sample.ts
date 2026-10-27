/**
 * Made-up responses from all five apps, in the slightly different shapes
 * they really send, for previewing /admin/apps (`?sample=1`, development
 * only) and for the tests. They go through the same readers as live data.
 */

import { sampleMetrics } from './sample';
import { FAMILY_APPS, familyTotals, readAppSummary, unavailableSnapshot, type FamilyAppId, type FamilySummary } from './family';

const app = (id: FamilyAppId) => FAMILY_APPS.find((a) => a.id === id)!;

function week(base: number, step: number) {
  const daily = Array.from({ length: 14 }, (_, i) => base + ((i * step) % 9));
  const value = daily.slice(7).reduce((a, b) => a + b, 0);
  const previous = daily.slice(0, 7).reduce((a, b) => a + b, 0);
  return { value, previous, delta: previous ? Math.round(((value - previous) / previous) * 100) : null, daily };
}

function platform(base: number, step: number) {
  const w = week(base, step);
  return { week: w.value, previousWeek: w.previous, delta: w.delta, sparkline: w.daily.map((downloads, i) => ({ date: `d${i}`, downloads })) };
}

/** Raw bodies, keyed by app, as each endpoint returns them. */
export function sampleFamilyBodies(now = new Date()): Partial<Record<FamilyAppId, unknown>> {
  return {
    godaisy: sampleMetrics(now),
    risedaisy: {
      app: 'rise_daisy',
      generatedAt: now.toISOString(),
      storeDownloads: { state: 'ok', data: { ios: platform(14, 4), android: platform(5, 2), hasData: true, latestDate: '2026-10-26' } },
      revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 286.4, revenue28d: 402.1, activeSubscriptions: 61, activeTrials: 9, newCustomers28d: 530 } },
      analytics: { state: 'ok', data: { activeUsers: week(310, 5), newUsers: week(200, 3), pageViews: week(1100, 7) } },
      platformHealth: { state: 'ok', data: { errors: week(1, 2), crashFreeRate: 99.81, topIssues: [{ id: 'a' }] } },
      webRevenue: { state: 'ok', data: { activeSubscriptions: 12 } },
    },
    flycast: {
      app: { id: 'fly_cast', name: 'Fly Cast' },
      generatedAt: now.toISOString(),
      storeDownloads: { state: 'ok', data: { ios: platform(2, 3), android: platform(0, 1), hasData: true, latestDate: '2026-10-26', configured: { ios: true, android: true } } },
      revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 0, revenue28d: 34.97, activeSubscriptions: 0, activeTrials: 0, newCustomers28d: 41, activeUsers28d: 66 } },
      analytics: { state: 'ok', data: { activeUsers: week(25, 4), pageViews: week(70, 6) } },
      platformHealth: { state: 'not_configured', missing: ['SENTRY_AUTH_TOKEN', 'SENTRY_PROJECT'] },
      alerts: [],
    },
    grewp: {
      app: 'grewp',
      generatedAt: now.toISOString(),
      storeDownloads: { state: 'ok', data: { ios: platform(30, 5), android: platform(22, 4), hasData: true, latestDate: '2026-10-26' } },
      revenue: { state: 'ok', data: { source: 'stripe', mrrByCurrency: [{ currency: 'EUR', mrr: 1240, subscriptions: 48 }], activeSubscriptions: 48, trialing: 6 } },
      analytics: { configured: false },
      platformHealth: { state: 'error', message: 'Sentry 500' },
    },
  };
}

export function sampleFamilySummary(now = new Date()): FamilySummary {
  const bodies = sampleFamilyBodies(now);
  const apps = FAMILY_APPS.map((a) =>
    a.id === 'findr' ? unavailableSnapshot(app('findr'), 'unavailable', 'No answer within 8 s') : readAppSummary(a, bodies[a.id]),
  );
  return { generatedAt: now.toISOString(), apps, totals: familyTotals(apps) };
}
