/**
 * Google Play's own download reports, folded into the figures /admin/apps
 * shows. Pure: the fetching is in play-console.ts.
 *
 *   installs          — `installs_<package>_<YYYYMM>_overview.csv`: one row a day,
 *                       however many countries. Read here as Android downloads,
 *                       so the family page no longer waits on each sibling app's
 *                       own store-stats sync to see them.
 *   store_performance — `store_performance_<package>_<YYYYMM>_country.csv`: store
 *                       listing visitors and the installs they led to, per country
 *                       per day. Android's counterpart of the App Store listing
 *                       conversion (listing-summary.ts).
 *
 * Windows match the rest of the dashboard: the 14 complete UTC days ending
 * yesterday (this week against the one before), so Android lines up with iOS.
 * Play writes its reports a couple of days late, so the newest days can read
 * 0 until it catches up; `latestDate` says how far the report goes.
 */

import { splitCsvLine } from '@/lib/store-stats/google';
import { utcDay } from '@/lib/store-stats/summary';
import { pctDelta, type PlayInstalls, type PlayListing } from './family';

const count = (cell: string | undefined): number | null => {
  const n = Number.parseInt((cell ?? '').replace(/,/g, ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** The header → column index for the names given, or null when the date column is missing. */
function columns(csv: string, names: Record<string, string>): { idx: Record<string, number>; rows: string[][] } | null {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return null;
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, header.indexOf(name)]));
  if (idx.date === -1) return null;
  return { idx, rows: lines.slice(1).map(splitCsvLine) };
}

// ─── Installs ────────────────────────────────────────────────────────

export interface InstallRow {
  date: string;
  /** People who installed that day (a person on two devices counts once). */
  installs: number;
  uninstalls: number;
  /** Devices with the app installed at the end of that day; null when the report has no such column. */
  activeDevices: number | null;
}

export function parseInstallsOverviewCsv(csv: string): InstallRow[] {
  const parsed = columns(csv, {
    date: 'Date',
    users: 'Daily User Installs',
    devices: 'Daily Device Installs',
    uninstalls: 'Daily Device Uninstalls',
    active: 'Active Device Installs',
  });
  if (!parsed || (parsed.idx.users === -1 && parsed.idx.devices === -1)) return [];
  const { idx } = parsed;
  return parsed.rows
    .flatMap((cells): InstallRow[] => {
      const date = cells[idx.date]?.trim();
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
      // Users, as the sibling apps' sync counts them; devices when the report has no user column
      const installs = count(cells[idx.users === -1 ? idx.devices : idx.users]);
      if (installs === null) return [];
      return [
        {
          date,
          installs,
          uninstalls: idx.uninstalls === -1 ? 0 : (count(cells[idx.uninstalls]) ?? 0),
          activeDevices: idx.active === -1 ? null : count(cells[idx.active]),
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** This week's and last week's installs, the 14 days between, and how many devices have it now. Null with no rows. */
export function summariseInstalls(unsorted: InstallRow[], now: Date): PlayInstalls | null {
  if (unsorted.length === 0) return null;
  // Months arrive newest first and a report's own order is not promised: "latest" must mean latest
  const rows = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));
  const days = Array.from({ length: 14 }, (_, i) => utcDay(now, 14 - i));
  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(r.date, (perDay.get(r.date) ?? 0) + r.installs);
  const daily = days.map((d) => perDay.get(d) ?? 0);
  const previous = daily.slice(0, 7).reduce((a, n) => a + n, 0);
  const value = daily.slice(7).reduce((a, n) => a + n, 0);
  const latest = rows[rows.length - 1];
  const lastWeek = days.slice(7);
  return {
    downloads: { value, previous, delta: pctDelta(value, previous), daily },
    latestDate: latest.date,
    activeDevices: [...rows].reverse().find((r) => r.activeDevices !== null)?.activeDevices ?? null,
    uninstalls7d: rows.filter((r) => lastWeek.includes(r.date)).reduce((a, r) => a + r.uninstalls, 0),
  };
}

// ─── Store listing ───────────────────────────────────────────────────

export interface ListingRow {
  date: string;
  visitors: number;
  acquisitions: number;
}

/** The country report's rows, summed per day. */
export function parseStorePerformanceCsv(csv: string): ListingRow[] {
  const parsed = columns(csv, { date: 'Date', visitors: 'Store listing visitors', acquisitions: 'Store listing acquisitions' });
  if (!parsed || parsed.idx.visitors === -1 || parsed.idx.acquisitions === -1) return [];
  const { idx } = parsed;
  const perDay = new Map<string, ListingRow>();
  for (const cells of parsed.rows) {
    const date = cells[idx.date]?.trim();
    const visitors = count(cells[idx.visitors]);
    const acquisitions = count(cells[idx.acquisitions]);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || visitors === null || acquisitions === null) continue;
    const day = perDay.get(date) ?? { date, visitors: 0, acquisitions: 0 };
    day.visitors += visitors;
    day.acquisitions += acquisitions;
    perDay.set(date, day);
  }
  return [...perDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const LISTING_DAYS = 28;

/** Visitors and the installs they led to over the 28 complete days ending yesterday. Null with no rows. */
export function summariseListing(unsorted: ListingRow[], now: Date): PlayListing | null {
  if (unsorted.length === 0) return null;
  const rows = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));
  const from = utcDay(now, LISTING_DAYS);
  const to = utcDay(now, 1);
  const inWindow = rows.filter((r) => r.date >= from && r.date <= to);
  const visitors = inWindow.reduce((a, r) => a + r.visitors, 0);
  const acquisitions = inWindow.reduce((a, r) => a + r.acquisitions, 0);
  return {
    days: LISTING_DAYS,
    visitors,
    acquisitions,
    // As a percentage to 1 dp, as listing-summary.ts rounds iOS; null with nobody to divide by
    conversion: visitors === 0 ? null : Math.round((acquisitions / visitors) * 1000) / 10,
    latestDate: rows[rows.length - 1].date,
  };
}
