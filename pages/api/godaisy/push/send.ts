/**
 * /api/godaisy/push/send
 *
 * API endpoint for sending Go Daisy push notifications.
 * Supports single user and broadcast modes, with Web Push and native push.
 *
 * @module pages/api/godaisy/push/send
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  sendGoDaisyPushNotification,
  sendGoDaisyBulkNotification,
  createWeatherAlertPayload,
  createActivityRecommendationPayload,
  createAstronomyAlertPayload,
  createTideAlertPayload,
  GoDaisyNotificationType,
  PushNotificationPayload,
} from '@/lib/godaisy/notifications';
import { sendFcmPushNotification } from '@/lib/notifications/fcmClient';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUSH_API_SECRET = process.env.GODAISY_PUSH_API_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SendNotificationRequest {
  userId?: string;
  broadcast?: boolean;
  notificationType?: GoDaisyNotificationType;
  locationLat?: number;
  locationLng?: number;
  radiusKm?: number;
  payload?: PushNotificationPayload;
  template?: {
    type: 'weather_alert' | 'activity_recommendation' | 'astronomy_alert' | 'tide_alert';
    data: Record<string, unknown>;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication: Either API secret or Bearer token
  const authHeader = req.headers.authorization;
  const apiSecret = req.headers['x-push-api-secret'];

  let isAuthorized = false;
  let userId: string | undefined;

  if (apiSecret && PUSH_API_SECRET && apiSecret === PUSH_API_SECRET) {
    isAuthorized = true;
  }

  if (!isAuthorized && authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!error && user) {
      isAuthorized = true;
      userId = user.id;
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as SendNotificationRequest;

  let payload: PushNotificationPayload | undefined = body.payload;

  if (!payload && body.template) {
    payload = buildPayloadFromTemplate(body.template);
  }

  if (!payload) {
    return res.status(400).json({ error: 'Missing payload or template' });
  }

  try {
    // Single user notification
    if (body.userId || (userId && !body.broadcast)) {
      const targetUserId = body.userId || userId;
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const notificationType = body.notificationType || 'activity_recommendation';

      const result = await sendGoDaisyPushNotification({
        userId: targetUserId,
        notificationType,
        payload,
        respectPreferences: true,
        respectQuietHours: true,
      });

      // Also send via native push (FCM)
      const nativeResult = await sendToNativeTokens(targetUserId, payload);

      const totalSent = result.sent + nativeResult.sent;
      const totalFailed = result.failed + nativeResult.failed;
      const allErrors = [...result.errors, ...nativeResult.errors];

      return res.status(200).json({
        success: totalSent > 0,
        sent: totalSent,
        failed: totalFailed,
        errors: allErrors,
        channels: {
          webPush: { sent: result.sent, failed: result.failed },
          native: { sent: nativeResult.sent, failed: nativeResult.failed },
        },
      });
    }

    // Broadcast notification
    if (body.broadcast && body.notificationType) {
      const result = await sendGoDaisyBulkNotification({
        notificationType: body.notificationType,
        payload,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        radiusKm: body.radiusKm,
      });

      return res.status(200).json({
        success: result.sent > 0,
        totalUsers: result.totalUsers,
        sent: result.sent,
        failed: result.failed,
      });
    }

    return res.status(400).json({
      error: 'Must specify userId for single send, or broadcast=true with notificationType',
    });
  } catch (error) {
    console.error('[GoDaisyPushSend] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function buildPayloadFromTemplate(template: {
  type: string;
  data: Record<string, unknown>;
}): PushNotificationPayload | undefined {
  switch (template.type) {
    case 'weather_alert':
      return createWeatherAlertPayload({
        condition: (template.data.condition as string) ?? 'Weather warning',
        severity: (template.data.severity as 'low' | 'moderate' | 'high' | 'severe') ?? 'moderate',
        location: (template.data.location as string) ?? 'your area',
        advice: template.data.advice as string | undefined,
      });

    case 'activity_recommendation':
      return createActivityRecommendationPayload({
        activity: (template.data.activity as string) ?? 'outdoor activities',
        rating: (template.data.rating as 'excellent' | 'good' | 'fair') ?? 'good',
        reason: (template.data.reason as string) ?? 'Great weather conditions today',
        location: template.data.location as string | undefined,
      });

    case 'astronomy_alert':
      return createAstronomyAlertPayload({
        event: (template.data.event as string) ?? 'Astronomy Event',
        time: (template.data.time as string) ?? 'tonight',
        details: template.data.details as string | undefined,
      });

    case 'tide_alert':
      return createTideAlertPayload({
        tideType: (template.data.tideType as 'high' | 'low' | 'spring') ?? 'high',
        time: (template.data.time as string) ?? 'soon',
        location: (template.data.location as string) ?? 'your coastal spot',
        height: template.data.height as number | undefined,
      });

    default:
      return undefined;
  }
}

async function sendToNativeTokens(
  targetUserId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', targetUserId);

    if (!tokens || tokens.length === 0) {
      return { sent: 0, failed: 0, errors: [] };
    }

    const nativePayload = {
      title: payload.title,
      body: payload.body,
      data: payload.data as Record<string, string> | undefined,
    };

    for (const tokenEntry of tokens) {
      try {
        if (tokenEntry.platform === 'android') {
          const success = await sendFcmPushNotification(tokenEntry.token, nativePayload);
          if (success) { sent++; } else { failed++; errors.push('Failed to send via android'); }
        }
        // iOS APNs for Go Daisy would need its own bundle ID;
        // for now, only FCM (Android) and Web Push are supported.
      } catch (err) {
        failed++;
        errors.push(`${tokenEntry.platform} error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to fetch native tokens: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  return { sent, failed, errors };
}
