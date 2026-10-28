/**
 * Made-up figures for previewing /admin/dashboard without credentials
 * (`/admin/dashboard?sample=1`, development only) and for the panel tests.
 * `?sample=1&unconfigured=1` swaps analytics for its not-configured state.
 */

import { summariseStoreStats, utcDay, type StoreStatInput } from '@/lib/store-stats/summary';
import { summariseStoreListing, type ListingInput } from '@/lib/store-stats/listing-summary';
import { weekMetric, type MetricsSummary } from './types';

export function sampleMetrics(now = new Date(), { unconfigured = false } = {}): MetricsSummary {
  const rows: StoreStatInput[] = [];
  for (let back = 1; back <= 30; back++) {
    const date = utcDay(now, back);
    rows.push({ stat_date: date, platform: 'ios', country: 'GB', downloads: 6 + (back % 5), redownloads: back % 3, uninstalls: 0 });
    rows.push({ stat_date: date, platform: 'ios', country: 'IE', downloads: back % 3, redownloads: 0, uninstalls: 0 });
    rows.push({ stat_date: date, platform: 'android', country: 'GB', downloads: 2 + (back % 4), redownloads: 0, uninstalls: back % 2 });
    rows.push({ stat_date: date, platform: 'android', country: 'ES', downloads: back % 2, redownloads: 0, uninstalls: 0 });
  }
  const listing: ListingInput[] = [];
  for (let back = 3; back <= 60; back++) {
    const views = 30 + (back % 9);
    listing.push({ stat_date: utcDay(now, back), country: 'GB', impressions: views * 6, product_page_views: views, first_time_downloads: 5 + (back % 4), product_page_downloads: 3 + (back % 3) });
  }
  const daily = (base: number) => Array.from({ length: 14 }, (_, i) => base + ((i * 7) % 11));

  return {
    app: 'go_daisy',
    generatedAt: now.toISOString(),
    storeDownloads: { state: 'ok', data: summariseStoreStats(rows, now) },
    storeListing: { state: 'ok', data: summariseStoreListing(listing, now) },
    revenue: {
      state: 'ok',
      data: { source: 'revenuecat', currency: 'GBP', mrr: 41.5, revenue28d: 63.97, activeSubscriptions: 17, activeTrials: 4, newCustomers28d: 212 },
    },
    analytics: unconfigured
      ? { state: 'not_configured', missing: ['GA_PROPERTY_ID', 'GOOGLE_ANALYTICS_CREDENTIALS'] }
      : {
          state: 'ok',
          data: {
            days: Array.from({ length: 14 }, (_, i) => utcDay(now, 14 - i)),
            activeUsers: weekMetric(daily(140)),
            newUsers: weekMetric(daily(90)),
            pageViews: weekMetric(daily(520)),
            engagementRate: { value: 58, previous: 54 },
            topPages: [
              { path: '/', views: 4210 },
              { path: '/call', views: 2875 },
              { path: '/hiking/snowdon', views: 611 },
              { path: '/surfing/bundoran-a-very-long-location-path-that-should-truncate', views: 402 },
            ],
            channels: [
              { channel: 'Organic Search', users: 1630, sessions: 2210, engagementRate: 61 },
              { channel: 'Direct', users: 1120, sessions: 1890, engagementRate: 55 },
              { channel: 'Referral', users: 210, sessions: 260, engagementRate: 70 },
            ],
            devices: [
              { device: 'Mobile', users: 2280, percent: 76 },
              { device: 'Desktop', users: 660, percent: 22 },
              { device: 'Tablet', users: 60, percent: 2 },
            ],
          },
        },
    audience: unconfigured
      ? { state: 'not_configured', missing: ['GA_PROPERTY_ID', 'GOOGLE_ANALYTICS_CREDENTIALS'] }
      : {
          state: 'ok',
          data: {
            window: { from: utcDay(now, 7), to: utcDay(now, 1) },
            countries: [
              { code: 'GB', name: 'United Kingdom', activeUsers: 212 },
              { code: 'IE', name: 'Ireland', activeUsers: 64 },
              { code: 'US', name: 'United States', activeUsers: 23 },
              { code: null, name: 'Unknown', activeUsers: 4 },
            ],
            devices: [
              { category: 'mobile', activeUsers: 228 },
              { category: 'desktop', activeUsers: 66 },
              { category: 'tablet', activeUsers: 6 },
            ],
            demographics: {
              available: false,
              age: [],
              gender: [],
              note: 'GA4 returned no age or gender rows: Google signals is off or the property is under its privacy thresholds.',
            },
          },
        },
    platformHealth: {
      state: 'ok',
      data: {
        errors: weekMetric(daily(3)),
        crashFreeRate: 99.42,
        topIssues: [
          {
            id: '1',
            title: "TypeError: Cannot read properties of undefined (reading 'hourly')",
            level: 'error',
            count: 48,
            lastSeen: new Date(now.getTime() - 40 * 60_000).toISOString(),
            permalink: 'https://go-daisy.sentry.io/issues/1/',
          },
          {
            id: '2',
            title: 'ChunkLoadError: Loading chunk 4417 failed.',
            level: 'warning',
            count: 9,
            lastSeen: new Date(now.getTime() - 26 * 3_600_000).toISOString(),
            permalink: 'https://go-daisy.sentry.io/issues/2/',
          },
        ],
      },
    },
  };
}
