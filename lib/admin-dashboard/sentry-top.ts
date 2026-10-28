/**
 * Each app's top unresolved Sentry issue for /admin/apps: the one with the
 * most events over the last 7 days, the same window as the errors-per-user
 * figure (funnel.ts). Asked from here, once per app, with Go Daisy's
 * SENTRY_ADMIN_TOKEN, so no sibling app's endpoint changes.
 *
 *   GET /projects/{org}/{slug}/            → numeric id (cached per instance)
 *   GET /organizations/{org}/issues/?project={id}&query=is:unresolved&statsPeriod=7d&sort=freq&limit=1
 *
 * Which project: SENTRY_PROJECTS in app-links.ts (org go-daisy). Hungerford
 * reports to Rise Daisy's project, so its top issue is Rise Daisy's too and
 * says so. The result rides in the app's snapshot, so the per-app cache
 * (family-cache.ts) keeps it for the same hour. A failure is one line on that
 * app's card, never a failed page.
 *
 * The token must be able to read every family project: org:read,
 * project:read and event:read across the go-daisy organisation.
 */

import { SENTRY_PROJECTS } from './app-links';
import { FAMILY_APPS, cleanMessage, type AppSnapshot, type FamilyApp, type FamilyAppId, type Part, type TopIssuePart } from './family';

const SENTRY_API = 'https://sentry.io/api/0';
const DEFAULT_ORG = 'go-daisy';
const TIMEOUT_MS = 8_000;
export const SENTRY_TOKEN_VAR = 'SENTRY_ADMIN_TOKEN';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

/** Another app whose Sentry project this app reports to, by name; null when the project is its own. */
export function sharedWith(id: FamilyAppId): string | null {
  const slug = SENTRY_PROJECTS[id];
  if (!slug) return null;
  // The first app listed with the slug owns it
  const owner = FAMILY_APPS.find((f) => SENTRY_PROJECTS[f.id] === slug);
  return owner && owner.id !== id ? owner.name : null;
}

/** The first issue in a Sentry issues list → the panel's shape; null when the list is empty or unreadable. */
export function readTopIssue(body: unknown, project: string, shared: string | null): TopIssuePart | null {
  const first = Array.isArray(body) ? body[0] : null;
  if (!isObj(first)) return null;
  const title = str(first.title);
  const permalink = str(first.permalink);
  if (!title || !permalink || !/^https:\/\//.test(permalink)) return null;
  const count = Number.parseInt(String(first.count ?? '0'), 10);
  return { title, shortId: str(first.shortId), count: Number.isFinite(count) ? count : 0, permalink, project, sharedWith: shared };
}

/** Project ids by slug, resolved once per instance. */
const projectIds = new Map<string, string>();

class SentryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function fetchTopIssue(
  app: FamilyApp,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<Part<TopIssuePart>> {
  const slug = SENTRY_PROJECTS[app.id];
  if (!slug) return { state: 'not_configured', missing: [], note: `${app.name} has no Sentry project` };
  const token = (env.SENTRY_ADMIN_TOKEN || env.SENTRY_AUTH_TOKEN || '').trim();
  if (!token) return { state: 'not_configured', missing: [SENTRY_TOKEN_VAR] };
  const org = env.SENTRY_ORG?.trim() || DEFAULT_ORG;

  const get = async (path: string): Promise<unknown> => {
    const res = await fetchImpl(`${SENTRY_API}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) throw new SentryError(`Sentry ${path.split('?')[0]} → ${res.status}`, res.status);
    return res.json();
  };

  try {
    let id = projectIds.get(`${org}/${slug}`);
    if (!id) {
      const project = await get(`/projects/${encodeURIComponent(org)}/${encodeURIComponent(slug)}/`);
      id = isObj(project) ? (str(project.id) ?? undefined) : undefined;
      if (!id) return { state: 'error', message: `Sentry project “${slug}” has no id` };
      projectIds.set(`${org}/${slug}`, id);
    }
    const issues = await get(
      `/organizations/${encodeURIComponent(org)}/issues/?${new URLSearchParams({ project: id, query: 'is:unresolved', statsPeriod: '7d', sort: 'freq', limit: '1' })}`,
    );
    const top = readTopIssue(issues, slug, sharedWith(app.id));
    // An empty list is a real answer: nothing unresolved had events this week
    if (!top && Array.isArray(issues) && issues.length === 0) return { state: 'not_configured', missing: [], note: 'No unresolved issues in 7 days' };
    return top ? { state: 'ok', data: top } : { state: 'error', message: 'Unreadable Sentry issues response' };
  } catch (err) {
    if (err instanceof SentryError && (err.status === 401 || err.status === 403)) {
      return {
        state: 'not_configured',
        missing: [SENTRY_TOKEN_VAR],
        note: `Sentry refused the token for ${slug} (${err.status}): it needs event:read on that project`,
      };
    }
    if (err instanceof SentryError && err.status === 404) return { state: 'error', message: `Sentry has no project “${slug}” in ${org}` };
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return { state: 'error', message: cleanMessage(timedOut ? 'Sentry did not answer in time' : err) };
  }
}

/** The snapshot with its top Sentry issue attached; an app the dashboard could not reach gets none. */
export async function withSentryTop(snapshot: AppSnapshot, app: FamilyApp, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<AppSnapshot> {
  if (snapshot.status !== 'ok') return snapshot;
  return { ...snapshot, topIssue: await fetchTopIssue(app, env, fetchImpl) };
}
