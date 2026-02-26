/**
 * Create Stripe Checkout Session
 *
 * Creates a Stripe Checkout session for premium subscription.
 * Supports voucher codes for discounts.
 *
 * @route POST /api/stripe/create-checkout-session
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://fishfindr.eu';

// Monthly price ID (set this after creating the product in Stripe dashboard)
const PREMIUM_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;

if (!PREMIUM_MONTHLY_PRICE_ID) {
  console.warn('NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID is not set. Create product in Stripe dashboard first.');
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
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await authClient.auth.getUser(authHeader.substring(7));
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    const email = user.email;

    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const { voucherCode } = req.body;

    if (!PREMIUM_MONTHLY_PRICE_ID) {
      return res.status(500).json({ error: 'Stripe price ID not configured. Please contact support.' });
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

    let customerId = profile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          supabase_user_id: userId,
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
        // Create Stripe coupon for this voucher
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
            amount_off: Math.round(discountValue * 100), // Convert to cents
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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PREMIUM_MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${BASE_URL}/findr/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/findr/premium?canceled=true`,
      metadata: {
        supabase_user_id: userId,
        ...voucherMetadata,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          ...voucherMetadata,
        },
        trial_period_days: 7, // 7-day free trial
      },
      ...(couponId && { discounts: [{ coupon: couponId }] }),
      allow_promotion_codes: !couponId, // Allow promo codes if no voucher applied
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session'
    });
  }
}
