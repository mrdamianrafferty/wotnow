/**
 * Pull the last N days from both stores into store_stats_daily.
 *
 * Re-syncing a day overwrites it, so the daily 4-day rolling window also picks
 * up the stores' late corrections and any day a previous run skipped.
 */

import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { createAppleToken, fetchAppleDay, getAppleConfig } from './apple';
import { fetchGoogleMonths, getGoogleConfig } from './google';
import { STORE_STATS_APP_ID, type StoreStatRow } from './types';

export interface PlatformResult {
  configured: boolean;
  rows: number;
  /** Days that kept failing and were left for the next run */
  skipped?: string[];
  error?: string;
}

export interface SyncResult {
  from: string;
  to: string;
  ios: PlatformResult;
  android: PlatformResult;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** The last `days` complete UTC days, oldest first. Today's report isn't out yet. */
export function dateRange(days: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = days; i >= 1; i--) {
    out.push(new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

async function upsert(rows: StoreStatRow[]): Promise<void> {
  if (rows.length === 0) return;
  // store_stats_daily is granted to service_role only, so this needs SUPABASE_SERVICE_ROLE_KEY
  const db = getSupabaseServerClient();
  const syncedAt = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({ ...r, app_id: STORE_STATS_APP_ID, synced_at: syncedAt }));
    const { error } = await db
      .from('store_stats_daily')
      .upsert(chunk, { onConflict: 'app_id,stat_date,platform,country' });
    if (error) throw new Error(error.message);
  }
}

// Each Apple call takes seconds: a 60-day backfill needs a few at a time to fit 300 s.
const IOS_CONCURRENCY = 4;

async function syncIos(dates: string[]): Promise<PlatformResult> {
  try {
    const config = getAppleConfig();
    if (!config) return { configured: false, rows: 0 };
    const token = createAppleToken(config);
    const rows: StoreStatRow[] = [];
    const failed: { date: string; message: string }[] = [];

    let next = 0;
    const worker = async () => {
      while (next < dates.length) {
        const date = dates[next++];
        try {
          rows.push(...(await fetchAppleDay(config, date, token)));
        } catch (err) {
          failed.push({ date, message: message(err) });
        }
      }
    };
    await Promise.all(Array.from({ length: IOS_CONCURRENCY }, worker));

    await upsert(rows);
    const skipped = failed.map((f) => f.date).sort();
    // Only an error when every day failed; a few skipped days are retried tomorrow
    if (failed.length === dates.length) {
      return { configured: true, rows: 0, skipped, error: failed[0].message };
    }
    return { configured: true, rows: rows.length, ...(skipped.length > 0 && { skipped }) };
  } catch (err) {
    return { configured: true, rows: 0, error: message(err) };
  }
}

async function syncAndroid(dates: string[]): Promise<PlatformResult> {
  try {
    const config = getGoogleConfig();
    if (!config) return { configured: false, rows: 0 };
    const months = [...new Set(dates.map((d) => d.slice(0, 7).replace('-', '')))];
    const first = dates[0];
    const last = dates[dates.length - 1];
    const rows = (await fetchGoogleMonths(config, months)).filter((r) => r.stat_date >= first && r.stat_date <= last);
    await upsert(rows);
    return { configured: true, rows: rows.length };
  } catch (err) {
    return { configured: true, rows: 0, error: message(err) };
  }
}

export async function syncStoreStats(days: number): Promise<SyncResult> {
  const dates = dateRange(days);
  const [ios, android] = await Promise.all([syncIos(dates), syncAndroid(dates)]);
  return { from: dates[0], to: dates[dates.length - 1], ios, android };
}
