/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Serves Grow Daisy and Go Daisy+ ONLY, identified by metadata.app
 * ('grow_daisy' / 'godaisy_plus').
 *
 * It used to also carry a findr fallback for events with no `app` marker.
 * That was removed on 2026-08-23: findr has its own repo, endpoint and
 * `findr_stripe_subscriptions` table and reads entitlement only from
 * there. Because all the Daisy apps share ONE Stripe account and ONE
 * Supabase `profiles` table, that fallback was catching Rise Daisy's
 * events (which carry supabase_user_id but no `app`) and granting those
 * subscribers premium here. See belongsToThisApp() for the full account.
 *
 * Events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.trial_will_end (notification only; no tier change)
 * - customer.subscription.deleted
 * - checkout.session.completed (including one-time lifetime purchases)
 * - invoice.payment_failed (records + dunning email; does not downgrade)
 *
 * Grow Daisy events also dispatch transactional email via
 * lib/grow/sendSubscriptionEmail. Those calls are deliberately awaited but
 * never allowed to throw: the sender resolves to a result object on every
 * path, because a rejection here would return 500, and Stripe would then
 * retry the event and re-run the tier writes. An email outage must not
 * become a billing-state problem.
 *
 * NOTE: trial_will_end must be enabled on the Stripe webhook endpoint's
 * event list, or it will simply never arrive. Adding the case here is
 * necessary but not sufficient.
 *
 * @route POST /api/stripe/webhook
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GrowSubscriptionTier, getTierDisplayName } from '@/lib/grow/subscription';
import { GoDaisyTier } from '@/lib/godaisy/subscription';
import {
  sendTrialStarted,
  sendTrialEnding,
  sendSubscriptionConfirmed,
  sendSubscriptionCancelled,
  sendPaymentFailed,
  formatStripeAmount,
  formatEpochDate,
  type GrowLifecycleContext,
} from '@/lib/grow/sendSubscriptionEmail';

type SupabaseServerClient = SupabaseClient<unknown>;

type SubscriptionLegacyFields = {
  trial_end?: number | null;
  current_period_end?: number | null;
  discount?: Stripe.Discount | null;
};

/**
 * Current period end, in seconds since the epoch, or null.
 *
 * Stripe moved `current_period_end` off the Subscription and onto each
 * SubscriptionItem. The top-level field still arrives on older API versions —
 * which is why `SubscriptionLegacyFields` exists — but the Grow Daisy account
 * created on 2026-08-23 has no API version pinned on its webhook endpoint, so
 * it follows the account default and may not send it at all.
 *
 * Reading only the legacy field fails SILENTLY when it is absent: the event
 * still delivers 200, nothing errors, and `*_subscription_end` simply stops
 * being written. Prefer the item, fall back to the legacy field.
 */
function currentPeriodEnd(subscription: Stripe.Subscription): number | null {
  const item = subscription.items?.data?.[0] as
    | { current_period_end?: number | null }
    | undefined;
  const legacy = (subscription as Stripe.Subscription & SubscriptionLegacyFields)
    .current_period_end;
  return item?.current_period_end ?? legacy ?? null;
}

// Grow Daisy specific types
type GrowProfileUpdatePayload = {
  grow_subscription_tier: GrowSubscriptionTier;
  grow_subscription_type?: 'monthly' | 'annual' | 'lifetime';
  grow_subscription_start?: string;
  grow_subscription_end?: string | null;
  grow_stripe_subscription_id?: string | null;
  grow_trial_ends_at?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const GROW_WEBHOOK_SECRET = process.env.STRIPE_GROW_WEBHOOK_SECRET;

// Disable Next.js body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// =============================================================================
// GROW DAISY SPECIFIC HANDLERS
// =============================================================================

/**
 * Update Grow Daisy profile based on subscription status.
 */
async function updateGrowProfileFromSubscription(
  supabase: SupabaseServerClient,
  userId: string,
  subscription: Stripe.Subscription
) {
  const tier = (subscription.metadata?.tier as GrowSubscriptionTier) || 'sprout';
  const billingType = subscription.metadata?.billing_type as 'monthly' | 'annual' | undefined;
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const legacyFields = subscription as Stripe.Subscription & SubscriptionLegacyFields;

  const updateData: GrowProfileUpdatePayload = {
    grow_subscription_tier: isActive ? tier : 'seed',
    grow_subscription_type: billingType,
    grow_stripe_subscription_id: subscription.id,
    grow_subscription_start: new Date(subscription.created * 1000).toISOString(),
  };

  // Trial end date
  if (legacyFields.trial_end) {
    updateData.grow_trial_ends_at = new Date(legacyFields.trial_end * 1000).toISOString();
  }

  // Subscription end date
  const growPeriodEnd = currentPeriodEnd(subscription);
  if (subscription.cancel_at) {
    updateData.grow_subscription_end = new Date(subscription.cancel_at * 1000).toISOString();
  } else if (growPeriodEnd) {
    updateData.grow_subscription_end = new Date(growPeriodEnd * 1000).toISOString();
  }

  const { error } = await supabase
    .from('profiles')
    // @ts-expect-error - Supabase type inference issue with profile updates
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('[grow] Error updating profile:', error);
    throw error;
  }

  console.log(`[grow] Updated subscription for user ${userId}: tier=${tier}, status=${subscription.status}`);

  // Handle voucher if present
  if (subscription.metadata?.voucherCode && subscription.metadata?.voucherId) {
    await handleGrowVoucher(supabase, userId, subscription);
  }
}

/**
 * Update Grow Daisy profile for lifetime purchase (one-time payment).
 */
async function updateGrowProfileFromLifetime(
  supabase: SupabaseServerClient,
  userId: string,
  session: Stripe.Checkout.Session
) {
  const tier = (session.metadata?.tier as GrowSubscriptionTier) || 'sprout';

  const updateData: GrowProfileUpdatePayload = {
    grow_subscription_tier: tier,
    grow_subscription_type: 'lifetime',
    grow_subscription_start: new Date().toISOString(),
    grow_subscription_end: null, // Lifetime never expires
    grow_stripe_subscription_id: null, // No subscription ID for one-time
    grow_trial_ends_at: null,
  };

  const { error } = await supabase
    .from('profiles')
    // @ts-expect-error - Supabase type inference issue with profile updates
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('[grow] Error updating profile for lifetime:', error);
    throw error;
  }

  console.log(`[grow] Activated lifetime ${tier} for user ${userId}`);

  // Handle voucher if present
  if (session.metadata?.voucherCode && session.metadata?.voucherId) {
    await handleGrowVoucherFromSession(supabase, userId, session);
  }
}

/**
 * Handle voucher application for Grow subscriptions.
 */
async function handleGrowVoucher(
  supabase: SupabaseServerClient,
  userId: string,
  subscription: Stripe.Subscription
) {
  try {
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) return;

    const price = await stripe.prices.retrieve(priceId);
    const originalPrice = (price.unit_amount || 0) / 100;

    // Calculate discount
    const legacyFields = subscription as Stripe.Subscription & SubscriptionLegacyFields;
    const discountEntry = legacyFields.discount
      ?? subscription.discounts?.find(
        (entry): entry is Stripe.Discount => typeof entry !== 'string'
      );

    let finalPrice = originalPrice;
    // @ts-expect-error - Stripe Discount type
    if (discountEntry?.coupon) {
      // @ts-expect-error - Stripe Discount type
      const coupon = discountEntry.coupon;
      if (coupon.percent_off) {
        finalPrice = originalPrice * (1 - coupon.percent_off / 100);
      } else if (coupon.amount_off) {
        finalPrice = originalPrice - (coupon.amount_off / 100);
      }
    }

    // @ts-expect-error - RPC function not in generated types
    await supabase.rpc('apply_voucher', {
      voucher_id_input: subscription.metadata!.voucherId,
      user_id_input: userId,
      original_price_input: originalPrice,
      final_price_input: finalPrice,
    });

    console.log(`[grow] Applied voucher ${subscription.metadata!.voucherCode} for user ${userId}`);
  } catch (err) {
    console.error('[grow] Failed to apply voucher:', err);
  }
}

/**
 * Handle voucher application for lifetime purchases.
 */
async function handleGrowVoucherFromSession(
  supabase: SupabaseServerClient,
  userId: string,
  session: Stripe.Checkout.Session
) {
  try {
    const originalPrice = (session.amount_total || 0) / 100;
    const finalPrice = (session.amount_total || 0) / 100; // Already discounted

    // @ts-expect-error - RPC function not in generated types
    await supabase.rpc('apply_voucher', {
      voucher_id_input: session.metadata!.voucherId,
      user_id_input: userId,
      original_price_input: originalPrice,
      final_price_input: finalPrice,
    });

    console.log(`[grow] Applied voucher ${session.metadata!.voucherCode} for lifetime purchase`);
  } catch (err) {
    console.error('[grow] Failed to apply voucher for lifetime:', err);
  }
}

/**
 * Record Grow Daisy subscription event in audit log.
 */
async function recordGrowEvent(
  supabase: SupabaseServerClient,
  userId: string,
  eventType: string,
  stripeEventId: string,
  tier: GrowSubscriptionTier,
  eventData: Stripe.Checkout.Session | Stripe.Subscription
) {
  // `new_tier`, NOT `tier`. The two audit tables have divergent shapes —
  // godaisy_subscription_events has a `tier` column, grow_subscription_events
  // has old_tier/new_tier — and this function was written against the Go Daisy
  // shape. Postgres rejected every insert with "column tier does not exist",
  // the returned error was never inspected, and so from launch until
  // 2026-09-02 not one Stripe event was recorded here: the table held only
  // RevenueCat rows. The @ts-expect-error below is what hid it, by suppressing
  // the very mismatch that would have failed the build.
  const { error } = await supabase
    .from('grow_subscription_events')
    // @ts-expect-error - Supabase type inference issue with grow_subscription_events
    .insert({
      user_id: userId,
      event_type: eventType,
      stripe_event_id: stripeEventId,
      new_tier: tier,
      event_data: eventData as unknown,
    });

  if (error) {
    // Audit-log failure must not fail the webhook, but it must be visible.
    console.error(`[grow] Failed to record ${eventType} (${stripeEventId}):`, error.message);
  }
}

/**
 * Check if event is for Grow Daisy app.
 */
function isGrowDaisyEvent(metadata: Stripe.Metadata | null): boolean {
  return metadata?.app === 'grow_daisy';
}

// =============================================================================
// GROW DAISY TRANSACTIONAL EMAIL
// =============================================================================

/**
 * Billing facts for the email copy, read off the subscription's own price
 * rather than the GROW_TIERS price table. The table is in EUR only, whereas
 * Stripe charges in whatever currency the price is denominated in — quoting a
 * figure the customer will not see on their statement is worse than quoting
 * nothing.
 */
function growBillingFacts(subscription: Stripe.Subscription, locale: string) {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  const interval = price?.recurring?.interval;

  return {
    amount: formatStripeAmount(price?.unit_amount, price?.currency, locale),
    interval: interval === 'year' ? ('year' as const) : interval === 'month' ? ('month' as const) : null,
  };
}

/**
 * Which platform this subscriber bought on, which decides the cancellation
 * instructions. A Stripe subscription is by definition the web purchase path —
 * iOS purchases go through Apple and surface via the RevenueCat webhook, never
 * here. Telling a Stripe subscriber to cancel in iOS Settings (or the reverse)
 * sends them somewhere that cannot work.
 */
const STRIPE_PLATFORM = 'web' as const;

/** Tier label for copy, e.g. 'bloom' → 'Bloom'. */
function growTierName(tier: GrowSubscriptionTier): string {
  try {
    return getTierDisplayName(tier);
  } catch {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }
}

function growEmailContext(
  supabase: SupabaseServerClient,
  userId: string,
  eventId: string,
  subscriptionId: string | null
): GrowLifecycleContext {
  return {
    supabase: supabase as never,
    userId,
    platform: STRIPE_PLATFORM,
    stripeEventId: eventId,
    stripeSubscriptionId: subscriptionId,
  };
}

/**
 * Does this event actually belong to Go Daisy+ / Grow Daisy?
 *
 * All the Daisy apps (Rise Daisy, findr, Go Daisy, Grow Daisy) share ONE
 * Stripe account, so this endpoint receives EVERY app's events for the
 * types it subscribes to — not just its own. It also shares one Supabase
 * `profiles` table with them.
 *
 * Before this guard existed, the routing fell through to an `else`
 * branch commented "// Findr event" whenever `metadata.app` was absent.
 * Rise Daisy's events carry `supabase_user_id` but no `app` field, so
 * they landed there and were written as premium entitlements against the
 * shared profiles row — i.e. Rise Daisy subscribers were silently granted
 * Grow Daisy premium. Confirmed live on 2026-08-23: three Rise Daisy
 * subscribers held `profiles.subscription_status = 'premium'` stamped
 * with their Rise Daisy subscription ids, and the then-live
 * `hooks/useSubscription.ts` read exactly that field to gate this app.
 *
 * That "Findr event" fallback was legacy in any case: findr moved to its
 * own repo, own endpoint and own `findr_stripe_subscriptions` table, and
 * reads entitlement only from there — it never reads
 * profiles.subscription_status. So there is no app left that wants the
 * fallback, and anything not explicitly ours must be ignored.
 *
 * `hooks/useSubscription.ts` and `lib/offline/subscriptionCache.ts` were
 * deleted on 2026-08-23 — both were leftover findr code with no callers,
 * and that hook was the only remaining reader of the contaminated column.
 * Go Daisy+ and Grow Daisy gate on their own hooks and their own columns.
 * Do not reintroduce a shared `profiles.subscription_status` reader.
 */
function belongsToThisApp(metadata: Stripe.Metadata | null | undefined): boolean {
  return isGoDaisyPlusEvent(metadata ?? null) || isGrowDaisyEvent(metadata ?? null);
}

// =============================================================================
// GO DAISY+ SPECIFIC HANDLERS
// =============================================================================

// Go Daisy+ profile update payload
type GoDaisyProfileUpdatePayload = {
  godaisy_subscription_tier: GoDaisyTier;
  godaisy_subscription_type?: 'monthly' | 'annual';
  godaisy_subscription_start?: string;
  godaisy_subscription_end?: string | null;
  godaisy_stripe_subscription_id?: string | null;
  godaisy_stripe_customer_id?: string;
};

/**
 * Check if event is for Go Daisy+ app.
 */
function isGoDaisyPlusEvent(metadata: Stripe.Metadata | null): boolean {
  return metadata?.app === 'godaisy_plus';
}

/**
 * Update Go Daisy+ profile based on subscription status.
 */
async function updateGoDaisyProfileFromSubscription(
  supabase: SupabaseServerClient,
  userId: string,
  subscription: Stripe.Subscription
) {
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const billingType = subscription.metadata?.billing_type as 'monthly' | 'annual' | undefined;

  const updateData: GoDaisyProfileUpdatePayload = {
    godaisy_subscription_tier: isActive ? 'plus' : 'free',
    godaisy_subscription_type: billingType,
    godaisy_stripe_subscription_id: subscription.id,
    godaisy_subscription_start: new Date(subscription.created * 1000).toISOString(),
  };

  // Set customer ID if available
  if (subscription.customer) {
    updateData.godaisy_stripe_customer_id = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
  }

  // Subscription end date
  const godaisyPeriodEnd = currentPeriodEnd(subscription);
  if (subscription.cancel_at) {
    updateData.godaisy_subscription_end = new Date(subscription.cancel_at * 1000).toISOString();
  } else if (godaisyPeriodEnd) {
    updateData.godaisy_subscription_end = new Date(godaisyPeriodEnd * 1000).toISOString();
  }

  const { error } = await supabase
    .from('profiles')
    // @ts-expect-error - Supabase type inference issue with profile updates
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('[godaisy+] Error updating profile:', error);
    throw error;
  }

  console.log(`[godaisy+] Updated subscription for user ${userId}: tier=${isActive ? 'plus' : 'free'}, status=${subscription.status}`);
}

/**
 * Record Go Daisy+ subscription event in audit log.
 */
async function recordGoDaisyEvent(
  supabase: SupabaseServerClient,
  userId: string,
  eventType: string,
  stripeEventId: string,
  tier: GoDaisyTier,
  eventData: Stripe.Checkout.Session | Stripe.Subscription
) {
  // @ts-expect-error - Supabase type inference issue with godaisy_subscription_events
  await supabase.from('godaisy_subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    stripe_event_id: stripeEventId,
    tier,
    event_data: eventData as unknown,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!WEBHOOK_SECRET && !GROW_WEBHOOK_SECRET) {
    console.error('No STRIPE_WEBHOOK_SECRET or STRIPE_GROW_WEBHOOK_SECRET is set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    // Verify webhook signature
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({ error: 'No signature provided' });
    }

    let event: Stripe.Event | null = null;

    // Try Grow webhook secret first (if available), then fall back to main secret
    // This supports webhooks from both grow.godaisy.io and godaisy.io/fishfindr.eu
    const secretsToTry = [GROW_WEBHOOK_SECRET, WEBHOOK_SECRET].filter(Boolean) as string[];

    for (const secret of secretsToTry) {
      try {
        event = stripe.webhooks.constructEvent(buf, sig, secret);
        break;
      } catch {
        // Try next secret
        continue;
      }
    }

    if (!event) {
      console.error('Webhook signature verification failed with all available secrets');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Use service role to bypass RLS
    const supabase: SupabaseServerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ── Ownership guard ────────────────────────────────────────────────
    // Drop other apps' events BEFORE any handler can write to the shared
    // profiles table. See belongsToThisApp() for the incident this
    // prevents. Returns 200, deliberately: a non-2xx tells Stripe the
    // delivery failed, so it retries and — after sustained failures —
    // DISABLES the endpoint. Rejecting another app's event with 400 was
    // producing exactly that risk (findr's events, whose metadata key is
    // `userId` rather than `supabase_user_id`, were 400ing here). An
    // event that isn't ours is successfully handled by ignoring it.
    {
      const obj = event.data.object as { metadata?: Stripe.Metadata | null; subscription?: unknown };
      let routingMetadata: Stripe.Metadata | null | undefined = obj?.metadata;

      // Invoice events carry the app marker on the SUBSCRIPTION, not the
      // invoice, so resolve it before deciding ownership.
      if (event.type.startsWith('invoice.') && typeof obj?.subscription === 'string') {
        try {
          const sub = await stripe.subscriptions.retrieve(obj.subscription);
          routingMetadata = sub.metadata;
        } catch (err) {
          console.error('[webhook] Could not resolve subscription for invoice event:', err);
        }
      }

      if (!belongsToThisApp(routingMetadata)) {
        console.log(
          `[webhook] Ignoring ${event.type} (${event.id}) — not a Go Daisy+/Grow Daisy event ` +
          `(metadata.app=${routingMetadata?.app ?? 'none'}). Shared Stripe account cross-talk.`
        );
        return res.status(200).json({ received: true, ignored: 'not_this_app' });
      }
    }

    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (!userId) {
          // 200, not 400 — see the ownership guard above. A missing id
          // means the event isn't actionable here, which is not a
          // delivery failure; 400 made Stripe retry and risked the
          // endpoint being auto-disabled.
          console.error('No user ID in checkout session metadata', event.id);
          return res.status(200).json({ received: true, ignored: 'no_user_id' });
        }

        // Update customer ID in profile
        if (session.customer) {
          await supabase
            .from('profiles')
            // @ts-expect-error - Supabase type inference issue with profile updates
            .update({ stripe_customer_id: session.customer as string })
            .eq('id', userId);
        }

        // Route to correct handler based on app
        if (isGoDaisyPlusEvent(session.metadata)) {
          // Go Daisy+ - subscription checkout (tier updated by subscription.created event)
          await recordGoDaisyEvent(supabase, userId, event.type, event.id, 'plus', session);
          // Store customer ID for Go Daisy+
          if (session.customer) {
            await supabase
              .from('profiles')
              // @ts-expect-error - Supabase type inference issue with profile updates
              .update({ godaisy_stripe_customer_id: session.customer as string })
              .eq('id', userId);
          }
          console.log(`[godaisy+] Processed checkout for user ${userId}`);
        } else if (isGrowDaisyEvent(session.metadata) && session.mode === 'payment') {
          await updateGrowProfileFromLifetime(supabase, userId, session);
          const tier = (session.metadata?.tier as GrowSubscriptionTier) || 'sprout';
          await recordGrowEvent(supabase, userId, event.type, event.id, tier, session);

          // Lifetime purchases never produce a subscription object, so this is
          // the only place they can be confirmed. Keyed on the session id —
          // a customer may legitimately buy more than once (e.g. upgrading
          // tier), and each purchase deserves its own receipt.
          await sendSubscriptionConfirmed(
            growEmailContext(supabase, userId, event.id, null),
            {
              tierName: growTierName(tier),
              amount: formatStripeAmount(session.amount_total, session.currency, 'en-GB'),
              interval: null,
              nextBillingOn: null,
            },
            session.id
          );

          console.log(`[grow] Processed lifetime checkout for user ${userId}`);
        } else if (isGrowDaisyEvent(session.metadata)) {
          // Subscription checkout - tier will be updated by subscription.created event
          const tier = (session.metadata?.tier as GrowSubscriptionTier) || 'sprout';
          await recordGrowEvent(supabase, userId, event.type, event.id, tier, session);
          console.log(`[grow] Processed subscription checkout for user ${userId}`);
        } else {
          // Unreachable: the ownership guard above already returned 200
          // for anything that isn't Go Daisy+/Grow Daisy. Kept as a
          // belt-and-braces no-op rather than the old "// Findr event"
          // write — see belongsToThisApp().
          console.warn(`[webhook] Unroutable checkout event reached switch: ${event.id}`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // 200, not 400 — see the ownership guard above.
          console.error('No user ID in subscription metadata', event.id);
          return res.status(200).json({ received: true, ignored: 'no_user_id' });
        }

        // Route to correct handler based on app
        if (isGoDaisyPlusEvent(subscription.metadata)) {
          await updateGoDaisyProfileFromSubscription(supabase, userId, subscription);
          const tier: GoDaisyTier = (subscription.status === 'active' || subscription.status === 'trialing') ? 'plus' : 'free';
          await recordGoDaisyEvent(supabase, userId, event.type, event.id, tier, subscription);
        } else if (isGrowDaisyEvent(subscription.metadata)) {
          await updateGrowProfileFromSubscription(supabase, userId, subscription);
          const tier = (subscription.metadata?.tier as GrowSubscriptionTier) || 'sprout';
          await recordGrowEvent(supabase, userId, event.type, event.id, tier, subscription);

          // ── Transactional email ──────────────────────────────────
          // Both created and updated land here, and both can represent the
          // same transition, so the dedupe keys are semantic (keyed on the
          // subscription, not the event id). Whichever event arrives first
          // sends; the other is skipped by the ledger.
          const ctx = growEmailContext(supabase, userId, event.id, subscription.id);
          const legacy = subscription as Stripe.Subscription & SubscriptionLegacyFields;
          const locale = 'en-GB';
          const facts = growBillingFacts(subscription, locale);
          const tierName = growTierName(tier);

          if (subscription.status === 'trialing' && legacy.trial_end) {
            await sendTrialStarted(ctx, {
              tierName,
              trialEndsOn: formatEpochDate(legacy.trial_end, locale) || '',
              firstChargeAmount: facts.amount,
            });
          } else if (subscription.status === 'active') {
            await sendSubscriptionConfirmed(
              ctx,
              {
                tierName,
                amount: facts.amount,
                interval: facts.interval,
                nextBillingOn: formatEpochDate(currentPeriodEnd(subscription), locale),
              },
              subscription.id
            );
          }
        } else {
          // Unreachable after the ownership guard. This is the exact
          // branch that granted Rise Daisy subscribers Grow Daisy
          // premium — it called updateProfileFromSubscription(), which
          // sets profiles.subscription_status = 'premium'. Now a no-op.
          console.warn(`[webhook] Unroutable subscription event reached switch: ${event.id}`);
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Previously unhandled. Stripe fires this ~3 days before a trial
        // converts; without it a 7-day trial became a live charge with no
        // warning of any kind, which is both poor practice and the thing UK/EU
        // subscribers most reasonably expect notice of.
        //
        // Note this event does NOT change the tier — it is purely a
        // notification. The conversion itself still arrives later as
        // customer.subscription.updated.
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // 200, not 400 — see the ownership guard above.
          console.error('No user ID in trial_will_end metadata', event.id);
          return res.status(200).json({ received: true, ignored: 'no_user_id' });
        }

        if (isGrowDaisyEvent(subscription.metadata)) {
          const tier = (subscription.metadata?.tier as GrowSubscriptionTier) || 'sprout';
          await recordGrowEvent(supabase, userId, event.type, event.id, tier, subscription);

          const legacy = subscription as Stripe.Subscription & SubscriptionLegacyFields;
          const locale = 'en-GB';
          const facts = growBillingFacts(subscription, locale);

          await sendTrialEnding(
            growEmailContext(supabase, userId, event.id, subscription.id),
            {
              tierName: growTierName(tier),
              trialEndsOn: formatEpochDate(legacy.trial_end, locale) || '',
              chargeAmount: facts.amount,
            },
            legacy.trial_end ?? null
          );

          console.log(`[grow] Trial ending soon for user ${userId} (sub ${subscription.id})`);
        } else {
          // Go Daisy+ has no trial configured today; nothing to send.
          console.log(`[webhook] trial_will_end for non-Grow subscription: ${event.id}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // 200, not 400 — see the ownership guard above.
          console.error('No user ID in subscription metadata', event.id);
          return res.status(200).json({ received: true, ignored: 'no_user_id' });
        }

        // Route to correct handler based on app
        if (isGoDaisyPlusEvent(subscription.metadata)) {
          // Go Daisy+ - downgrade to free
          await supabase
            .from('profiles')
            // @ts-expect-error - Supabase type inference issue with profile updates
            .update({
              godaisy_subscription_tier: 'free',
              godaisy_subscription_end: new Date().toISOString(),
            })
            .eq('id', userId);

          await recordGoDaisyEvent(supabase, userId, event.type, event.id, 'free', subscription);
          console.log(`[godaisy+] Subscription cancelled for user ${userId}, downgraded to free`);
        } else if (isGrowDaisyEvent(subscription.metadata)) {
          // Downgrade to seed tier
          await supabase
            .from('profiles')
            // @ts-expect-error - Supabase type inference issue with profile updates
            .update({
              grow_subscription_tier: 'seed',
              grow_subscription_end: new Date().toISOString(),
            })
            .eq('id', userId);

          const tier = (subscription.metadata?.tier as GrowSubscriptionTier) || 'seed';
          await recordGrowEvent(supabase, userId, event.type, event.id, tier, subscription);

          // Access usually runs to the end of the paid period rather than
          // stopping the moment Stripe deletes the subscription, so quote the
          // period end when we have it rather than implying instant cut-off.
          await sendSubscriptionCancelled(
            growEmailContext(supabase, userId, event.id, subscription.id),
            {
              tierName: growTierName(tier),
              accessEndsOn: formatEpochDate(currentPeriodEnd(subscription), 'en-GB'),
            }
          );

          console.log(`[grow] Subscription cancelled for user ${userId}, downgraded to seed`);
        } else {
          // Unreachable after the ownership guard. Previously downgraded
          // profiles.subscription_status on another app's cancellation.
          console.warn(`[webhook] Unroutable subscription.deleted reached switch: ${event.id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Previously unhandled: Grow Daisy / Go Daisy+ had no dunning
        // signal at all, so a failed renewal was invisible until Stripe
        // eventually gave up and fired subscription.deleted.
        //
        // Deliberately does NOT downgrade the tier. Stripe retries a
        // failed invoice over several days and most recover; cutting a
        // customer off on the first failure would be wrong. The final
        // downgrade is already handled by customer.subscription.deleted
        // if it never recovers. This records the failure so it is
        // visible — wiring an actual "update your card" email is the
        // obvious next step but there is no mail path in this repo yet.
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
        if (!subId) {
          console.warn(`[webhook] invoice.payment_failed with no subscription: ${event.id}`);
          break;
        }

        const failedSub = await stripe.subscriptions.retrieve(subId);
        const failedUserId = failedSub.metadata?.supabase_user_id;
        if (!failedUserId) {
          console.warn(`[webhook] invoice.payment_failed, no supabase_user_id: ${event.id}`);
          break;
        }

        if (isGoDaisyPlusEvent(failedSub.metadata)) {
          await recordGoDaisyEvent(supabase, failedUserId, event.type, event.id, 'plus', failedSub);
          console.warn(`[godaisy+] Payment FAILED for user ${failedUserId} (sub ${subId}) — tier unchanged pending Stripe retries`);
        } else if (isGrowDaisyEvent(failedSub.metadata)) {
          const tier = (failedSub.metadata?.tier as GrowSubscriptionTier) || 'sprout';
          await recordGrowEvent(supabase, failedUserId, event.type, event.id, tier, failedSub);

          // Dunning email. Keyed on the INVOICE, not the event: Stripe fires
          // this once per retry attempt across several days, and one failed
          // card should produce one email, not four.
          const nextAttempt = (invoice as Stripe.Invoice & { next_payment_attempt?: number | null })
            .next_payment_attempt ?? null;

          await sendPaymentFailed(
            growEmailContext(supabase, failedUserId, event.id, subId),
            {
              tierName: growTierName(tier),
              amount: formatStripeAmount(invoice.amount_due, invoice.currency, 'en-GB'),
              nextAttemptOn: formatEpochDate(nextAttempt, 'en-GB'),
            },
            invoice.id || `sub_${subId}_${invoice.period_end ?? 'na'}`
          );

          console.warn(`[grow] Payment FAILED for user ${failedUserId} (sub ${subId}) — tier unchanged pending Stripe retries`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    });
  }
}
