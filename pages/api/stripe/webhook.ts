/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Updates user profiles and records events in subscription_events table.
 *
 * Events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - checkout.session.completed
 *
 * @route POST /api/stripe/webhook
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

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
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscription: Stripe.Subscription
) {
  const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'premium' : 'free';

  const updateData: any = {
    subscription_status: status,
    payment_platform: 'web',
    stripe_subscription_id: subscription.id,
  };

  // Set subscription dates
  if (status === 'premium') {
    updateData.subscription_start_date = new Date(subscription.created * 1000).toISOString();

    // Trial end date
    if (subscription.trial_end) {
      updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
    }

    // Subscription end date (if canceled)
    if (subscription.cancel_at) {
      updateData.subscription_end_date = new Date(subscription.cancel_at * 1000).toISOString();
    } else if (subscription.current_period_end) {
      updateData.subscription_end_date = new Date(subscription.current_period_end * 1000).toISOString();
    }
  }

  // Apply voucher if present in metadata
  if (subscription.metadata?.voucherCode && subscription.metadata?.voucherId) {
    updateData.voucher_code = subscription.metadata.voucherCode;
    updateData.referral_source = subscription.metadata.voucherCode;
  }

  const { error } = await supabase
    .from('profiles')
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

      // Calculate discount from subscription discount
      const discount = subscription.discount;
      let finalPrice = originalPrice;

      if (discount?.coupon) {
        if (discount.coupon.percent_off) {
          finalPrice = originalPrice * (1 - discount.coupon.percent_off / 100);
        } else if (discount.coupon.amount_off) {
          finalPrice = originalPrice - (discount.coupon.amount_off / 100);
        }
      }

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
 * Record subscription event in audit log.
 */
async function recordEvent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  eventType: string,
  stripeEventId: string,
  eventData: any
) {
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    stripe_event_id: stripeEventId,
    event_data: eventData,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    // Verify webhook signature
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({ error: 'No signature provided' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
            .update({ stripe_customer_id: session.customer as string })
            .eq('id', userId);
        }

        await recordEvent(supabase, userId, event.type, event.id, session);
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

        await updateProfileFromSubscription(supabase, userId, subscription);
        await recordEvent(supabase, userId, event.type, event.id, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error('No user ID in subscription metadata');
          return res.status(400).json({ error: 'No user ID in metadata' });
        }

        // Downgrade to free
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'free',
            subscription_end_date: new Date().toISOString(),
          })
          .eq('id', userId);

        await recordEvent(supabase, userId, event.type, event.id, subscription);
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
