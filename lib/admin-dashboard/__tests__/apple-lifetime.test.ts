/**
 * @jest-environment node
 */
import { gzipSync } from 'node:zlib';
import { generateKeyPairSync } from 'node:crypto';
import { lifetimePeriods, fetchAppleLifetime } from '../apple-lifetime';
import { parseFirstTimeByApp, type AppleConfig } from '@/lib/store-stats/apple';
import { FAMILY_APPS, familyTotals, readAppSummary, withAppleLifetime, type AppSnapshot } from '../family';

const report = (rows: [string, string, number][]) =>
  ['Provider\tProduct Type Identifier\tUnits\tApple Identifier\tCountry Code', ...rows.map(([id, type, units]) => `APPLE\t${type}\t${units}\t${id}\tGB`)].join('\n');

describe('parseFirstTimeByApp', () => {
  it('adds first-time downloads per Apple id, across every app in the report', () => {
    const tsv = report([
      ['111', '1', 4],
      ['111', '1F', 2],
      ['222', '1T', 5],
      ['111', '3', 9], // a re-download
      ['111', '7', 30], // an update
      ['222', 'IA1', 1], // an in-app purchase
    ]);
    expect([...parseFirstTimeByApp(tsv)]).toEqual([
      ['111', 6],
      ['222', 5],
    ]);
  });

  it('reads an empty or unrecognised report as nothing', () => {
    expect(parseFirstTimeByApp('').size).toBe(0);
    expect(parseFirstTimeByApp('Provider\tUnits\n').size).toBe(0);
  });
});

describe('lifetimePeriods', () => {
  const ids = (now: string, published: boolean) => lifetimePeriods(new Date(now), published).map(([f, d]) => `${f} ${d}`);

  it('asks for completed months monthly and this month so far daily', () => {
    const p = ids('2026-03-04T10:00:00Z', true);
    expect(p.slice(0, 2)).toEqual(['MONTHLY 2026-01', 'MONTHLY 2026-02']);
    expect(p.slice(2)).toEqual(['DAILY 2026-03-01', 'DAILY 2026-03-02', 'DAILY 2026-03-03']);
  });

  it('falls back to days for the last completed month when Apple has not published its monthly report', () => {
    const p = ids('2026-03-04T10:00:00Z', false);
    expect(p.filter((x) => x.startsWith('MONTHLY'))).toEqual(['MONTHLY 2026-01']);
    expect(p.filter((x) => x.startsWith('DAILY 2026-02'))).toHaveLength(28);
    expect(p.filter((x) => x.startsWith('DAILY 2026-03'))).toHaveLength(3);
  });

  it('counts nothing for today, which Apple has not written', () => {
    expect(ids('2026-10-01T00:30:00Z', true).filter((x) => x.startsWith('DAILY'))).toEqual([]);
  });

  it('adds a yearly report for each earlier year once a new one starts', () => {
    expect(ids('2027-01-05T10:00:00Z', true).slice(0, 2)).toEqual(['YEARLY 2026', 'DAILY 2027-01-01']);
  });
});

describe('fetchAppleLifetime', () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const config: AppleConfig = { keyId: 'K', issuerId: 'I', privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), vendorNumber: '1', appId: '111' };
  const gz = (rows: [string, string, number][]) => new Response(gzipSync(report(rows)));

  afterEach(() => jest.restoreAllMocks());

  it('adds every period for every app', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const q = new URL(String(input)).searchParams;
      return q.get('filter[frequency]') === 'MONTHLY' ? gz([['111', '1', 10], ['222', '1', 1]]) : gz([['111', '1', 1]]);
    });
    // 2026-03-04: Jan and Feb monthly, 1-3 March daily
    expect(await fetchAppleLifetime(config, new Date('2026-03-04T10:00:00Z'))).toEqual({ '111': 23, '222': 2 });
  });

  it('asks for version 1_1 of a daily report and 1_0 of a monthly or yearly one, as Apple requires', async () => {
    const urls: URL[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      urls.push(new URL(String(input)));
      return gz([['111', '1', 1]]);
    });
    await fetchAppleLifetime(config, new Date('2027-03-04T10:00:00Z'));
    const versionOf = (frequency: string) => [...new Set(urls.filter((u) => u.searchParams.get('filter[frequency]') === frequency).map((u) => u.searchParams.get('filter[version]')))];
    expect(versionOf('DAILY')).toEqual(['1_1']);
    expect(versionOf('MONTHLY')).toEqual(['1_0']);
    expect(versionOf('YEARLY')).toEqual(['1_0']);
  });

  it('counts a 404 as nothing sold, but fails the whole figure on any other error', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input) => (new URL(String(input)).searchParams.get('filter[frequency]') === 'MONTHLY' ? new Response('', { status: 404 }) : gz([['111', '1', 1]])));
    // Monthly reports 404: January is nothing sold, and February (not published yet) is read day by day: 28 + 3 days of March
    expect(await fetchAppleLifetime(config, new Date('2026-03-04T10:00:00Z'))).toEqual({ '111': 31 });

    fetchMock.mockImplementation(async (input) => (new URL(String(input)).searchParams.get('filter[reportDate]') === '2026-03-02' ? new Response('nope', { status: 403 }) : gz([['111', '1', 1]])));
    await expect(fetchAppleLifetime(config, new Date('2026-03-04T10:00:00Z'))).rejects.toThrow(/403/);
  });
});

describe('the all-time total', () => {
  const snapshot = (id: 'godaisy' | 'hungerford' | 'findr', total: number): AppSnapshot =>
    readAppSummary(FAMILY_APPS.find((a) => a.id === id)!, {
      storeDownloads: { ios: { value: total, previous: 0 } },
    });

  it('keeps the Apple id of every app in the family, each different', () => {
    const idsOf = FAMILY_APPS.map((a) => a.appleId);
    expect(idsOf.every(Boolean)).toBe(true);
    expect(new Set(idsOf).size).toBe(FAMILY_APPS.length);
  });

  it('leaves an app the report does not list as not reported, not zero', () => {
    const app = FAMILY_APPS.find((a) => a.id === 'godaisy')!;
    const s = snapshot('godaisy', 5);
    const before = s.downloads.state === 'ok' ? s.downloads.data.lifetime : 'unread';
    expect(before).toBeUndefined();
    expect(withAppleLifetime(s, app, { '999': 5 })).toBe(s);
    expect(familyTotals([withAppleLifetime(s, app, { '999': 5 })]).lifetime).toEqual({ value: 0, ios: 0, android: 0, apps: 0 });
  });

  it('adds iOS and Android across the apps that report either', () => {
    const go = FAMILY_APPS.find((a) => a.id === 'godaisy')!;
    const hung = FAMILY_APPS.find((a) => a.id === 'hungerford')!;
    const a = withAppleLifetime(snapshot('godaisy', 5), go, { [go.appleId!]: 120 });
    const b = withAppleLifetime(snapshot('hungerford', 5), hung, { [hung.appleId!]: 30 });
    expect(familyTotals([a, b]).lifetime).toEqual({ value: 150, ios: 150, android: 0, apps: 2 });
  });
});
