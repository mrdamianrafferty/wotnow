/**
 * RevenueCat in-app revenue for /admin/dashboard: MRR, active subscriptions
 * and trials now, revenue and new customers over the last 28 days.
 *
 * Go Daisy has no RevenueCat project of its own. Its App Store app
 * (`app7b23f455ba`, io.godaisy.app) sits in the "Grow Daisy" project beside
 * Grow Daisy's (`appb6332dd627`), and the v2 metrics/overview endpoint is project-wide with no
 * app filter, so it would report both apps' revenue on both cards. The Charts
 * endpoints do take an app filter, so this reads five charts instead.
 *
 * The key needs the "Charts & metrics" read permission (a v2 secret key).
 * Stripe web billing is not in RevenueCat and is not counted here.
 */

import { metricsApp } from './app-identity';
import { errorMessage, type RevenueSummary, type Section } from './types';

const RC_API = 'https://api.revenuecat.com/v2';
/** RevenueCat project "Grow Daisy", which holds both Daisy apps. */
const DEFAULT_PROJECT_ID = 'projb49b8cff';
const CURRENCY = 'GBP';

export interface ChartResponse {
  values?: { cohort?: number; measure?: number; value?: number | null; incomplete?: boolean }[];
}

/** Charts read: point-in-time ones take the newest day, flow ones are summed. */
export const REVENUE_CHARTS = ['mrr', 'actives', 'trials', 'revenue', 'customers_new'] as const;
export type RevenueChart = (typeof REVENUE_CHARTS)[number];

/** The chart's first measure, oldest first. Null when the chart had no values at all. */
function series(chart: ChartResponse | null | undefined): number[] | null {
  const points = (chart?.values ?? []).filter((v) => (v.measure ?? 0) === 0 && typeof v.value === 'number').sort((a, b) => (a.cohort ?? 0) - (b.cohort ?? 0));
  return points.length === 0 ? null : points.map((v) => v.value as number);
}

const latest = (chart: ChartResponse | null | undefined) => {
  const s = series(chart);
  return s === null ? null : s[s.length - 1];
};
const total = (chart: ChartResponse | null | undefined) => {
  const s = series(chart);
  return s === null ? null : Math.round(s.reduce((a, b) => a + b, 0) * 100) / 100;
};

export function summariseRevenueCharts(charts: Partial<Record<RevenueChart, ChartResponse | null>>, currency = CURRENCY): RevenueSummary {
  return {
    source: 'revenuecat',
    currency,
    mrr: latest(charts.mrr),
    activeSubscriptions: latest(charts.actives),
    activeTrials: latest(charts.trials),
    revenue28d: total(charts.revenue),
    newCustomers28d: total(charts.customers_new),
  };
}

/** Query string for one chart: daily, the last 28 complete days, Go Daisy's app only. */
export function chartQuery(appId: string, now: Date): URLSearchParams {
  const day = (back: number) => new Date(now.getTime() - back * 86_400_000).toISOString().slice(0, 10);
  return new URLSearchParams({
    start_date: day(28),
    end_date: day(1),
    resolution: '0',
    currency: CURRENCY,
    filters: JSON.stringify([{ name: 'app_id', values: [appId] }]),
  });
}

export async function fetchRevenueSummary(env: Record<string, string | undefined> = process.env): Promise<Section<RevenueSummary>> {
  const key = env.REVENUECAT_METRICS_API_KEY?.trim();
  if (!key) return { state: 'not_configured', missing: ['REVENUECAT_METRICS_API_KEY'] };
  const projectId = env.REVENUECAT_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;
  // Each app's own RevenueCat app (Go Daisy app7b23f455ba, Grow Daisy appb6332dd627), so the shared project is never counted twice
  const appId = env.REVENUECAT_APP_ID?.trim() || metricsApp(env).revenuecatAppId;
  const query = chartQuery(appId, new Date());

  try {
    const responses = await Promise.all(
      REVENUE_CHARTS.map((chart) =>
        fetch(`${RC_API}/projects/${encodeURIComponent(projectId)}/charts/${chart}?${query}`, {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(10_000),
        }),
      ),
    );
    const refused = responses.find((r) => r.status === 401 || r.status === 403);
    if (refused) {
      return {
        state: 'not_configured',
        missing: ['REVENUECAT_METRICS_API_KEY'],
        hint: `RevenueCat refused the key (${refused.status}). It needs a v2 secret key with Charts & metrics read access on the Grow Daisy project.`,
      };
    }
    const failed = responses.findIndex((r) => !r.ok);
    if (failed !== -1) {
      const body = (await responses[failed].text()).slice(0, 160);
      return { state: 'error', message: `RevenueCat ${REVENUE_CHARTS[failed]} chart ${responses[failed].status}: ${body}` };
    }
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as ChartResponse[];
    const charts = Object.fromEntries(REVENUE_CHARTS.map((c, i) => [c, bodies[i]])) as Record<RevenueChart, ChartResponse>;
    return { state: 'ok', data: summariseRevenueCharts(charts) };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}
