/**
 * /api/grow/push/subscribe
 *
 * Manages Web Push API subscriptions for Grow Daisy notifications.
 *
 * POST: Create or update a push subscription
 * DELETE: Remove a push subscription
 *
 * @module pages/api/grow/push/subscribe
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

interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceName?: string;
  userAgent?: string;
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
    // Create or update push subscription
    const { endpoint, keys, deviceName, userAgent } = req.body as PushSubscriptionPayload;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        error: 'Missing required fields: endpoint, keys.p256dh, keys.auth',
      });
    }

    try {
      // Upsert the subscription (unique by user_id + endpoint)
      const { data, error } = await supabase
        .from('grow_push_subscriptions')
        .upsert(
          {
            user_id: userId,
            endpoint,
            p256dh_key: keys.p256dh,
            auth_key: keys.auth,
            device_name: deviceName || null,
            user_agent: userAgent || null,
            is_active: true,
            failed_count: 0,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,endpoint',
          }
        )
        .select('id')
        .single();

      if (error) {
        console.error('[GrowPushSubscribe] Error upserting subscription:', error);
        return res.status(500).json({ error: 'Failed to save subscription' });
      }

      // Ensure user has notification preferences (create defaults if not exists)
      const { error: prefError } = await supabase
        .from('grow_notification_preferences')
        .upsert(
          {
            user_id: userId,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: true,
          }
        );

      if (prefError) {
        console.warn('[GrowPushSubscribe] Failed to create default preferences:', prefError);
        // Don't fail the subscription if preferences fail
      }

      console.log(`[GrowPushSubscribe] Subscription saved for user ${userId}`);
      return res.status(200).json({
        success: true,
        subscriptionId: data?.id,
        message: 'Push subscription registered',
      });
    } catch (error) {
      console.error('[GrowPushSubscribe] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Remove push subscription
    const { endpoint } = req.body as { endpoint?: string };

    try {
      let query = supabase
        .from('grow_push_subscriptions')
        .delete()
        .eq('user_id', userId);

      // If endpoint specified, only delete that subscription
      if (endpoint) {
        query = query.eq('endpoint', endpoint);
      }

      const { error } = await query;

      if (error) {
        console.error('[GrowPushSubscribe] Error deleting subscription:', error);
        return res.status(500).json({ error: 'Failed to remove subscription' });
      }

      console.log(`[GrowPushSubscribe] Subscription removed for user ${userId}`);
      return res.status(200).json({ success: true, message: 'Subscription removed' });
    } catch (error) {
      console.error('[GrowPushSubscribe] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    // Get user's subscriptions
    try {
      const { data, error } = await supabase
        .from('grow_push_subscriptions')
        .select('id, endpoint, device_name, is_active, last_used_at, created_at')
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('[GrowPushSubscribe] Error fetching subscriptions:', error);
        return res.status(500).json({ error: 'Failed to fetch subscriptions' });
      }

      return res.status(200).json({
        subscriptions: data || [],
      });
    } catch (error) {
      console.error('[GrowPushSubscribe] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
