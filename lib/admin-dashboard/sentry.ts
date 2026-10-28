/**
 * Sentry error volume, crash-free sessions and top unresolved issues for
 * /admin/dashboard. Same queries as Grewp's and Rise Daisy's dashboards.
 *
 * Which project: this repo also serves Findr and Grow, and SENTRY_PROJECT is
 * the source-map upload target, not necessarily Go Daisy's. Go Daisy's
 * browser errors go to NEXT_PUBLIC_SENTRY_DSN_GODAISY (instrumentation-client),
 * and a DSN ends in its project's numeric id, so that is what is read, with
 * SENTRY_DASHBOARD_PROJECT_ID as an override. Server-side errors use SENTRY_DSN
 * (same project) and are counted here.
 *
 * The token is read from SENTRY_ADMIN_TOKEN first: SENTRY_AUTH_TOKEN is the
 * source-map upload token, which usually cannot read issues or stats. Needs
 * org:read, project:read and event:read.
 */

import { errorMessage, weekMetric, type Section, type SentrySummary } from './types';
import { metricsApp } from './app-identity';

const SENTRY_API = 'https://sentry.io/api/0';
const DEFAULT_ORG = 'go-daisy';

interface StatsV2Response {
  intervals?: string[];
  groups?: { series?: Record<string, number[]> }[];
}
interface SessionsResponse {
  groups?: { totals?: Record<string, number | null> }[];
}
interface IssueResponse {
  id: string;
  title: string;
  level?: string;
  count?: string;
  lastSeen: string;
  permalink: string;
}

/** Daily error counts for complete UTC days only: today's partial bucket would read as a drop. */
export function dailyErrorCounts(stats: StatsV2Response | null, now: Date): number[] {
  const series = stats?.groups?.[0]?.series?.['sum(quantity)'] ?? [];
  const intervals = stats?.intervals ?? [];
  const today = now.toISOString().slice(0, 10);
  return series.filter((_, i) => !(intervals[i] ?? '').startsWith(today));
}

export function summariseSentry(stats: StatsV2Response | null, sessions: SessionsResponse | null, issues: IssueResponse[] | null, now: Date): SentrySummary {
  const rate = sessions?.groups?.[0]?.totals?.['crash_free_rate(session)'];
  return {
    errors: weekMetric(dailyErrorCounts(stats, now)),
    crashFreeRate: typeof rate === 'number' ? Math.round(rate * 10000) / 100 : null,
    topIssues: (issues ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      level: i.level ?? 'error',
      count: Number.parseInt(i.count ?? '0', 10) || 0,
      lastSeen: i.lastSeen,
      permalink: i.permalink,
    })),
  };
}

/** The numeric project id at the end of a Sentry DSN, e.g. https://key@o1.ingest.sentry.io/4506 → 4506. */
export function projectIdFromDsn(dsn: string | undefined): string | null {
  const match = dsn?.trim().match(/^https?:\/\/[^/]+\/(?:.*\/)?(\d+)\/?$/);
  return match ? match[1] : null;
}

export async function fetchSentrySummary(env: Record<string, string | undefined> = process.env): Promise<Section<SentrySummary>> {
  const token = (env.SENTRY_ADMIN_TOKEN || env.SENTRY_AUTH_TOKEN || '').trim();
  const app = metricsApp(env);
  const projectId = env.SENTRY_DASHBOARD_PROJECT_ID?.trim() || (app.sentryDsnVar ? projectIdFromDsn(env[app.sentryDsnVar]) : null);
  if (!projectId && !app.sentryDsnVar) {
    return { state: 'not_configured', missing: [], hint: `${app.name} has no Sentry project yet.` };
  }
  const org = env.SENTRY_ORG?.trim() || DEFAULT_ORG;
  const missing = [!token && 'SENTRY_ADMIN_TOKEN', !projectId && app.sentryDsnVar].filter(Boolean) as string[];
  if (missing.length || !projectId) return { state: 'not_configured', missing };

  const get = async <T>(path: string): Promise<{ status: number; body: T | null }> => {
    const res = await fetch(`${SENTRY_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[admin/metrics] Sentry ${path.split('?')[0]} → ${res.status}`);
      return { status: res.status, body: null };
    }
    return { status: res.status, body: (await res.json()) as T };
  };

  try {
    // All three take the numeric project id; without it they cover the whole org.
    const [issues, stats, sessions] = await Promise.all([
      get<IssueResponse[]>(
        `/organizations/${org}/issues/?${new URLSearchParams({ project: projectId, query: 'is:unresolved', statsPeriod: '14d', sort: 'freq', limit: '5' })}`,
      ),
      get<StatsV2Response>(
        `/organizations/${org}/stats_v2/?${new URLSearchParams({ field: 'sum(quantity)', category: 'error', outcome: 'accepted', interval: '1d', statsPeriod: '15d', project: projectId })}`,
      ),
      get<SessionsResponse>(
        `/organizations/${org}/sessions/?${new URLSearchParams({ field: 'crash_free_rate(session)', statsPeriod: '14d', interval: '1d', project: projectId })}`,
      ),
    ]);
    if (issues.status === 401 || issues.status === 403) {
      return {
        state: 'not_configured',
        missing: ['SENTRY_ADMIN_TOKEN'],
        hint: `Sentry refused the token (${issues.status}). It needs org:read, project:read and event:read in the "${org}" organisation.`,
      };
    }
    if (issues.status === 404) {
      return { state: 'not_configured', missing: ['SENTRY_ORG'], hint: `Sentry has no organisation "${org}" for this token.` };
    }
    // Issues are the core of the panel; a 400 on sessions (no session data) only blanks the crash-free rate.
    if (!issues.body) return { state: 'error', message: `Sentry issues ${issues.status}` };
    return { state: 'ok', data: summariseSentry(stats.body, sessions.body, issues.body, new Date()) };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}
