/**
 * GA4 Data API reports for /admin/dashboard, from the godaisy.io property
 * (measurement id G-0YDQB1067L, tagged in pages/_app.tsx). Grow Daisy has its
 * own property and Findr's routes are excluded from the tag, so this is Go
 * Daisy only. The iOS app loads godaisy.io in its web view, so app use is in
 * here too.
 *
 * Calls the REST endpoint directly with a service-account token rather than
 * @google-analytics/data, as Rise Daisy does: the four reports go in one
 * batchRunReports request. Vercel Web Analytics also runs but has no read API.
 */

import { decodeServiceAccountKey, getServiceAccountToken } from '@/lib/google/service-account-token';
import { errorMessage, weekMetric, type Ga4Summary, type Section } from './types';

interface Ga4Row {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}
interface Ga4Report {
  rows?: Ga4Row[];
}
export interface Ga4BatchResponse {
  reports?: Ga4Report[];
}

const RANGE_14D = { startDate: '14daysAgo', endDate: 'yesterday' };
const RANGE_28D = { startDate: '28daysAgo', endDate: 'yesterday' };

/** The four reports, in the order summariseGa4 reads them. */
export function ga4Requests() {
  return [
    {
      dateRanges: [RANGE_14D],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'screenPageViews' }, { name: 'engagementRate' }],
      orderBys: [{ dimension: { dimensionName: 'date', orderType: 'ALPHANUMERIC' } }],
    },
    {
      dateRanges: [RANGE_28D],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8,
    },
    {
      dateRanges: [RANGE_28D],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'engagementRate' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8,
    },
    {
      dateRanges: [RANGE_28D],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    },
  ];
}

const num = (row: Ga4Row, i: number) => Number(row.metricValues?.[i]?.value ?? 0) || 0;
const dim = (row: Ga4Row, i: number) => row.dimensionValues?.[i]?.value ?? '(not set)';

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The 14 complete days the daily report covers, oldest first. */
export function last14Days(now: Date): string[] {
  const days: string[] = [];
  for (let back = 14; back >= 1; back--) days.push(isoDay(new Date(now.getTime() - back * 86400_000)));
  return days;
}

export function summariseGa4(json: Ga4BatchResponse, now: Date): Ga4Summary {
  const [daily, pages, channels, devices] = json.reports ?? [];

  // GA leaves out days with no data unless asked; fill by date so a gap is a 0, not a shift.
  const days = last14Days(now);
  const byDay = new Map<string, Ga4Row>();
  for (const row of daily?.rows ?? []) {
    const d = dim(row, 0);
    if (/^\d{8}$/.test(d)) byDay.set(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, row);
  }
  const series = (i: number) => days.map((d) => (byDay.has(d) ? num(byDay.get(d)!, i) : 0));
  const engagement = series(3).map((r) => r * 100);
  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  const deviceRows = (devices?.rows ?? []).map((r) => ({ device: dim(r, 0), users: num(r, 0) }));
  const deviceTotal = deviceRows.reduce((a, r) => a + r.users, 0);

  return {
    days,
    activeUsers: weekMetric(series(0)),
    newUsers: weekMetric(series(1)),
    pageViews: weekMetric(series(2)),
    engagementRate: { value: mean(engagement.slice(7)), previous: mean(engagement.slice(0, 7)) },
    topPages: (pages?.rows ?? []).map((r) => ({ path: dim(r, 0), views: num(r, 0) })),
    channels: (channels?.rows ?? []).map((r) => ({
      channel: dim(r, 0),
      users: num(r, 0),
      sessions: num(r, 1),
      engagementRate: Math.round(num(r, 2) * 100),
    })),
    devices: deviceRows.map((r) => ({
      device: r.device.charAt(0).toUpperCase() + r.device.slice(1),
      users: r.users,
      percent: deviceTotal > 0 ? Math.round((r.users / deviceTotal) * 100) : 0,
    })),
  };
}

export async function fetchGa4Summary(env: Record<string, string | undefined> = process.env): Promise<Section<Ga4Summary>> {
  const propertyId = env.GA_PROPERTY_ID?.trim();
  const credentials = env.GOOGLE_ANALYTICS_CREDENTIALS?.trim();
  const missing = [!propertyId && 'GA_PROPERTY_ID', !credentials && 'GOOGLE_ANALYTICS_CREDENTIALS'].filter(Boolean) as string[];
  if (missing.length) return { state: 'not_configured', missing };

  try {
    const token = await getServiceAccountToken(
      decodeServiceAccountKey(credentials!, 'GOOGLE_ANALYTICS_CREDENTIALS'),
      'https://www.googleapis.com/auth/analytics.readonly',
    );
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId!)}:batchRunReports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: ga4Requests() }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 403) {
      return {
        state: 'not_configured',
        missing: [],
        hint: 'GA4 refused the service account (403). Add its client_email as a Viewer on the Go Daisy GA4 property.',
      };
    }
    if (!res.ok) return { state: 'error', message: `GA4 ${res.status}: ${(await res.text()).slice(0, 160)}` };
    return { state: 'ok', data: summariseGa4((await res.json()) as Ga4BatchResponse, new Date()) };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}
