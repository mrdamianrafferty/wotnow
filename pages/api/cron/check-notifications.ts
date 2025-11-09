/**
 * /api/cron/check-notifications
 *
 * Cron job that checks fishing predictions and sends notifications to users
 * when their favorite species cross confidence thresholds
 *
 * Runs every 30-60 minutes via Vercel Cron
 *
 * Email Strategy: Daily Digest
 * - One email per user per day maximum
 * - Contains ALL species alerts for that day
 * - Batched together to avoid overwhelming users
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { generateDailyDigestHTML, generateDailyDigestText, type EmailSpeciesAlert } from '../../../lib/findr/emailTemplates';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration for cron job');
}

// Service role client bypasses RLS for cron jobs
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Initialize Resend client (only if API key is configured)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface UserFavourite {
  id: string;
  user_id: string;
  species_id: string;
  notifications_enabled: boolean;
  notification_threshold: number;
  notification_channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
}

interface UserLocationPreference {
  user_id: string;
  rectangle_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface PredictionResult {
  species_code: string;
  confidence: number;
  rectangle_code: string;
}

interface NotificationToSend {
  userId: string;
  speciesId: string;
  speciesCode: string;
  speciesName: string;
  confidence: number;
  threshold: number;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  rectangleCode: string;
}

/**
 * Get user's default location (rectangle code)
 */
async function getUserLocation(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_location_preferences')
    .select('rectangle_code, latitude, longitude')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  const location = data as UserLocationPreference;
  return location.rectangle_code;
}

/**
 * Get live predictions for a species in a rectangle
 */
async function getPredictions(rectangleCode: string, _speciesCodes: string[]): Promise<Map<string, number>> {
  try {
    const { data, error } = await supabase.rpc('get_fishing_predictions', {
      p_rectangle_code: rectangleCode,
      p_prediction_date: new Date().toISOString().split('T')[0], // Today's date
    });

    if (error) {
      console.error('[Cron] Error fetching predictions:', error);
      return new Map();
    }

    if (!data || !Array.isArray(data)) {
      return new Map();
    }

    // Build map of species_code -> confidence
    const predictions = new Map<string, number>();
    data.forEach((prediction: PredictionResult) => {
      if (prediction.species_code && typeof prediction.confidence === 'number') {
        predictions.set(prediction.species_code.toUpperCase(), prediction.confidence);
      }
    });

    return predictions;
  } catch (error) {
    console.error('[Cron] Exception fetching predictions:', error);
    return new Map();
  }
}

/**
 * Check if a notification was recently sent (within last 6 hours)
 */
async function wasRecentlySent(userId: string, speciesId: string): Promise<boolean> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('species_id', speciesId)
    .eq('notification_type', 'threshold_crossed')
    .gte('sent_at', sixHoursAgo)
    .limit(1);

  if (error) {
    console.error('[Cron] Error checking notification log:', error);
    return false; // On error, allow sending (better to send duplicate than miss)
  }

  return data && data.length > 0;
}

/**
 * Check if user has already received a daily digest email today
 * Enforces maximum one email per day policy
 */
async function hasReceivedDailyDigestToday(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    const { data, error } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('channel', 'email')
      .eq('notification_type', 'daily_digest')
      .gte('sent_at', todayStart.toISOString())
      .limit(1);

    if (error) {
      console.error('[Cron] Error checking daily digest:', error);
      return false; // On error, allow sending
    }

    return data && data.length > 0;
  } catch {
    return false; // On error, allow sending
  }
}

/**
 * Send push notification (placeholder - will be implemented with actual push service)
 */
async function sendPushNotification(notification: NotificationToSend): Promise<boolean> {
  // TODO: Implement actual push notification sending
  // For now, just log to console
  console.log('[Cron] Would send push notification:', {
    userId: notification.userId,
    species: notification.speciesName,
    confidence: notification.confidence,
    threshold: notification.threshold,
  });

  // In a real implementation, this would:
  // 1. Get user's push token from database
  // 2. Send via Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNS)
  // 3. Use the Capacitor Push Notifications plugin token

  return true; // Simulated success
}

/**
 * Send daily digest email to a user with all their species alerts
 *
 * NOTE: This function is NOT called per-notification.
 * It's called once per user with ALL their alerts batched together.
 */
async function sendDailyDigestEmail(
  userId: string,
  alerts: NotificationToSend[],
  locationName: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Cron] Resend not configured, skipping email for user:', userId);
    return false;
  }

  if (alerts.length === 0) {
    console.log('[Cron] No alerts to send for user:', userId);
    return false;
  }

  try {
    // 1. Get user's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user?.email) {
      console.error('[Cron] Could not get user email:', userError);
      return false;
    }

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.name || undefined;

    // 2. Build email data with species alerts
    const emailAlerts: EmailSpeciesAlert[] = alerts.map(alert => ({
      speciesName: alert.speciesName,
      confidence: alert.confidence,
      locationName: locationName,
      rectangleCode: alert.rectangleCode,
      // TODO: Add species image URL if available
      imageUrl: undefined,
    }));

    const emailData = {
      userName,
      alerts: emailAlerts,
      date: new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    };

    // 3. Generate HTML and text versions
    const htmlContent = generateDailyDigestHTML(emailData);
    const textContent = generateDailyDigestText(emailData);

    // 4. Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: userEmail,
      subject: `🎣 ${alerts.length} great fishing ${alerts.length === 1 ? 'opportunity' : 'opportunities'} today`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('[Cron] Error sending email via Resend:', error);
      return false;
    }

    console.log('[Cron] Daily digest email sent successfully:', {
      userId,
      email: userEmail,
      alertCount: alerts.length,
      resendId: data?.id,
    });

    // 5. Log the daily digest send
    await supabase.from('notification_log').insert({
      user_id: userId,
      species_id: null, // Not species-specific, it's a digest
      notification_type: 'daily_digest',
      channel: 'email',
      confidence_at_send: null,
      threshold_value: null,
      notification_data: {
        alert_count: alerts.length,
        species_codes: alerts.map(a => a.speciesCode),
        location: locationName,
      },
      sent_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('[Cron] Exception sending daily digest email:', error);
    return false;
  }
}

/**
 * Send email notification (DEPRECATED - replaced by daily digest)
 *
 * This function is no longer used for individual species notifications.
 * Email notifications are now batched into daily digests.
 */
async function _sendEmailNotification(_notification: NotificationToSend): Promise<boolean> {
  console.log('[Cron] Individual email notifications deprecated, use daily digest instead');
  return false;
}

/**
 * Log sent notification to prevent spam
 */
async function logNotification(notification: NotificationToSend, channel: 'push' | 'email' | 'sms'): Promise<void> {
  await supabase.from('notification_log').insert({
    user_id: notification.userId,
    species_id: notification.speciesId,
    notification_type: 'threshold_crossed',
    channel,
    confidence_at_send: notification.confidence,
    threshold_value: notification.threshold,
    notification_data: {
      species_code: notification.speciesCode,
      species_name: notification.speciesName,
      rectangle_code: notification.rectangleCode,
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Starting notification check...');

    // 1. Get all users with notifications enabled
    const { data: favourites, error: favError } = await supabase
      .from('user_favourites')
      .select('id, user_id, species_id, notifications_enabled, notification_threshold, notification_channels')
      .eq('notifications_enabled', true);

    if (favError) {
      console.error('[Cron] Error fetching favourites:', favError);
      throw favError;
    }

    if (!favourites || favourites.length === 0) {
      console.log('[Cron] No users with notifications enabled');
      return res.status(200).json({ success: true, message: 'No notifications to check', processed: 0 });
    }

    const typedFavourites = favourites as UserFavourite[];
    console.log('[Cron] Found', typedFavourites.length, 'favourites with notifications enabled');

    // 2. Group favourites by user
    const userFavourites = new Map<string, UserFavourite[]>();
    typedFavourites.forEach((fav) => {
      const existing = userFavourites.get(fav.user_id) || [];
      existing.push(fav);
      userFavourites.set(fav.user_id, existing);
    });

    console.log('[Cron] Processing', userFavourites.size, 'users');

    // 3. Check predictions for each user
    const notificationsToSend: NotificationToSend[] = [];

    for (const [userId, favs] of userFavourites.entries()) {
      // Get user's location
      const rectangleCode = await getUserLocation(userId);
      if (!rectangleCode) {
        console.log('[Cron] No location for user', userId, '- skipping');
        continue;
      }

      // Get species codes from favourites
      const speciesCodes = favs.map((f) => f.species_id.toUpperCase());

      // Get predictions for this location
      const predictions = await getPredictions(rectangleCode, speciesCodes);

      // Check each favourite against threshold
      for (const fav of favs) {
        const speciesCode = fav.species_id.toUpperCase();
        const confidence = predictions.get(speciesCode);

        if (confidence === undefined) {
          continue; // No prediction available
        }

        // Check if confidence crossed threshold
        if (confidence >= fav.notification_threshold) {
          // Check if we recently sent a notification for this species
          const recentlySent = await wasRecentlySent(userId, fav.species_id);
          if (recentlySent) {
            console.log('[Cron] Already sent notification for user', userId, 'species', fav.species_id, 'in last 6 hours - skipping');
            continue;
          }

          // Queue notification
          notificationsToSend.push({
            userId,
            speciesId: fav.species_id,
            speciesCode,
            speciesName: speciesCode, // TODO: Get actual species name from species table
            confidence,
            threshold: fav.notification_threshold,
            channels: fav.notification_channels,
            rectangleCode,
          });
        }
      }
    }

    console.log('[Cron] Found', notificationsToSend.length, 'threshold-crossing species');

    // 4. Send notifications - DAILY DIGEST APPROACH
    // Push notifications: Send individually (real-time)
    // Email notifications: Batch by user (one email per day max)

    let pushCount = 0;
    let emailDigestCount = 0;

    // 4a. Send push notifications individually (real-time alerts)
    for (const notification of notificationsToSend) {
      if (notification.channels.push) {
        const pushSent = await sendPushNotification(notification);
        if (pushSent) {
          await logNotification(notification, 'push');
          pushCount++;
        }
      }

      // Note: SMS not implemented yet
      if (notification.channels.sms) {
        console.log('[Cron] SMS notifications not implemented yet');
      }
    }

    // 4b. Send daily digest emails (batched by user)
    // Group email-enabled notifications by user
    const userEmailAlerts = new Map<string, NotificationToSend[]>();
    const userLocations = new Map<string, string>();

    for (const notification of notificationsToSend) {
      if (notification.channels.email) {
        const existing = userEmailAlerts.get(notification.userId) || [];
        existing.push(notification);
        userEmailAlerts.set(notification.userId, existing);

        // Store location for email context
        if (!userLocations.has(notification.userId)) {
          // Get location name from rectangle code
          const { data: rectangle } = await supabase
            .from('ices_rectangles')
            .select('code')
            .eq('code', notification.rectangleCode)
            .single();

          userLocations.set(notification.userId, rectangle?.code || notification.rectangleCode);
        }
      }
    }

    // Send one digest email per user (if they haven't received one today)
    for (const [userId, alerts] of userEmailAlerts.entries()) {
      // Check if user already received digest today
      const alreadySentToday = await hasReceivedDailyDigestToday(userId);
      if (alreadySentToday) {
        console.log('[Cron] User', userId, 'already received daily digest today - skipping');
        continue;
      }

      // Send digest with ALL species for this user
      const locationName = userLocations.get(userId) || 'your location';
      const digestSent = await sendDailyDigestEmail(userId, alerts, locationName);

      if (digestSent) {
        emailDigestCount++;
      }
    }

    console.log('[Cron] Notification check complete.');
    console.log(`[Cron] - Sent ${pushCount} push notifications`);
    console.log(`[Cron] - Sent ${emailDigestCount} daily digest emails`);

    return res.status(200).json({
      success: true,
      message: 'Notifications checked and sent',
      processed: userFavourites.size,
      thresholdCrossings: notificationsToSend.length,
      pushNotificationsSent: pushCount,
      emailDigestsSent: emailDigestCount,
    });
  } catch (error: unknown) {
    console.error('[Cron] Error in notification check:', error);
    return res.status(500).json({
      error: 'Failed to check notifications',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
