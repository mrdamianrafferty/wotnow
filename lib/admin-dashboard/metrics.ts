/**
 * Everything /admin/dashboard and the multi-app dashboard show, fetched in
 * parallel, for whichever app this deployment is (Go Daisy on the wotnow
 * project, Grow Daisy on growdaisy: see app-identity.ts). Each source reports "not configured" or its own error without
 * failing the others.
 */

import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { FINANCE_PERIODS_SHOWN, summariseFinance, type StoreFinanceSummary } from '@/lib/store-stats/finance-summary';
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

/**
 * From app_store_finance_periods / _rows, filled by /api/cron/godaisy/store-stats.
 * Vendor-wide: Rise Daisy's subscriptions show here as well as this app's.
 */
export async function fetchStoreFinance(now = new Date()): Promise<Section<StoreFinanceSummary>> {
  const vendor = process.env.APP_STORE_VENDOR_NUMBER;
  const missing = [...(vendor ? [] : ['APP_STORE_VENDOR_NUMBER']), ...(process.env.SUPABASE_SERVICE_ROLE_KEY ? [] : ['SUPABASE_SERVICE_ROLE_KEY'])];
  if (!vendor || missing.length) return { state: 'not_configured', missing };
  try {
    const db = getSupabaseServerClient();
    const { data: periods, error } = await db
      .from('app_store_finance_periods')
      .select('fiscal_year, fiscal_period, start_date, end_date, status, detail, row_count, fetched_at')
      .eq('vendor_number', vendor)
      .order('fiscal_year', { ascending: false })
      .order('fiscal_period', { ascending: false })
      .limit(24);
    if (error) return { state: 'error', message: errorMessage(error.message) };

    const shown = (periods ?? []).filter((p) => p.status === 'ok' || p.status === 'mismatch').slice(0, FINANCE_PERIODS_SHOWN);
    const oldest = shown.map((p) => p.start_date).filter((d): d is string => Boolean(d)).sort()[0];
    let rows: Parameters<typeof summariseFinance>[1] = [];
    if (shown.length > 0) {
      const { data, error: rowsError } = await db
        .from('app_store_finance_rows')
        .select('fiscal_year, fiscal_period, apple_identifier, sku, title, quantity, extended_partner_share, partner_share_currency')
        .eq('vendor_number', vendor)
        .gte('transaction_date', oldest ?? '2000-01-01')
        .limit(20000);
      if (rowsError) return { state: 'error', message: errorMessage(rowsError.message) };
      rows = data ?? [];
    }
    return { state: 'ok', data: summariseFinance(periods ?? [], rows, now) };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const [storeDownloads, storeListing, storeFinance, revenue, analytics, platformHealth, audience, webRevenue] = await Promise.all([
    fetchStoreDownloads(),
    fetchStoreListing(),
    fetchStoreFinance(),
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
    storeFinance,
    revenue,
    analytics,
    platformHealth,
    audience,
    ...(webRevenue ? { webRevenue } : {}),
  };
}
