/**
 * @jest-environment node
 */
/**
 * Store download stats — parsers, token and dashboard summary. Ported from
 * Rise Daisy's suite (#867) with Go Daisy's ids.
 *
 * The fixtures follow the stores' documented formats. The first real sync is
 * still the real test: these parsers have not yet seen a live Go Daisy file.
 */

import { generateKeyPairSync } from 'node:crypto';
import { createAppleToken, getAppleConfig, parseAppleSalesReport } from '../apple';
import { decodePlayCsv, getGoogleConfig, parsePlayInstallsCsv } from '../google';
import { dateRange } from '../sync';
import { summariseStoreStats } from '../summary';
import { storeStatsAppId } from '../types';

const APP_ID = '6755695873';

describe('parseAppleSalesReport', () => {
  const header = 'Provider\tProduct Type Identifier\tUnits\tApple Identifier\tCountry Code\tBegin Date';
  const row = (type: string, units: number, id: string, country: string) => `APPLE\t${type}\t${units}\t${id}\t${country}\t10/26/2026`;

  it('sums first-time downloads and re-downloads per country', () => {
    const rows = parseAppleSalesReport(
      [header, row('1F', 5, APP_ID, 'GB'), row('1F', 2, APP_ID, 'GB'), row('3F', 1, APP_ID, 'GB'), row('1F', 4, APP_ID, 'ES')].join('\n'),
      APP_ID,
      '2026-10-26',
    );
    expect(rows.find((r) => r.country === 'GB')).toMatchObject({ downloads: 7, redownloads: 1, platform: 'ios' });
    expect(rows.find((r) => r.country === 'ES')?.downloads).toBe(4);
  });

  it('ignores updates, other apps (Rise Daisy) and in-app purchases', () => {
    const rows = parseAppleSalesReport(
      [header, row('7F', 50, APP_ID, 'GB'), row('1F', 9, '6761378447', 'GB'), row('IA1', 3, APP_ID, 'GB')].join('\n'),
      APP_ID,
      '2026-10-26',
    );
    expect(rows).toHaveLength(0);
  });

  it('handles bad countries, empty reports and unknown headers', () => {
    expect(parseAppleSalesReport(`${header}\n${row('1F', 2, APP_ID, '??')}`, APP_ID, '2026-10-26')[0]?.country).toBe('ZZ');
    expect(parseAppleSalesReport('', APP_ID, '2026-10-26')).toHaveLength(0);
    expect(parseAppleSalesReport('a\tb\n1\t2', APP_ID, '2026-10-26')).toHaveLength(0);
  });
});

describe('createAppleToken', () => {
  it('signs an ES256 JWT Apple accepts', () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const token = createAppleToken({
      keyId: 'KEY123',
      issuerId: 'issuer-1',
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      vendorNumber: '1',
      appId: APP_ID,
    });
    const [h, p, sig] = token.split('.');
    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(header).toMatchObject({ alg: 'ES256', kid: 'KEY123' });
    expect(payload).toMatchObject({ iss: 'issuer-1', aud: 'appstoreconnect-v1' });
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(20 * 60);
    expect(Buffer.from(sig, 'base64url')).toHaveLength(64);
  });
});

describe('config defaults', () => {
  it('defaults to Go Daisy on both stores', () => {
    const apple = getAppleConfig({
      APP_STORE_CONNECT_KEY_ID: 'k',
      APP_STORE_CONNECT_ISSUER_ID: 'i',
      APP_STORE_CONNECT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nx',
      APP_STORE_VENDOR_NUMBER: 'v',
    });
    expect(apple?.appId).toBe(APP_ID);
    expect(apple?.privateKey).toContain('\n');

    const creds = Buffer.from(JSON.stringify({ client_email: 'sa@x', private_key: 'k' })).toString('base64');
    const google = getGoogleConfig({ GOOGLE_PLAY_REPORTS_CREDENTIALS: creds, GOOGLE_PLAY_REPORTS_BUCKET: 'gs://pubsite_prod_1/' });
    expect(google?.packageName).toBe('io.godaisy.app');
    expect(google?.bucket).toBe('pubsite_prod_1');
    expect(storeStatsAppId({})).toBe('go_daisy');
    expect(storeStatsAppId({ METRICS_APP_ID: 'grow_daisy' })).toBe('grow_daisy');
  });

  it('is null when unset and throws when the Play key is unreadable', () => {
    expect(getAppleConfig({})).toBeNull();
    expect(getGoogleConfig({})).toBeNull();
    expect(() =>
      getGoogleConfig({ GOOGLE_PLAY_REPORTS_CREDENTIALS: Buffer.from('{}').toString('base64'), GOOGLE_PLAY_REPORTS_BUCKET: 'b' }),
    ).toThrow(/client_email/);
  });
});

describe('parsePlayInstallsCsv', () => {
  const csv = [
    'Date,Package Name,Country,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,Daily User Installs,Daily User Uninstalls',
    '2026-10-25,io.godaisy.app,GB,4,1,0,100,3,1',
    '2026-10-25,io.godaisy.app,ES,2,0,0,50,2,0',
    '2026-10-26,io.godaisy.app,,1,2,0,150,1,2',
  ].join('\n');

  it('prefers user installs and maps blank countries to ZZ', () => {
    const rows = parsePlayInstallsCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ platform: 'android', country: 'GB', downloads: 3, uninstalls: 1 });
    expect(rows[2].country).toBe('ZZ');
  });

  it('decodes UTF-16LE with a BOM and falls back to device installs', () => {
    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(csv, 'utf16le')]);
    expect(parsePlayInstallsCsv(decodePlayCsv(utf16))).toHaveLength(3);
    expect(parsePlayInstallsCsv('Date,Country,Daily Device Installs\n2026-10-25,FR,6')[0]?.downloads).toBe(6);
  });
});

describe('dateRange', () => {
  it('returns the last complete days, oldest first, never today', () => {
    expect(dateRange(3, new Date('2026-10-27T07:00:00Z'))).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
  });
});

describe('summariseStoreStats', () => {
  const now = new Date('2026-10-27T07:00:00Z');
  const base = { country: 'GB', redownloads: 0, uninstalls: 0 };

  it('compares the last 7 complete days with the 7 before', () => {
    const data = summariseStoreStats(
      [
        { ...base, stat_date: '2026-10-26', platform: 'ios', downloads: 10 },
        { ...base, stat_date: '2026-10-25', platform: 'ios', downloads: 10, country: 'IE' },
        { ...base, stat_date: '2026-10-15', platform: 'ios', downloads: 10, redownloads: 2 },
        { ...base, stat_date: '2026-10-26', platform: 'android', downloads: 3, uninstalls: 1 },
        { ...base, stat_date: '2026-10-27', platform: 'android', downloads: 99, uninstalls: 99 },
      ],
      now,
    );
    expect(data.hasData).toBe(true);
    expect(data.latestDate).toBe('2026-10-27');
    expect(data.ios).toMatchObject({ week: 20, previousWeek: 10, delta: 100, total30d: 30, redownloads30d: 2 });
    expect(data.ios.sparkline).toHaveLength(14);
    expect(data.ios.sparkline[13].date).toBe('2026-10-26');
    expect(data.ios.topCountries[0]).toEqual({ country: 'GB', downloads: 20 });
    // A row dated today is not counted
    expect(data.android).toMatchObject({ week: 3, uninstalls7d: 1, total30d: 3, delta: null });
  });

  it('is empty with no rows', () => {
    const empty = summariseStoreStats([], now);
    expect(empty).toMatchObject({ hasData: false, latestDate: null });
    expect(empty.ios.week).toBe(0);
  });
});
