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
 * Each app's answer is cached for an hour (five minutes when it failed), so
 * a page load does not spend seven apps' GA4 quota: see family-cache.ts.
 */

import type { RuntimeCache } from '@vercel/functions';
import { metricsApp } from './app-identity';
import { cachedSnapshot, claimRefresh } from './family-cache';
import { getMetricsSummary } from './metrics';
import { FAMILY_APPS, familyTotals, readAppSummary, unavailableSnapshot, type AppSnapshot, type FamilyApp, type FamilySummary } from './family';

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
  const apps = await Promise.all(
    FAMILY_APPS.map((app) => cachedSnapshot(app, () => fetchAppSnapshot(app, env), { bypass: state.refreshed, cache })),
  );
  return { generatedAt: new Date().toISOString(), refresh: state, apps, totals: familyTotals(apps) };
}
