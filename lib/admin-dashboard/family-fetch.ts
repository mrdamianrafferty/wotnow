/**
 * Server side of /admin/apps: ask every app in the family for its
 * metrics-summary, in parallel, each with its own short timeout, and fold the
 * answers with lib/admin-dashboard/family.ts.
 *
 * The app this deployment is (Go Daisy) is read in-process. Every other app,
 * Grow Daisy included, is called at
 * METRICS_<APP>_URL with `Authorization: Bearer $METRICS_<APP>_TOKEN`; the
 * tokens never leave this server. An app that is unset, slow, refusing or
 * malformed becomes one "unavailable" card, never a failed page.
 *
 * Each app's Vercel Web Analytics figures are added to its snapshot
 * (vercel-analytics.ts), and its top unresolved Sentry issue (sentry-top.ts);
 * both ride in the same cache entry.
 *
 * Each app's answer is cached for an hour (five minutes when it failed), so
 * a page load does not spend seven apps' GA4 quota: see family-cache.ts.
 */

import type { RuntimeCache } from '@vercel/functions';
import { metricsApp } from './app-identity';
import { cachedSnapshot, claimRefresh } from './family-cache';
import { getMetricsSummary } from './metrics';
import { withVercel } from './vercel-analytics';
import { withSentryTop } from './sentry-top';
import { withPlay } from './play-console';
import { getAppleLifetime } from './apple-lifetime';
import { dashboardUrl } from './app-links';
import { FAMILY_APPS, familyTotals, readAppSummary, unavailableSnapshot, withAppleLifetime, type AppSnapshot, type FamilyApp, type FamilySummary } from './family';

const TIMEOUT_MS = 8_000;

export async function fetchAppSnapshot(
  app: FamilyApp,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<AppSnapshot> {
  try {
    // The app this deployment is (Go Daisy on wotnow) is read in-process; its sibling in the same codebase is called like any other
    if (app.inProcess && app.inProcess === metricsApp(env).id) return readAppSummary(app, await getMetricsSummary());

    const urlVar = `METRICS_${app.envKey}_URL`;
    const tokenVar = `METRICS_${app.envKey}_TOKEN`;
    const url = env[urlVar]?.trim();
    const token = env[tokenVar]?.trim();
    const missing = [!url && urlVar, !token && tokenVar].filter(Boolean) as string[];
    if (missing.length) return unavailableSnapshot(app, 'not_configured', 'Not connected yet', missing);
    if (!/^https:\/\//.test(url!) && !/^http:\/\/localhost[:/]/.test(url!)) {
      return unavailableSnapshot(app, 'not_configured', `${urlVar} must be an https URL`, [urlVar]);
    }

    const res = await fetchImpl(url!, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) {
      return unavailableSnapshot(app, 'unavailable', `Refused the token (${res.status}). Check ${tokenVar} matches that app's DASHBOARD_READ_TOKEN.`);
    }
    if (!res.ok) return unavailableSnapshot(app, 'unavailable', `HTTP ${res.status}`);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return unavailableSnapshot(app, 'unavailable', 'Response was not JSON');
    }
    return readAppSummary(app, body);
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return unavailableSnapshot(app, 'unavailable', timedOut ? `No answer within ${TIMEOUT_MS / 1000} s` : err instanceof Error ? err.message : String(err));
  }
}

/**
 * The family summary, each app from the cache unless `refresh` is asked for
 * and the shared cooldown allows it (see family-cache.ts).
 */
export async function getFamilySummary(
  env: Record<string, string | undefined> = process.env,
  { refresh = false, cache }: { refresh?: boolean; cache?: RuntimeCache } = {},
): Promise<FamilySummary> {
  const state = await claimRefresh(refresh, { cache });
  // One Apple report covers every app, so it is asked once, alongside the apps, and cached on its own for twelve hours
  const [cached, appleLifetime] = await Promise.all([
    Promise.all(
      FAMILY_APPS.map((app) =>
        cachedSnapshot(app, async () => withPlay(await withSentryTop(await withVercel(await fetchAppSnapshot(app, env), app, env), app, env), app, env), { bypass: state.refreshed, cache }),
      ),
    ),
    getAppleLifetime(env, { bypass: state.refreshed, cache }),
  ]);
  const apps = appleLifetime.state === 'ok' ? cached.map((a) => withAppleLifetime(a, FAMILY_APPS.find((f) => f.id === a.id)!, appleLifetime.byApp)) : cached;
  // Attached after the cache so a changed METRICS_<APP>_DASHBOARD_URL shows at once
  const linked = apps.map((a) => ({ ...a, dashboardUrl: dashboardUrl(a.id, FAMILY_APPS.find((f) => f.id === a.id)?.envKey ?? '', env) }));
  const totals = familyTotals(apps);
  const lifetimeNote =
    appleLifetime.state === 'error'
      ? `App Store: ${appleLifetime.message}`
      : appleLifetime.state === 'not_configured'
        ? 'App Store: not configured'
        : totals.lifetime.ios === 0
          ? 'App Store: no sales for any of these apps in the reports'
          : null;
  return { generatedAt: new Date().toISOString(), refresh: state, apps: linked, totals, lifetimeNote };
}
