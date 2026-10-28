/**
 * @jest-environment node
 */
/**
 * Play's installs and store-listing reports as the family page's Android
 * downloads and listing conversion: parsing, windows, and how the installs
 * replace an app's Android downloads without touching its iOS.
 */

import { deriveAttention } from '../attention';
import { FAMILY_APPS, familyTotals, withPlayDownloads, type AppSnapshot, type PlayInstalls } from '../family';
import { sampleFamilySummary } from '../family-sample';
import { parseInstallsOverviewCsv, parseStorePerformanceCsv, summariseInstalls, summariseListing } from '../play-reports';

const now = new Date('2026-10-28T10:00:00Z');
const HEADER =
  'Date,Package name,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,Daily User Installs,Daily User Uninstalls,Active Device Installs,Install events,Update events,Uninstall events';
const csv = (...rows: string[]) => [HEADER, ...rows].join('\n');

describe('installs report', () => {
  it('reads users who installed (not devices), uninstalls and active devices, by header', () => {
    const rows = parseInstallsOverviewCsv(csv('2026-10-21,p,1,0,0,0,2,0,3,1,0,0', '2026-10-23,p,0,1,0,0,0,1,4,0,0,1', 'x,p,1,1,1,1,1,1,1,1,1,1'));
    expect(rows).toEqual([
      { date: '2026-10-21', installs: 2, uninstalls: 0, activeDevices: 3 },
      { date: '2026-10-23', installs: 0, uninstalls: 1, activeDevices: 4 },
    ]);
  });

  it('falls back to device installs, and reads nothing when the columns are not there', () => {
    expect(parseInstallsOverviewCsv('Date,Daily Device Installs\n2026-10-21,5')).toEqual([{ date: '2026-10-21', installs: 5, uninstalls: 0, activeDevices: null }]);
    expect(parseInstallsOverviewCsv('Date,Something\n2026-10-21,5')).toEqual([]);
    expect(parseInstallsOverviewCsv('')).toEqual([]);
  });

  it('is this week against the week before over the 14 days to yesterday, with the report’s own end date', () => {
    const s = summariseInstalls(parseInstallsOverviewCsv(csv('2026-10-14,p,0,0,0,0,3,0,5,0,0,0', '2026-10-22,p,0,0,0,0,2,0,9,0,0,0', '2026-10-23,p,0,2,0,0,4,0,11,0,0,0', '2026-10-01,p,0,0,0,0,50,0,1,0,0,0')), now)!;
    expect(s.downloads).toMatchObject({ value: 6, previous: 3, delta: 100 });
    expect(s.downloads.daily).toHaveLength(14);
    expect(s.downloads.daily[0]).toBe(3); // 14 Oct, the first day of the window
    expect(s.downloads.daily[8]).toBe(2); // 22 Oct
    expect(s).toMatchObject({ latestDate: '2026-10-23', activeDevices: 11, uninstalls7d: 2 });
  });

  it('takes the newest day from rows that arrive newest month first (September after October)', () => {
    const rows = parseInstallsOverviewCsv(csv('2026-10-22,p,0,0,0,0,2,0,10,0,0,0', '2026-10-23,p,0,0,0,0,0,0,11,0,0,0')).concat(parseInstallsOverviewCsv(csv('2026-09-30,p,0,0,0,0,1,0,8,0,0,0')));
    expect(summariseInstalls(rows, now)).toMatchObject({ latestDate: '2026-10-23', activeDevices: 11 });
    const listing = [{ date: '2026-10-20', visitors: 4, acquisitions: 1 }, { date: '2026-09-30', visitors: 9, acquisitions: 9 }];
    expect(summariseListing(listing, now)?.latestDate).toBe('2026-10-20');
  });

  it('is null with no rows, and counts the days Play has not written yet as zero', () => {
    expect(summariseInstalls([], now)).toBeNull();
    const s = summariseInstalls([{ date: '2026-10-14', installs: 1, uninstalls: 0, activeDevices: 1 }], now)!;
    expect(s.downloads.value).toBe(0);
    expect(s.downloads.previous).toBe(1);
  });
});

describe('store listing report', () => {
  const LIST =
    'Date,Package name,Country / region,Store listing acquisitions,Store listing visitors,Store listing conversion rate\n' +
    ['2026-10-20,p,GB,1,10,10.0', '2026-10-20,p,Other,0,5,0.0', '2026-10-22,p,GB,2,5,40.0', '2026-09-01,p,GB,9,9,100.0'].join('\n');

  it('sums the countries per day', () => {
    expect(parseStorePerformanceCsv(LIST)).toEqual([
      { date: '2026-09-01', visitors: 9, acquisitions: 9 },
      { date: '2026-10-20', visitors: 15, acquisitions: 1 },
      { date: '2026-10-22', visitors: 5, acquisitions: 2 },
    ]);
    expect(parseStorePerformanceCsv('Date,Store listing visitors\n2026-10-20,3')).toEqual([]);
  });

  it('is visitors and the installs they led to over the 28 days to yesterday, as a percentage to 1 dp', () => {
    expect(summariseListing(parseStorePerformanceCsv(LIST), now)).toEqual({ days: 28, visitors: 20, acquisitions: 3, conversion: 15, latestDate: '2026-10-22' });
    expect(summariseListing([{ date: '2026-10-20', visitors: 3, acquisitions: 1 }], now)?.conversion).toBe(33.3);
  });

  it('has no conversion with no visitors, and is null with no rows', () => {
    expect(summariseListing([{ date: '2026-10-20', visitors: 0, acquisitions: 0 }], now)?.conversion).toBeNull();
    expect(summariseListing([], now)).toBeNull();
  });
});

describe('Play installs as Android downloads', () => {
  const trend = (value: number, previous: number) => ({ value, previous, delta: previous ? Math.round(((value - previous) / previous) * 100) : null, daily: Array.from({ length: 14 }, (_, i) => (i === 13 ? value : 0)) });
  const installs = (value: number, previous: number): PlayInstalls => ({ downloads: trend(value, previous), latestDate: '2026-10-23', activeDevices: 5, uninstalls7d: 0 });
  const withoutPlay = () => sampleFamilySummary(now).apps;
  const find = (apps: AppSnapshot[], id: string) => apps.find((a) => a.id === id)!;

  it('replaces Android and keeps iOS, the regions and the later of the two end dates', () => {
    const before = find(withoutPlay(), 'godaisy');
    const own = before.downloads.state === 'ok' ? before.downloads.data : null;
    const after = withPlayDownloads(before, installs(7, 2));
    const dl = after.downloads.state === 'ok' ? after.downloads.data : null;
    expect(dl?.android).toMatchObject({ value: 7, previous: 2 });
    expect(dl?.ios).toEqual(own?.ios);
    expect(dl?.countries30d).toEqual(own?.countries30d);
    expect(dl?.total.value).toBe((own?.ios?.value ?? 0) + 7);
    expect(dl?.latestDate).toBe([own?.latestDate, '2026-10-23'].filter(Boolean).sort().pop());
  });

  it('gives an app whose own downloads could not be read its Android numbers alone', () => {
    const dead: AppSnapshot = { ...find(withoutPlay(), 'flycast'), downloads: { state: 'error', message: 'HTTP 404' } };
    const dl = withPlayDownloads(dead, installs(3, 1)).downloads;
    expect(dl).toMatchObject({ state: 'ok', data: { ios: null, android: { value: 3 }, total: { value: 3 } } });
  });

  it('lets the family totals and the Android-missing alert see them', () => {
    const base = sampleFamilySummary(now);
    const missing = (apps: AppSnapshot[]) => deriveAttention({ ...base, apps, totals: familyTotals(apps) }).some((i) => i.rule === 'android_missing');
    expect(missing(base.apps)).toBe(true);
    const apps = base.apps.map((a) => (a.id === 'risedaisy' ? withPlayDownloads(a, installs(2, 0)) : a));
    expect(missing(apps)).toBe(false);
    expect(familyTotals(apps).downloads.value).toBe(familyTotals(base.apps).downloads.value + 2);
  });

  it('is applied to every app in the sample that has installs', () => {
    const apps = sampleFamilySummary(now, { withPlay: true }).apps;
    for (const id of ['godaisy', 'risedaisy', 'findr']) {
      const dl = find(apps, id).downloads;
      expect(dl.state === 'ok' && dl.data.android?.value).toBeGreaterThan(0);
    }
    expect(FAMILY_APPS.length).toBeGreaterThan(3);
  });
});
