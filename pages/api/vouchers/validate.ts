/**
 * Voucher Validation API Endpoint
 *
 * Validates a voucher code and returns discount information.
 *
 * @route POST /api/vouchers/validate
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { voucherCode, userId } = req.body;

    if (!voucherCode || typeof voucherCode !== 'string') {
      return res.status(400).json({ error: 'Voucher code is required' });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Call the validate_voucher RPC function
    const { data, error } = await supabase.rpc('validate_voucher', {
      voucher_code_input: voucherCode,
      user_id_input: userId,
    });

    if (error) {
      console.error('Error validating voucher:', error);
      return res.status(500).json({ error: 'Failed to validate voucher' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Voucher validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
