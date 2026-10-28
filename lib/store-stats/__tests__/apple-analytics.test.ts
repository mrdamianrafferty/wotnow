/**
 * App Store listing conversion — Analytics Reports parsers, instance
 * precedence and the summary.
 * Ported from Rise Daisy's tsx script (RiseDaisy#875) to jest.
 *
 * The fixtures follow Apple's documented columns and values
 * (developer.apple.com/documentation/analytics-reports/app-download and
 * …/app-store-discovery-and-engagement). No live instance had been published
 * when these were written, so the first real sync is still the real test,
 * above all for the Territory column, whose form Apple's docs don't show.
 */

import { addDiscoveryTsv, addDownloadsTsv, latestPerDate, mergeReports, territoryCode, type ListingRow } from '../apple-analytics';
import { summariseStoreListing } from '../listing-summary';


/** Each check is its own expect, labelled with what it claims. */
function assert(cond: unknown, m: string): void {
  expect({ check: m, ok: Boolean(cond) }).toEqual({ check: m, ok: true });
}

const APP = '6755695873';
const OTHER = '6761378447';

const DISCOVERY_HEADER = [
  'Date', 'App Name', 'App Apple Identifier', 'Event', 'Page Type', 'Source Type', 'Engagement Type',
  'Device', 'Platform Version', 'Territory', 'Counts', 'Unique Counts',
].join('\t');
const disc = (date: string, app: string, event: string, page: string, territory: string, counts: number, unique: number, device = 'iPhone') =>
  [date, 'Rise Daisy', app, event, page, 'App Store search', '', device, 'iOS 18.6', territory, counts, unique].join('\t');

const DOWNLOADS_HEADER = [
  'Date', 'App Name', 'App Apple Identifier', 'Download Type', 'App Version', 'Device', 'Platform Version',
  'Source Type', 'Page Type', 'Pre-Order', 'Territory', 'Counts',
].join('\t');
const dl = (date: string, app: string, type: string, page: string, territory: string, counts: number) =>
  [date, 'Rise Daisy', app, type, '2.4', 'iPhone', 'iOS 18.6', 'App Store search', page, '', territory, counts].join('\t');

describe('territoryCode', () => {
  it('behaves as Apple documents', () => {
  assert(territoryCode('GB') === 'GB' && territoryCode('fr') === 'FR', 'a code is kept, upper-cased');
  assert(territoryCode('United Kingdom') === 'GB', 'an English region name maps to its code');
  assert(territoryCode('UK') === 'GB', 'an alias code is canonicalised');
  assert(territoryCode('Spain') === 'ES' && territoryCode('united states') === 'US', 'names match case-insensitively');
  assert(territoryCode('') === 'ZZ' && territoryCode('Atlantis') === 'ZZ' && territoryCode(undefined) === 'ZZ', 'unknown → ZZ');
  });
});

describe('addDiscoveryTsv', () => {
  it('behaves as Apple documents', () => {
  const acc = new Map<string, ListingRow>();
  addDiscoveryTsv(
    acc,
    [
      DISCOVERY_HEADER,
      disc('2026-10-26', APP, 'Impression', 'No page', 'GB', 40, 30),
      disc('2026-10-26', APP, 'Impression', 'No page', 'GB', 10, 8, 'iPad'),
      disc('2026-10-26', APP, 'Page view', 'Product page', 'GB', 12, 10),
      disc('2026-10-26', APP, 'Page view', 'Product page', 'GB', 3, 3, 'iPad'),
      disc('2026-10-26', APP, 'Page view', 'Developer page', 'GB', 99, 99),
      disc('2026-10-26', APP, 'Tap', 'Product page', 'GB', 5, 5),
      disc('2026-10-26', APP, 'Page view', 'Product page', 'ES', 4, 4),
      disc('2026-10-26', OTHER, 'Page view', 'Product page', 'GB', 500, 500),
      'not\ta\tdate\trow',
    ].join('\n'),
    APP,
  );
  const gb = acc.get('2026-10-26|GB');
  assert(gb?.impressions === 50 && gb.impressions_unique === 38, `impressions summed across device rows (got ${gb?.impressions}/${gb?.impressions_unique})`);
  assert(gb?.product_page_views === 15 && gb.product_page_views_unique === 13, `only product-page views count (got ${gb?.product_page_views})`);
  assert(acc.get('2026-10-26|ES')?.product_page_views === 4, 'per territory');
  assert(acc.size === 2, 'other apps and junk rows ignored');

  let threw = false;
  try {
    addDiscoveryTsv(new Map(), 'Something\tElse\n1\t2', APP);
  } catch {
    threw = true;
  }
  assert(threw, 'an unexpected header fails loudly rather than storing zeros');
  });
});

describe('addDownloadsTsv', () => {
  it('behaves as Apple documents', () => {
  const acc = new Map<string, ListingRow>();
  addDownloadsTsv(
    acc,
    [
      DOWNLOADS_HEADER,
      dl('2026-10-26', APP, 'First-time download', 'Product page', 'GB', 3),
      dl('2026-10-26', APP, 'First-time download', 'No Page', 'GB', 2),
      dl('2026-10-26', APP, 'First-time Download', 'Product page', 'GB', 1),
      dl('2026-10-26', APP, 'Redownload', 'Product page', 'GB', 4),
      dl('2026-10-26', APP, 'Auto-update', 'No Page', 'GB', 50),
      dl('2026-10-26', APP, 'Restore', 'No Page', 'GB', 7),
      dl('2026-10-26', OTHER, 'First-time download', 'Product page', 'GB', 90),
    ].join('\n'),
    APP,
  );
  const gb = acc.get('2026-10-26|GB');
  assert(gb?.first_time_downloads === 6, `all first-time downloads, any case (got ${gb?.first_time_downloads})`);
  assert(gb?.product_page_downloads === 4, `product-page first-time downloads only (got ${gb?.product_page_downloads})`);
  assert(gb?.redownloads === 4, 'redownloads; updates and restores ignored');
  });
});

describe('latestPerDate', () => {
  it('behaves as Apple documents', () => {
  const inst = (processingDate: string, rows: [string, string, number][]) => {
    const acc = new Map<string, ListingRow>();
    addDiscoveryTsv(acc, [DISCOVERY_HEADER, ...rows.map(([d, c, n]) => disc(d, APP, 'Page view', 'Product page', c, n, n))].join('\n'), APP);
    return { processingDate, rows: acc };
  };
  // 10-27 carries 10-25 (complete) and 10-26 (partial); 10-28 restates 10-26 and starts 10-27
  const out = latestPerDate([
    inst('2026-10-28', [['2026-10-26', 'GB', 9], ['2026-10-27', 'GB', 2]]),
    inst('2026-10-27', [['2026-10-25', 'GB', 5], ['2026-10-25', 'ES', 1], ['2026-10-26', 'GB', 4], ['2026-10-26', 'FR', 3]]),
  ]);
  assert(out.get('2026-10-26|GB')?.product_page_views === 9, 'a newer instance replaces the date, never summed (9, not 13)');
  assert(!out.has('2026-10-26|FR'), 'a territory missing from the newer set does not linger');
  assert(out.get('2026-10-25|GB')?.product_page_views === 5 && out.get('2026-10-25|ES')?.product_page_views === 1, 'a date only the older instance has is kept whole');
  assert(out.get('2026-10-27|GB')?.product_page_views === 2, 'order of instances does not matter');
  });
});

describe('mergeReports', () => {
  it('behaves as Apple documents', () => {
  const d = new Map<string, ListingRow>();
  addDiscoveryTsv(d, [DISCOVERY_HEADER, disc('2026-10-26', APP, 'Page view', 'Product page', 'GB', 20, 18)].join('\n'), APP);
  const w = new Map<string, ListingRow>();
  addDownloadsTsv(w, [DOWNLOADS_HEADER, dl('2026-10-26', APP, 'First-time download', 'Product page', 'GB', 5), dl('2026-10-26', APP, 'First-time download', 'Product page', 'US', 1)].join('\n'), APP);
  const rows = mergeReports(d, w);
  const gb = rows.find((r) => r.country === 'GB');
  assert(rows.length === 2 && gb?.product_page_views === 20 && gb.product_page_downloads === 5, 'views and downloads land in one row per day and territory');
  assert(rows.find((r) => r.country === 'US')?.product_page_views === 0, 'a territory with downloads but no views keeps zero views');
  });
});

describe('summariseStoreListing', () => {
  it('behaves as Apple documents', () => {
  const NOW = new Date('2026-10-28T12:00:00Z');
  const row = (stat_date: string, country: string, views: number, ppDownloads: number, impressions = views * 5, allDownloads = ppDownloads + 1) => ({
    stat_date,
    country,
    impressions,
    product_page_views: views,
    first_time_downloads: allDownloads,
    product_page_downloads: ppDownloads,
  });
  const s = summariseStoreListing(
    [
      row('2026-10-25', 'GB', 20, 5), // complete window ends 10-25 (three days back)
      row('2026-10-26', 'GB', 100, 0), // still settling: left out
      row('2026-09-28', 'ES', 10, 1), // first day of the window
      row('2026-09-27', 'ES', 40, 4), // previous window
      row('2026-10-20', 'ZZ', 5, 5),
    ],
    NOW,
  );
  assert(s.window.from === '2026-09-28' && s.window.to === '2026-10-25' && s.window.days === 28, `28 complete days ending three back (got ${JSON.stringify(s.window)})`);
  assert(s.totals.productPageViews === 35 && s.totals.productPageDownloads === 11, `settling days excluded, ZZ counted in totals (got ${s.totals.productPageViews})`);
  assert(s.totals.conversionRate === 31.4, `conversion 11/35 = 31.4% (got ${s.totals.conversionRate})`);
  assert(s.totals.pageViewRate === 20, 'page-view rate = views / impressions');
  assert(s.totals.firstTimeDownloads === 14, 'all first-time downloads kept beside the product-page ones');
  assert(s.previous.productPageViews === 40 && s.previous.conversionRate === 10, 'previous window');
  assert(s.countries.map((c) => c.country).join() === 'GB,ES', 'countries by views, ZZ left out');
  assert(s.countries[0].conversionRate === 25, 'per-country conversion');
  assert(s.daily.length === 28 && s.daily[0].date === '2026-09-28' && s.daily[27].productPageViews === 20, 'daily series fills the window, oldest first');
  assert(s.latestDate === '2026-10-26' && s.hasData, 'latestDate is the newest row, settling or not');

  const empty = summariseStoreListing([], NOW);
  assert(!empty.hasData && empty.totals.conversionRate === null && empty.totals.pageViewRate === null, 'no data → null rates, not 0%');
  });
});

