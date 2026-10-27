/**
 * Store download stats — shared types.
 *
 * Ported from Rise Daisy (#867), itself from Grewp. store_stats_daily lives in
 * the GoDaisy Supabase project and is shared with Rise Daisy and Findr, so
 * every row carries `app_id`; the table was created by Rise Daisy's migration.
 */

/** The `app_id` Go Daisy writes and reads in store_stats_daily. */
export const STORE_STATS_APP_ID = 'go_daisy';

export type StorePlatform = 'ios' | 'android';

export interface StoreStatRow {
  stat_date: string; // YYYY-MM-DD
  platform: StorePlatform;
  country: string; // two-letter store region, 'ZZ' when unknown
  downloads: number;
  redownloads: number;
  uninstalls: number;
}
