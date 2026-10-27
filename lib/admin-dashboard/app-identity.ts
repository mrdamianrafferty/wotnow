/**
 * Which app this deployment reports for. One codebase ships two apps: the
 * `wotnow` Vercel project is Go Daisy and the `growdaisy` project is Grow
 * Daisy, with the same env var NAMES set to each app's own values. The
 * metrics-summary endpoint, the store-stats cron and the dashboard sources
 * read their app-specific defaults (store ids, RevenueCat app, Sentry
 * project, Stripe prices) from here rather than from two copies of the code.
 *
 * Resolution: METRICS_APP_ID if set, else the growdaisy project's id in
 * VERCEL_PROJECT_ID (a Vercel system env var), else Go Daisy.
 */

export type MetricsAppId = 'go_daisy' | 'grow_daisy';

export interface MetricsApp {
  /** Also the `app_id` in store_stats_daily and the summary's `app`. */
  id: MetricsAppId;
  name: string;
  /** App Store Connect app id (overridable with APP_STORE_APP_ID). */
  appleId: string;
  /** Google Play package (overridable with GOOGLE_PLAY_PACKAGE_NAME). */
  playPackage: string;
  /** This app inside RevenueCat project projb49b8cff, which holds both (overridable with REVENUECAT_APP_ID). */
  revenuecatAppId: string;
  /** The env var whose DSN names this app's Sentry project; null when it has none. */
  sentryDsnVar: string | null;
  /** Env vars holding this app's recurring Stripe web price ids; empty when it sells no web plans. */
  stripePriceVars: string[];
}

export const GROWDAISY_VERCEL_PROJECT_ID = 'prj_dGCj7klGydvZ3b4BoSC1W8blBoSL';

const APPS: Record<MetricsAppId, MetricsApp> = {
  go_daisy: {
    id: 'go_daisy',
    name: 'Go Daisy',
    appleId: '6755695873',
    playPackage: 'io.godaisy.app',
    revenuecatAppId: 'app7b23f455ba',
    sentryDsnVar: 'NEXT_PUBLIC_SENTRY_DSN_GODAISY',
    stripePriceVars: [],
  },
  grow_daisy: {
    id: 'grow_daisy',
    name: 'Grow Daisy',
    // apps.apple.com/gb/app/grow-daisy/id6756812661 (Apple lookup by bundle id io.growdaisy.app)
    appleId: '6756812661',
    playPackage: 'io.growdaisy.app',
    revenuecatAppId: 'appb6332dd627',
    // No Grow Daisy project in the go-daisy Sentry org; SENTRY_DASHBOARD_PROJECT_ID would still work
    sentryDsnVar: null,
    // Monthly and annual only: the lifetime prices are one-off payments, not MRR
    stripePriceVars: ['SPROUT', 'BLOOM', 'HARVEST', 'ORCHARD'].flatMap((tier) => [
      `STRIPE_GROW_${tier}_MONTHLY_PRICE_ID`,
      `STRIPE_GROW_${tier}_ANNUAL_PRICE_ID`,
    ]),
  },
};

export function metricsApp(env: Record<string, string | undefined> = process.env): MetricsApp {
  const explicit = env.METRICS_APP_ID?.trim();
  if (explicit === 'go_daisy' || explicit === 'grow_daisy') return APPS[explicit];
  if (env.VERCEL_PROJECT_ID?.trim() === GROWDAISY_VERCEL_PROJECT_ID) return APPS.grow_daisy;
  return APPS.go_daisy;
}
