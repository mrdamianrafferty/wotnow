/**
 * /api/grow/push/send
 *
 * API endpoint for sending push notifications.
 * Can send to a single user or broadcast to all users of a notification type.
 *
 * POST: Send a notification
 *   - userId + payload: Send to specific user
 *   - notificationType + payload: Broadcast to all users with that type enabled
 *
 * @module pages/api/grow/push/send
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
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
      const targetUserId = body.userId || userId;
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const notificationType = body.notificationType || 'task_reminder';

      const result = await sendPushNotification({
        userId: targetUserId,
        notificationType,
        payload,
        respectPreferences: true,
        respectQuietHours: true,
      });

      return res.status(200).json({
        success: result.sent > 0,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      });
    }

    // Broadcast notification
    if (body.broadcast && body.notificationType) {
      const result = await sendBulkNotification({
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
