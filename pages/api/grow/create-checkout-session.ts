/**
 * Create Stripe Checkout Session for Grow Daisy
 *
 * Creates a Stripe Checkout session for Grow Daisy subscription.
 * Supports multiple tiers and billing types.
 *
 * @route POST /api/grow/create-checkout-session
 */

import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import { GrowSubscriptionTier, GrowSubscriptionType, GROW_TIERS } from '@/lib/grow/subscription';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_GROW_BASE_URL || 'https://grow.godaisy.io';

interface CheckoutRequest {
  userId: string;
  email: string;
  tier: GrowSubscriptionTier;
  billingType: GrowSubscriptionType;
  voucherCode?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, tier, billingType, voucherCode }: CheckoutRequest = req.body;

    // Validate required fields
    if (!userId || !email || !tier || !billingType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate tier
    if (!GROW_TIERS[tier] || tier === 'seed') {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    // Get price ID for this tier/billing combination
    const tierInfo = GROW_TIERS[tier];
    const priceId = tierInfo.stripePriceIds?.[billingType];

    if (!priceId) {
      return res.status(500).json({
        error: `Price not configured for ${tier} ${billingType}. Please contact support.`,
      });
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          supabase_user_id: userId,
          app: 'grow_daisy',
        },
      });

      customerId = customer.id;

      // Update profile with customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Validate voucher if provided
    let couponId: string | undefined;
    let voucherMetadata: { voucherId?: string; voucherCode?: string } = {};

    if (voucherCode) {
      const { data: voucherData } = await supabase.rpc('validate_voucher', {
        voucher_code_input: voucherCode,
        user_id_input: userId,
      });

      if (voucherData && voucherData.valid) {
        const discountType = voucherData.discount_type;
        const discountValue = voucherData.discount_value;

        if (discountType === 'percentage') {
          const coupon = await stripe.coupons.create({
            percent_off: discountValue,
            duration: 'once',
            name: `Voucher: ${voucherCode}`,
          });
          couponId = coupon.id;
        } else if (discountType === 'fixed_amount') {
          const coupon = await stripe.coupons.create({
            amount_off: Math.round(discountValue * 100),
            currency: 'eur',
            duration: 'once',
            name: `Voucher: ${voucherCode}`,
          });
          couponId = coupon.id;
        }

        voucherMetadata = {
          voucherId: voucherData.voucher_id,
          voucherCode: voucherCode.toUpperCase(),
        };
      }
    }

    // Determine if this is a subscription or one-time payment
    const isLifetime = billingType === 'lifetime';

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isLifetime ? 'payment' : 'subscription',
      success_url: `${BASE_URL}/grow/settings?subscription=success&tier=${tier}`,
      cancel_url: `${BASE_URL}/grow/premium?canceled=true`,
      metadata: {
        supabase_user_id: userId,
        app: 'grow_daisy',
        tier,
        billing_type: billingType,
        ...voucherMetadata,
      },
      ...(couponId && { discounts: [{ coupon: couponId }] }),
      allow_promotion_codes: !couponId,
    };

    // Add subscription-specific options
    if (!isLifetime) {
      sessionParams.subscription_data = {
        metadata: {
          supabase_user_id: userId,
          app: 'grow_daisy',
          tier,
          billing_type: billingType,
          ...voucherMetadata,
        },
        // Only offer trial for monthly subscriptions
        ...(billingType === 'monthly' && { trial_period_days: 7 }),
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Grow checkout session creation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    });
  }
}
