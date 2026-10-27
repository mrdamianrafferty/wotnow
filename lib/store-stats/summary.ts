/**
 * Fold raw store_stats_daily rows into the numbers /admin/dashboard shows.
 * Pure, so it is tested without a database.
 */

export interface StoreStatInput {
  stat_date: string;
  platform: string;
  country: string;
  downloads: number;
  redownloads: number;
  uninstalls: number;
}

export interface CountryDownloads {
  country: string; // two-letter store region
  downloads: number;
}

export interface PlatformDownloads {
  /** Last 7 complete days */
  week: number;
  /** The 7 days before that */
  previousWeek: number;
  /** Percentage change, null when the previous week was zero */
  delta: number | null;
  /** 14 daily values, oldest first; the last is yesterday (UTC) */
  sparkline: { date: string; downloads: number }[];
  total30d: number;
  redownloads30d: number; // iOS only
  uninstalls7d: number; // Android only
  topCountries: CountryDownloads[];
}

export interface StoreDownloadsSummary {
  ios: PlatformDownloads;
  android: PlatformDownloads;
  hasData: boolean;
  /** Newest day any store has reported */
  latestDate: string | null;
}

export function utcDay(now: Date, daysBack: number): string {
  return new Date(now.getTime() - daysBack * 86_400_000).toISOString().slice(0, 10);
}

function summarisePlatform(rows: StoreStatInput[], now: Date): PlatformDownloads {
  // Stores report whole days, so the newest complete day is yesterday (UTC).
  const days = Array.from({ length: 14 }, (_, i) => utcDay(now, 14 - i));
  const perDay = new Map<string, number>();
  const perCountry = new Map<string, number>();
  const oldest30 = utcDay(now, 30);
  let total30d = 0;
  let redownloads30d = 0;
  let uninstalls7d = 0;

  for (const r of rows) {
    perDay.set(r.stat_date, (perDay.get(r.stat_date) ?? 0) + r.downloads);
    if (r.stat_date >= oldest30 && r.stat_date <= days[13]) {
      total30d += r.downloads;
      redownloads30d += r.redownloads;
      perCountry.set(r.country, (perCountry.get(r.country) ?? 0) + r.downloads);
    }
    if (r.stat_date >= days[7] && r.stat_date <= days[13]) uninstalls7d += r.uninstalls;
  }

  const sparkline = days.map((date) => ({ date, downloads: perDay.get(date) ?? 0 }));
  const previousWeek = sparkline.slice(0, 7).reduce((a, d) => a + d.downloads, 0);
  const week = sparkline.slice(7).reduce((a, d) => a + d.downloads, 0);

  return {
    week,
    previousWeek,
    delta: previousWeek === 0 ? null : Math.round(((week - previousWeek) / previousWeek) * 100),
    sparkline,
    total30d,
    redownloads30d,
    uninstalls7d,
    topCountries: [...perCountry.entries()]
      .filter(([country, downloads]) => country !== 'ZZ' && downloads > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([country, downloads]) => ({ country, downloads })),
  };
}

export function summariseStoreStats(rows: StoreStatInput[], now = new Date()): StoreDownloadsSummary {
  return {
    ios: summarisePlatform(rows.filter((r) => r.platform === 'ios'), now),
    android: summarisePlatform(rows.filter((r) => r.platform === 'android'), now),
    hasData: rows.length > 0,
    latestDate: rows.reduce<string | null>((latest, r) => (latest === null || r.stat_date > latest ? r.stat_date : latest), null),
  };
}
