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

export type FamilyAppId = 'godaisy' | 'risedaisy' | 'findr' | 'flycast' | 'grewp';

export interface FamilyApp {
  id: FamilyAppId;
  name: string;
  /** METRICS_<envKey>_URL / METRICS_<envKey>_TOKEN */
  envKey: string;
  /** One colour per app, used everywhere the app appears. */
  color: string;
}

export const FAMILY_APPS: FamilyApp[] = [
  { id: 'godaisy', name: 'Go Daisy', envKey: 'GODAISY', color: '#0891b2' },
  { id: 'risedaisy', name: 'Rise Daisy', envKey: 'RISEDAISY', color: '#d97706' },
  { id: 'findr', name: 'Findr', envKey: 'FINDR', color: '#2563eb' },
  { id: 'flycast', name: 'Fly Cast', envKey: 'FLYCAST', color: '#7c3aed' },
  { id: 'grewp', name: 'Grewp', envKey: 'GREWP', color: '#059669' },
];

/** A 7-day count against the 7 days before; `daily` oldest first when known. */
export interface Trend {
  value: number;
  previous: number;
  delta: number | null;
  daily: number[];
}

export type Part<T> =
  | { state: 'ok'; data: T }
  | { state: 'not_configured'; missing: string[]; note?: string }
  | { state: 'error'; message: string };

export interface DownloadsPart {
  ios: Trend | null;
  android: Trend | null;
  total: Trend;
  latestDate: string | null;
}

export interface RevenuePart {
  source: string;
  currency: string | null;
  mrr: number | null;
  activeSubscriptions: number | null;
  activeTrials: number | null;
  revenue28d: number | null;
}

export interface AnalyticsPart {
  activeUsers: Trend | null;
  sessions: Trend | null;
  pageViews: Trend | null;
}

export interface HealthPart {
  errors: Trend | null;
  crashFreeRate: number | null;
  /** Unresolved issues the app reported (its top list, so a floor, not a census). */
  topIssues: number;
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
  downloads: Part<DownloadsPart>;
  revenue: Part<RevenuePart>;
  analytics: Part<AnalyticsPart>;
  health: Part<HealthPart>;
}

export interface FamilyTotals {
  downloads: Trend & { apps: number };
  /** MRR is only summed within a currency; the one most apps report in first. */
  mrr: { currency: string; value: number; apps: number }[];
  activeSubscriptions: { value: number; apps: number };
  activeTrials: { value: number; apps: number };
  /** Summed per app, so a person using two apps counts twice. */
  activeUsers: Trend & { apps: number };
  errors: Trend & { apps: number };
  /** Each reporting app's share of the family's downloads this week. */
  downloadShare: { id: FamilyAppId; name: string; color: string; value: number }[];
}

export interface FamilySummary {
  generatedAt: string;
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
  const daily = rawDaily
    .map((d) => (isObj(d) ? (num(d.downloads) ?? num(d.value)) : num(d)))
    .filter((d): d is number => d !== null);
  return { value, previous, delta: pctDelta(value, previous), daily };
}

/** Section, {configured:false}, or bare data → the data, or why there is none. */
function readSection(v: unknown): Part<Obj> {
  if (v === undefined || v === null) return { state: 'not_configured', missing: [], note: 'Not reported by this app' };
  if (!isObj(v)) return { state: 'error', message: 'Unreadable response' };
  if (v.configured === false) return { state: 'not_configured', missing: strings(v.missing) };
  if (v.state === 'not_configured') {
    return { state: 'not_configured', missing: strings(v.missing), ...(str(v.hint) ? { note: str(v.hint)! } : {}) };
  }
  if (v.state === 'error') return { state: 'error', message: cleanMessage(str(v.message) ?? 'Source error') };
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
  return { ios, android, total: sumTrends(present), latestDate: str(d.latestDate) };
}

export function readRevenue(d: Obj): RevenuePart | null {
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
  return part.mrr === null && part.activeSubscriptions === null && part.activeTrials === null && part.revenue28d === null ? null : part;
}

export function readAnalytics(d: Obj): AnalyticsPart | null {
  const part = { activeUsers: readTrend(d.activeUsers), sessions: readTrend(d.sessions), pageViews: readTrend(d.pageViews) };
  return part.activeUsers || part.sessions || part.pageViews ? part : null;
}

export function readHealth(d: Obj): HealthPart | null {
  const errors = readTrend(d.errors) ?? readTrend(d.errorCount);
  const rate = num(d.crashFreeRate);
  const topIssues = Array.isArray(d.topIssues) ? d.topIssues.length : 0;
  if (!errors && rate === null && !Array.isArray(d.topIssues)) return null;
  return { errors, crashFreeRate: rate, topIssues };
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
  };
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
    revenue: mapPart(readSection(body.revenue), readRevenue),
    analytics: mapPart(readSection(body.analytics), readAnalytics),
    health: mapPart(readSection(body.platformHealth), readHealth),
  };
}

// ─── Family totals ───────────────────────────────────────────────────

const okData = <T>(p: Part<T>): T | null => (p.state === 'ok' ? p.data : null);

export function familyTotals(apps: AppSnapshot[]): FamilyTotals {
  const dl = apps.map((a) => ({ app: a, d: okData(a.downloads) })).filter((x): x is { app: AppSnapshot; d: DownloadsPart } => x.d !== null);
  const rev = apps.map((a) => okData(a.revenue)).filter((r): r is RevenuePart => r !== null);
  const users = apps.map((a) => okData(a.analytics)?.activeUsers ?? null).filter((t): t is Trend => t !== null);
  const errs = apps.map((a) => okData(a.health)?.errors ?? null).filter((t): t is Trend => t !== null);

  const mrr = new Map<string, { value: number; apps: number }>();
  for (const r of rev) {
    if (r.mrr === null || !r.currency) continue;
    const m = mrr.get(r.currency) ?? { value: 0, apps: 0 };
    mrr.set(r.currency, { value: Math.round((m.value + r.mrr) * 100) / 100, apps: m.apps + 1 });
  }
  const count = (field: 'activeSubscriptions' | 'activeTrials') => {
    const vals = rev.map((r) => r[field]).filter((n): n is number => n !== null);
    return { value: vals.reduce((a, b) => a + b, 0), apps: vals.length };
  };

  return {
    downloads: { ...sumTrends(dl.map((x) => x.d.total)), apps: dl.length },
    mrr: [...mrr.entries()].map(([currency, m]) => ({ currency, ...m })).sort((a, b) => b.apps - a.apps || b.value - a.value),
    activeSubscriptions: count('activeSubscriptions'),
    activeTrials: count('activeTrials'),
    activeUsers: { ...sumTrends(users), apps: users.length },
    errors: { ...sumTrends(errs), apps: errs.length },
    downloadShare: dl
      .filter((x) => x.d.total.value > 0)
      .map((x) => ({ id: x.app.id, name: x.app.name, color: x.app.color, value: x.d.total.value }))
      .sort((a, b) => b.value - a.value),
  };
}
