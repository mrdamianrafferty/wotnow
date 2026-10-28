/**
 * RevenueCat in-app revenue for /admin/dashboard: MRR, active subscriptions
 * and trials now, revenue and new customers over the last 28 days.
 *
 * Go Daisy has no RevenueCat project of its own. Its App Store app
 * (`app7b23f455ba`, io.godaisy.app) sits in the "Grow Daisy" project beside
 * Grow Daisy's (`appb6332dd627`), and the v2 metrics/overview endpoint is project-wide with no
 * app filter, so it would report both apps' revenue on both cards. The Charts
 * endpoints can be filtered per app, so this reads five charts instead.
 *
 * Not every chart takes the same filter (checked 2026-10-28 with the chart
 * options schema): mrr, actives, trials and revenue take `app_id`, but
 * customers_new does not ("Invalid filter: app_id", 400) and takes
 * `first_app_id`, the app a customer was first seen in. Should RevenueCat
 * reject a chart's filter anyway, that one chart is read unfiltered and its
 * figure is marked as the project total rather than failing the section.
 *
 * The key needs the "Charts & metrics" read permission (a v2 secret key).
 * Stripe web billing is not in RevenueCat and is not counted here.
 */

import { metricsApp } from './app-identity';
import { errorMessage, type RevenueFigure, type RevenueSummary, type Section } from './types';

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

/** The per-app filter each chart accepts. */
export const APP_FILTER: Record<RevenueChart, string> = {
  mrr: 'app_id',
  actives: 'app_id',
  trials: 'app_id',
  revenue: 'app_id',
  customers_new: 'first_app_id',
};

/** The summary figure each chart becomes. */
export const CHART_FIELD: Record<RevenueChart, RevenueFigure> = {
  mrr: 'mrr',
  actives: 'activeSubscriptions',
  trials: 'activeTrials',
  revenue: 'revenue28d',
  customers_new: 'newCustomers28d',
};

export function summariseRevenueCharts(
  charts: Partial<Record<RevenueChart, ChartResponse | null>>,
  currency = CURRENCY,
  /** Charts that had to be read unfiltered, so are the whole project's. */
  unfiltered: RevenueChart[] = [],
): RevenueSummary {
  return {
    ...(unfiltered.length ? { projectTotal: unfiltered.map((c) => CHART_FIELD[c]) } : {}),
    source: 'revenuecat',
    currency,
    mrr: latest(charts.mrr),
    activeSubscriptions: latest(charts.actives),
    activeTrials: latest(charts.trials),
    revenue28d: total(charts.revenue),
    newCustomers28d: total(charts.customers_new),
  };
}

/** Query string for one chart: daily, the last 28 complete days, this app only (or the whole project when appId is null). */
export function chartQuery(chart: RevenueChart, appId: string | null, now: Date): URLSearchParams {
  const day = (back: number) => new Date(now.getTime() - back * 86_400_000).toISOString().slice(0, 10);
  const q = new URLSearchParams({ start_date: day(28), end_date: day(1), resolution: '0', currency: CURRENCY });
  if (appId) q.set('filters', JSON.stringify([{ name: APP_FILTER[chart], values: [appId] }]));
  return q;
}

/** RevenueCat's 400 for a filter the chart does not support. */
export function isFilterRejection(status: number, body: string): boolean {
  return status === 400 && /invalid filter/i.test(body);
}

export async function fetchRevenueSummary(env: Record<string, string | undefined> = process.env): Promise<Section<RevenueSummary>> {
  const key = env.REVENUECAT_METRICS_API_KEY?.trim();
  if (!key) return { state: 'not_configured', missing: ['REVENUECAT_METRICS_API_KEY'] };
  const projectId = env.REVENUECAT_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;
  // Each app's own RevenueCat app (Go Daisy app7b23f455ba, Grow Daisy appb6332dd627), so the shared project is never counted twice
  const appId = env.REVENUECAT_APP_ID?.trim() || metricsApp(env).revenuecatAppId;
  const now = new Date();
  const unfiltered: RevenueChart[] = [];
  const get = (chart: RevenueChart, app: string | null) =>
    fetch(`${RC_API}/projects/${encodeURIComponent(projectId)}/charts/${chart}?${chartQuery(chart, app, now)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });

  try {
    const responses = await Promise.all(
      REVENUE_CHARTS.map(async (chart) => {
        const res = await get(chart, appId);
        if (res.status !== 400) return res;
        const body = await res.clone().text();
        if (!isFilterRejection(res.status, body)) return res;
        // This chart cannot be split per app: show the project's figure, labelled, rather than no revenue at all
        unfiltered.push(chart);
        return get(chart, null);
      }),
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
    return { state: 'ok', data: summariseRevenueCharts(charts, CURRENCY, REVENUE_CHARTS.filter((c) => unfiltered.includes(c))) };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}
