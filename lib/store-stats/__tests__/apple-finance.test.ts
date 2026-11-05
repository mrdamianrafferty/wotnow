/**
 * @jest-environment node
 */
/**
 * Apple finance reports — parser, fetch outcomes, period guess, the sync's
 * non-fatal statuses and the dashboard summary.
 *
 * The fixture is the real a real finance file (vendor number replaced) (Rise Daisy's three
 * subscription payments). No live Apple call has been made from here: the fetch
 * tests stub `fetch`.
 */

import { generateKeyPairSync } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fetchFinanceReport, findMismatches, fiscalPeriodOf, getAppleFinanceConfig, parseFinanceReport, recentFiscalPeriods, usDateToIso } from '../apple-finance';
import { summariseFinance } from '../finance-summary';
import { syncFinance } from '../finance-sync';

const HEADER = [
  'Transaction Date',
  'Settlement Date',
  'Apple Identifier',
  'SKU',
  'Title',
  'Developer Name',
  'Product Type Identifier',
  'Country of Sale',
  'Quantity',
  'Partner Share',
  'Extended Partner Share',
  'Partner Share Currency',
  'Customer Price',
  'Customer Currency',
  'Sale or Return',
  'Promo Code',
  'Order Type',
  'Region',
].join('\t');

const SAMPLE = [
  'Vendor Name\tFly Industries Ltd.',
  'Start Date\t08/30/2026',
  'End Date\t09/26/2026',
  HEADER,
  '08/31/2026\t09/01/2026\t6768055125\trd_pro_monthly\tRise Daisy Pro Supporter\t\tIAY\tGB\t1\t1.73\t1.73\tGBP\t2.990\tGBP\tS\t\t\t',
  '09/17/2026\t09/18/2026\t6768055125\trd_pro_monthly\tRise Daisy Pro Supporter\t\tIAY\tGB\t1\t1.73\t1.73\tGBP\t2.990\tGBP\tS\t\t\t',
  '09/23/2026\t09/24/2026\t6768055199\trd_pro_yearly\tRise Daisy Supporters\t\tIAY\tGB\t1\t14.49\t14.49\tGBP\t24.990\tGBP\tS\t\t\t',
  'Country Of Sale\tPartner Share Currency\tQuantity\tExtended Partner Share',
  'GB\tGBP\t3\t17.95',
].join('\n');

const REFUND_ROW = '09/25/2026\t09/26/2026\t6768055125\trd_pro_monthly\tRise Daisy Pro Supporter\t\tIAY\tGB\t-1\t-1.73\t-1.73\tGBP\t-2.990\tGBP\tR\t\t\t';
const withRefund = SAMPLE.replace('Country Of Sale', `${REFUND_ROW}\nCountry Of Sale`).replace('GB\tGBP\t3\t17.95', 'GB\tGBP\t2\t16.22');

describe('usDateToIso', () => {
  it('turns MM/DD/YYYY into an ISO date and rejects anything else', () => {
    expect(usDateToIso('08/30/2026')).toBe('2026-08-30');
    expect(usDateToIso('9/7/2026')).toBe('2026-09-07');
    expect(usDateToIso('2026-08-30')).toBeNull();
    expect(usDateToIso('')).toBeNull();
  });
});

describe('parseFinanceReport', () => {
  it('reads the period, the detail rows and the totals block from the real sample', () => {
    const r = parseFinanceReport(SAMPLE);
    expect(r).toMatchObject({ vendorName: 'Fly Industries Ltd.', startDate: '2026-08-30', endDate: '2026-09-26' });
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toMatchObject({
      transaction_date: '2026-08-31',
      settlement_date: '2026-09-01',
      apple_identifier: '6768055125',
      sku: 'rd_pro_monthly',
      title: 'Rise Daisy Pro Supporter',
      product_type: 'IAY',
      country: 'GB',
      quantity: 1,
      extended_partner_share: 1.73,
      partner_share_currency: 'GBP',
      customer_price: 2.99,
      sale_or_return: 'S',
    });
    expect(r.totals).toEqual([{ country: 'GB', currency: 'GBP', quantity: 3, extended_partner_share: 17.95 }]);
    expect(r.mismatches).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('gives identical rows distinct keys, and the same keys on a re-parse', () => {
    const r = parseFinanceReport(SAMPLE);
    // the two monthly rows differ by date, so make a true duplicate
    const dup = parseFinanceReport(SAMPLE.replace('09/17/2026\t09/18/2026', '08/31/2026\t09/01/2026'));
    expect(dup.rows[0].row_key).not.toBe(dup.rows[1].row_key);
    expect(dup.rows[0].row_key.split(':')[0]).toBe(dup.rows[1].row_key.split(':')[0]);
    expect(parseFinanceReport(SAMPLE).rows.map((x) => x.row_key)).toEqual(r.rows.map((x) => x.row_key));
    expect(new Set(r.rows.map((x) => x.row_key)).size).toBe(3);
  });

  it('keeps a refund as negative units and amounts and still matches the totals', () => {
    const r = parseFinanceReport(withRefund);
    const refund = r.rows.find((x) => x.sale_or_return === 'R');
    expect(refund).toMatchObject({ quantity: -1, extended_partner_share: -1.73 });
    expect(r.mismatches).toEqual([]);
  });

  it('flags a detail/totals mismatch', () => {
    const r = parseFinanceReport(SAMPLE.replace('GB\tGBP\t3\t17.95', 'GB\tGBP\t3\t19.95'));
    expect(r.mismatches).toEqual(['GBP: detail rows sum to 17.95 but the totals block says 19.95']);
    expect(parseFinanceReport(SAMPLE.replace('GB\tGBP\t3\t17.95', 'GB\tGBP\t4\t17.95')).mismatches[0]).toMatch(/quantity 3 but the totals block says 4/);
  });

  it('flags a missing totals block', () => {
    const r = parseFinanceReport(SAMPLE.split('Country Of Sale')[0]);
    expect(r.rows).toHaveLength(3);
    expect(r.mismatches[0]).toMatch(/No totals block/);
  });

  it('checks each currency on its own', () => {
    const rows = parseFinanceReport(SAMPLE).rows;
    const usd = { ...rows[0], partner_share_currency: 'USD', extended_partner_share: 2 };
    expect(
      findMismatches(
        [...rows, usd],
        [
          { country: 'GB', currency: 'GBP', quantity: 3, extended_partner_share: 17.95 },
          { country: 'US', currency: 'USD', quantity: 1, extended_partner_share: 2 },
        ],
      ),
    ).toEqual([]);
  });

  it('goes by header name: reordered, extra and missing columns, blank lines and CRLF', () => {
    const text = [
      'Vendor Name\tFly Industries Ltd.',
      'Start Date\t09/27/2026',
      'End Date\t10/31/2026',
      'SKU\tTransaction Date\tQuantity\tExtended Partner Share\tPartner Share Currency\tNew Apple Column',
      'rd_pro_monthly\t10/02/2026\t2\t3.46\tGBP\tsurprise',
      '',
      'Country Of Sale\tPartner Share Currency\tQuantity\tExtended Partner Share',
      'GB\tGBP\t2\t3.46',
      '',
    ].join('\r\n');
    const r = parseFinanceReport(text);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ sku: 'rd_pro_monthly', quantity: 2, extended_partner_share: 3.46, title: '', extra: { 'New Apple Column': 'surprise' } });
    expect(r.startDate).toBe('2026-09-27');
    expect(r.mismatches).toEqual([]);
  });

  it('returns nothing, not a throw, for an empty or headerless file', () => {
    expect(parseFinanceReport('').rows).toEqual([]);
    expect(parseFinanceReport('Vendor Name\tX\nStart Date\t08/30/2026').rows).toEqual([]);
  });
});

describe('getAppleFinanceConfig', () => {
  const { privateKey: statsPem } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const { privateKey: financePem } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = (k: typeof statsPem) => k.export({ type: 'pkcs8', format: 'pem' }).toString();
  const base = {
    APP_STORE_CONNECT_KEY_ID: 'STATS',
    APP_STORE_CONNECT_ISSUER_ID: 'ISS',
    APP_STORE_CONNECT_PRIVATE_KEY: pem(statsPem),
    APP_STORE_VENDOR_NUMBER: '12345678',
  };

  it('uses the Finance key pair when both are set, with the shared issuer and vendor', () => {
    const c = getAppleFinanceConfig({ ...base, APP_STORE_FINANCE_KEY_ID: 'FIN', APP_STORE_FINANCE_PRIVATE_KEY: pem(financePem) });
    expect(c).toMatchObject({ keyId: 'FIN', issuerId: 'ISS', vendorNumber: '12345678', privateKey: pem(financePem) });
  });

  it('falls back to the stats key when the Finance pair is unset or only half set', () => {
    expect(getAppleFinanceConfig(base)).toMatchObject({ keyId: 'STATS', privateKey: pem(statsPem) });
    expect(getAppleFinanceConfig({ ...base, APP_STORE_FINANCE_KEY_ID: 'FIN' })).toMatchObject({ keyId: 'STATS', privateKey: pem(statsPem) });
    expect(getAppleFinanceConfig({ ...base, APP_STORE_FINANCE_PRIVATE_KEY: pem(financePem) })).toMatchObject({ keyId: 'STATS' });
  });

  it('is null without the shared issuer or vendor number', () => {
    expect(getAppleFinanceConfig({ ...base, APP_STORE_VENDOR_NUMBER: undefined, APP_STORE_FINANCE_KEY_ID: 'FIN', APP_STORE_FINANCE_PRIVATE_KEY: pem(financePem) })).toBeNull();
  });
});

describe('fiscalPeriodOf', () => {
  it('maps a period’s end date to Apple’s fiscal year and month', () => {
    expect(fiscalPeriodOf('2026-09-26')).toEqual({ fiscalYear: 2026, fiscalPeriod: 12 });
    expect(fiscalPeriodOf('2026-10-31')).toEqual({ fiscalYear: 2027, fiscalPeriod: 1 });
    expect(fiscalPeriodOf('2027-01-30')).toEqual({ fiscalYear: 2027, fiscalPeriod: 4 });
  });
});

describe('recentFiscalPeriods', () => {
  it('maps the calendar month to Apple’s periods, October starting the next fiscal year', () => {
    expect(recentFiscalPeriods(new Date('2026-11-05T07:00:00Z'), 4)).toEqual([
      { fiscalYear: 2027, fiscalPeriod: 2 },
      { fiscalYear: 2027, fiscalPeriod: 1 },
      { fiscalYear: 2026, fiscalPeriod: 12 },
      { fiscalYear: 2026, fiscalPeriod: 11 },
    ]);
    expect(recentFiscalPeriods(new Date('2026-09-28T00:00:00Z'), 1)).toEqual([{ fiscalYear: 2026, fiscalPeriod: 12 }]);
    expect(recentFiscalPeriods(new Date('2027-01-10T00:00:00Z'), 5).map((p) => `${p.fiscalYear}-${p.fiscalPeriod}`)).toEqual(['2027-4', '2027-3', '2027-2', '2027-1', '2026-12']);
  });
});

const config = { keyId: 'K', issuerId: 'I', privateKey: 'unused', vendorNumber: '12345678', appId: '1' };

function stubFetch(status: number, body: string | Buffer = '') {
  const fn = jest.fn(async () => new Response(body as BodyInit, { status }));
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('fetchFinanceReport', () => {
  afterEach(() => jest.restoreAllMocks());

  it('asks for FINANCE_DETAIL, region Z1, reportDate in the fiscal calendar, and gunzips the file', async () => {
    const fn = stubFetch(200, gzipSync(SAMPLE));
    const got = await fetchFinanceReport(config, 'tok', 2026, 12);
    expect(got).toEqual({ kind: 'ok', text: SAMPLE });
    const url = new URL((fn.mock.calls[0] as unknown as [string])[0]);
    expect(url.pathname).toBe('/v1/financeReports');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      'filter[regionCode]': 'Z1',
      'filter[reportType]': 'FINANCE_DETAIL',
      'filter[vendorNumber]': '12345678',
      'filter[reportDate]': '2026-12',
    });
  });

  it('reads a period Apple has not published (404) as not ready, not an error', async () => {
    stubFetch(404, JSON.stringify({ errors: [{ code: 'NOT_FOUND', detail: 'no report' }] }));
    await expect(fetchFinanceReport(config, 'tok', 2027, 2)).resolves.toEqual({ kind: 'not_ready' });
  });

  it.each([401, 403])('reports %i as no access, with Apple’s own words', async (status) => {
    stubFetch(status, JSON.stringify({ errors: [{ code: 'FORBIDDEN_ERROR', detail: 'The API key in use does not allow this request' }] }));
    await expect(fetchFinanceReport(config, 'tok', 2026, 12)).resolves.toEqual({
      kind: 'no_access',
      status,
      detail: 'FORBIDDEN_ERROR: The API key in use does not allow this request',
    });
  });

  it('throws on other failures, naming the period', async () => {
    stubFetch(400, JSON.stringify({ errors: [{ code: 'PARAMETER_ERROR.INVALID', detail: 'bad period' }] }));
    await expect(fetchFinanceReport(config, 'tok', 2026, 13)).rejects.toThrow(/400 on finance FY2026 P13: PARAMETER_ERROR.INVALID: bad period/);
  });
});

/** Just enough of supabase-js for syncFinance: records writes per table. */
function fakeDb(okPeriods: { fiscal_year: number; fiscal_period: number }[] = []) {
  const writes: { table: string; op: string; payload?: unknown }[] = [];
  const from = (table: string) => {
    const chain: Record<string, unknown> = {};
    const done = (op: string, payload?: unknown) => {
      writes.push({ table, op, payload });
      return Promise.resolve({ error: null });
    };
    // storedPeriods(): select().eq(vendor).eq(status) resolves to the already-ok periods
    chain.select = () => ({ eq: () => ({ eq: () => Promise.resolve({ data: okPeriods, error: null }) }) });
    chain.delete = () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => done('delete') }) }) }) });
    chain.insert = (p: unknown) => done('insert', p);
    chain.upsert = (p: unknown) => done('upsert', p);
    return chain;
  };
  return { db: { from }, writes };
}

jest.mock('@/lib/supabase/serverClient', () => ({ getSupabaseServerClient: jest.fn() }));

describe('syncFinance', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    process.env = {
      ...OLD_ENV,
      APP_STORE_CONNECT_KEY_ID: 'K',
      APP_STORE_CONNECT_ISSUER_ID: 'I',
      APP_STORE_CONNECT_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      APP_STORE_VENDOR_NUMBER: '12345678',
    };
  });
  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });
  const setDb = (db: unknown) => (jest.requireMock('@/lib/supabase/serverClient').getSupabaseServerClient as jest.Mock).mockReturnValue(db);
  const NOW = new Date('2026-11-05T07:00:00Z');

  it('does nothing without the Apple env vars', async () => {
    delete process.env.APP_STORE_VENDOR_NUMBER;
    await expect(syncFinance(4, NOW)).resolves.toEqual({ configured: false, stored: [], notReady: [] });
  });

  it('records "key lacks Finance access" once and stops, without an error', async () => {
    const { db, writes } = fakeDb();
    setDb(db);
    const fn = stubFetch(403, JSON.stringify({ errors: [{ code: 'FORBIDDEN_ERROR', detail: 'no finance role' }] }));
    const r = await syncFinance(4, NOW);
    expect(r.error).toBeUndefined();
    expect(r.noAccess).toMatch(/403: FORBIDDEN_ERROR: no finance role/);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(1);
    expect(writes[0].payload).toMatchObject({ status: 'no_access', fiscal_year: 2027, fiscal_period: 2 });
  });

  it('treats 404 as not ready for every period and still succeeds', async () => {
    const { db, writes } = fakeDb();
    setDb(db);
    stubFetch(404);
    const r = await syncFinance(2, NOW);
    expect(r).toMatchObject({ configured: true, stored: [], notReady: ['FY2027 P2', 'FY2027 P1'] });
    expect(r.error).toBeUndefined();
    expect(writes.map((w) => (w.payload as { status: string }).status)).toEqual(['not_ready', 'not_ready']);
  });

  it('stores a published period, skips one already stored, and marks it ok', async () => {
    const { db, writes } = fakeDb([{ fiscal_year: 2027, fiscal_period: 2 }]);
    setDb(db);
    const fn = jest.fn(async () => new Response(gzipSync(SAMPLE) as unknown as BodyInit, { status: 200 }));
    global.fetch = fn as unknown as typeof fetch;
    const r = await syncFinance(2, NOW);
    expect(fn).toHaveBeenCalledTimes(1); // P2 was already stored
    expect(r.stored).toEqual(['FY2027 P1']);
    const inserted = writes.find((w) => w.op === 'insert')?.payload as { vendor_number: string; row_key: string }[];
    expect(inserted).toHaveLength(3);
    expect(inserted[0].vendor_number).toBe('12345678');
    const last = writes[writes.length - 1].payload as { status: string; start_date: string; row_count: number };
    expect(last).toMatchObject({ status: 'ok', start_date: '2026-08-30', row_count: 3 });
    // The sample is fiscal 2026-12, not the 2027-01 asked for, so the guess being off is noted
    expect((last as unknown as { detail: string }).detail).toMatch(/FY2026 P12, not FY2027 P1/);
  });

  it('stores the rows but marks the period mismatch when the totals disagree', async () => {
    const { db, writes } = fakeDb();
    setDb(db);
    global.fetch = jest.fn(async () => new Response(gzipSync(SAMPLE.replace('17.95', '99.00')) as unknown as BodyInit, { status: 200 })) as unknown as typeof fetch;
    await syncFinance(1, NOW);
    expect((writes[writes.length - 1].payload as { status: string }).status).toBe('mismatch');
  });

  it('reports a database failure in the result instead of throwing', async () => {
    setDb({ from: () => ({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'relation "app_store_finance_periods" does not exist' } }) }) }) }) });
    stubFetch(404);
    const r = await syncFinance(2, NOW);
    expect(r.error).toMatch(/does not exist/);
  });
});

describe('summariseFinance', () => {
  const NOW = new Date('2026-11-05T07:00:00Z');
  const period = (o: Partial<Parameters<typeof summariseFinance>[0][number]>) => ({
    fiscal_year: 2026,
    fiscal_period: 12,
    start_date: '2026-08-30',
    end_date: '2026-09-26',
    status: 'ok',
    detail: null,
    row_count: 3,
    fetched_at: '2026-11-05T07:00:00Z',
    ...o,
  });
  const rows = parseFinanceReport(withRefund).rows.map((r) => ({ ...r, fiscal_year: 2026, fiscal_period: 12 }));

  it('sums proceeds by period and by product in the settlement currency, refunds netted', () => {
    const s = summariseFinance([period({})], rows, NOW);
    expect(s.state).toBe('ok');
    expect(s.statusText).toMatch(/^Last period fetched: FY2026 P12 \(30 Aug 2026 – 26 Sep\w* 2026\)\.$/);
    expect(s.periods[0].totals).toEqual([{ currency: 'GBP', units: 2, proceeds: 16.22 }]);
    expect(s.periods[0].products).toEqual([
      expect.objectContaining({ sku: 'rd_pro_yearly', units: 1, proceeds: 14.49, currency: 'GBP' }),
      expect.objectContaining({ sku: 'rd_pro_monthly', units: 1, proceeds: 1.73, currency: 'GBP' }),
    ]);
  });

  it('says waiting for Apple with no stored period', () => {
    const s = summariseFinance([period({ status: 'not_ready' })], [], NOW);
    expect(s).toMatchObject({ state: 'waiting', hasData: false });
    expect(s.statusText).toMatch(/^Waiting for Apple/);
  });

  it('says the key lacks Finance access when a recent attempt got 401/403', () => {
    const s = summariseFinance([period({ status: 'no_access', detail: 'x', fiscal_year: 2027, fiscal_period: 2 })], [], NOW);
    expect(s.state).toBe('no_access');
    expect(s.statusText).toMatch(/lacks Finance access/);
  });

  it('ignores an old no_access once the key works (the attempt is stale)', () => {
    const s = summariseFinance([period({ status: 'no_access', fetched_at: '2026-10-01T07:00:00Z' }), period({ fiscal_period: 11, status: 'ok' })], [], NOW);
    expect(s.state).toBe('ok');
  });

  it('surfaces a failed fetch and a mismatched period', () => {
    expect(summariseFinance([period({ status: 'error', detail: 'Apple 500' })], [], NOW).state).toBe('error');
    const m = summariseFinance([period({ status: 'mismatch', detail: 'GBP: off' })], rows, NOW);
    expect(m.periods[0].status).toBe('mismatch');
    expect(m.statusText).toMatch(/disagreed/);
  });
});
