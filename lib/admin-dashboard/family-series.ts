/**
 * Daily series for /admin/apps' sparklines and the stacked downloads chart,
 * built from the `daily` arrays each app already sends with its 7-day trends
 * (oldest first, 14 days). Pure, so the same summary always draws the same
 * lines.
 *
 * Series only add up day by day when they cover the same days, so a sum
 * takes the apps whose series has the most common length and leaves the rest
 * out, and says how many it used.
 */

import type { AppSnapshot, Part, Trend } from './family';

const okData = <T>(p: Part<T>): T | null => (p.state === 'ok' ? p.data : null);

export interface SummedSeries {
  daily: number[];
  /** Apps whose series went into the sum. */
  apps: number;
}

/** Sums equal-length series; the most common length wins. Empty when no series has two or more days. */
export function sumSeries(series: (number[] | null | undefined)[]): SummedSeries {
  const usable = series.filter((s): s is number[] => Array.isArray(s) && s.length >= 2);
  if (!usable.length) return { daily: [], apps: 0 };
  const counts = new Map<number, number>();
  for (const s of usable) counts.set(s.length, (counts.get(s.length) ?? 0) + 1);
  const len = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const same = usable.filter((s) => s.length === len);
  return { daily: Array.from({ length: len }, (_, i) => same.reduce((a, s) => a + (s[i] ?? 0), 0)), apps: same.length };
}

const trendDaily = (t: Trend | null | undefined) => (t && t.daily.length >= 2 ? t.daily : null);

/** Each app's daily first-time downloads (iOS + Android), or null when it sends no series. */
export function appDownloadsDaily(app: AppSnapshot): number[] | null {
  return trendDaily(okData(app.downloads)?.total);
}

/** Each app's daily active users as GA4 counts them (raw, before any country is left out). */
export function appUsersDaily(app: AppSnapshot): number[] | null {
  return trendDaily(okData(app.analytics)?.activeUsers);
}

export function appErrorsDaily(app: AppSnapshot): number[] | null {
  return trendDaily(okData(app.health)?.errors);
}

/**
 * App Store listing conversion over a rolling window, summed across apps by
 * date (views and downloads, never an average of rates). Null where a window
 * has no views.
 */
export function listingConversionDaily(apps: AppSnapshot[], window = 7): (number | null)[] {
  const byDate = new Map<string, { views: number; downloads: number }>();
  for (const a of apps) {
    const l = a.storeListing ? okData(a.storeListing) : null;
    for (const d of l?.daily ?? []) {
      const t = byDate.get(d.date) ?? { views: 0, downloads: 0 };
      byDate.set(d.date, { views: t.views + d.productPageViews, downloads: t.downloads + d.productPageDownloads });
    }
  }
  const days = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map((e) => e[1]);
  const out: (number | null)[] = [];
  for (let i = window - 1; i < days.length; i++) {
    const slice = days.slice(i - window + 1, i + 1);
    const views = slice.reduce((a, d) => a + d.views, 0);
    const dls = slice.reduce((a, d) => a + d.downloads, 0);
    out.push(views > 0 ? (dls / views) * 100 : null);
  }
  return out;
}

/** The newest day any app's store figures reach (YYYY-MM-DD), or null when none says. */
export function latestStoreDate(apps: AppSnapshot[]): string | null {
  const dates = apps.map((a) => okData(a.downloads)?.latestDate ?? null).filter((d): d is string => !!d);
  return dates.length ? dates.sort()[dates.length - 1] : null;
}

export interface StackedDay {
  /** Index into the series, oldest first. */
  index: number;
  total: number;
  segments: { id: AppSnapshot['id']; name: string; color: string; value: number }[];
}

/** One stacked bar per day: each app's downloads that day, in the apps' order. Apps without a series of the common length are left out. */
export function stackedDownloads(apps: AppSnapshot[]): { days: StackedDay[]; apps: { id: AppSnapshot['id']; name: string; color: string; total: number }[]; left: string[] } {
  const withSeries = apps.map((a) => ({ a, s: appDownloadsDaily(a) }));
  const { daily } = sumSeries(withSeries.map((x) => x.s));
  const len = daily.length;
  const used = withSeries.filter((x): x is { a: AppSnapshot; s: number[] } => !!x.s && x.s.length === len);
  const left = withSeries.filter((x) => okData(x.a.downloads) && (!x.s || x.s.length !== len)).map((x) => x.a.name);
  const days = Array.from({ length: len }, (_, i) => {
    const segments = used.map(({ a, s }) => ({ id: a.id, name: a.name, color: a.color, value: s[i] ?? 0 })).filter((g) => g.value > 0);
    return { index: i, total: segments.reduce((t, g) => t + g.value, 0), segments };
  });
  const totals = used
    .map(({ a, s }) => ({ id: a.id, name: a.name, color: a.color, total: s.reduce((t, v) => t + v, 0) }))
    .sort((x, y) => y.total - x.total);
  return { days, apps: totals, left };
}
