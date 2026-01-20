/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Supports both Findr and Grow Daisy apps (identified by metadata.app field).
 *
 * Events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - checkout.session.completed (including one-time lifetime purchases)
 *
 * @route POST /api/stripe/webhook
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GrowSubscriptionTier } from '@/lib/grow/subscription';

type SupabaseServerClient = SupabaseClient<unknown>;

type ProfileUpdatePayload = {
  subscription_status: 'free' | 'premium';
  payment_platform: 'web' | 'ios' | 'android';
  stripe_subscription_id: string | null;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  voucher_code?: string;
  referral_source?: string;
};

type SubscriptionLegacyFields = {
  trial_end?: number | null;
  current_period_end?: number | null;
  discount?: Stripe.Discount | null;
};

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

/**
 * Update user profile based on subscription status.
 */
async function updateProfileFromSubscription(
  supabase: SupabaseServerClient,
  userId: string,
  subscription: Stripe.Subscription
) {
  const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'premium' : 'free';
  const legacyFields = subscription as Stripe.Subscription & SubscriptionLegacyFields;

  const updateData: ProfileUpdatePayload = {
    subscription_status: status,
    payment_platform: 'web',
    stripe_subscription_id: subscription.id,
  };

  // Set subscription dates
  if (status === 'premium') {
    updateData.subscription_start_date = new Date(subscription.created * 1000).toISOString();

    // Trial end date (legacy field)
    if (legacyFields.trial_end) {
      updateData.trial_ends_at = new Date(legacyFields.trial_end * 1000).toISOString();
    }

    // Subscription end date (if canceled)
    if (subscription.cancel_at) {
      updateData.subscription_end_date = new Date(subscription.cancel_at * 1000).toISOString();
    } else if (legacyFields.current_period_end) {
      updateData.subscription_end_date = new Date(legacyFields.current_period_end * 1000).toISOString();
    }
  }

  // Apply voucher if present in metadata
  if (subscription.metadata?.voucherCode && subscription.metadata?.voucherId) {
    updateData.voucher_code = subscription.metadata.voucherCode;
    updateData.referral_source = subscription.metadata.voucherCode;
  }

  const { error } = await supabase
    .from('profiles')
    // @ts-expect-error - Supabase type inference issue with profile updates
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  // Record voucher usage if applicable
  if (subscription.metadata?.voucherCode && subscription.metadata?.voucherId) {
    // Get subscription price for voucher tracking
    const priceId = subscription.items.data[0]?.price.id;
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      const originalPrice = (price.unit_amount || 0) / 100;

      // Calculate discount from subscription discounts (use first discount if present)
      const discountEntry = legacyFields.discount
        ?? subscription.discounts?.find(
          (entry): entry is Stripe.Discount => typeof entry !== 'string'
        );
      const discount = discountEntry ?? null;
      let finalPrice = originalPrice;

      // @ts-expect-error - Stripe Discount type doesn't expose coupon property in types
      if (discount?.coupon) {
        // @ts-expect-error - Stripe Discount type doesn't expose coupon property in types
        const coupon = discount.coupon;
        if (coupon.percent_off) {
          finalPrice = originalPrice * (1 - coupon.percent_off / 100);
        } else if (coupon.amount_off) {
          finalPrice = originalPrice - (coupon.amount_off / 100);
        }
      }

      // @ts-expect-error - RPC function not in generated types
      await supabase.rpc('apply_voucher', {
        voucher_id_input: subscription.metadata.voucherId,
        user_id_input: userId,
        original_price_input: originalPrice,
        final_price_input: finalPrice,
      });
    }
  }
}

/**
 * Record subscription event in audit log (Findr).
 */
async function recordEvent(
  supabase: SupabaseServerClient,
  userId: string,
  eventType: string,
  stripeEventId: string,
  eventData: Stripe.Checkout.Session | Stripe.Subscription
) {
  // @ts-expect-error - Supabase type inference issue with subscription_events
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    stripe_event_id: stripeEventId,
    event_data: eventData,
  });
}

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
  if (subscription.cancel_at) {
    updateData.grow_subscription_end = new Date(subscription.cancel_at * 1000).toISOString();
  } else if (legacyFields.current_period_end) {
    updateData.grow_subscription_end = new Date(legacyFields.current_period_end * 1000).toISOString();
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
  // @ts-expect-error - Supabase type inference issue with grow_subscription_events
  await supabase.from('grow_subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    stripe_event_id: stripeEventId,
    tier,
    event_data: eventData as unknown,
  });
}

/**
 * Check if event is for Grow Daisy app.
 */
function isGrowDaisyEvent(metadata: Stripe.Metadata | null): boolean {
  return metadata?.app === 'grow_daisy';
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

    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (!userId) {
          console.error('No user ID in checkout session metadata');
          return res.status(400).json({ error: 'No user ID in metadata' });
        }

        // Update customer ID in profile
        if (session.customer) {
          await supabase
            .from('profiles')
            // @ts-expect-error - Supabase type inference issue with profile updates
            .update({ stripe_customer_id: session.customer as string })
            .eq('id', userId);
        }

        // Handle Grow Daisy lifetime purchase (one-time payment)
        if (isGrowDaisyEvent(session.metadata) && session.mode === 'payment') {
          await updateGrowProfileFromLifetime(supabase, userId, session);
          const tier = (session.metadata?.tier as GrowSubscriptionTier) || 'sprout';
          await recordGrowEvent(supabase, userId, event.type, event.id, tier, session);
          console.log(`[grow] Processed lifetime checkout for user ${userId}`);
        } else if (isGrowDaisyEvent(session.metadata)) {
          // Subscription checkout - tier will be updated by subscription.created event
          const tier = (session.metadata?.tier as GrowSubscriptionTier) || 'sprout';
          await recordGrowEvent(supabase, userId, event.type, event.id, tier, session);
          console.log(`[grow] Processed subscription checkout for user ${userId}`);
        } else {
          // Findr event
          await recordEvent(supabase, userId, event.type, event.id, session);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error('No user ID in subscription metadata');
          return res.status(400).json({ error: 'No user ID in metadata' });
        }

        // Route to correct handler based on app
        if (isGrowDaisyEvent(subscription.metadata)) {
          await updateGrowProfileFromSubscription(supabase, userId, subscription);
          const tier = (subscription.metadata?.tier as GrowSubscriptionTier) || 'sprout';
          await recordGrowEvent(supabase, userId, event.type, event.id, tier, subscription);
        } else {
          // Findr event
          await updateProfileFromSubscription(supabase, userId, subscription);
          await recordEvent(supabase, userId, event.type, event.id, subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error('No user ID in subscription metadata');
          return res.status(400).json({ error: 'No user ID in metadata' });
        }

        // Route to correct handler based on app
        if (isGrowDaisyEvent(subscription.metadata)) {
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
          console.log(`[grow] Subscription cancelled for user ${userId}, downgraded to seed`);
        } else {
          // Findr event - downgrade to free
          await supabase
            .from('profiles')
            // @ts-expect-error - Supabase type inference issue with profile updates
            .update({
              subscription_status: 'free',
              subscription_end_date: new Date().toISOString(),
            })
            .eq('id', userId);

          await recordEvent(supabase, userId, event.type, event.id, subscription);
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
