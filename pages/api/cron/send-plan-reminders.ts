/**
 * /api/cron/send-plan-reminders
 *
 * Cron job that sends push notification reminders for planned activities.
 * Runs every 15 minutes via Vercel Cron.
 *
 * Process:
 * 1. Query planned_activities where reminder_at <= now AND reminder_sent = FALSE
 * 2. For each pending reminder, send push notification to user
 * 3. Mark reminder_sent = TRUE
 *
 * Supported Apps:
 * - Go Daisy: Activity reminders
 * - Findr: Fishing session reminders
 * - Grow Daisy: Gardening task reminders
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendPushToUser, isPushConfigured } from '../../../lib/notifications/sendPushNotification';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration for cron job');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface PlannedActivityRow {
  id: string;
  user_id: string;
  app: 'godaisy' | 'findr' | 'growdaisy';
  activity_type: string;
  activity_name: string;
  activity_data: Record<string, unknown>;
  planned_for: string;
  planned_time: string | null;
  reminder_enabled: boolean;
  reminder_at: string;
  reminder_sent: boolean;
}

/**
 * Get app-specific notification title
 */
function getAppTitle(app: PlannedActivityRow['app']): string {
  switch (app) {
    case 'godaisy':
      return '🌤️ Go Daisy Reminder';
    case 'findr':
      return '🎣 Fishing Reminder';
    case 'growdaisy':
      return '🌱 Grow Daisy Reminder';
    default:
      return '⏰ Reminder';
  }
}

/**
 * Get deep link path for the app
 */
function getDeepLink(activity: PlannedActivityRow): string {
  switch (activity.app) {
    case 'godaisy':
      return '/';
    case 'findr':
      return '/findr';
    case 'growdaisy':
      return '/grow';
    default:
      return '/';
  }
}

/**
 * Format the reminder body text
 */
function getReminderBody(activity: PlannedActivityRow): string {
  const timeText = activity.planned_time
    ? ` at ${activity.planned_time}`
    : '';

  return `${activity.activity_name}${timeText}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[PlanReminders] Starting reminder check...');

    // Check if push is configured
    const pushConfig = isPushConfigured();
    console.log('[PlanReminders] Push config:', pushConfig);

    if (!pushConfig.ios && !pushConfig.android) {
      console.log('[PlanReminders] No push notification services configured');
      return res.status(200).json({
        success: true,
        message: 'Push notifications not configured',
        sent: 0,
      });
    }

    // 1. Get all pending reminders where reminder_at is in the past
    const now = new Date().toISOString();

    const { data: pendingReminders, error: queryError } = await supabase
      .from('planned_activities')
      .select('*')
      .eq('reminder_enabled', true)
      .eq('reminder_sent', false)
      .eq('completed', false)
      .lte('reminder_at', now)
      .not('user_id', 'is', null) // Only for authenticated users
      .order('reminder_at', { ascending: true })
      .limit(100); // Process max 100 per run to avoid timeouts

    if (queryError) {
      console.error('[PlanReminders] Error fetching reminders:', queryError);
      throw queryError;
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      console.log('[PlanReminders] No pending reminders');
      return res.status(200).json({
        success: true,
        message: 'No pending reminders',
        sent: 0,
      });
    }

    console.log('[PlanReminders] Found', pendingReminders.length, 'pending reminders');

    // 2. Send notifications for each reminder
    let sentCount = 0;
    let failedCount = 0;
    const processedIds: string[] = [];

    for (const activity of pendingReminders as PlannedActivityRow[]) {
      try {
        console.log('[PlanReminders] Processing reminder:', {
          id: activity.id,
          user: activity.user_id,
          app: activity.app,
          activity: activity.activity_name,
        });

        const result = await sendPushToUser(activity.user_id, {
          title: getAppTitle(activity.app),
          body: getReminderBody(activity),
          data: {
            type: 'plan_reminder',
            planId: activity.id,
            app: activity.app,
            deepLink: getDeepLink(activity),
          },
          badge: 1,
          sound: 'default',
        });

        // Count as sent if at least one platform succeeded
        if (result.ios.sent || result.android.sent) {
          sentCount++;
          console.log('[PlanReminders] Notification sent for:', activity.id);
        } else {
          // No tokens or all failed - still mark as processed to avoid retrying forever
          console.log('[PlanReminders] No devices reached for:', activity.id);
        }

        processedIds.push(activity.id);
      } catch (err) {
        console.error('[PlanReminders] Error sending notification:', activity.id, err);
        failedCount++;
        // Still mark as processed to avoid infinite retries
        processedIds.push(activity.id);
      }
    }

    // 3. Mark all processed reminders as sent
    if (processedIds.length > 0) {
      const { error: updateError } = await supabase
        .from('planned_activities')
        .update({ reminder_sent: true })
        .in('id', processedIds);

      if (updateError) {
        console.error('[PlanReminders] Error updating reminder_sent:', updateError);
      } else {
        console.log('[PlanReminders] Marked', processedIds.length, 'reminders as sent');
      }
    }

    console.log('[PlanReminders] Complete:', {
      processed: processedIds.length,
      sent: sentCount,
      failed: failedCount,
    });

    return res.status(200).json({
      success: true,
      message: 'Reminders processed',
      processed: processedIds.length,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error: unknown) {
    console.error('[PlanReminders] Error:', error);
    return res.status(500).json({
      error: 'Failed to process reminders',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
