/**
 * App Store Connect Sales and Trends API — daily summary report.
 * https://developer.apple.com/documentation/appstoreconnectapi/get_v1_salesreports
 *
 * The key, issuer and vendor number belong to the Apple team, so Go Daisy
 * shares them with Rise Daisy and Grewp; only the app's Apple ID differs.
 */

import { createPrivateKey, sign } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { metricsApp } from '@/lib/admin-dashboard/app-identity';
import type { StoreStatRow } from './types';

// Product types that count as a first-time download, and as a re-download.
// Updates (7*), in-app purchases (IA*) and the rest are ignored.
const FIRST_TIME_TYPES = new Set(['1', '1F', '1T', '1E', '1EP', '1EU']);
const REDOWNLOAD_TYPES = new Set(['3', '3F', '3T']);

export interface AppleConfig {
  keyId: string;
  issuerId: string;
  privateKey: string;
  vendorNumber: string;
  appId: string;
}

export function getAppleConfig(env: Record<string, string | undefined> = process.env): AppleConfig | null {
  const keyId = env.APP_STORE_CONNECT_KEY_ID;
  const issuerId = env.APP_STORE_CONNECT_ISSUER_ID;
  const rawKey = env.APP_STORE_CONNECT_PRIVATE_KEY;
  const vendorNumber = env.APP_STORE_VENDOR_NUMBER;
  if (!keyId || !issuerId || !rawKey || !vendorNumber) return null;

  // Accept the .p8 contents as-is, with \n escapes, or base64 encoded
  const privateKey = rawKey.includes('BEGIN PRIVATE KEY') ? rawKey.replace(/\\n/g, '\n') : Buffer.from(rawKey, 'base64').toString('utf-8');

  return { keyId, issuerId, privateKey, vendorNumber, appId: env.APP_STORE_APP_ID || metricsApp(env).appleId };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** ES256 JWT for the App Store Connect API. Apple allows at most 20 minutes. */
export function createAppleToken(config: AppleConfig, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const header = { alg: 'ES256', kid: config.keyId, typ: 'JWT' };
  const payload = { iss: config.issuerId, iat, exp: iat + 15 * 60, aud: 'appstoreconnect-v1' };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = sign('sha256', Buffer.from(unsigned), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: 'ieee-p1363',
  });
  return `${unsigned}.${base64url(signature)}`;
}

/** Turn one day's tab-separated sales report into per-country rows for our app. */
export function parseAppleSalesReport(tsv: string, appId: string, statDate: string): StoreStatRow[] {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const header = lines[0].split('\t');
  const typeIdx = header.indexOf('Product Type Identifier');
  const unitsIdx = header.indexOf('Units');
  const idIdx = header.indexOf('Apple Identifier');
  const countryIdx = header.indexOf('Country Code');
  if ([typeIdx, unitsIdx, idIdx, countryIdx].includes(-1)) return [];

  const byCountry = new Map<string, StoreStatRow>();
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    if (cells[idIdx] !== appId) continue;

    const type = cells[typeIdx];
    const units = parseInt(cells[unitsIdx] || '0', 10);
    if (!Number.isFinite(units) || units <= 0) continue;

    const first = FIRST_TIME_TYPES.has(type);
    const again = REDOWNLOAD_TYPES.has(type);
    if (!first && !again) continue;

    const country = /^[A-Z]{2}$/.test(cells[countryIdx] ?? '') ? cells[countryIdx] : 'ZZ';
    const row = byCountry.get(country) ?? {
      stat_date: statDate,
      platform: 'ios' as const,
      country,
      downloads: 0,
      redownloads: 0,
      uninstalls: 0,
    };
    if (first) row.downloads += units;
    else row.redownloads += units;
    byCountry.set(country, row);
  }
  return [...byCountry.values()];
}

/** Apple's reports API throws the odd transient 500 or 429, so retry those with backoff. */
async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let res = await fetch(url, init);
  for (let i = 1; i < attempts && (res.status >= 500 || res.status === 429); i++) {
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
    res = await fetch(url, init);
  }
  return res;
}

/** Apple's JSON error body as "CODE: detail", or the first part of whatever it sent. */
export function appleErrorDetail(body: string): string {
  try {
    const e = (JSON.parse(body) as { errors?: { code?: string; detail?: string; title?: string }[] }).errors?.[0];
    if (e) return [e.code, e.detail ?? e.title].filter(Boolean).join(': ').slice(0, 300);
  } catch {
    // not JSON: fall through to the raw text
  }
  return body.replace(/\s+/g, ' ').slice(0, 300);
}

export type AppleFrequency = 'DAILY' | 'MONTHLY' | 'YEARLY';

/**
 * One sales report as text: `reportDate` is YYYY-MM-DD, YYYY-MM or YYYY for
 * DAILY, MONTHLY and YEARLY. Null when Apple has none for that period (404).
 */
export async function fetchAppleReportText(config: AppleConfig, token: string, frequency: AppleFrequency, reportDate: string, signal?: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({
    'filter[frequency]': frequency,
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[vendorNumber]': config.vendorNumber,
    'filter[reportDate]': reportDate,
    'filter[version]': '1_1',
  });
  const res = await fetchWithRetry(`https://api.appstoreconnect.apple.com/v1/salesReports?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/a-gzip' },
    signal,
  });

  // 404: no report for that date (nothing sold, or not published yet)
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`App Store Connect ${res.status} on ${frequency} ${reportDate}: ${appleErrorDetail(await res.text())}`);
  return gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf-8');
}

/** First-time downloads per Apple identifier in one sales report: every app on the vendor account, not just ours. */
export function parseFirstTimeByApp(tsv: string): Map<string, number> {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const byApp = new Map<string, number>();
  if (lines.length < 2) return byApp;

  const header = lines[0].split('\t');
  const typeIdx = header.indexOf('Product Type Identifier');
  const unitsIdx = header.indexOf('Units');
  const idIdx = header.indexOf('Apple Identifier');
  if ([typeIdx, unitsIdx, idIdx].includes(-1)) return byApp;

  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    if (!FIRST_TIME_TYPES.has(cells[typeIdx])) continue;
    const units = parseInt(cells[unitsIdx] || '0', 10);
    if (!Number.isFinite(units) || units <= 0 || !cells[idIdx]) continue;
    byApp.set(cells[idIdx], (byApp.get(cells[idIdx]) ?? 0) + units);
  }
  return byApp;
}

/** Fetch and parse one day. Returns [] when Apple has no report for that date. */
export async function fetchAppleDay(config: AppleConfig, statDate: string, token: string): Promise<StoreStatRow[]> {
  const tsv = await fetchAppleReportText(config, token, 'DAILY', statDate);
  return tsv === null ? [] : parseAppleSalesReport(tsv, config.appId, statDate);
}
