/**
 * App Store Connect Finance Reports — FINANCE_DETAIL, one file per Apple fiscal
 * period for the whole vendor account (every app, in-app purchase and
 * subscription), in the currency Apple pays out in.
 * https://developer.apple.com/documentation/appstoreconnectapi/get_v1_financereports
 *
 * Apple's fiscal calendar is its own (5-4-4 weeks, October first: FY2026
 * period 12 is 30 Aug – 26 Sep 2026, FY2027 period 1 is 27 Sep – 31 Oct), so
 * the real dates are read from the file's own Start Date / End Date rows and
 * the calendar month is only used to guess which periods to ask for.
 *
 * The call needs a key with the Finance role. Without it Apple answers 401/403,
 * which is reported as `no_access` rather than thrown.
 */

import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { appleErrorDetail, fetchWithRetry, type AppleConfig } from './apple';

export interface FinanceRow {
  transaction_date: string; // YYYY-MM-DD
  settlement_date: string | null;
  apple_identifier: string;
  sku: string;
  title: string;
  developer_name: string;
  product_type: string;
  country: string;
  quantity: number;
  partner_share: number;
  extended_partner_share: number;
  partner_share_currency: string;
  customer_price: number;
  customer_currency: string;
  /** 'S' sale, 'R' return. Refund quantities and amounts arrive negative and are kept as sent. */
  sale_or_return: string;
  promo_code: string;
  order_type: string;
  region: string;
  /** Columns this parser does not know about, so a new Apple column is kept rather than lost */
  extra: Record<string, string>;
  /** Deterministic per row within a period: content hash + ordinal among identical rows */
  row_key: string;
}

export interface FinanceTotal {
  country: string;
  currency: string;
  quantity: number;
  extended_partner_share: number;
}

export interface FinanceReport {
  vendorName: string | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
  rows: FinanceRow[];
  /** The trailing totals block, as Apple sent it */
  totals: FinanceTotal[];
  /** Why the detail rows and the totals block disagree, empty when they match */
  mismatches: string[];
  /** Cells that could not be read as the number their column needs */
  warnings: string[];
}

const lower = (s: string | undefined) => (s ?? '').trim().toLowerCase();
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
/** Half a minor unit of slack for float noise between the detail and the totals. */
const TOTAL_TOLERANCE = 0.005;

/** MM/DD/YYYY → YYYY-MM-DD, null when it is not a date. */
export function usDateToIso(s: string | undefined): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((s ?? '').trim());
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

const COLUMNS = {
  txn: 'Transaction Date',
  settled: 'Settlement Date',
  id: 'Apple Identifier',
  sku: 'SKU',
  title: 'Title',
  dev: 'Developer Name',
  type: 'Product Type Identifier',
  country: 'Country of Sale',
  qty: 'Quantity',
  share: 'Partner Share',
  ext: 'Extended Partner Share',
  currency: 'Partner Share Currency',
  price: 'Customer Price',
  custCurrency: 'Customer Currency',
  sor: 'Sale or Return',
  promo: 'Promo Code',
  order: 'Order Type',
  region: 'Region',
} as const;

/**
 * Parse a FINANCE_DETAIL file: three header lines (Vendor Name / Start Date /
 * End Date), the column header row, the detail rows, then a totals block with
 * its own header row. Columns are found by name, so a blank trailing column,
 * a missing one or a new one from Apple does not shift anything.
 */
export function parseFinanceReport(text: string): FinanceReport {
  const warnings: string[] = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);

  let vendorName: string | null = null;
  let startDate: string | null = null;
  let endDate: string | null = null;
  let i = 0;
  for (; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const key = lower(cells[0]);
    if (cells.some((c) => lower(c) === 'transaction date')) break; // the column header, wherever Apple puts that column
    if (key === 'vendor name') vendorName = cells[1]?.trim() || null;
    else if (key === 'start date') startDate = usDateToIso(cells[1]);
    else if (key === 'end date') endDate = usDateToIso(cells[1]);
  }

  const result: FinanceReport = { vendorName, startDate, endDate, rows: [], totals: [], mismatches: [], warnings };
  if (i >= lines.length) return result; // no column header: nothing to read

  const header = lines[i].split('\t');
  const idx = Object.fromEntries(Object.entries(COLUMNS).map(([k, name]) => [k, header.findIndex((h) => lower(h) === lower(name))])) as Record<keyof typeof COLUMNS, number>;
  const known = new Set(Object.values(idx));
  const extraCols = header.map((h, n) => ({ h: h.trim(), n })).filter(({ h, n }) => h !== '' && !known.has(n));

  const num = (v: string | undefined, what: string): number => {
    const s = (v ?? '').trim().replace(/,/g, '');
    if (s === '') return 0;
    const n = Number(s);
    if (!Number.isFinite(n)) {
      warnings.push(`${what}: "${s}" is not a number`);
      return 0;
    }
    return n;
  };

  const seen = new Map<string, number>();
  let j = i + 1;
  for (; j < lines.length; j++) {
    const line = lines[j];
    if (line.trim() === '') continue;
    const cells = line.split('\t');
    if (lower(cells[0]) === 'country of sale') break; // the totals block's own header row
    const cell = (n: number) => (n === -1 ? '' : (cells[n] ?? '').trim());

    const txn = usDateToIso(cell(idx.txn));
    if (!txn) continue; // stray line, not a transaction

    const row: Omit<FinanceRow, 'row_key'> = {
      transaction_date: txn,
      settlement_date: usDateToIso(cell(idx.settled)),
      apple_identifier: cell(idx.id),
      sku: cell(idx.sku),
      title: cell(idx.title),
      developer_name: cell(idx.dev),
      product_type: cell(idx.type),
      country: cell(idx.country),
      quantity: Math.round(num(cells[idx.qty], 'Quantity')),
      partner_share: num(cells[idx.share], 'Partner Share'),
      extended_partner_share: num(cells[idx.ext], 'Extended Partner Share'),
      partner_share_currency: cell(idx.currency),
      customer_price: num(cells[idx.price], 'Customer Price'),
      customer_currency: cell(idx.custCurrency),
      sale_or_return: cell(idx.sor).toUpperCase(),
      promo_code: cell(idx.promo),
      order_type: cell(idx.order),
      region: cell(idx.region),
      extra: Object.fromEntries(extraCols.map(({ h, n }) => [h, (cells[n] ?? '').trim()]).filter(([, v]) => v !== '')),
    };
    // Apple can send two identical rows (two same-day purchases): the ordinal keeps both
    const hash = createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 16);
    const ordinal = seen.get(hash) ?? 0;
    seen.set(hash, ordinal + 1);
    result.rows.push({ ...row, row_key: `${hash}:${ordinal}` });
  }

  if (j < lines.length) {
    const th = lines[j].split('\t');
    const tcol = (name: string) => th.findIndex((h) => lower(h) === lower(name));
    const t = { country: tcol('Country of Sale'), currency: tcol('Partner Share Currency'), qty: tcol('Quantity'), ext: tcol('Extended Partner Share') };
    for (j++; j < lines.length; j++) {
      if (lines[j].trim() === '') continue;
      const cells = lines[j].split('\t');
      const currency = (cells[t.currency] ?? '').trim();
      if (!currency) continue; // not a totals row (e.g. a row-count footer)
      result.totals.push({
        country: (cells[t.country] ?? '').trim(),
        currency,
        quantity: Math.round(num(cells[t.qty], 'Total Quantity')),
        extended_partner_share: num(cells[t.ext], 'Total Extended Partner Share'),
      });
    }
  }

  result.mismatches = findMismatches(result.rows, result.totals);
  return result;
}

/** Detail Extended Partner Share and Quantity per currency against the totals block. */
export function findMismatches(rows: FinanceRow[], totals: FinanceTotal[]): string[] {
  if (rows.length === 0 && totals.length === 0) return [];
  if (totals.length === 0) return ['No totals block in the file, so the detail rows could not be checked (truncated download?)'];

  const sum = (items: { currency: string; q: number; e: number }[]) => {
    const by = new Map<string, { q: number; e: number }>();
    for (const x of items) {
      const cur = by.get(x.currency) ?? { q: 0, e: 0 };
      by.set(x.currency, { q: cur.q + x.q, e: round4(cur.e + x.e) });
    }
    return by;
  };
  const detail = sum(rows.map((r) => ({ currency: r.partner_share_currency, q: r.quantity, e: r.extended_partner_share })));
  const stated = sum(totals.map((t) => ({ currency: t.currency, q: t.quantity, e: t.extended_partner_share })));

  const out: string[] = [];
  for (const currency of new Set([...detail.keys(), ...stated.keys()])) {
    const d = detail.get(currency) ?? { q: 0, e: 0 };
    const s = stated.get(currency) ?? { q: 0, e: 0 };
    if (Math.abs(d.e - s.e) > TOTAL_TOLERANCE) out.push(`${currency}: detail rows sum to ${d.e.toFixed(2)} but the totals block says ${s.e.toFixed(2)}`);
    if (d.q !== s.q) out.push(`${currency}: detail quantity ${d.q} but the totals block says ${s.q}`);
  }
  return out;
}

export type FinanceFetch =
  | { kind: 'ok'; text: string }
  /** Apple has no report for that period: not finished, not published yet, or nothing sold */
  | { kind: 'not_ready' }
  /** 401/403: the API key lacks the Finance role */
  | { kind: 'no_access'; status: number; detail: string };

/** One fiscal period's FINANCE_DETAIL file. Throws on anything but ok, 404 and 401/403. */
export async function fetchFinanceReport(config: AppleConfig, token: string, fiscalYear: number, fiscalPeriod: number, signal?: AbortSignal): Promise<FinanceFetch> {
  const params = new URLSearchParams({
    'filter[regionCode]': 'ZZ',
    'filter[reportType]': 'FINANCE_DETAIL',
    'filter[vendorNumber]': config.vendorNumber,
    'filter[fiscalYear]': String(fiscalYear),
    'filter[fiscalPeriod]': String(fiscalPeriod),
  });
  const res = await fetchWithRetry(`https://api.appstoreconnect.apple.com/v1/financeReports?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/a-gzip' },
    signal,
  });

  if (res.status === 404) return { kind: 'not_ready' };
  if (res.status === 401 || res.status === 403) return { kind: 'no_access', status: res.status, detail: appleErrorDetail(await res.text()) };
  if (!res.ok) throw new Error(`App Store Connect ${res.status} on finance FY${fiscalYear} P${fiscalPeriod}: ${appleErrorDetail(await res.text())}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const gzipped = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  return { kind: 'ok', text: (gzipped ? gunzipSync(buf) : buf).toString('utf-8') };
}

/**
 * Apple fiscal periods matching a date, newest first: October is period 1 of
 * the next fiscal year, September period 12. Only a guess (periods start on
 * Sundays, not the 1st), so the caller asks for the current period and the
 * ones before it, and a period that does not exist yet reads as not ready.
 */
export function recentFiscalPeriods(now: Date, count: number): { fiscalYear: number; fiscalPeriod: number }[] {
  const month = now.getUTCMonth() + 1;
  let fiscalYear = now.getUTCFullYear() + (month >= 10 ? 1 : 0);
  let fiscalPeriod = ((month + 2) % 12) + 1;
  const out: { fiscalYear: number; fiscalPeriod: number }[] = [];
  for (let n = 0; n < count; n++) {
    out.push({ fiscalYear, fiscalPeriod });
    if (--fiscalPeriod === 0) {
      fiscalPeriod = 12;
      fiscalYear--;
    }
  }
  return out;
}
