/**
 * Fold app_store_listing_daily rows into listing conversion for the
 * dashboard and metrics-summary. Pure, so it is tested without a database.
 *
 * Conversion = first-time downloads made from the product page ÷ product-page
 * views, both Apple's total `Counts`. Downloads tapped straight from search
 * results or a list never open the product page, so they are left out of the
 * numerator (they are still in `firstTimeDownloads`); otherwise the rate
 * could pass 100%.
 *
 * The window ends three days back: Apple's discovery report is complete
 * within three days and the downloads report within two, so a newer day
 * would set a still-growing figure against a settled one.
 */

import { utcDay } from './summary';

export interface ListingInput {
  stat_date: string;
  country: string;
  impressions: number;
  product_page_views: number;
  first_time_downloads: number;
  product_page_downloads: number;
}

export interface ListingTotals {
  impressions: number;
  productPageViews: number;
  /** All first-time downloads, from any page or none */
  firstTimeDownloads: number;
  /** First-time downloads from the product page */
  productPageDownloads: number;
  /** productPageDownloads ÷ productPageViews as a percentage, 1 dp; null with no views */
  conversionRate: number | null;
  /** productPageViews ÷ impressions as a percentage, 1 dp; null with no impressions */
  pageViewRate: number | null;
}

export interface CountryListing extends ListingTotals {
  country: string;
}

export interface StoreListingSummary {
  /** The complete days summarised, inclusive */
  window: { from: string; to: string; days: number };
  totals: ListingTotals;
  /** The same length of window just before it */
  previous: ListingTotals;
  /** Top 10 territories by product-page views, the unknown 'ZZ' left out */
  countries: CountryListing[];
  /** One entry per day in the window, oldest first */
  daily: { date: string; productPageViews: number; productPageDownloads: number }[];
  hasData: boolean;
  /** Newest day Apple has reported, which may be inside the settling lag */
  latestDate: string | null;
}

export const LISTING_WINDOW_DAYS = 28;
export const LISTING_SETTLE_DAYS = 3;

function pct(n: number, d: number): number | null {
  return d === 0 ? null : Math.round((n / d) * 1000) / 10;
}

function totals(rows: ListingInput[]): ListingTotals {
  let impressions = 0;
  let productPageViews = 0;
  let firstTimeDownloads = 0;
  let productPageDownloads = 0;
  for (const r of rows) {
    impressions += r.impressions;
    productPageViews += r.product_page_views;
    firstTimeDownloads += r.first_time_downloads;
    productPageDownloads += r.product_page_downloads;
  }
  return {
    impressions,
    productPageViews,
    firstTimeDownloads,
    productPageDownloads,
    conversionRate: pct(productPageDownloads, productPageViews),
    pageViewRate: pct(productPageViews, impressions),
  };
}

export function summariseStoreListing(rows: ListingInput[], now = new Date()): StoreListingSummary {
  const to = utcDay(now, LISTING_SETTLE_DAYS);
  const from = utcDay(now, LISTING_SETTLE_DAYS + LISTING_WINDOW_DAYS - 1);
  const prevTo = utcDay(now, LISTING_SETTLE_DAYS + LISTING_WINDOW_DAYS);
  const prevFrom = utcDay(now, LISTING_SETTLE_DAYS + 2 * LISTING_WINDOW_DAYS - 1);

  const inWindow = rows.filter((r) => r.stat_date >= from && r.stat_date <= to);
  const inPrevious = rows.filter((r) => r.stat_date >= prevFrom && r.stat_date <= prevTo);

  const byCountry = new Map<string, ListingInput[]>();
  for (const r of inWindow) {
    if (r.country === 'ZZ') continue;
    byCountry.set(r.country, [...(byCountry.get(r.country) ?? []), r]);
  }
  const countries = [...byCountry.entries()]
    .map(([country, rs]) => ({ country, ...totals(rs) }))
    .filter((c) => c.productPageViews > 0 || c.firstTimeDownloads > 0)
    .sort((a, b) => b.productPageViews - a.productPageViews || b.firstTimeDownloads - a.firstTimeDownloads || a.country.localeCompare(b.country))
    .slice(0, 10);

  const perDay = new Map<string, { productPageViews: number; productPageDownloads: number }>();
  for (const r of inWindow) {
    const d = perDay.get(r.stat_date) ?? { productPageViews: 0, productPageDownloads: 0 };
    d.productPageViews += r.product_page_views;
    d.productPageDownloads += r.product_page_downloads;
    perDay.set(r.stat_date, d);
  }
  const daily = Array.from({ length: LISTING_WINDOW_DAYS }, (_, i) => {
    const date = utcDay(now, LISTING_SETTLE_DAYS + LISTING_WINDOW_DAYS - 1 - i);
    return { date, ...(perDay.get(date) ?? { productPageViews: 0, productPageDownloads: 0 }) };
  });

  return {
    window: { from, to, days: LISTING_WINDOW_DAYS },
    totals: totals(inWindow),
    previous: totals(inPrevious),
    countries,
    daily,
    hasData: rows.length > 0,
    latestDate: rows.reduce<string | null>((latest, r) => (latest === null || r.stat_date > latest ? r.stat_date : latest), null),
  };
}
