/**
 * Google Play install reports.
 *
 * Play has no downloads API. Play Console exports monthly CSVs to a Cloud
 * Storage bucket owned by the developer account (Download reports →
 * Statistics), and a service account invited in Play Console reads them.
 * Go Daisy shares the bucket and the `grewp-play-reports` service account
 * with Rise Daisy and Grewp; only the package name differs.
 */

import { decodeServiceAccountKey, getServiceAccountToken } from '@/lib/google/service-account-token';
import type { StoreStatRow } from './types';

const DEFAULT_PACKAGE_NAME = 'io.godaisy.app';

export interface GoogleConfig {
  clientEmail: string;
  privateKey: string;
  bucket: string;
  packageName: string;
}

/** Null when unset. Throws when set but unreadable, so the sync reports it. */
export function getGoogleConfig(env: Record<string, string | undefined> = process.env): GoogleConfig | null {
  const credentialsBase64 = env.GOOGLE_PLAY_REPORTS_CREDENTIALS;
  const bucket = env.GOOGLE_PLAY_REPORTS_BUCKET;
  if (!credentialsBase64 || !bucket) return null;

  const credentials = decodeServiceAccountKey(credentialsBase64, 'GOOGLE_PLAY_REPORTS_CREDENTIALS');
  return {
    clientEmail: credentials.clientEmail,
    privateKey: credentials.privateKey,
    bucket: bucket.replace(/^gs:\/\//, '').replace(/\/+$/, ''),
    packageName: env.GOOGLE_PLAY_PACKAGE_NAME || DEFAULT_PACKAGE_NAME,
  };
}

/** Play writes these CSVs as UTF-16LE with a byte-order mark; accept plain UTF-8 too. */
export function decodePlayCsv(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }
  return buffer.toString('utf-8').replace(/^﻿/, '');
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

/** Parse a Play `installs_<package>_<YYYYMM>_country.csv` into per-day, per-country rows. */
export function parsePlayInstallsCsv(csv: string): StoreStatRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const dateIdx = header.indexOf('Date');
  const countryIdx = header.indexOf('Country');
  // Users who installed (one person on two devices counts once); fall back to devices
  const userIdx = header.indexOf('Daily User Installs');
  const installsIdx = userIdx !== -1 ? userIdx : header.indexOf('Daily Device Installs');
  const uninstallsIdx = header.indexOf('Daily Device Uninstalls');
  if (dateIdx === -1 || installsIdx === -1) return [];

  const num = (value: string | undefined) => {
    const n = parseInt(value || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const rows: StoreStatRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = cells[dateIdx]?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const rawCountry = countryIdx === -1 ? '' : (cells[countryIdx] ?? '').trim();
    rows.push({
      stat_date: date,
      platform: 'android',
      country: /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'ZZ',
      downloads: num(cells[installsIdx]),
      redownloads: 0,
      uninstalls: uninstallsIdx === -1 ? 0 : num(cells[uninstallsIdx]),
    });
  }
  return rows;
}

/** Fetch the country report for each YYYYMM given. A month Play hasn't written yet is skipped. */
export async function fetchGoogleMonths(config: GoogleConfig, months: string[]): Promise<StoreStatRow[]> {
  const token = await getServiceAccountToken(config, 'https://www.googleapis.com/auth/devstorage.read_only');
  const rows: StoreStatRow[] = [];

  for (const month of months) {
    const object = `stats/installs/installs_${config.packageName}_${month}_country.csv`;
    const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(config.bucket)}/o/${encodeURIComponent(object)}?alt=media`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`Play reports ${res.status}: ${(await res.text()).slice(0, 200)}`);
    rows.push(...parsePlayInstallsCsv(decodePlayCsv(Buffer.from(await res.arrayBuffer()))));
  }
  return rows;
}
