/**
 * Create Stripe Customer Portal Session
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows users to update payment methods, view invoices, and cancel subscriptions.
 *
 * @route POST /api/stripe/create-portal-session
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://fishfindr.eu';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (!profile.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${BASE_URL}/findr/account`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Portal session creation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create portal session'
    });
  }
}
