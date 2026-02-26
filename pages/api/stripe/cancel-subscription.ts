/**
 * Cancel Subscription API
 *
 * Cancels a Stripe subscription at the end of the billing period.
 * The user retains access until the current period ends.
 *
 * @route POST /api/stripe/cancel-subscription
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    // Get user's subscription from database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_status, payment_platform')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check if user has a web subscription
    if (profile.payment_platform !== 'web') {
      return res.status(400).json({
        error: 'Only web subscriptions can be cancelled via this endpoint'
      });
    }

    if (!profile.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel the subscription at period end (user keeps access until then)
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // @ts-expect-error - Stripe subscription type doesn't expose current_period_end in types
    const periodEnd = subscription.current_period_end as number;

    // Update database to reflect cancellation
    await supabase
      .from('profiles')
      .update({
        subscription_end_date: new Date(periodEnd * 1000).toISOString(),
      })
      .eq('id', userId);

    return res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
      cancelsAt: new Date(periodEnd * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to cancel subscription'
    });
  }
}
