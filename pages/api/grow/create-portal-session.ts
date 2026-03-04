/**
 * Create Stripe Customer Portal Session for Grow Daisy
 *
 * Allows users to manage their subscription: change plan, update payment, cancel.
 *
 * @route POST /api/grow/create-portal-session
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_GROW_BASE_URL || 'https://grow.godaisy.io';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (!profile.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Create portal session — returns to Grow support page
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${BASE_URL}/grow/support`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Grow portal session error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create portal session',
    });
  }
}
