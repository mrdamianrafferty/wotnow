/**
 * Payment webhook payloads → GA4 server events. Pure, so the mapping is tested
 * without Stripe or RevenueCat (the webhooks call these, then sendServerEvent).
 *
 * Which property: Stripe objects carry metadata.app ('godaisy_plus' /
 * 'grow_daisy'); RevenueCat products are classified by the webhook, which
 * already knows a Go Daisy+ product or tip from a Grow one.
 */

import type Stripe from 'stripe';
import type { GaApp } from './gaIds';
import { stripeAmountToValue, type ServerEvent, type ServerEventOpts } from './measurement-protocol';

export interface MappedServerEvent {
  event: ServerEvent;
  opts: ServerEventOpts;
}

/** The GA property a Stripe object belongs to, from its metadata.app. */
export function stripeAppOf(metadata: Stripe.Metadata | null | undefined): GaApp | null {
  if (metadata?.app === 'godaisy_plus') return 'godaisy';
  if (metadata?.app === 'grow_daisy') return 'grow';
  return null;
}

function productOf(app: GaApp, metadata: Stripe.Metadata | null | undefined): string {
  const tier = metadata?.tier || (app === 'godaisy' ? 'plus' : 'sprout');
  const billing = metadata?.billing_type;
  return billing ? `${tier}_${billing}` : tier;
}

function stripeOpts(metadata: Stripe.Metadata | null | undefined): ServerEventOpts {
  return {
    supabaseUserId: metadata?.supabase_user_id ?? null,
    gaClientId: metadata?.ga_client_id ?? null,
    platform: 'web',
  };
}

/** start_trial for a subscription that was just created in a trial. */
export function stripeTrialStarted(sub: Pick<Stripe.Subscription, 'status' | 'metadata' | 'currency'>): MappedServerEvent | null {
  const app = stripeAppOf(sub.metadata);
  if (!app || sub.status !== 'trialing') return null;
  return {
    event: {
      app,
      name: 'start_trial',
      params: {
        product: productOf(app, sub.metadata),
        product_kind: 'subscription',
        store: 'stripe',
        value: 0,
        currency: (sub.currency || 'eur').toUpperCase(),
      },
    },
    opts: stripeOpts(sub.metadata),
  };
}

/** purchase for a paid subscription invoice (first payment and each renewal). */
export function stripeInvoicePurchase(
  invoice: Pick<Stripe.Invoice, 'id' | 'amount_paid' | 'currency' | 'billing_reason'>,
  sub: Pick<Stripe.Subscription, 'metadata'>,
): MappedServerEvent | null {
  const app = stripeAppOf(sub.metadata);
  // A £0 invoice (the trial's opening invoice, a 100% voucher) is not revenue.
  if (!app || !invoice.id || !invoice.amount_paid) return null;
  return {
    event: {
      app,
      name: 'purchase',
      params: {
        transaction_id: invoice.id,
        value: stripeAmountToValue(invoice.amount_paid, invoice.currency),
        currency: (invoice.currency || 'eur').toUpperCase(),
        product: productOf(app, sub.metadata),
        product_kind: 'subscription',
        billing_reason: invoice.billing_reason ?? undefined,
        store: 'stripe',
      },
    },
    opts: stripeOpts(sub.metadata),
  };
}

/** purchase for a one-off Checkout payment (Grow lifetime). */
export function stripeLifetimePurchase(
  session: Pick<Stripe.Checkout.Session, 'id' | 'mode' | 'payment_status' | 'payment_intent' | 'amount_total' | 'currency' | 'metadata'>,
): MappedServerEvent | null {
  const app = stripeAppOf(session.metadata);
  if (!app || session.mode !== 'payment' || session.payment_status !== 'paid' || !session.amount_total) return null;
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  return {
    event: {
      app,
      name: 'purchase',
      params: {
        transaction_id: pi || session.id,
        value: stripeAmountToValue(session.amount_total, session.currency),
        currency: (session.currency || 'eur').toUpperCase(),
        product: `${session.metadata?.tier || 'sprout'}_lifetime`,
        product_kind: 'lifetime',
        billing_reason: 'lifetime',
        store: 'stripe',
      },
    },
    opts: stripeOpts(session.metadata),
  };
}

export interface RevenueCatEventLike {
  id: string;
  type: string;
  app_user_id: string;
  product_id: string;
  period_type?: 'NORMAL' | 'TRIAL' | 'INTRO';
  environment?: 'SANDBOX' | 'PRODUCTION';
  store?: string;
  price_in_purchased_currency?: number;
  currency?: string;
  transaction_id?: string;
}

/**
 * start_trial / purchase from a RevenueCat webhook event. `kind` is what the
 * webhook already decided the product is. Sandbox purchases never count.
 */
export function revenueCatServerEvent(
  rc: RevenueCatEventLike,
  app: GaApp,
  kind: 'subscription' | 'tip' | 'lifetime',
): MappedServerEvent | null {
  if (rc.environment === 'SANDBOX') return null;
  const platform = rc.store === 'APP_STORE' ? 'ios' : rc.store === 'PLAY_STORE' ? 'android' : 'web';
  const opts: ServerEventOpts = { supabaseUserId: rc.app_user_id, platform };
  const store = (rc.store || 'unknown').toLowerCase();

  if (rc.type === 'INITIAL_PURCHASE' && rc.period_type === 'TRIAL') {
    return {
      event: { app, name: 'start_trial', params: { product: rc.product_id, product_kind: kind, store, value: 0, currency: rc.currency } },
      opts,
    };
  }
  if (!['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE'].includes(rc.type)) return null;
  const value = rc.price_in_purchased_currency ?? 0;
  if (!(value > 0)) return null;
  return {
    event: {
      app,
      name: 'purchase',
      params: {
        transaction_id: rc.transaction_id || rc.id,
        value: Math.round(value * 100) / 100,
        currency: rc.currency,
        product: rc.product_id,
        product_kind: kind,
        billing_reason: rc.type === 'RENEWAL' ? 'renewal' : rc.type === 'NON_RENEWING_PURCHASE' ? 'one_off' : 'initial',
        store,
      },
    },
    opts,
  };
}
