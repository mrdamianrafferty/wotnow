/**
 * The multi-app dashboard (/admin/apps): the five apps' metrics-summary
 * responses folded into one comparable snapshot each, plus family totals.
 *
 * Pure. The endpoints land at different times and are written in different
 * repos, so nothing here trusts a response's shape: every field is read
 * defensively, and a part that cannot be read becomes "not reported" rather
 * than a zero. Accepted per part: a Section ({state:'ok',data} |
 * {state:'not_configured',missing} | {state:'error',message}), the legacy
 * {configured:false}, or bare data.
 */

export type FamilyAppId = 'godaisy' | 'growdaisy' | 'risedaisy' | 'hungerford' | 'findr' | 'flycast' | 'grewp';

export interface FamilyApp {
  id: FamilyAppId;
  name: string;
  /** METRICS_<envKey>_URL / METRICS_<envKey>_TOKEN */
  envKey: string;
  /** One colour per app, used everywhere the app appears. */
  color: string;
  /** Store platforms it ships on; an app without Android never counts as "Android missing". */
  platforms: ('ios' | 'android')[];
  /** A club app that takes no money: no revenue is a fact, not a gap. */
  noRevenue?: boolean;
  /** The metrics app id this codebase can read in-process (see app-identity.ts). */
  inProcess?: 'go_daisy' | 'grow_daisy';
}

export const FAMILY_APPS: FamilyApp[] = [
  { id: 'godaisy', name: 'Go Daisy', envKey: 'GODAISY', color: '#475569', platforms: ['ios', 'android'], inProcess: 'go_daisy' },
  { id: 'growdaisy', name: 'Grow Daisy', envKey: 'GROWDAISY', color: '#73e2a0', platforms: ['ios', 'android'], inProcess: 'grow_daisy' },
  { id: 'risedaisy', name: 'Rise Daisy', envKey: 'RISEDAISY', color: '#0c6231', platforms: ['ios', 'android'] },
  { id: 'hungerford', name: 'Hungerford', envKey: 'HUNGERFORD', color: '#164e63', platforms: ['ios'], noRevenue: true },
  { id: 'findr', name: 'Findr', envKey: 'FINDR', color: '#0e7490', platforms: ['ios', 'android'] },
  { id: 'flycast', name: 'Fly Cast', envKey: 'FLYCAST', color: '#22d3ee', platforms: ['ios', 'android'] },
  { id: 'grewp', name: 'Grewp', envKey: 'GREWP', color: '#18b254', platforms: ['ios', 'android'] },
];

/** A 7-day count against the 7 days before; `daily` oldest first when known. */
export interface Trend {
  value: number;
  previous: number;
  delta: number | null;
  daily: number[];
}

export type Part<T> = { state: 'ok'; data: T } | { state: 'not_configured'; missing: string[]; note?: string } | { state: 'error'; message: string };

export interface CountryCount {
  country: string;
  downloads: number;
}

export interface DownloadsPart {
  ios: Trend | null;
  android: Trend | null;
  total: Trend;
  latestDate: string | null;
  /** First-time downloads by store region over 30 days; null when the app does not send them yet. */
  countries30d: CountryCount[] | null;
  /** First-time downloads over the last 30 complete days (PlatformDownloads.total30d); null per platform when not sent. */
  total30d?: { ios: number | null; android: number | null };
}

export interface RevenuePart {
  /** 'none' for an app that takes no money (Hungerford). */
  source: string;
  note?: string | null;
  currency: string | null;
  mrr: number | null;
  activeSubscriptions: number | null;
  activeTrials: number | null;
  revenue28d: number | null;
  /**
   * Figures that are a shared RevenueCat project's total rather than this
   * app's (Go Daisy and Grow Daisy share one). Shown labelled; never summed
   * into family totals, where they would be counted once per app.
   */
  projectTotal?: string[];
}

export interface AnalyticsPart {
  activeUsers: Trend | null;
  sessions: Trend | null;
  pageViews: Trend | null;
}

/** Vercel Web Analytics for the same seven days as GA4: counts people without asking for consent. */
export interface VercelCountry {
  /** ISO-2, upper case. */
  code: string;
  name: string;
  visitors: number;
  pageviews: number;
}

export interface VercelPart {
  window: { from: string; to: string };
  visitors: Trend;
  pageviews: Trend;
  /** Top 10 by visitors. */
  countries: VercelCountry[];
  /** Visitors over the last 28 complete UTC days, for the funnel (funnel.ts); absent in snapshots cached before it existed. */
  visitors28d?: number | null;
}

export interface HealthPart {
  errors: Trend | null;
  crashFreeRate: number | null;
  /** Unresolved issues the app reported (its top list, so a floor, not a census). */
  topIssues: number;
}

export interface AudiencePart {
  window: { from: string; to: string } | null;
  countries: { code: string | null; name: string; activeUsers: number }[];
  devices: { category: string; activeUsers: number }[];
  demographics: {
    available: boolean;
    age: { bracket: string; activeUsers: number }[];
    gender: { gender: string; activeUsers: number }[];
    note: string | null;
  };
}

/** Stripe web plans (Rise Daisy, Grow Daisy): separate from in-app revenue, so never double counted. */
export interface WebRevenuePart {
  activeSubscriptions: number | null;
  trialing: number | null;
  mrrByCurrency: { currency: string; mrr: number; subscriptions: number }[];
}

/** Extra club KPIs (Hungerford), labelled and in the order sent. */
export interface ClubPart {
  stats: { key: string; label: string; value: number }[];
}

/** App Store listing figures over one window (lib/store-stats/listing-summary.ts). */
export interface ListingFigures {
  impressions: number;
  productPageViews: number;
  /** All first-time downloads, from any page or none */
  firstTimeDownloads: number;
  /** First-time downloads from the product page: the conversion numerator */
  productPageDownloads: number;
  /** productPageDownloads ÷ productPageViews, %, 1 dp; null with no views */
  conversionRate: number | null;
  /** productPageViews ÷ impressions, %, 1 dp; null with no impressions */
  pageViewRate: number | null;
}

/** Listing conversion over 28 complete days ending three days back, against the 28 before. */
export interface StoreListingPart {
  window: { from: string; to: string; days: number } | null;
  totals: ListingFigures;
  /** null when the app sent no previous window */
  previous: ListingFigures | null;
  countries: (ListingFigures & { country: string })[];
  daily: { date: string; productPageViews: number; productPageDownloads: number }[];
  latestDate: string | null;
}

export type AppStatus = 'ok' | 'not_configured' | 'unavailable';

export interface AppSnapshot {
  id: FamilyAppId;
  name: string;
  color: string;
  status: AppStatus;
  /** Why the app is not_configured or unavailable. */
  message?: string;
  missing?: string[];
  generatedAt: string | null;
  /** The app's own admin dashboard (app-links.ts, after any env override); absent or null when it has none. */
  dashboardUrl?: string | null;
  /** When the dashboard fetched this snapshot; older than the page when it came from the cache (family-cache.ts). */
  fetchedAt?: string;
  downloads: Part<DownloadsPart>;
  revenue: Part<RevenuePart>;
  analytics: Part<AnalyticsPart>;
  health: Part<HealthPart>;
  /** Added 2026-10-27; an app that has not shipped it yet reads as not reported. */
  audience: Part<AudiencePart>;
  /**
   * App Store listing conversion, added 2026-10-28. Optional so a snapshot
   * cached before it reads as not reported; an app that does not send it
   * (Grewp) reads the same way, never as zeros.
   */
  storeListing?: Part<StoreListingPart>;
  /** Vercel Web Analytics, added by the dashboard itself (vercel-analytics.ts); absent for an optional project that did not answer. */
  vercel?: Part<VercelPart>;
  /** Only apps that sell on the web send it; null when absent. */
  webRevenue: Part<WebRevenuePart> | null;
  /** Only club apps send it; null when absent. */
  club: ClubPart | null;
  /** The app's top unresolved Sentry issue over 7 days, added by the dashboard itself (sentry-top.ts). */
  topIssue?: Part<TopIssuePart>;
}

/** One Sentry issue: the most events in the window among the project's unresolved ones. */
export interface TopIssuePart {
  title: string;
  shortId: string | null;
  /** Events in the window. */
  count: number;
  permalink: string;
  /** Sentry project slug it came from. */
  project: string;
  /** Set when the project is shared with another app (Hungerford reports to Rise Daisy's). */
  sharedWith: string | null;
}

/** A country summed across apps, with the apps it came from (largest first). */
export interface FamilyCountry {
  /** ISO-2 when known; GA4's "(not set)" has none. */
  code: string | null;
  name: string;
  value: number;
  apps: FamilyAppId[];
}

export interface FamilyAudience {
  /** Apps whose audience section came back ok. */
  reporting: number;
  /** Visitors (GA4 active users over the 7 days) by country, summed per app, largest first. */
  countries: FamilyCountry[];
  /** Total visitors: the sum of each reporting app's device rows, which cover everyone. */
  visitors: number;
  devices: { category: string; value: number }[];
  /** Per app, so a note can say which app leans mobile. */
  deviceShare: {
    id: FamilyAppId;
    name: string;
    visitors: number;
    mobile: number;
  }[];
  demographics: {
    /** Apps with at least one age or gender row. */
    availableApps: number;
    age: { bracket: string; value: number }[];
    gender: { gender: string; value: number }[];
  };
  /** Store downloads by region, 30 days, summed across apps that send countries30d. */
  storeCountries: FamilyCountry[];
  storeReporting: number;
}

/** Listing conversion across the apps with data, weighted by views: Σ page downloads ÷ Σ page views. */
export interface FamilyListing {
  productPageViews: number;
  productPageDownloads: number;
  firstTimeDownloads: number;
  conversionRate: number | null;
  /** The same sums over each app's previous window; null when no reporting app sent one. */
  previous: { productPageViews: number; productPageDownloads: number; conversionRate: number | null } | null;
  /** Apps whose listing section came back ok */
  apps: number;
  /** Apps with credentials set that are waiting for Apple's first report */
  waiting: number;
}

export interface FamilyTotals {
  downloads: Trend & { apps: number };
  /** MRR is only summed within a currency; the largest figure first (currencies are not converted). */
  mrr: { currency: string; value: number; apps: number }[];
  activeSubscriptions: { value: number; apps: number };
  activeTrials: { value: number; apps: number };
  /** Summed per app, so a person using two apps counts twice. */
  activeUsers: Trend & { apps: number };
  errors: Trend & { apps: number };
  /** Each reporting app's share of the family's downloads this week. */
  downloadShare: {
    id: FamilyAppId;
    name: string;
    color: string;
    value: number;
  }[];
  audience: FamilyAudience;
  /** Optional so a summary built before it existed still type-checks; familyTotals always sets it. */
  storeListing?: FamilyListing;
}

export interface FamilySummary {
  generatedAt: string;
  /** The Refresh control's state (family-cache.ts); absent for sample data. */
  refresh?: { refreshed: boolean; nextRefreshAt: string | null };
  apps: AppSnapshot[];
  totals: FamilyTotals;
}

// ─── Defensive readers ───────────────────────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

export function pctDelta(value: number, previous: number): number | null {
  return previous === 0 ? null : Math.round(((value - previous) / previous) * 100);
}

/** Keeps a message short and free of anything that looks like a credential. */
export function cleanMessage(raw: unknown): string {
  const text = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw);
  return text.replace(/(Bearer\s+|sk_live_|sk_test_|rk_live_)\S*/g, '[redacted]').slice(0, 200);
}

/** A WeekMetric {value, previous, daily} or a PlatformDownloads {week, previousWeek, sparkline}. */
export function readTrend(v: unknown): Trend | null {
  if (!isObj(v)) return null;
  const value = num(v.value) ?? num(v.week);
  if (value === null) return null;
  const previous = num(v.previous) ?? num(v.previousWeek) ?? 0;
  const rawDaily = Array.isArray(v.daily) ? v.daily : Array.isArray(v.sparkline) ? v.sparkline : [];
  const daily = rawDaily.map((d) => (isObj(d) ? (num(d.downloads) ?? num(d.value)) : num(d))).filter((d): d is number => d !== null);
  return { value, previous, delta: pctDelta(value, previous), daily };
}

/** Section, {configured:false}, or bare data → the data, or why there is none. */
function readSection(v: unknown): Part<Obj> {
  if (v === undefined || v === null)
    return {
      state: 'not_configured',
      missing: [],
      note: NOT_REPORTED,
    };
  if (!isObj(v)) return { state: 'error', message: 'Unreadable response' };
  if (v.configured === false) return { state: 'not_configured', missing: strings(v.missing) };
  if (v.state === 'not_configured') {
    return {
      state: 'not_configured',
      missing: strings(v.missing),
      ...(str(v.hint) ? { note: str(v.hint)! } : {}),
    };
  }
  if (v.state === 'error')
    return {
      state: 'error',
      message: cleanMessage(str(v.message) ?? 'Source error'),
    };
  if (v.state === 'ok') return isObj(v.data) ? { state: 'ok', data: v.data } : { state: 'error', message: 'Unreadable response' };
  if ('state' in v) return { state: 'error', message: 'Unreadable response' };
  return { state: 'ok', data: v };
}

function mapPart<T>(part: Part<Obj>, read: (d: Obj) => T | null): Part<T> {
  if (part.state !== 'ok') return part;
  const data = read(part.data);
  return data === null ? { state: 'error', message: 'Unreadable response' } : { state: 'ok', data };
}

function sumTrends(trends: Trend[]): Trend {
  const value = trends.reduce((a, t) => a + t.value, 0);
  const previous = trends.reduce((a, t) => a + t.previous, 0);
  // Daily series only add up when every one covers the same days
  const len = trends[0]?.daily.length ?? 0;
  const daily = len > 0 && trends.every((t) => t.daily.length === len) ? trends[0].daily.map((_, i) => trends.reduce((a, t) => a + t.daily[i], 0)) : [];
  return { value, previous, delta: pctDelta(value, previous), daily };
}

export function readDownloads(d: Obj): DownloadsPart | null {
  const ios = readTrend(d.ios);
  const android = readTrend(d.android);
  const present = [ios, android].filter((t): t is Trend => t !== null);
  if (present.length === 0) return null;
  return {
    ios,
    android,
    total: sumTrends(present),
    latestDate: str(d.latestDate),
    countries30d: readCountries30d(d.countries30d),
    total30d: { ios: isObj(d.ios) ? num(d.ios.total30d) : null, android: isObj(d.android) ? num(d.android.total30d) : null },
  };
}

export function readCountries30d(v: unknown): CountryCount[] | null {
  if (!Array.isArray(v)) return null;
  return v
    .filter(isObj)
    .map((c) => ({
      country: str(c.country)?.toUpperCase() ?? '',
      downloads: num(c.downloads) ?? 0,
    }))
    .filter((c) => /^[A-Z]{2}$/.test(c.country) && c.country !== 'ZZ' && c.downloads > 0);
}

/** {code,name,activeUsers}[] etc. — rows with a non-numeric count are dropped, not zeroed. */
function rows<T>(v: unknown, read: (o: Obj) => T | null): T[] {
  return Array.isArray(v)
    ? v
        .filter(isObj)
        .map(read)
        .filter((r): r is T => r !== null)
    : [];
}

export function readAudience(d: Obj): AudiencePart | null {
  const countries = rows(d.countries, (c) => {
    const users = num(c.activeUsers);
    if (users === null) return null;
    const code = str(c.code)?.toUpperCase() ?? null;
    return {
      code: code && /^[A-Z]{2}$/.test(code) ? code : null,
      name: str(c.name) ?? code ?? 'Unknown',
      activeUsers: users,
    };
  });
  const devices = rows(d.devices, (x) => {
    const users = num(x.activeUsers);
    const category = str(x.category);
    return users === null || !category ? null : { category: category.toLowerCase(), activeUsers: users };
  });
  const demo = isObj(d.demographics) ? d.demographics : {};
  const age = rows(demo.age, (x) => (num(x.activeUsers) === null || !str(x.bracket) ? null : { bracket: str(x.bracket)!, activeUsers: num(x.activeUsers)! }));
  const gender = rows(demo.gender, (x) =>
    num(x.activeUsers) === null || !str(x.gender)
      ? null
      : {
          gender: str(x.gender)!.toLowerCase(),
          activeUsers: num(x.activeUsers)!,
        },
  );
  if (!Array.isArray(d.countries) && !Array.isArray(d.devices) && !isObj(d.demographics)) return null;
  const window = isObj(d.window) && str(d.window.from) && str(d.window.to) ? { from: str(d.window.from)!, to: str(d.window.to)! } : null;
  return {
    window,
    countries,
    devices,
    // Trust the rows over the flag: "available" with nothing in it is not available
    demographics: {
      available: age.length > 0 || gender.length > 0,
      age,
      gender,
      note: str(demo.note),
    },
  };
}

export function readRevenue(d: Obj): RevenuePart | null {
  if (d.source === 'none') {
    return { source: 'none', note: str(d.note), currency: null, mrr: null, activeSubscriptions: null, activeTrials: null, revenue28d: null };
  }
  // Stripe summaries (Grewp) may carry MRR per currency instead of one figure
  const byCurrency = Array.isArray(d.mrrByCurrency) ? d.mrrByCurrency.filter(isObj) : [];
  const single = byCurrency.length === 1 ? byCurrency[0] : null;
  const part: RevenuePart = {
    source: str(d.source) ?? 'unknown',
    currency: str(d.currency) ?? (single ? str(single.currency) : null),
    mrr: num(d.mrr) ?? (single ? num(single.mrr) : null),
    activeSubscriptions: num(d.activeSubscriptions),
    activeTrials: num(d.activeTrials) ?? num(d.trialing),
    revenue28d: num(d.revenue28d),
  };
  const projectTotal = Array.isArray(d.projectTotal) ? d.projectTotal.filter((f): f is string => typeof f === 'string') : [];
  if (projectTotal.length) part.projectTotal = projectTotal;
  return part.mrr === null && part.activeSubscriptions === null && part.activeTrials === null && part.revenue28d === null ? null : part;
}

export function readWebRevenue(d: Obj): WebRevenuePart | null {
  const byCurrency = (Array.isArray(d.mrrByCurrency) ? d.mrrByCurrency : [])
    .filter(isObj)
    .map((m) => ({ currency: str(m.currency)?.toUpperCase() ?? '', mrr: num(m.mrr) ?? NaN, subscriptions: num(m.subscriptions) ?? 0 }))
    .filter((m) => m.currency && Number.isFinite(m.mrr));
  const part = { activeSubscriptions: num(d.activeSubscriptions), trialing: num(d.trialing), mrrByCurrency: byCurrency };
  return part.activeSubscriptions === null && byCurrency.length === 0 ? null : part;
}

const CLUB_LABELS: Record<string, string> = {
  members: 'Members',
  catchEntries7d: 'Catch entries · 7 days',
  fishLogged7d: 'Fish logged · 7 days',
  trips7d: 'Trips · 7 days',
  blankTrips7d: 'Blank trips · 7 days',
};
const humanise = (k: string) =>
  CLUB_LABELS[k] ??
  k
    .replace(/(\d+)d$/, ' · $1 days')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

/** Any numeric club figure, and `members.total`; everything else is ignored. */
export function readClub(v: unknown): ClubPart | null {
  const part = readSection(v);
  if (part.state !== 'ok') return null;
  const stats = Object.entries(part.data).flatMap(([key, val]) => {
    const value = num(val) ?? (isObj(val) ? num(val.total) : null);
    return value === null ? [] : [{ key, label: humanise(key), value }];
  });
  return stats.length ? { stats } : null;
}

export function readAnalytics(d: Obj): AnalyticsPart | null {
  const part = {
    activeUsers: readTrend(d.activeUsers),
    sessions: readTrend(d.sessions),
    pageViews: readTrend(d.pageViews),
  };
  return part.activeUsers || part.sessions || part.pageViews ? part : null;
}

export function readHealth(d: Obj): HealthPart | null {
  const errors = readTrend(d.errors) ?? readTrend(d.errorCount);
  const rate = num(d.crashFreeRate);
  const topIssues = Array.isArray(d.topIssues) ? d.topIssues.length : 0;
  if (!errors && rate === null && !Array.isArray(d.topIssues)) return null;
  return { errors, crashFreeRate: rate, topIssues };
}

/** A share as a percentage to 1 dp, as listing-summary.ts rounds it; null with nothing to divide by. */
export const pct1 = (n: number, d: number): number | null => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

const count = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n >= 0 ? n : null;
};

/**
 * One window's figures. The four counts must be there; the rates are
 * recomputed from them, so a rate can never disagree with its own counts.
 */
export function readListingFigures(v: unknown): ListingFigures | null {
  if (!isObj(v)) return null;
  const views = count(v.productPageViews);
  const pageDownloads = count(v.productPageDownloads);
  if (views === null || pageDownloads === null) return null;
  const impressions = count(v.impressions) ?? 0;
  return {
    impressions,
    productPageViews: views,
    firstTimeDownloads: count(v.firstTimeDownloads) ?? pageDownloads,
    productPageDownloads: pageDownloads,
    conversionRate: pct1(pageDownloads, views),
    pageViewRate: pct1(views, impressions),
  };
}

export function readStoreListing(d: Obj): StoreListingPart | null {
  const totals = readListingFigures(d.totals);
  if (!totals) return null;
  const w = isObj(d.window) ? d.window : null;
  const window = w && str(w.from) && str(w.to) ? { from: str(w.from)!, to: str(w.to)!, days: num(w.days) ?? 28 } : null;
  const countries = rows(d.countries, (c) => {
    const country = str(c.country)?.toUpperCase();
    const f = readListingFigures(c);
    return country && /^[A-Z]{2}$/.test(country) && country !== 'ZZ' && f ? { country, ...f } : null;
  });
  const daily = rows(d.daily, (x) => {
    const date = str(x.date);
    const views = count(x.productPageViews);
    const downloads = count(x.productPageDownloads);
    return date && views !== null && downloads !== null ? { date, productPageViews: views, productPageDownloads: downloads } : null;
  });
  return { window, totals, previous: readListingFigures(d.previous), countries, daily, latestDate: str(d.latestDate) };
}

const NOT_REPORTED = 'Not reported by this app';

/** Credentials set, no report instance synced yet: the quiet state until Apple's first report lands. */
export const listingWaiting = (p: Part<StoreListingPart> | undefined): boolean =>
  !!p && p.state === 'not_configured' && p.missing.length === 0 && p.note !== NOT_REPORTED;

function readStoreListingSection(v: unknown): Part<StoreListingPart> {
  const part = readSection(v);
  // Not expected (the apps send not_configured instead), but an empty summary is waiting, not unreadable
  if (part.state === 'ok' && part.data.hasData === false) return { state: 'not_configured', missing: [], note: 'No listing data yet' };
  return mapPart(part, readStoreListing);
}

const NOT_REACHED: Part<never> = { state: 'not_configured', missing: [] };

/** An app the dashboard could not ask (no URL/token) or that did not answer usefully. */
export function unavailableSnapshot(app: FamilyApp, status: Exclude<AppStatus, 'ok'>, message: string, missing: string[] = []): AppSnapshot {
  return {
    id: app.id,
    name: app.name,
    color: app.color,
    status,
    message: cleanMessage(message),
    ...(missing.length ? { missing } : {}),
    generatedAt: null,
    downloads: NOT_REACHED,
    revenue: NOT_REACHED,
    analytics: NOT_REACHED,
    health: NOT_REACHED,
    audience: NOT_REACHED,
    webRevenue: null,
    club: null,
  };
}

/** A club app's revenue is "none", whatever (if anything) it sent. */
function readRevenueSection(app: FamilyApp, v: unknown): Part<RevenuePart> {
  const part = mapPart(readSection(v), readRevenue);
  if (app.noRevenue && (part.state !== 'ok' || part.data.mrr === null)) {
    return {
      state: 'ok',
      data: {
        source: 'none',
        note: part.state === 'ok' ? (part.data.note ?? null) : null,
        currency: null,
        mrr: null,
        activeSubscriptions: null,
        activeTrials: null,
        revenue28d: null,
      },
    };
  }
  return part;
}

function readDownloadsSection(v: unknown): Part<DownloadsPart> {
  const part = readSection(v);
  // An app with credentials but no synced rows yet is not "unreadable"
  if (part.state === 'ok' && part.data.hasData === false) return { state: 'not_configured', missing: [], note: 'No store data yet' };
  return mapPart(part, readDownloads);
}

/** One app's metrics-summary body → its snapshot. Never throws. */
export function readAppSummary(app: FamilyApp, body: unknown): AppSnapshot {
  if (!isObj(body)) return unavailableSnapshot(app, 'unavailable', 'Response was not a JSON object');
  return {
    id: app.id,
    name: app.name,
    color: app.color,
    status: 'ok',
    generatedAt: str(body.generatedAt),
    downloads: readDownloadsSection(body.storeDownloads),
    storeListing: readStoreListingSection(body.storeListing),
    revenue: readRevenueSection(app, body.revenue),
    analytics: mapPart(readSection(body.analytics), readAnalytics),
    health: mapPart(readSection(body.platformHealth), readHealth),
    audience: mapPart(readSection(body.audience), readAudience),
    webRevenue: body.webRevenue === undefined ? null : mapPart(readSection(body.webRevenue), readWebRevenue),
    club: readClub(body.club),
  };
}

// ─── Family totals ───────────────────────────────────────────────────

/** True when this figure is a shared project's total, not the app's own. */
export const isProjectTotal = (r: RevenuePart | null | undefined, field: keyof RevenuePart) => !!r?.projectTotal?.includes(field);

/**
 * One app's MRR per currency: in-app plus Stripe web plans. Empty when it
 * reports none. `ownOnly` leaves out an in-app MRR that is a shared
 * project's total, for sums across apps.
 */
export function appMrr(a: AppSnapshot, ownOnly = false): { currency: string; value: number }[] {
  const m = new Map<string, number>();
  const r = a.revenue.state === 'ok' ? a.revenue.data : null;
  if (r?.mrr != null && r.currency && !(ownOnly && isProjectTotal(r, 'mrr'))) m.set(r.currency, r.mrr);
  const w = a.webRevenue?.state === 'ok' ? a.webRevenue.data : null;
  for (const x of w?.mrrByCurrency ?? []) m.set(x.currency, (m.get(x.currency) ?? 0) + x.mrr);
  return [...m.entries()].map(([currency, value]) => ({ currency, value: Math.round(value * 100) / 100 })).sort((x, y) => y.value - x.value);
}

const okData = <T>(p: Part<T>): T | null => (p.state === 'ok' ? p.data : null);

export function familyTotals(apps: AppSnapshot[]): FamilyTotals {
  const dl = apps.map((a) => ({ app: a, d: okData(a.downloads) })).filter((x): x is { app: AppSnapshot; d: DownloadsPart } => x.d !== null);
  const users = apps.map((a) => okData(a.analytics)?.activeUsers ?? null).filter((t): t is Trend => t !== null);
  const errs = apps.map((a) => okData(a.health)?.errors ?? null).filter((t): t is Trend => t !== null);

  const mrr = new Map<string, { value: number; apps: number }>();
  for (const a of apps) {
    for (const m of appMrr(a, true)) {
      const t = mrr.get(m.currency) ?? { value: 0, apps: 0 };
      mrr.set(m.currency, { value: Math.round((t.value + m.value) * 100) / 100, apps: t.apps + 1 });
    }
  }
  // In-app (RevenueCat/Stripe) plus web plans: different books, so they add up
  const count = (field: 'activeSubscriptions' | 'activeTrials', web: (w: WebRevenuePart) => number | null) => {
    const vals = apps
      .map((a) => {
        const r = okData(a.revenue);
        const w = a.webRevenue ? okData(a.webRevenue) : null;
        const parts = [r && !isProjectTotal(r, field) ? r[field] : null, w ? web(w) : null].filter((n): n is number => n !== null);
        return parts.length ? parts.reduce((x, y) => x + y, 0) : null;
      })
      .filter((n): n is number => n !== null);
    return { value: vals.reduce((x, y) => x + y, 0), apps: vals.length };
  };

  return {
    downloads: { ...sumTrends(dl.map((x) => x.d.total)), apps: dl.length },
    mrr: [...mrr.entries()].map(([currency, m]) => ({ currency, ...m })).sort((a, b) => b.value - a.value || b.apps - a.apps),
    activeSubscriptions: count('activeSubscriptions', (w) => w.activeSubscriptions),
    activeTrials: count('activeTrials', (w) => w.trialing),
    activeUsers: { ...sumTrends(users), apps: users.length },
    errors: { ...sumTrends(errs), apps: errs.length },
    downloadShare: dl
      .filter((x) => x.d.total.value > 0)
      .map((x) => ({
        id: x.app.id,
        name: x.app.name,
        color: x.app.color,
        value: x.d.total.value,
      }))
      .sort((a, b) => b.value - a.value),
    audience: familyAudience(apps),
    storeListing: familyListing(apps),
  };
}

export function familyListing(apps: AppSnapshot[]): FamilyListing {
  const parts = apps.map((a) => (a.storeListing ? okData(a.storeListing) : null)).filter((p): p is StoreListingPart => p !== null);
  const sum = (pick: (p: StoreListingPart) => number) => parts.reduce((a, p) => a + pick(p), 0);
  const views = sum((p) => p.totals.productPageViews);
  const downloads = sum((p) => p.totals.productPageDownloads);
  const prev = parts.map((p) => p.previous).filter((p): p is ListingFigures => p !== null);
  const prevViews = prev.reduce((a, p) => a + p.productPageViews, 0);
  const prevDownloads = prev.reduce((a, p) => a + p.productPageDownloads, 0);
  return {
    productPageViews: views,
    productPageDownloads: downloads,
    firstTimeDownloads: sum((p) => p.totals.firstTimeDownloads),
    conversionRate: pct1(downloads, views),
    previous: prev.length ? { productPageViews: prevViews, productPageDownloads: prevDownloads, conversionRate: pct1(prevDownloads, prevViews) } : null,
    apps: parts.length,
    waiting: apps.filter((a) => listingWaiting(a.storeListing)).length,
  };
}

/** Sums by key, remembering which apps contributed (largest contributor first). */
function sumByKey(
  items: {
    key: string;
    code: string | null;
    name: string;
    value: number;
    app: FamilyAppId;
  }[],
): FamilyCountry[] {
  const m = new Map<
    string,
    {
      code: string | null;
      name: string;
      value: number;
      perApp: Map<FamilyAppId, number>;
    }
  >();
  for (const it of items) {
    const e = m.get(it.key) ?? {
      code: it.code,
      name: it.name,
      value: 0,
      perApp: new Map(),
    };
    e.value += it.value;
    e.perApp.set(it.app, (e.perApp.get(it.app) ?? 0) + it.value);
    m.set(it.key, e);
  }
  return [...m.values()]
    .map((e) => ({
      code: e.code,
      name: e.name,
      value: e.value,
      apps: [...e.perApp.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id),
    }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function sumRows<K extends string>(rowsIn: { key: string; value: number }[], keyName: K): ({ [P in K]: string } & { value: number })[] {
  const m = new Map<string, number>();
  for (const r of rowsIn) m.set(r.key, (m.get(r.key) ?? 0) + r.value);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, value]) => ({ [keyName]: k, value }) as { [P in K]: string } & { value: number });
}

export function familyAudience(apps: AppSnapshot[]): FamilyAudience {
  const aud = apps.map((a) => ({ app: a, d: okData(a.audience) })).filter((x): x is { app: AppSnapshot; d: AudiencePart } => x.d !== null);
  const store = apps
    .map((a) => ({ app: a, c: okData(a.downloads)?.countries30d ?? null }))
    .filter((x): x is { app: AppSnapshot; c: CountryCount[] } => x.c !== null);

  const countries = sumByKey(
    aud.flatMap(({ app, d }) =>
      d.countries.map((c) => ({
        key: c.code ?? `?${c.name}`,
        code: c.code,
        name: c.name,
        value: c.activeUsers,
        app: app.id,
      })),
    ),
  );
  const devices = sumRows(
    aud.flatMap(({ d }) => d.devices.map((x) => ({ key: x.category, value: x.activeUsers }))),
    'category',
  );
  const withDemo = aud.filter(({ d }) => d.demographics.available);

  return {
    reporting: aud.length,
    countries,
    visitors: devices.reduce((a, x) => a + x.value, 0),
    devices,
    deviceShare: aud.map(({ app, d }) => ({
      id: app.id,
      name: app.name,
      visitors: d.devices.reduce((a, x) => a + x.activeUsers, 0),
      mobile: d.devices.filter((x) => x.category === 'mobile').reduce((a, x) => a + x.activeUsers, 0),
    })),
    demographics: {
      availableApps: withDemo.length,
      age: sumRows(
        withDemo.flatMap(({ d }) =>
          d.demographics.age.map((x) => ({
            key: x.bracket,
            value: x.activeUsers,
          })),
        ),
        'bracket',
      ).sort((a, b) => a.bracket.localeCompare(b.bracket)),
      gender: sumRows(
        withDemo.flatMap(({ d }) =>
          d.demographics.gender.map((x) => ({
            key: x.gender,
            value: x.activeUsers,
          })),
        ),
        'gender',
      ),
    },
    storeCountries: sumByKey(
      store.flatMap(({ app, c }) =>
        c.map((x) => ({
          key: x.country,
          code: x.country,
          name: x.country,
          value: x.downloads,
          app: app.id,
        })),
      ),
    ),
    storeReporting: store.length,
  };
}
