/**
 * Per-app funnel and error rate for /admin/apps (insights plan items #12 and
 * #14). Pure: built only from figures already in an AppSnapshot.
 *
 * Funnel: visitors → store downloads → trials → paid.
 *   - visitors: Vercel Web Analytics, last 28 complete days (vercel-analytics.ts)
 *   - downloads: iOS + Android first-time downloads, last 30 complete days
 *     (PlatformDownloads.total30d: the stores' own window, the nearest the
 *     metrics-summary contract has to 28)
 *   - trials, paid: trials and subscriptions active now, in-app (RevenueCat or
 *     Stripe) plus Stripe web plans. The contract has no 28-day trial starts
 *     or conversions, so these are standing counts, not one cohort: a step's
 *     rate is shown only when it is a plausible share (≤ 100%).
 *
 * A step an app cannot report is "not tracked", never 0. A step that does not
 * exist for the app is left out: no store for a web-first app without store
 * data (Grewp), no trials or paid for a club app that takes no money
 * (Hungerford). A shared RevenueCat project's total is not this app's, so it
 * is not tracked either.
 *
 * Error rate: stored (accepted) Sentry errors over the 7-day window ÷ adjusted
 * active users over the same 7 days (automated.ts), per 100 users.
 */

import { adjustUsers } from './automated';
import { FAMILY_APPS, isProjectTotal, type AppSnapshot, type FamilyAppId, type Part } from './family';

/** Apps that live on the web first: no store step unless they actually report downloads. */
export const WEB_FIRST: ReadonlySet<FamilyAppId> = new Set(['grewp']);

export type FunnelKey = 'visitors' | 'downloads' | 'trials' | 'paid';

export interface FunnelStep {
  key: FunnelKey;
  label: string;
  /** What the figure covers, e.g. "28 days" or "active now". */
  window: string;
  /** Null when not tracked. */
  value: number | null;
  /** Why it is not tracked, or what it is made of. */
  note: string | null;
}

export interface FunnelLink {
  /** % of the previous step reaching this one; null when either is missing, the previous is 0, or it would exceed 100%. */
  rate: number | null;
  /** Why there is no rate, when there could have been one. */
  note: string | null;
}

export interface AppFunnel {
  steps: FunnelStep[];
  /** links[i] joins steps[i] and steps[i + 1]. */
  links: FunnelLink[];
}

const okData = <T>(p: Part<T> | null | undefined): T | null => (p && p.state === 'ok' ? p.data : null);

function why(p: Part<unknown> | null | undefined, fallback: string): string {
  if (!p) return fallback;
  if (p.state === 'error') return `error: ${p.message}`;
  if (p.state === 'not_configured') return p.missing.length ? `${p.missing.join(', ')} not set` : (p.note ?? fallback);
  return fallback;
}

function visitorsStep(app: AppSnapshot): FunnelStep {
  const v = okData(app.vercel);
  const value = v?.visitors28d ?? null;
  return {
    key: 'visitors',
    label: 'Visitors',
    window: '28 days',
    value,
    note: value !== null ? 'Vercel Web Analytics' : v ? 'no 28-day count yet' : why(app.vercel, 'Vercel not reported'),
  };
}

/** Null when the app has no store presence and none should be shown. */
function downloadsStep(app: AppSnapshot): FunnelStep | null {
  const family = FAMILY_APPS.find((f) => f.id === app.id);
  const platforms = family?.platforms ?? ['ios', 'android'];
  const d = okData(app.downloads);
  const parts = platforms.map((p) => ({ p, n: d?.total30d?.[p] ?? null }));
  const known = parts.filter((x): x is { p: 'ios' | 'android'; n: number } => x.n !== null);
  const value = known.length ? known.reduce((a, x) => a + x.n, 0) : null;
  if (platforms.length === 0 || (WEB_FIRST.has(app.id) && value === null)) return null;
  const label = (p: string) => (p === 'ios' ? 'iOS' : 'Android');
  const missing = parts.filter((x) => x.n === null).map((x) => label(x.p));
  return {
    key: 'downloads',
    label: 'Downloads',
    window: '30 days',
    value,
    note:
      value === null
        ? d
          ? '30-day totals not sent'
          : why(app.downloads, 'not reported')
        : missing.length
          ? `${known.map((x) => label(x.p)).join(' + ')} only; ${missing.join(' + ')} not tracked`
          : platforms.map(label).join(' + '),
  };
}

/** Trials or paid: in-app plus web, leaving out a shared project's total. Null when the app takes no money. */
function revenueStep(app: AppSnapshot, key: 'trials' | 'paid'): FunnelStep | null {
  const family = FAMILY_APPS.find((f) => f.id === app.id);
  const r = okData(app.revenue);
  if (family?.noRevenue || r?.source === 'none') return null;
  const field = key === 'trials' ? 'activeTrials' : 'activeSubscriptions';
  const w = app.webRevenue ? okData(app.webRevenue) : null;
  const shared = !!r && isProjectTotal(r, field);
  const inApp = r && !shared ? r[field] : null;
  const web = w ? (key === 'trials' ? w.trialing : w.activeSubscriptions) : null;
  const known = [inApp, web].filter((n): n is number => n !== null);
  const value = known.length ? known.reduce((a, b) => a + b, 0) : null;
  const source = r ? (r.source === 'revenuecat' ? 'RevenueCat' : r.source === 'stripe' ? 'Stripe' : r.source) : null;
  return {
    key,
    label: key === 'trials' ? 'Trials' : 'Paid',
    window: 'active now',
    value,
    note:
      value === null
        ? shared
          ? 'only the shared project total is known'
          : r
            ? `${source} does not report ${key}`
            : why(app.revenue, 'not reported')
        : [inApp !== null && source, web !== null && 'Stripe web'].filter(Boolean).join(' + ') || null,
  };
}

function link(from: FunnelStep, to: FunnelStep): FunnelLink {
  if (from.value === null || to.value === null) return { rate: null, note: null };
  if (from.value === 0) return { rate: null, note: `no ${from.label.toLowerCase()} to convert` };
  const rate = (to.value / from.value) * 100;
  if (rate > 100) return { rate: null, note: 'standing counts, not one cohort' };
  return { rate: rate >= 10 || rate === 0 ? Math.round(rate) : Math.round(rate * 10) / 10, note: null };
}

export function appFunnel(app: AppSnapshot): AppFunnel {
  const steps = [visitorsStep(app), downloadsStep(app), revenueStep(app, 'trials'), revenueStep(app, 'paid')].filter((s): s is FunnelStep => s !== null);
  return { steps, links: steps.slice(1).map((s, i) => link(steps[i], s)) };
}

export interface ErrorRate {
  /** Stored errors over the 7-day window; null when not reported. */
  errors: number | null;
  /** Adjusted active users over the same 7 days; null when not reported. */
  users: number | null;
  /** True when the user figure had a country left out (automated.ts). */
  adjusted: boolean;
  /** Errors per 100 users, one decimal; null when either side is missing or there were no users. */
  per100: number | null;
  /** Why there is no rate. */
  note: string | null;
}

export function errorRate(app: AppSnapshot): ErrorRate {
  const errors = okData(app.health)?.errors?.value ?? null;
  const uv = adjustUsers(app);
  const users = uv.headline?.value ?? null;
  const adjusted = uv.excluded > 0;
  if (errors === null) return { errors, users, adjusted, per100: null, note: `Errors: ${why(app.health, 'not reported')}` };
  if (users === null) return { errors, users, adjusted, per100: null, note: `Active users: ${why(app.analytics, 'not reported')}` };
  if (users === 0) return { errors, users, adjusted, per100: null, note: 'no active users this week' };
  return { errors, users, adjusted, per100: Math.round((errors / users) * 1000) / 10, note: null };
}
