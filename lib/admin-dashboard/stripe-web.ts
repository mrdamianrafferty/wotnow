/**
 * Stripe web subscriptions for an app that sells plans on the web (Grow
 * Daisy), as `webRevenue` in metrics-summary. Same shape as Rise Daisy's
 * StripeWebSummary, so the family dashboard reads both alike.
 *
 * The Stripe account is shared across the family, so subscriptions are
 * matched by the PRODUCTS behind the app's own recurring price ids, not by
 * price id: that keeps subscribers on a price that has since been retired.
 * RevenueCat does not see these, so nothing is counted twice.
 */

import { metricsApp } from './app-identity';
import { errorMessage, type Section } from './types';

export interface StripeWebSummary {
  activeSubscriptions: number;
  trialing: number;
  cancellingAtPeriodEnd: number;
  new28d: number;
  /** Monthly-normalised list price of active (not trialing) subscriptions, per currency, major units. */
  mrrByCurrency: { currency: string; mrr: number; subscriptions: number }[];
}

export interface StripePrice {
  id: string;
  product: string | { id: string };
  unit_amount: number | null;
  currency: string;
  recurring: { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } | null;
}

export interface StripeSubscription {
  id: string;
  status: string;
  created: number;
  cancel_at_period_end: boolean;
  items: { data: { quantity?: number; price: StripePrice }[] };
}

const productId = (p: StripePrice) => (typeof p.product === 'string' ? p.product : p.product.id);

/** Major units per month for one item. */
function monthly(price: StripePrice, quantity: number): number {
  if (!price.recurring || price.unit_amount === null) return 0;
  const perInterval = (price.unit_amount / 100) * quantity;
  const n = price.recurring.interval_count || 1;
  const perMonth = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 }[price.recurring.interval];
  return (perInterval * perMonth) / n;
}

export function summariseStripeWeb(subs: StripeSubscription[], products: Set<string>, now: Date): StripeWebSummary {
  const since28d = now.getTime() / 1000 - 28 * 86_400;
  const mine = subs.filter((s) => s.items.data.some((i) => products.has(productId(i.price))));
  const active = mine.filter((s) => s.status === 'active' || s.status === 'past_due');
  const mrr = new Map<string, { mrr: number; subscriptions: number }>();
  for (const s of active) {
    const items = s.items.data.filter((i) => products.has(productId(i.price)));
    const currency = items[0].price.currency.toUpperCase();
    const m = mrr.get(currency) ?? { mrr: 0, subscriptions: 0 };
    m.mrr += items.reduce((a, i) => a + monthly(i.price, i.quantity ?? 1), 0);
    m.subscriptions += 1;
    mrr.set(currency, m);
  }
  return {
    activeSubscriptions: active.length,
    trialing: mine.filter((s) => s.status === 'trialing').length,
    cancellingAtPeriodEnd: active.filter((s) => s.cancel_at_period_end).length,
    new28d: mine.filter((s) => s.created >= since28d).length,
    mrrByCurrency: [...mrr.entries()]
      .map(([currency, m]) => ({ currency, mrr: Math.round(m.mrr * 100) / 100, subscriptions: m.subscriptions }))
      .sort((a, b) => b.mrr - a.mrr),
  };
}

const STRIPE_API = 'https://api.stripe.com/v1';
const MAX_PAGES = 10;

/** Null when this app sells no web plans, so the summary leaves `webRevenue` out. */
export async function fetchStripeWebSummary(env: Record<string, string | undefined> = process.env): Promise<Section<StripeWebSummary> | null> {
  const app = metricsApp(env);
  if (app.stripePriceVars.length === 0) return null;
  const key = env.STRIPE_SECRET_KEY?.trim();
  const priceIds = app.stripePriceVars.map((v) => env[v]?.trim()).filter((v): v is string => !!v);
  const missing = [!key && 'STRIPE_SECRET_KEY', priceIds.length === 0 && app.stripePriceVars[0]].filter(Boolean) as string[];
  if (missing.length) return { state: 'not_configured', missing };

  const get = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${STRIPE_API}${path}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Stripe ${path.split('?')[0]} ${res.status}`);
    return (await res.json()) as T;
  };

  try {
    const prices = await Promise.all(priceIds.map((id) => get<StripePrice>(`/prices/${encodeURIComponent(id)}`)));
    const products = new Set(prices.map(productId));

    // Only the live statuses: the account is shared, and its cancelled history is long
    const subs: StripeSubscription[] = [];
    for (const status of ['active', 'trialing', 'past_due']) {
      let after: string | null = null;
      for (let page = 0; page < MAX_PAGES; page++) {
        const q = new URLSearchParams({ status, limit: '100' });
        if (after) q.set('starting_after', after);
        const body = await get<{ data: StripeSubscription[]; has_more: boolean }>(`/subscriptions?${q}`);
        subs.push(...body.data);
        if (!body.has_more || body.data.length === 0) break;
        after = body.data[body.data.length - 1].id;
      }
    }
    return { state: 'ok', data: summariseStripeWeb(subs, products, new Date()) };
  } catch (err) {
    return { state: 'error', message: errorMessage(err) };
  }
}
