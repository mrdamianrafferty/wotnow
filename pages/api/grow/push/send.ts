/**
 * /api/grow/push/send
 *
 * API endpoint for sending push notifications.
 * Can send to a single user or broadcast to all users of a notification type.
 * Supports both Web Push (PWA) and native push (APNs for iOS, FCM for Android).
 *
 * POST: Send a notification
 *   - userId + payload: Send to specific user
 *   - notificationType + payload: Broadcast to all users with that type enabled
 *
 * @module pages/api/grow/push/send
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, RateLimitError } from '@/lib/utils/rate-limiter';
import {
  sendPushNotification,
  sendBulkNotification,
  createFrostAlertPayload,
  createWateringReminderPayload,
  createPestRiskPayload,
  createHarvestReminderPayload,
  NotificationType,
  PushNotificationPayload,
} from '@/lib/grow/notifications';
import { sendGrowApnsPushNotification } from '@/lib/grow/apnsClient';
import { sendFcmPushNotification } from '@/lib/notifications/fcmClient';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Secret key for internal API calls (prevents unauthorized notifications)
const PUSH_API_SECRET = process.env.GROW_PUSH_API_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface SendNotificationRequest {
  // Send to specific user
  userId?: string;

  // Or broadcast by type
  broadcast?: boolean;
  notificationType?: NotificationType;

  // Location for geo-filtered broadcasts
  locationLat?: number;
  locationLng?: number;
  radiusKm?: number;

  // Notification content (one of these)
  payload?: PushNotificationPayload;
  template?: {
    type: 'frost_alert' | 'watering_reminder' | 'pest_risk' | 'harvest_reminder';
    data: Record<string, unknown>;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication: Either service role or API secret
  const authHeader = req.headers.authorization;
  const apiSecret = req.headers['x-push-api-secret'];

  let isAuthorized = false;
  let userId: string | undefined;

  // Check API secret (for internal/cron calls)
  if (apiSecret && PUSH_API_SECRET && apiSecret === PUSH_API_SECRET) {
    isAuthorized = true;
  }

  // Check Bearer token (for user-initiated sends, e.g., test notifications)
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

  // Rate limiting: 10 requests per minute
  try {
    await checkRateLimit(req, { maxRequests: 10, windowMs: 60 * 1000 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return res.status(429).json({ error: error.message, retryAfter: error.retryAfter });
    }
    throw error;
  }

  const body = req.body as SendNotificationRequest;

  // Build payload from template if provided
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
      // When authenticated via Bearer token, enforce self-only sends
      if (userId && body.userId && body.userId !== userId) {
        return res.status(403).json({ error: 'Cannot send notifications to another user' });
      }
      const targetUserId = userId || body.userId;
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const notificationType = body.notificationType || 'task_reminder';

      // Send via Web Push
      const result = await sendPushNotification({
        userId: targetUserId,
        notificationType,
        payload,
        respectPreferences: true,
        respectQuietHours: true,
      });

      // Also send via native push (APNs/FCM)
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
      // Web Push broadcast
      const result = await sendBulkNotification({
        notificationType: body.notificationType,
        payload,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        radiusKm: body.radiusKm,
      });

      // Also broadcast via native push (APNs/FCM)
      const nativeResult = await broadcastToNativeTokens(
        body.notificationType,
        payload
      );

      const totalSent = result.sent + nativeResult.sent;
      const totalFailed = result.failed + nativeResult.failed;

      return res.status(200).json({
        success: totalSent > 0,
        totalUsers: result.totalUsers + nativeResult.totalUsers,
        sent: totalSent,
        failed: totalFailed,
        channels: {
          webPush: { totalUsers: result.totalUsers, sent: result.sent, failed: result.failed },
          native: { totalUsers: nativeResult.totalUsers, sent: nativeResult.sent, failed: nativeResult.failed },
        },
      });
    }

    return res.status(400).json({
      error: 'Must specify userId for single send, or broadcast=true with notificationType',
    });
  } catch (error) {
    console.error('[GrowPushSend] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Build notification payload from a template
 */
function buildPayloadFromTemplate(template: {
  type: string;
  data: Record<string, unknown>;
}): PushNotificationPayload | undefined {
  switch (template.type) {
    case 'frost_alert':
      return createFrostAlertPayload({
        temperature: (template.data.temperature as number) ?? -2,
        location: (template.data.location as string) ?? 'your area',
        expectedTime: (template.data.expectedTime as string) ?? 'tonight',
      });

    case 'watering_reminder':
      return createWateringReminderPayload({
        plantCount: (template.data.plantCount as number) ?? 5,
        gardenName: template.data.gardenName as string | undefined,
      });

    case 'pest_risk':
      return createPestRiskPayload({
        threatName: (template.data.threatName as string) ?? 'Pest Alert',
        riskLevel: (template.data.riskLevel as 'low' | 'medium' | 'high') ?? 'medium',
        affectedPlants: (template.data.affectedPlants as string[]) ?? ['your plants'],
      });

    case 'harvest_reminder':
      return createHarvestReminderPayload({
        plantName: (template.data.plantName as string) ?? 'plant',
        daysReady: (template.data.daysReady as number) ?? 0,
      });

    default:
      return undefined;
  }
}

// =============================================================================
// NATIVE PUSH HELPERS (APNs / FCM)
// =============================================================================

/**
 * Send notification to a single user's native push tokens (iOS/Android)
 */
async function sendToNativeTokens(
  targetUserId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Filter to Grow Daisy tokens or legacy tokens (null bundle_id)
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', targetUserId)
      .or('bundle_id.eq.io.growdaisy.app,bundle_id.is.null');

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
        let success = false;
        if (tokenEntry.platform === 'ios') {
          success = await sendGrowApnsPushNotification(tokenEntry.token, nativePayload);
        } else if (tokenEntry.platform === 'android') {
          success = await sendFcmPushNotification(tokenEntry.token, nativePayload);
        }

        if (success) {
          sent++;
        } else {
          failed++;
          errors.push(`Failed to send via ${tokenEntry.platform}`);
        }
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

/**
 * Broadcast notification to all Grow Daisy native push tokens (iOS/Android)
 * for users who have the specified notification type enabled.
 */
async function broadcastToNativeTokens(
  notificationType: NotificationType,
  payload: PushNotificationPayload
): Promise<{ totalUsers: number; sent: number; failed: number }> {
  let totalUsers = 0;
  let sent = 0;
  let failed = 0;

  try {
    // Get Grow Daisy native tokens (filter by bundle_id)
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('user_id, token, platform')
      .or('bundle_id.eq.io.growdaisy.app,bundle_id.is.null');

    if (!tokens || tokens.length === 0) {
      return { totalUsers: 0, sent: 0, failed: 0 };
    }

    totalUsers = new Set(tokens.map(t => t.user_id)).size;

    const nativePayload = {
      title: payload.title,
      body: payload.body,
      data: payload.data as Record<string, string> | undefined,
    };

    for (const tokenEntry of tokens) {
      try {
        let success = false;
        if (tokenEntry.platform === 'ios') {
          success = await sendGrowApnsPushNotification(tokenEntry.token, nativePayload);
        } else if (tokenEntry.platform === 'android') {
          success = await sendFcmPushNotification(tokenEntry.token, nativePayload);
        }

        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
  } catch (err) {
    console.error('[GrowPushSend] Native broadcast error:', err);
  }

  return { totalUsers, sent, failed };
}
