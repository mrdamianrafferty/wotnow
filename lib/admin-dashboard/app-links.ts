/**
 * Where the family dashboard sends you next: each app's own detailed admin
 * dashboard, and the Sentry project behind an "errors rising" alert.
 *
 * Defaults are the verified pages (28 Oct 2026). METRICS_<ENVKEY>_DASHBOARD_URL
 * overrides one app's, so a moved page needs an env change, not a deploy.
 * An app with no dashboard (Grow Daisy for now) has no link at all.
 */

import type { FamilyAppId } from './family';
import type { AttentionItem } from './attention';

/** Same-site pages are relative and open in this tab; anything else opens in a new one. */
export const APP_DASHBOARDS: Record<FamilyAppId, string | null> = {
  godaisy: '/admin/dashboard',
  growdaisy: null,
  risedaisy: 'https://www.risedaisy.com/admin/dashboard',
  hungerford: 'https://hungerford.risedaisy.com/admin',
  findr: 'https://fishfindr.eu/findr/admin/dashboard',
  flycast: 'https://flycastcoach.com/admin',
  grewp: 'https://grewp.org/en/admin/dashboard',
};

/** Sentry project slugs (org go-daisy). Hungerford shares Rise Daisy's project. */
export const SENTRY_PROJECTS: Record<FamilyAppId, string | null> = {
  godaisy: 'godaisy-nextjs',
  growdaisy: null,
  risedaisy: 'rise-daisy',
  hungerford: 'rise-daisy',
  findr: 'findr-nextjs',
  flycast: 'fly-cast',
  grewp: 'grewp-nextjs',
};

export const SENTRY_ORG_URL = 'https://go-daisy.sentry.io';

/** The env var that overrides an app's dashboard URL, e.g. METRICS_RISEDAISY_DASHBOARD_URL. */
export const dashboardEnvVar = (envKey: string) => `METRICS_${envKey}_DASHBOARD_URL`;

/** Only an https URL or a site-relative path is a usable link; anything else is ignored. */
export function cleanDashboardUrl(raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (/^\/(?!\/)/.test(v)) return v;
  try {
    return new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
}

/** The override if it is usable, else the default; null when the app has no dashboard. */
export function dashboardUrl(id: FamilyAppId, envKey: string, env: Record<string, string | undefined> = {}): string | null {
  return cleanDashboardUrl(env[dashboardEnvVar(envKey)]) ?? APP_DASHBOARDS[id];
}

export const isExternalUrl = (href: string) => !href.startsWith('/');

/** The project's issue list: the slug route, which needs no numeric project id. */
export function sentryUrl(id: FamilyAppId): string | null {
  const slug = SENTRY_PROJECTS[id];
  return slug ? `${SENTRY_ORG_URL}/projects/${slug}/` : null;
}

export interface ActionLink {
  text: string;
  href: string;
  external: boolean;
  /** Spoken label; says when it opens a new tab. */
  aria: string;
}

export function makeAction(text: string, href: string): ActionLink {
  const external = isExternalUrl(href);
  return { text, href, external, aria: external ? `${text} (opens in a new tab)` : text };
}

/**
 * The link(s) that take you to where an alert can be acted on. `urls` maps an
 * app to its resolved dashboard URL (AppSnapshot.dashboardUrl); an app without
 * one contributes nothing.
 */
export function attentionActions(
  item: Pick<AttentionItem, 'rule' | 'apps'> & { label?: string },
  urls: Partial<Record<FamilyAppId, string | null | undefined>>,
  names: Partial<Record<FamilyAppId, string>> = {},
): ActionLink[] {
  const dash = (id: FamilyAppId) => {
    const href = urls[id];
    return href ? makeAction(`Open ${names[id] ?? id} dashboard`, href) : null;
  };
  if (item.rule === 'errors_rising') {
    const out: ActionLink[] = [];
    const seen = new Set<string>();
    for (const id of item.apps) {
      const href = sentryUrl(id);
      if (href && !seen.has(href)) {
        seen.add(href);
        out.push(makeAction('Open Sentry issues', href));
      }
    }
    return out;
  }
  // The Android alert is about the store reports, which Go Daisy's dashboard reads
  const apps: FamilyAppId[] = item.rule === 'android_missing' ? ['godaisy'] : item.apps;
  return apps.map(dash).filter((a): a is ActionLink => a !== null);
}
