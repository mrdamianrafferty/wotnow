/**
 * @jest-environment node
 */
/**
 * storeListing in /api/admin/metrics-summary: App Store listing conversion,
 * the same section as Rise Daisy's (RiseDaisy#875).
 */

import { summariseStoreListing } from '@/lib/store-stats/listing-summary';
import { storeListingSection } from '../metrics';
import { sampleMetrics } from '../sample';

const now = new Date('2026-10-28T09:00:00Z');
const apple = { APP_STORE_CONNECT_KEY_ID: 'x', APP_STORE_CONNECT_ISSUER_ID: 'x', APP_STORE_CONNECT_PRIVATE_KEY: 'x', APP_STORE_VENDOR_NUMBER: 'x' };

describe('storeListingSection', () => {
  it('is not configured, with a hint, until Apple has published an instance', () => {
    const s = storeListingSection(summariseStoreListing([], now), apple);
    expect(s.state === 'not_configured' && s.missing).toEqual([]);
    expect(s.state === 'not_configured' && s.hint).toBeTruthy();
  });

  it('names only the Apple vars when they are unset', () => {
    const s = storeListingSection(summariseStoreListing([], now), {});
    expect(s.state === 'not_configured' && s.missing).toHaveLength(4);
  });

  it('passes rows through with the conversion rate', () => {
    const rows = [{ stat_date: '2026-10-20', country: 'GB', impressions: 100, product_page_views: 20, first_time_downloads: 6, product_page_downloads: 5 }];
    const s = storeListingSection(summariseStoreListing(rows, now), apple);
    expect(s.state === 'ok' && s.data.totals.conversionRate).toBe(25);
  });

  it('is in the sample summary', () => {
    const s = sampleMetrics(now).storeListing;
    expect(s.state === 'ok' && s.data.totals.conversionRate).toBeGreaterThan(0);
  });
});
