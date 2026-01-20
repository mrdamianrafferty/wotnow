/**
 * Grow Daisy Push Notification Service
 *
 * Server-side service for sending Web Push notifications.
 * Uses the web-push library with VAPID authentication.
 *
 * @module lib/grow/notifications
 */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@godaisy.io';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Supabase client for server-side operations
const getSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// =============================================================================
// TYPES
// =============================================================================

export type NotificationType =
  | 'frost_alert'
  | 'weather_threat'
  | 'extreme_weather'
  | 'watering_reminder'
  | 'task_reminder'
  | 'plant_health'
  | 'harvest_reminder'
  | 'local_pest';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface SendNotificationOptions {
  userId: string;
  notificationType: NotificationType;
  payload: PushNotificationPayload;
  respectPreferences?: boolean;
  respectQuietHours?: boolean;
}

export interface BulkNotificationOptions {
  notificationType: NotificationType;
  payload: PushNotificationPayload;
  locationLat?: number;
  locationLng?: number;
  radiusKm?: number;
}

// =============================================================================
// NOTIFICATION SENDING
// =============================================================================

/**
 * Send a push notification to a single user
 */
export async function sendPushNotification(options: SendNotificationOptions): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const {
    userId,
    notificationType,
    payload,
    respectPreferences = true,
    respectQuietHours = true,
  } = options;

  const supabase = getSupabase();
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  try {
    // Get user's active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .rpc('grow_get_user_push_subscriptions', { p_user_id: userId });

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0, errors: ['No active subscriptions'] };
    }

    // Check preferences if requested
    if (respectPreferences) {
      const { data: prefs } = await supabase
        .from('grow_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (prefs) {
        // Check if this notification type is enabled
        const typeEnabled = checkNotificationTypeEnabled(notificationType, prefs);
        if (!typeEnabled) {
          return { sent: 0, failed: 0, errors: ['Notification type disabled by user'] };
        }

        // Check quiet hours
        if (respectQuietHours && isInQuietHours(prefs)) {
          return { sent: 0, failed: 0, errors: ['User is in quiet hours'] };
        }
      }
    }

    // Send to all subscriptions
    const pushPayload = JSON.stringify({
      ...payload,
      notificationType,
      timestamp: Date.now(),
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          },
          pushPayload
        );

        // Record success
        await supabase.rpc('grow_record_push_success', { p_subscription_id: sub.id });
        sent++;

        // Log the notification
        await logNotification(supabase, userId, sub.id, notificationType, payload, 'sent');
      } catch (pushError) {
        failed++;

        // Check if subscription is expired/invalid
        const error = pushError as { statusCode?: number; message?: string };
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription no longer valid - record failure
          await supabase.rpc('grow_record_push_failure', { p_subscription_id: sub.id });
          errors.push(`Subscription ${sub.id} expired or invalid`);
        } else {
          errors.push(`Failed to send to ${sub.id}: ${error.message || 'Unknown error'}`);
        }

        // Log the failure
        await logNotification(
          supabase,
          userId,
          sub.id,
          notificationType,
          payload,
          'failed',
          error.message
        );
      }
    }

    return { sent, failed, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { sent: 0, failed: 1, errors: [message] };
  }
}

/**
 * Send a notification to all users who have enabled a specific notification type.
 * Optionally filter by location proximity.
 */
export async function sendBulkNotification(options: BulkNotificationOptions): Promise<{
  totalUsers: number;
  sent: number;
  failed: number;
}> {
  const { notificationType, payload, locationLat, locationLng, radiusKm } = options;

  const supabase = getSupabase();
  let totalUsers = 0;
  let sent = 0;
  let failed = 0;

  try {
    // Get all users who should receive this notification
    const { data: users, error: userError } = await supabase.rpc(
      'grow_get_users_for_notification',
      {
        p_notification_type: notificationType,
        p_location_lat: locationLat ?? null,
        p_location_lng: locationLng ?? null,
        p_radius_km: radiusKm ?? 50,
      }
    );

    if (userError) {
      throw new Error(`Failed to get users: ${userError.message}`);
    }

    if (!users || users.length === 0) {
      return { totalUsers: 0, sent: 0, failed: 0 };
    }

    totalUsers = users.length;

    // Send to each user
    const pushPayload = JSON.stringify({
      ...payload,
      notificationType,
      timestamp: Date.now(),
    });

    for (const user of users) {
      try {
        await webpush.sendNotification(
          {
            endpoint: user.endpoint,
            keys: {
              p256dh: user.p256dh_key,
              auth: user.auth_key,
            },
          },
          pushPayload
        );

        await supabase.rpc('grow_record_push_success', { p_subscription_id: user.subscription_id });
        sent++;

        await logNotification(
          supabase,
          user.user_id,
          user.subscription_id,
          notificationType,
          payload,
          'sent'
        );
      } catch (pushError) {
        failed++;
        const error = pushError as { statusCode?: number };
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase.rpc('grow_record_push_failure', {
            p_subscription_id: user.subscription_id,
          });
        }
      }
    }

    return { totalUsers, sent, failed };
  } catch (error) {
    console.error('[GrowNotifications] Bulk send error:', error);
    return { totalUsers, sent, failed };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a notification type is enabled in user preferences
 */
function checkNotificationTypeEnabled(
  type: NotificationType,
  prefs: Record<string, boolean | number | string | null>
): boolean {
  const typeMap: Record<NotificationType, string> = {
    frost_alert: 'frost_alerts',
    weather_threat: 'weather_threats',
    extreme_weather: 'extreme_weather',
    watering_reminder: 'watering_reminders',
    task_reminder: 'task_reminders',
    plant_health: 'plant_health_alerts',
    harvest_reminder: 'harvest_reminders',
    local_pest: 'local_pest_alerts',
  };

  const prefKey = typeMap[type];
  return prefs[prefKey] !== false; // Default to true if not explicitly disabled
}

/**
 * Check if current time is within user's quiet hours
 */
function isInQuietHours(prefs: {
  quiet_start_hour?: number;
  quiet_end_hour?: number;
  timezone?: string;
}): boolean {
  const startHour = prefs.quiet_start_hour ?? 22;
  const endHour = prefs.quiet_end_hour ?? 7;
  const timezone = prefs.timezone || 'Europe/Dublin';

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });
    const currentHour = parseInt(formatter.format(now), 10);

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour;
    } else {
      return currentHour >= startHour && currentHour < endHour;
    }
  } catch {
    // If timezone parsing fails, don't block the notification
    return false;
  }
}

/**
 * Log a notification to the notification_log table
 */
async function logNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscriptionId: string | null,
  notificationType: NotificationType,
  payload: PushNotificationPayload,
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked',
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('grow_notification_log').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      notification_type: notificationType,
      title: payload.title,
      body: payload.body,
      data: payload.data || null,
      status,
      error_message: errorMessage || null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error('[GrowNotifications] Failed to log notification:', error);
  }
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

/**
 * Create a frost alert notification payload
 */
export function createFrostAlertPayload(options: {
  temperature: number;
  location: string;
  expectedTime: string;
}): PushNotificationPayload {
  return {
    title: '🥶 Frost Alert!',
    body: `Frost expected ${options.expectedTime} in ${options.location}. Temperature dropping to ${options.temperature}°C. Protect your tender plants!`,
    icon: '/icons/grow-icon-192.png',
    badge: '/icons/grow-badge-72.png',
    tag: 'frost-alert',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: {
      type: 'frost_alert',
      temperature: options.temperature,
      location: options.location,
      url: '/grow/weather',
    },
  };
}

/**
 * Create a watering reminder notification payload
 */
export function createWateringReminderPayload(options: {
  plantCount: number;
  gardenName?: string;
}): PushNotificationPayload {
  const garden = options.gardenName ? ` in ${options.gardenName}` : '';
  return {
    title: '💧 Watering Reminder',
    body: `${options.plantCount} plant${options.plantCount !== 1 ? 's' : ''}${garden} may need watering today.`,
    icon: '/icons/grow-icon-192.png',
    badge: '/icons/grow-badge-72.png',
    tag: 'watering-reminder',
    actions: [
      { action: 'view', title: 'View Tasks' },
      { action: 'done', title: 'Mark Done' },
    ],
    data: {
      type: 'watering_reminder',
      plantCount: options.plantCount,
      url: '/grow/tasks',
    },
  };
}

/**
 * Create a pest/disease risk notification payload
 */
export function createPestRiskPayload(options: {
  threatName: string;
  riskLevel: 'low' | 'medium' | 'high';
  affectedPlants: string[];
}): PushNotificationPayload {
  const emoji = options.riskLevel === 'high' ? '🚨' : options.riskLevel === 'medium' ? '⚠️' : '📢';
  const plantsText =
    options.affectedPlants.length > 2
      ? `${options.affectedPlants.slice(0, 2).join(', ')} and ${options.affectedPlants.length - 2} more`
      : options.affectedPlants.join(' and ');

  return {
    title: `${emoji} ${options.threatName} Risk`,
    body: `${options.riskLevel.charAt(0).toUpperCase() + options.riskLevel.slice(1)} risk for ${plantsText}. Weather conditions favor ${options.threatName}.`,
    icon: '/icons/grow-icon-192.png',
    badge: '/icons/grow-badge-72.png',
    tag: `pest-risk-${options.threatName.toLowerCase().replace(/\s+/g, '-')}`,
    requireInteraction: options.riskLevel === 'high',
    actions: [
      { action: 'view', title: 'View Advice' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: {
      type: 'weather_threat',
      threatName: options.threatName,
      riskLevel: options.riskLevel,
      url: '/grow/threats',
    },
  };
}

/**
 * Create a harvest reminder notification payload
 */
export function createHarvestReminderPayload(options: {
  plantName: string;
  daysReady: number;
}): PushNotificationPayload {
  const urgency = options.daysReady <= 0 ? 'ready now' : `ready in ~${options.daysReady} days`;
  return {
    title: '🥕 Harvest Time!',
    body: `Your ${options.plantName} ${options.daysReady <= 0 ? 'is' : 'will be'} ${urgency}. Don't miss the perfect harvest window!`,
    icon: '/icons/grow-icon-192.png',
    badge: '/icons/grow-badge-72.png',
    tag: `harvest-${options.plantName.toLowerCase().replace(/\s+/g, '-')}`,
    actions: [
      { action: 'view', title: 'View Plant' },
      { action: 'harvested', title: 'Mark Harvested' },
    ],
    data: {
      type: 'harvest_reminder',
      plantName: options.plantName,
      url: '/grow/garden',
    },
  };
}
