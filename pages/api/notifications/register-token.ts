/**
 * /api/notifications/register-token
 *
 * Registers a device push token for the authenticated user.
 * Tokens are stored in user_push_tokens table for sending push notifications.
 *
 * POST: Register or update a push token
 * DELETE: Remove a push token (e.g., on logout)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface RegisterTokenRequest {
  token: string;
  platform: 'ios' | 'android';
  bundle_id?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);

  // Verify the token and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  if (req.method === 'POST') {
    // Register or update push token
    const { token, platform, bundle_id } = req.body as RegisterTokenRequest;

    if (!token || !platform) {
      return res.status(400).json({ error: 'Missing token or platform' });
    }

    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform. Must be ios or android' });
    }

    try {
      // Upsert the token (one per user per platform per bundle)
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(
          {
            user_id: userId,
            token,
            platform,
            bundle_id: bundle_id || null,
            last_used: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,platform,bundle_id',
          }
        );

      if (error) {
        console.error('[RegisterToken] Error upserting token:', error);
        return res.status(500).json({ error: 'Failed to register token' });
      }

      console.log(`[RegisterToken] Token registered for user ${userId} on ${platform}`);
      return res.status(200).json({ success: true, message: 'Token registered' });
    } catch (error) {
      console.error('[RegisterToken] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Remove push token (e.g., on logout)
    const { platform, bundle_id: deleteBundleId } = req.body as { platform?: 'ios' | 'android'; bundle_id?: string };

    try {
      let query = supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId);

      // If platform specified, only delete that one
      if (platform) {
        query = query.eq('platform', platform);
      }

      // If bundle_id specified, only delete that app's token
      if (deleteBundleId) {
        query = query.eq('bundle_id', deleteBundleId);
      }

      const { error } = await query;

      if (error) {
        console.error('[RegisterToken] Error deleting token:', error);
        return res.status(500).json({ error: 'Failed to remove token' });
      }

      console.log(`[RegisterToken] Token removed for user ${userId}`);
      return res.status(200).json({ success: true, message: 'Token removed' });
    } catch (error) {
      console.error('[RegisterToken] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
