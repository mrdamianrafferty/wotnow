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

import { getCache, type RuntimeCache } from '@vercel/functions';
import { metricsApp } from './app-identity';
import { decodeServiceAccountKey, getServiceAccountToken } from '@/lib/google/service-account-token';
import { errorMessage, weekMetric, type AudienceSummary, type Ga4Summary, type Section } from './types';

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

// ─── Audience: country, device, age, gender ─────────────────────────

const RANGE_7D = { startDate: '7daysAgo', endDate: 'yesterday' };

/**
 * The audience reports, in the order summariseAudience reads them. Age and
 * gender are GA4 "potentially thresholded" dimensions, which draw on a small
 * separate hourly quota per property; `withDemographics: false` leaves them
 * out so the batch costs none of it.
 */
export function audienceRequests(withDemographics = true) {
  const byUsers = { orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], metrics: [{ name: 'activeUsers' }] };
  return [
    { dateRanges: [RANGE_7D], dimensions: [{ name: 'countryId' }, { name: 'country' }], ...byUsers, limit: 10 },
    { dateRanges: [RANGE_7D], dimensions: [{ name: 'deviceCategory' }], ...byUsers },
    ...(withDemographics
      ? [
          { dateRanges: [RANGE_7D], dimensions: [{ name: 'userAgeBracket' }], ...byUsers },
          { dateRanges: [RANGE_7D], dimensions: [{ name: 'userGender' }], ...byUsers },
        ]
      : []),
  ];
}

const NOT_SET = new Set(['(not set)', '']);
const DEMOGRAPHICS_NOTE = 'GA4 returned no age or gender rows: Google signals is off or the property is under its privacy thresholds.';
export const DEMOGRAPHICS_SKIPPED_NOTE = `${DEMOGRAPHICS_NOTE} Not asked again for a week, to save GA4's thresholded quota.`;
export const DEMOGRAPHICS_QUOTA_NOTE = 'Age and gender left out this time: GA4’s hourly quota for thresholded reports is used up.';

export function summariseAudience(json: Ga4BatchResponse, now: Date, note = DEMOGRAPHICS_NOTE): AudienceSummary {
  const [countries, devices, age, gender] = json.reports ?? [];
  const known = (rows: Ga4Row[] | undefined) => (rows ?? []).filter((r) => !['unknown', '(not set)', ''].includes(dim(r, 0).toLowerCase()));

  const ageRows = known(age?.rows).map((r) => ({ bracket: dim(r, 0), activeUsers: num(r, 0) }));
  const genderRows = known(gender?.rows).map((r) => ({ gender: dim(r, 0), activeUsers: num(r, 0) }));
  const available = ageRows.length > 0 || genderRows.length > 0;

  return {
    window: { from: isoDay(new Date(now.getTime() - 7 * 86400_000)), to: isoDay(new Date(now.getTime() - 86400_000)) },
    countries: (countries?.rows ?? [])
      .map((r) => {
        const code = dim(r, 0);
        const name = dim(r, 1);
        return {
          code: NOT_SET.has(code) ? null : code,
          name: NOT_SET.has(name) ? 'Unknown' : name,
          activeUsers: num(r, 0),
        };
      })
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 10),
    devices: (devices?.rows ?? []).map((r) => ({ category: dim(r, 0), activeUsers: num(r, 0) })),
    demographics: { available, age: ageRows, gender: genderRows, ...(available ? {} : { note }) },
  };
}

// ─── Fetch ───────────────────────────────────────────────────────────

/** One batchRunReports call against GA_PROPERTY_ID, as a Section. */
async function runBatch<T>(
  env: Record<string, string | undefined>,
  requests: object[],
  summarise: (json: Ga4BatchResponse, now: Date) => T,
): Promise<Section<T>> {
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
      body: JSON.stringify({ requests }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 403) {
      return {
        state: 'not_configured',
        missing: [],
        hint: `GA4 refused the service account (403). Add its client_email as a Viewer on the ${metricsApp(env).name} GA4 property.`,
      };
    }
    if (!res.ok) return { state: 'error', message: `GA4 ${res.status}: ${(await res.text()).slice(0, 160)}` };
    return { state: 'ok', data: summarise((await res.json()) as Ga4BatchResponse, new Date()) };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}

export function fetchGa4Summary(env: Record<string, string | undefined> = process.env): Promise<Section<Ga4Summary>> {
  return runBatch(env, ga4Requests(), summariseGa4);
}

/** How long an empty age/gender answer is trusted before asking again. */
export const DEMOGRAPHICS_RECHECK_S = 7 * 86_400;
const demographicsEmptyKey = (propertyId: string) => `ga4-demographics-empty:v1:${propertyId}`;

/** GA4's 429 for the thresholded-requests quota (age, gender), as opposed to the core one. */
export const isThresholdedQuota = (message: string) => /\b429\b/.test(message) && /thresholded/i.test(message);

/**
 * A second batch: batchRunReports takes at most five reports, and the traffic
 * batch has four.
 *
 * Age and gender are only asked for while they might answer. When both come
 * back empty (Google signals off, or a property under the thresholds) that is
 * remembered in the Runtime Cache for a week, and until then the batch leaves
 * them out and spends none of the thresholded quota. When that quota is
 * already exhausted, the batch is retried without them, so countries and
 * devices still show.
 */
export async function fetchAudienceSummary(
  env: Record<string, string | undefined> = process.env,
  cache: RuntimeCache = getCache(),
): Promise<Section<AudienceSummary>> {
  const propertyId = env.GA_PROPERTY_ID?.trim();
  const key = propertyId ? demographicsEmptyKey(propertyId) : null;
  // A cache error only costs the demographic reports, never the section
  const knownEmpty = key ? await cache.get(key).then(Boolean, () => false) : false;

  if (knownEmpty) return runBatch(env, audienceRequests(false), (json, now) => summariseAudience(json, now, DEMOGRAPHICS_SKIPPED_NOTE));

  const result = await runBatch(env, audienceRequests(true), summariseAudience);
  if (result.state === 'error' && isThresholdedQuota(result.message)) {
    return runBatch(env, audienceRequests(false), (json, now) => summariseAudience(json, now, DEMOGRAPHICS_QUOTA_NOTE));
  }
  if (key && result.state === 'ok' && !result.data.demographics.available) {
    await cache.set(key, new Date().toISOString(), { ttl: DEMOGRAPHICS_RECHECK_S, name: 'ga4-demographics-empty' }).catch(() => undefined);
  }
  return result;
}
