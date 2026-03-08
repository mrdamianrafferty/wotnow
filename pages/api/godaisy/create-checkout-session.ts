/**
 * Create Stripe Checkout Session for Go Daisy+
 *
 * Creates a Stripe Checkout session for Go Daisy+ subscription.
 * Supports monthly (€1.49) and annual (€9.99) billing.
 *
 * @route POST /api/godaisy/create-checkout-session
 */

import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import { GoDaisySubscriptionType, GODAISY_PRICING } from '@/lib/godaisy/subscription';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://godaisy.io';

interface CheckoutRequest {
  billingType: Exclude<GoDaisySubscriptionType, 'promo'>;
  promoCode?: string;
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
    const { billingType, promoCode } = req.body as CheckoutRequest;

    if (!email || !billingType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (billingType !== 'monthly' && billingType !== 'annual') {
      return res.status(400).json({ error: 'Invalid billing type. Must be monthly or annual.' });
    }

    // Get price ID
    const pricing = GODAISY_PRICING[billingType];
    const priceId = pricing.stripe_price_id;

    if (!priceId) {
      return res.status(500).json({ error: 'Price not configured. Please contact support.' });
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
      .select('godaisy_stripe_customer_id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[godaisy+] Error fetching profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    // Prefer Go Daisy-specific customer ID, fall back to shared one
    let customerId = profile?.godaisy_stripe_customer_id || profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          supabase_user_id: userId,
          app: 'godaisy_plus',
        },
      });

      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ godaisy_stripe_customer_id: customerId } as Record<string, unknown>)
        .eq('id', userId);
    }

    // Validate promo code if provided
    let promotionCodeId: string | undefined;

    if (promoCode) {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          promotionCodeId = promotionCodes.data[0].id;
        }
      } catch {
        // Promo code not found in Stripe — ignore silently
        console.log(`[godaisy+] Promo code "${promoCode}" not found in Stripe`);
      }
    }

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
      mode: 'subscription',
      success_url: `${BASE_URL}/account?subscription=success&app=godaisy`,
      cancel_url: `${BASE_URL}/godaisy-plus?canceled=true`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          app: 'godaisy_plus',
          billing_type: billingType,
        },
      },
      metadata: {
        supabase_user_id: userId,
        app: 'godaisy_plus',
        billing_type: billingType,
      },
      ...(promotionCodeId && { discounts: [{ promotion_code: promotionCodeId }] }),
      allow_promotion_codes: !promotionCodeId,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[godaisy+] Checkout session creation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    });
  }
}
