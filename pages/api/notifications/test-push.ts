/**
 * /api/notifications/test-push
 *
 * Test endpoint to send a push notification to a specific user.
 * Requires service role key for authentication.
 *
 * POST: Send test notification
 * Body: { userId?: string } - Optional user ID, defaults to first user with a token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendApnsPushNotification } from '../../../lib/findr/apnsClient';
import { sendFcmPushNotification } from '../../../lib/notifications/fcmClient';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check - require service role key in header
  const authHeader = req.headers['x-service-key'];
  if (authHeader !== SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId } = req.body as { userId?: string };

    // Get push tokens
    let query = supabase
      .from('user_push_tokens')
      .select('user_id, platform, token')
      .order('last_used', { ascending: false })
      .limit(5);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: tokens, error } = await query;

    if (error) {
      console.error('[TestPush] Error fetching tokens:', error);
      return res.status(500).json({ error: 'Failed to fetch tokens' });
    }

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ error: 'No push tokens found' });
    }

    const results: { platform: string; success: boolean; error?: string }[] = [];

    for (const tokenRecord of tokens) {
      let success = false;
      let errorMsg: string | undefined;

      if (tokenRecord.platform === 'ios') {
        try {
          success = await sendApnsPushNotification(tokenRecord.token, {
            title: '🧪 Test Notification',
            body: 'Push notifications are working!',
            data: { type: 'test' },
            badge: 1,
            sound: 'default',
          });
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : 'Unknown error';
        }
      } else if (tokenRecord.platform === 'android') {
        try {
          success = await sendFcmPushNotification(tokenRecord.token, {
            title: '🧪 Test Notification',
            body: 'Push notifications are working!',
            data: { type: 'test' },
          });
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : 'Unknown error';
        }
      }

      results.push({
        platform: tokenRecord.platform,
        success,
        error: errorMsg,
      });
    }

    return res.status(200).json({
      message: 'Test complete',
      tokensFound: tokens.length,
      results,
    });
  } catch (error) {
    console.error('[TestPush] Exception:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
