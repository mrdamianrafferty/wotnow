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
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    // Identity-guarded RPC: validate_voucher checks
    // `auth.uid() IS DISTINCT FROM user_id_input -> raise 'not authorized'`.
    // The service-role key carries no auth.uid(), so calling it that way always
    // failed. Use the caller's own JWT instead — SECURITY DEFINER still supplies
    // the privileges, and `authenticated` holds EXECUTE.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { voucherCode } = req.body;

    if (!voucherCode || typeof voucherCode !== 'string') {
      return res.status(400).json({ error: 'Voucher code is required' });
    }

    // Call the validate_voucher RPC function as the signed-in user
    const { data, error } = await userClient.rpc('validate_voucher', {
      voucher_code_input: voucherCode,
      user_id_input: user.id,
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
