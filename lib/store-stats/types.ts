/**
 * Store download stats — shared types.
 *
 * Ported from Rise Daisy (#867), itself from Grewp. store_stats_daily lives in
 * the GoDaisy Supabase project and is shared with Rise Daisy and Findr, so
 * every row carries `app_id`; the table was created by Rise Daisy's migration.
 */

import { metricsApp } from '@/lib/admin-dashboard/app-identity';

/**
 * The `app_id` this deployment writes and reads in store_stats_daily:
 * 'go_daisy' on the wotnow project, 'grow_daisy' on growdaisy (see
 * lib/admin-dashboard/app-identity.ts).
 */
export function storeStatsAppId(env: Record<string, string | undefined> = process.env): string {
  return metricsApp(env).id;
}

export type StorePlatform = 'ios' | 'android';

export interface StoreStatRow {
  stat_date: string; // YYYY-MM-DD
  platform: StorePlatform;
  country: string; // two-letter store region, 'ZZ' when unknown
  downloads: number;
  redownloads: number;
  uninstalls: number;
}
