import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * API Route: Check Founder Badge Status
 *
 * Determines if the authenticated user is one of the first 500 users.
 *
 * GET /api/findr/founder-status
 *
 * Returns:
 * - isFounder: boolean - true if user is in first 500
 * - userRank: number - user's rank by creation date (1-indexed)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  try {
    // Use RPC function to check founder status
    const { data, error: rpcError } = await supabase
      .rpc('check_founder_status', { p_user_id: user.id });

    if (rpcError || !data || data.length === 0) {
      console.error('[founder-status] RPC error:', rpcError);
      return res.status(500).json({
        error: 'Failed to determine founder status',
        isFounder: false
      });
    }

    const result = data[0];

    return res.status(200).json({
      isFounder: result.is_founder,
      userRank: result.user_rank,
    });
  } catch (error) {
    console.error('[founder-status] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      isFounder: false
    });
  }
}
