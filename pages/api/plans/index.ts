/**
 * /api/plans
 *
 * CRUD API for planned activities.
 * Syncs localStorage plans to database for authenticated users.
 *
 * GET: Get user's planned activities
 * POST: Create a new planned activity
 * PUT: Update a planned activity (mark complete, etc.)
 * DELETE: Remove a planned activity
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

interface PlannedActivityRequest {
  id?: string;
  app: 'godaisy' | 'findr' | 'growdaisy';
  activityType: string;
  activityName: string;
  activityData?: Record<string, unknown>;
  plannedFor: string;
  plannedTime?: string;
  reminderEnabled?: boolean;
}

interface PlannedActivityRow {
  id: string;
  user_id: string;
  app: string;
  activity_type: string;
  activity_name: string;
  activity_data: Record<string, unknown>;
  planned_for: string;
  planned_time: string | null;
  reminder_enabled: boolean;
  reminder_at: string | null;
  reminder_sent: boolean;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Calculate reminder time (1 hour before, or 9am on the day)
function calculateReminderAt(plannedFor: string, plannedTime?: string): string | null {
  const plannedDate = new Date(plannedFor);

  if (plannedTime) {
    const [hours, minutes] = plannedTime.split(':').map(Number);
    const reminderDate = new Date(plannedDate);
    reminderDate.setHours(hours - 1, minutes, 0, 0); // 1 hour before

    // Don't schedule if already passed
    if (reminderDate <= new Date()) {
      return null;
    }
    return reminderDate.toISOString();
  } else {
    // No specific time - remind at 9am on the day
    const reminderDate = new Date(plannedDate);
    reminderDate.setHours(9, 0, 0, 0);

    // Don't schedule if already passed
    if (reminderDate <= new Date()) {
      return null;
    }
    return reminderDate.toISOString();
  }
}

// Transform database row to API response
function transformRow(row: PlannedActivityRow) {
  return {
    id: row.id,
    app: row.app,
    activityType: row.activity_type,
    activityName: row.activity_name,
    activityData: row.activity_data,
    plannedFor: row.planned_for,
    plannedTime: row.planned_time,
    reminderEnabled: row.reminder_enabled,
    reminderAt: row.reminder_at,
    reminderSent: row.reminder_sent,
    completed: row.completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

  try {
    if (req.method === 'GET') {
      // Get user's planned activities
      const { app, upcoming } = req.query;

      let query = supabase
        .from('planned_activities')
        .select('*')
        .eq('user_id', userId)
        .order('planned_for', { ascending: true });

      // Filter by app if specified
      if (app && typeof app === 'string') {
        query = query.eq('app', app);
      }

      // Only upcoming (not completed, future date)
      if (upcoming === 'true') {
        query = query
          .eq('completed', false)
          .gte('planned_for', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Plans API] Error fetching plans:', error);
        return res.status(500).json({ error: 'Failed to fetch plans' });
      }

      return res.status(200).json({
        plans: (data || []).map(transformRow),
      });

    } else if (req.method === 'POST') {
      // Create a new planned activity
      const body = req.body as PlannedActivityRequest;

      if (!body.app || !body.activityType || !body.activityName || !body.plannedFor) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const reminderAt = body.reminderEnabled
        ? calculateReminderAt(body.plannedFor, body.plannedTime)
        : null;

      const { data, error } = await supabase
        .from('planned_activities')
        .insert({
          user_id: userId,
          app: body.app,
          activity_type: body.activityType,
          activity_name: body.activityName,
          activity_data: body.activityData || {},
          planned_for: body.plannedFor,
          planned_time: body.plannedTime || null,
          reminder_enabled: body.reminderEnabled || false,
          reminder_at: reminderAt,
        })
        .select()
        .single();

      if (error) {
        console.error('[Plans API] Error creating plan:', error);
        return res.status(500).json({ error: 'Failed to create plan' });
      }

      console.log(`[Plans API] Created plan ${data.id} for user ${userId}`);
      return res.status(201).json({ plan: transformRow(data) });

    } else if (req.method === 'PUT') {
      // Update a planned activity
      const { id, completed, reminderEnabled } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing plan ID' });
      }

      const updates: Record<string, unknown> = {};

      if (completed !== undefined) {
        updates.completed = completed;
        updates.completed_at = completed ? new Date().toISOString() : null;
      }

      if (reminderEnabled !== undefined) {
        updates.reminder_enabled = reminderEnabled;
        // Recalculate reminder_at if enabling
        if (reminderEnabled) {
          const { data: existing } = await supabase
            .from('planned_activities')
            .select('planned_for, planned_time')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

          if (existing) {
            updates.reminder_at = calculateReminderAt(existing.planned_for, existing.planned_time);
          }
        } else {
          updates.reminder_at = null;
        }
      }

      const { data, error } = await supabase
        .from('planned_activities')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[Plans API] Error updating plan:', error);
        return res.status(500).json({ error: 'Failed to update plan' });
      }

      console.log(`[Plans API] Updated plan ${id} for user ${userId}`);
      return res.status(200).json({ plan: transformRow(data) });

    } else if (req.method === 'DELETE') {
      // Delete a planned activity
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing plan ID' });
      }

      const { error } = await supabase
        .from('planned_activities')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('[Plans API] Error deleting plan:', error);
        return res.status(500).json({ error: 'Failed to delete plan' });
      }

      console.log(`[Plans API] Deleted plan ${id} for user ${userId}`);
      return res.status(200).json({ success: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Plans API] Exception:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
