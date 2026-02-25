/**
 * Go Daisy Push Notification Service
 *
 * Server-side service for sending Web Push notifications for Go Daisy.
 * Covers weather alerts, activity recommendations, astronomy, and tide alerts.
 *
 * @module lib/godaisy/notifications
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

const getSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// =============================================================================
// TYPES
// =============================================================================

export type GoDaisyNotificationType =
  | 'weather_alert'
  | 'extreme_weather'
  | 'activity_recommendation'
  | 'astronomy_alert'
  | 'tide_alert';

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
  notificationType: GoDaisyNotificationType;
  payload: PushNotificationPayload;
  respectPreferences?: boolean;
  respectQuietHours?: boolean;
}

export interface BulkNotificationOptions {
  notificationType: GoDaisyNotificationType;
  payload: PushNotificationPayload;
  locationLat?: number;
  locationLng?: number;
  radiusKm?: number;
}

// =============================================================================
// NOTIFICATION SENDING
// =============================================================================

/**
 * Send a push notification to a single Go Daisy user
 */
export async function sendGoDaisyPushNotification(options: SendNotificationOptions): Promise<{
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
    const { data: subscriptions, error: subError } = await supabase
      .rpc('godaisy_get_user_push_subscriptions', { p_user_id: userId });

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0, errors: ['No active subscriptions'] };
    }

    if (respectPreferences) {
      const { data: prefs } = await supabase
        .from('godaisy_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (prefs) {
        if (!checkNotificationTypeEnabled(notificationType, prefs)) {
          return { sent: 0, failed: 0, errors: ['Notification type disabled by user'] };
        }

        if (respectQuietHours && isInQuietHours(prefs)) {
          return { sent: 0, failed: 0, errors: ['User is in quiet hours'] };
        }
      }
    }

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
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          pushPayload
        );

        await supabase.rpc('godaisy_record_push_success', { p_subscription_id: sub.id });
        sent++;
        await logNotification(supabase, userId, sub.id, notificationType, payload, 'sent');
      } catch (pushError) {
        failed++;
        const error = pushError as { statusCode?: number; message?: string };
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase.rpc('godaisy_record_push_failure', { p_subscription_id: sub.id });
          errors.push(`Subscription ${sub.id} expired or invalid`);
        } else {
          errors.push(`Failed to send to ${sub.id}: ${error.message || 'Unknown error'}`);
        }
        await logNotification(supabase, userId, sub.id, notificationType, payload, 'failed', error.message);
      }
    }

    return { sent, failed, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { sent: 0, failed: 1, errors: [message] };
  }
}

/**
 * Send a notification to all Go Daisy users who have a notification type enabled
 */
export async function sendGoDaisyBulkNotification(options: BulkNotificationOptions): Promise<{
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
    const { data: users, error: userError } = await supabase.rpc(
      'godaisy_get_users_for_notification',
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
            keys: { p256dh: user.p256dh_key, auth: user.auth_key },
          },
          pushPayload
        );
        await supabase.rpc('godaisy_record_push_success', { p_subscription_id: user.subscription_id });
        sent++;
        await logNotification(supabase, user.user_id, user.subscription_id, notificationType, payload, 'sent');
      } catch (pushError) {
        failed++;
        const error = pushError as { statusCode?: number };
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase.rpc('godaisy_record_push_failure', { p_subscription_id: user.subscription_id });
        }
      }
    }

    return { totalUsers, sent, failed };
  } catch (error) {
    console.error('[GoDaisyNotifications] Bulk send error:', error);
    return { totalUsers, sent, failed };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function checkNotificationTypeEnabled(
  type: GoDaisyNotificationType,
  prefs: Record<string, boolean | number | string | null>
): boolean {
  const typeMap: Record<GoDaisyNotificationType, string> = {
    weather_alert: 'weather_alerts',
    extreme_weather: 'extreme_weather',
    activity_recommendation: 'activity_recommendations',
    astronomy_alert: 'astronomy_alerts',
    tide_alert: 'tide_alerts',
  };

  const prefKey = typeMap[type];
  return prefs[prefKey] !== false;
}

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

    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour;
    } else {
      return currentHour >= startHour && currentHour < endHour;
    }
  } catch {
    return false;
  }
}

async function logNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  subscriptionId: string | null,
  notificationType: GoDaisyNotificationType,
  payload: PushNotificationPayload,
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked',
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('godaisy_notification_log').insert({
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
    console.error('[GoDaisyNotifications] Failed to log notification:', error);
  }
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

/**
 * Create a weather alert notification (wind, rain, UV, etc.)
 */
export function createWeatherAlertPayload(options: {
  condition: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  location: string;
  advice?: string;
}): PushNotificationPayload {
  const emoji = options.severity === 'severe' ? '🚨' : options.severity === 'high' ? '⚠️' : '🌤️';
  return {
    title: `${emoji} Weather Alert - ${options.condition}`,
    body: `${options.severity.charAt(0).toUpperCase() + options.severity.slice(1)} conditions in ${options.location}.${options.advice ? ` ${options.advice}` : ''}`,
    icon: '/icons/godaisy-icon-192.png',
    badge: '/icons/godaisy-badge-72.png',
    tag: `weather-alert-${options.condition.toLowerCase().replace(/\s+/g, '-')}`,
    requireInteraction: options.severity === 'severe' || options.severity === 'high',
    actions: [
      { action: 'view', title: 'View Weather' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: {
      type: 'weather_alert',
      condition: options.condition,
      severity: options.severity,
      url: '/weather',
    },
  };
}

/**
 * Create an activity recommendation notification
 */
export function createActivityRecommendationPayload(options: {
  activity: string;
  rating: 'excellent' | 'good' | 'fair';
  reason: string;
  location?: string;
}): PushNotificationPayload {
  const emoji =
    options.rating === 'excellent' ? '🌟' :
    options.rating === 'good' ? '👍' : '🙂';
  const locationText = options.location ? ` in ${options.location}` : '';

  return {
    title: `${emoji} Great day for ${options.activity}!`,
    body: `${options.rating.charAt(0).toUpperCase() + options.rating.slice(1)} conditions${locationText}. ${options.reason}`,
    icon: '/icons/godaisy-icon-192.png',
    badge: '/icons/godaisy-badge-72.png',
    tag: `activity-${options.activity.toLowerCase().replace(/\s+/g, '-')}`,
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: {
      type: 'activity_recommendation',
      activity: options.activity,
      rating: options.rating,
      url: '/activities',
    },
  };
}

/**
 * Create an astronomy alert notification
 */
export function createAstronomyAlertPayload(options: {
  event: string;
  time: string;
  details?: string;
}): PushNotificationPayload {
  return {
    title: `🔭 ${options.event}`,
    body: `${options.time}${options.details ? `. ${options.details}` : ''}`,
    icon: '/icons/godaisy-icon-192.png',
    badge: '/icons/godaisy-badge-72.png',
    tag: `astronomy-${options.event.toLowerCase().replace(/\s+/g, '-')}`,
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: {
      type: 'astronomy_alert',
      event: options.event,
      url: '/weather',
    },
  };
}

/**
 * Create a tide alert notification
 */
export function createTideAlertPayload(options: {
  tideType: 'high' | 'low' | 'spring';
  time: string;
  location: string;
  height?: number;
}): PushNotificationPayload {
  const emoji = options.tideType === 'spring' ? '🌊' : options.tideType === 'high' ? '🔵' : '⬇️';
  const heightText = options.height ? ` (${options.height.toFixed(1)}m)` : '';

  return {
    title: `${emoji} ${options.tideType.charAt(0).toUpperCase() + options.tideType.slice(1)} Tide - ${options.location}`,
    body: `${options.tideType === 'spring' ? 'Spring tide' : `${options.tideType.charAt(0).toUpperCase() + options.tideType.slice(1)} tide`} at ${options.time}${heightText}.`,
    icon: '/icons/godaisy-icon-192.png',
    badge: '/icons/godaisy-badge-72.png',
    tag: `tide-${options.tideType}-${options.location.toLowerCase().replace(/\s+/g, '-')}`,
    actions: [
      { action: 'view', title: 'View Tides' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: {
      type: 'tide_alert',
      tideType: options.tideType,
      url: '/weather',
    },
  };
}
