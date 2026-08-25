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
import { checkoutTaxParams } from '@/lib/stripe/tax';
import { createClient } from '@supabase/supabase-js';
import { GrowSubscriptionTier, GrowSubscriptionType, GROW_TIERS } from '@/lib/grow/subscription';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
    // Authenticate the caller
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const accessToken = authHeader.substring(7);
    // Carries the caller's JWT so auth.uid() resolves inside identity-guarded
    // RPCs (validate_voucher below). The service-role client further down has no
    // auth.uid() and those functions raise 'not authorized' for it.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    const email = user.email;
    const { tier, billingType, voucherCode } = req.body as Omit<CheckoutRequest, 'userId' | 'email'>;

    // Validate required fields
    if (!email || !tier || !billingType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate tier
    if (!GROW_TIERS[tier] || tier === 'seed') {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    // Get price ID for this tier/billing combination
    const tierInfo = GROW_TIERS[tier];
    // .trim() is load-bearing, not defensive tidiness. Vercel env values added
    // without ./scripts/vercel-env-add.sh can carry a trailing newline (see
    // CLAUDE.md, "Adding Vercel Environment Variables"). Four wotnow production
    // vars were found in that state on 2026-08-23, two of them Go Daisy+ price
    // IDs. A price ID with a trailing newline matches nothing, so Stripe answers
    // "No such price" and checkout dies — with no clue pointing at the env var.
    const priceId = tierInfo.stripePriceIds?.[billingType]?.trim();

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
      // Idempotency key is deterministic per user, deliberately: exactly one
      // Stripe customer should ever exist per Grow Daisy account. Without it,
      // a double-clicked upgrade button or a network retry creates a second
      // customer, and the `profiles.stripe_customer_id` write races — leaving
      // an orphaned customer that later collects its own subscription.
      // (Stripe expires idempotency keys after 24h, which covers the retry
      // window this actually guards against.)
      const customer = await stripe.customers.create(
        {
          email,
          metadata: {
            supabase_user_id: userId,
            app: 'grow_daisy',
          },
        },
        { idempotencyKey: `grow-customer-create-${userId}` }
      );

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
      const { data: voucherData, error: voucherError } = await userClient.rpc('validate_voucher', {
        voucher_code_input: voucherCode,
        user_id_input: userId,
      });

      if (voucherError) {
        // Previously swallowed: a failing voucher lookup silently produced a
        // full-price checkout with no indication anything had gone wrong.
        console.error('[grow] validate_voucher failed:', voucherError);
      }

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
      // No-op unless STRIPE_AUTOMATIC_TAX_ENABLED=true — see lib/stripe/tax.ts
      // for why this is opt-in rather than always on.
      ...checkoutTaxParams(true),
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
