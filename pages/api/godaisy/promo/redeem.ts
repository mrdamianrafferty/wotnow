/**
 * Go Daisy+ Promo Code Redemption API
 *
 * Validates and redeems a promo code atomically via RPC function.
 *
 * @route POST /api/godaisy/promo/redeem
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface RedeemRequest {
  code: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await authClient.auth.getUser(authHeader.substring(7));
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code } = req.body as RedeemRequest;

    if (!code?.trim()) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    // Use service role to call RPC (SECURITY DEFINER function)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.rpc('redeem_godaisy_promo_code', {
      p_user_id: user.id,
      p_code: code.trim(),
    });

    if (error) {
      console.error('[promo] RPC error:', error);
      return res.status(500).json({ error: 'Failed to redeem promo code' });
    }

    if (!data?.success) {
      return res.status(400).json({ error: data?.error || 'Invalid promo code' });
    }

    return res.status(200).json({
      success: true,
      tier: data.tier,
      grantedUntil: data.granted_until,
      durationDays: data.duration_days,
    });
  } catch (error) {
    console.error('[promo] Redemption error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to redeem promo code',
    });
  }
}
