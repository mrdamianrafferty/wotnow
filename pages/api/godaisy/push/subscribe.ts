/**
 * /api/godaisy/push/subscribe
 *
 * Manages Web Push API subscriptions for Go Daisy notifications.
 *
 * POST: Create or update a push subscription
 * DELETE: Remove a push subscription
 * GET: List user's subscriptions
 *
 * @module pages/api/godaisy/push/subscribe
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
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
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  if (req.method === 'POST') {
    const { endpoint, keys, deviceName, userAgent } = req.body as PushSubscriptionPayload;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        error: 'Missing required fields: endpoint, keys.p256dh, keys.auth',
      });
    }

    try {
      const { data, error } = await supabase
        .from('godaisy_push_subscriptions')
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
          { onConflict: 'user_id,endpoint' }
        )
        .select('id')
        .single();

      if (error) {
        console.error('[GoDaisyPushSubscribe] Error upserting subscription:', error);
        return res.status(500).json({ error: 'Failed to save subscription' });
      }

      // Ensure default preferences exist
      const { error: prefError } = await supabase
        .from('godaisy_notification_preferences')
        .upsert(
          { user_id: userId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id', ignoreDuplicates: true }
        );

      if (prefError) {
        console.warn('[GoDaisyPushSubscribe] Failed to create default preferences:', prefError);
      }

      return res.status(200).json({
        success: true,
        subscriptionId: data?.id,
        message: 'Push subscription registered',
      });
    } catch (error) {
      console.error('[GoDaisyPushSubscribe] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    const { endpoint } = req.body as { endpoint?: string };

    try {
      let query = supabase
        .from('godaisy_push_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (endpoint) {
        query = query.eq('endpoint', endpoint);
      }

      const { error } = await query;

      if (error) {
        console.error('[GoDaisyPushSubscribe] Error deleting subscription:', error);
        return res.status(500).json({ error: 'Failed to remove subscription' });
      }

      return res.status(200).json({ success: true, message: 'Subscription removed' });
    } catch (error) {
      console.error('[GoDaisyPushSubscribe] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('godaisy_push_subscriptions')
        .select('id, endpoint, device_name, is_active, last_used_at, created_at')
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('[GoDaisyPushSubscribe] Error fetching subscriptions:', error);
        return res.status(500).json({ error: 'Failed to fetch subscriptions' });
      }

      return res.status(200).json({ subscriptions: data || [] });
    } catch (error) {
      console.error('[GoDaisyPushSubscribe] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
