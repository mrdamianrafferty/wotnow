/**
 * Everything /admin/dashboard and the multi-app dashboard show, fetched in
 * parallel, for whichever app this deployment is (Go Daisy on the wotnow
 * project, Grow Daisy on growdaisy: see app-identity.ts). Each source reports "not configured" or its own error without
 * failing the others.
 */

import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { summariseStoreStats, utcDay, type StoreDownloadsSummary } from '@/lib/store-stats/summary';
import { storeStatsAppId } from '@/lib/store-stats/types';
import { LISTING_SETTLE_DAYS, LISTING_WINDOW_DAYS, summariseStoreListing, type StoreListingSummary } from '@/lib/store-stats/listing-summary';
import { fetchAudienceSummary, fetchGa4Summary } from './ga4';
import { fetchRevenueSummary } from './revenuecat';
import { fetchSentrySummary } from './sentry';
import { fetchStripeWebSummary } from './stripe-web';
import { errorMessage, type MetricsSummary, type Section } from './types';

/** From store_stats_daily, filled by /api/cron/godaisy/store-stats. */
export async function fetchStoreDownloads(now = new Date()): Promise<Section<StoreDownloadsSummary>> {
  // The table is granted to service_role only; the anon fallback would just be refused.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { state: 'not_configured', missing: ['SUPABASE_SERVICE_ROLE_KEY'] };
  try {
    const { data, error } = await getSupabaseServerClient()
      .from('store_stats_daily')
      .select('stat_date, platform, country, downloads, redownloads, uninstalls')
      .eq('app_id', storeStatsAppId())
      .gte('stat_date', utcDay(now, 30))
      .limit(10000);
    if (error) return { state: 'error', message: errorMessage(error.message) };
    return { state: 'ok', data: summariseStoreStats(data ?? [], now) };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}

const APPLE_VARS = ['APP_STORE_CONNECT_KEY_ID', 'APP_STORE_CONNECT_ISSUER_ID', 'APP_STORE_CONNECT_PRIVATE_KEY', 'APP_STORE_VENDOR_NUMBER'];

/**
 * Listing conversion as a Section. No rows reads "not configured": either the
 * Apple vars are unset, or Apple hasn't published a report instance yet (the
 * requests were created 2026-10-28; the first instances come a day or two later).
 */
export function storeListingSection(summary: StoreListingSummary, env: Record<string, string | undefined> = process.env): Section<StoreListingSummary> {
  if (summary.hasData) return { state: 'ok', data: summary };
  const missing = APPLE_VARS.filter((v) => !env[v]);
  return {
    state: 'not_configured',
    missing,
    ...(missing.length === 0 && { hint: 'Apple credentials are set but no Analytics Reports instance has been synced yet.' }),
  };
}

/** From app_store_listing_daily, filled by /api/cron/godaisy/store-stats. */
export async function fetchStoreListing(now = new Date()): Promise<Section<StoreListingSummary>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { state: 'not_configured', missing: ['SUPABASE_SERVICE_ROLE_KEY'] };
  try {
    const { data, error } = await getSupabaseServerClient()
      .from('app_store_listing_daily')
      .select('stat_date, country, impressions, product_page_views, first_time_downloads, product_page_downloads')
      .eq('app_id', storeStatsAppId())
      .gte('stat_date', utcDay(now, LISTING_SETTLE_DAYS + 2 * LISTING_WINDOW_DAYS))
      .limit(20000);
    if (error) return { state: 'error', message: errorMessage(error.message) };
    return storeListingSection(summariseStoreListing(data ?? [], now));
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const [storeDownloads, storeListing, revenue, analytics, platformHealth, audience, webRevenue] = await Promise.all([
    fetchStoreDownloads(),
    fetchStoreListing(),
    fetchRevenueSummary(),
    fetchGa4Summary(),
    fetchSentrySummary(),
    fetchAudienceSummary(),
    fetchStripeWebSummary(),
  ]);
  return {
    app: storeStatsAppId(),
    generatedAt: new Date().toISOString(),
    storeDownloads,
    storeListing,
    revenue,
    analytics,
    platformHealth,
    audience,
    ...(webRevenue ? { webRevenue } : {}),
  };
}
