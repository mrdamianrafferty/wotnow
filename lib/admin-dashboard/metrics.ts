/**
 * Everything /admin/dashboard and the multi-app dashboard show, fetched in
 * parallel, for whichever app this deployment is (Go Daisy on the wotnow
 * project, Grow Daisy on growdaisy: see app-identity.ts). Each source reports "not configured" or its own error without
 * failing the others.
 */

import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { summariseStoreStats, utcDay, type StoreDownloadsSummary } from '@/lib/store-stats/summary';
import { storeStatsAppId } from '@/lib/store-stats/types';
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

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const [storeDownloads, revenue, analytics, platformHealth, audience, webRevenue] = await Promise.all([
    fetchStoreDownloads(),
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
    revenue,
    analytics,
    platformHealth,
    audience,
    ...(webRevenue ? { webRevenue } : {}),
  };
}
