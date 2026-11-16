/**
 * GA4 Measurement Protocol — money events sent from the server
 * ─────────────────────────────────────────────────────────────────────────────
 * Trials and payments are recorded from the payment webhooks (Stripe,
 * RevenueCat), not from the browser: the webhook is the only place that knows
 * a payment really happened, and it reaches GA whatever the ad blocker or
 * WebView does.
 *
 *   start_trial   { product, product_kind, store, value 0 }   a free trial began
 *   purchase      { transaction_id, value, currency, product, product_kind, billing_reason, store }
 *
 * GA de-duplicates `purchase` on transaction_id, so a webhook replay doesn't
 * double-count revenue.
 *
 * The webhooks serve two properties, so each event names its app and goes to
 * that app's measurement ID with that property's own API secret:
 *   godaisy → G-0YDQB1067L, GA_MP_API_SECRET_GODAISY
 *   grow    → G-S895QHFGQH, GA_MP_API_SECRET_GROW
 * (GA Admin → Data streams → <stream> → Measurement Protocol API secrets.)
 * Without the secret, or outside VERCEL_ENV=production, every call is a no-op,
 * so this ships dark until the owner sets them.
 *
 * Never throws and never waits more than 2.5 s: a webhook's real job is the
 * database write, and analytics must not turn a payment into a retry.
 */

import { createHash } from 'node:crypto';
import { GA_MEASUREMENT_IDS, type GaApp } from './gaIds';

const ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const TIMEOUT_MS = 2500;

export const MP_SECRET_ENV: Record<GaApp, string> = {
  godaisy: 'GA_MP_API_SECRET_GODAISY',
  grow: 'GA_MP_API_SECRET_GROW',
};

/** Same value the browser sends as user_id (lib/analytics/track.ts analyticsUserId). */
export function analyticsUserIdServer(app: GaApp, supabaseUserId: string): string {
  return createHash('sha256').update(`${app}:${supabaseUserId}`).digest('hex').slice(0, 32);
}

/**
 * MP needs a client_id. Use the browser's own (`_ga` cookie, passed through
 * checkout metadata as `ga_client_id`) when we have it, so the event joins that
 * session; otherwise a stable id derived from the user, which still joins on
 * user_id.
 */
export function clientIdFor(app: GaApp, gaClientId: string | null | undefined, supabaseUserId: string | null | undefined): string {
  if (gaClientId && /^\d+\.\d+$/.test(gaClientId)) return gaClientId;
  if (supabaseUserId) {
    const n = parseInt(analyticsUserIdServer(app, supabaseUserId).slice(0, 12), 16);
    return `${n}.1`;
  }
  return `${Math.floor(Math.random() * 2 ** 31)}.${Math.floor(Date.now() / 1000)}`;
}

export type ServerEventName = 'start_trial' | 'purchase';

export interface ServerEvent {
  app: GaApp;
  name: ServerEventName;
  params: Record<string, string | number | undefined>;
}

export interface ServerEventOpts {
  supabaseUserId?: string | null;
  gaClientId?: string | null;
  platform?: 'web' | 'ios' | 'android';
}

export function buildPayload(event: ServerEvent, opts: ServerEventOpts): Record<string, unknown> {
  const params: Record<string, string | number> = { engagement_time_msec: 1 };
  for (const [k, v] of Object.entries(event.params)) if (v !== undefined) params[k] = v;
  const body: Record<string, unknown> = {
    client_id: clientIdFor(event.app, opts.gaClientId, opts.supabaseUserId),
    events: [{ name: event.name, params }],
  };
  if (opts.supabaseUserId) body.user_id = analyticsUserIdServer(event.app, opts.supabaseUserId);
  if (opts.platform) body.user_properties = { platform: { value: opts.platform } };
  return body;
}

/** The URL to post to, or null when this environment must not send. */
export function collectUrl(app: GaApp, env: Record<string, string | undefined>): string | null {
  const secret = env[MP_SECRET_ENV[app]]?.trim();
  if (!secret || env.VERCEL_ENV !== 'production') return null;
  return `${ENDPOINT}?measurement_id=${GA_MEASUREMENT_IDS[app]}&api_secret=${encodeURIComponent(secret)}`;
}

export async function sendServerEvent(
  event: ServerEvent,
  opts: ServerEventOpts = {},
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  try {
    const url = collectUrl(event.app, env);
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(event, opts)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.warn(`[ga-mp] ${event.app} ${event.name} not sent:`, err instanceof Error ? err.message : err);
  }
}

/** Stripe minor units → GA value (major units). Zero-decimal currencies left as is. */
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
export function stripeAmountToValue(amount: number | null | undefined, currency: string | null | undefined): number {
  if (!amount) return 0;
  return ZERO_DECIMAL.has((currency ?? '').toLowerCase()) ? amount : Math.round(amount) / 100;
}
