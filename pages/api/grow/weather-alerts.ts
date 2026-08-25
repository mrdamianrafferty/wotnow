/**
 * /api/grow/weather-alerts
 *
 * API endpoint for user's weather alerts.
 * Fetch, dismiss, and mark alerts as read.
 *
 * GET: Get user's active weather alerts
 * PATCH: Mark alerts as read or dismissed
 *
 * @module pages/api/grow/weather-alerts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface UpdateAlertRequest {
  alertId: string;
  markAsRead?: boolean;
  dismiss?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);
  // grow_get_active_weather_alerts guards on auth.uid(); the module-level
  // `supabase` client holds the service-role key and has none, so that RPC must
  // go through a client carrying the caller's own JWT.
  const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  // GET - Fetch active alerts
  if (req.method === 'GET') {
    try {
      const includeRead = req.query.includeRead === 'true';
      const alertType = req.query.type as string;

      // Use RPC function for efficient query
      const { data: alerts, error } = await userClient.rpc('grow_get_active_weather_alerts', {
        target_user_id: userId,
      });

      if (error) {
        console.error('[Weather Alerts] Error fetching:', error);
        return res.status(500).json({ error: 'Failed to fetch alerts' });
      }

      // Apply additional filters
      let filteredAlerts = alerts || [];

      if (!includeRead) {
        filteredAlerts = filteredAlerts.filter((a: { is_read: boolean }) => !a.is_read);
      }

      if (alertType) {
        filteredAlerts = filteredAlerts.filter((a: { alert_type: string }) => a.alert_type === alertType);
      }

      // Fetch affected plant names
      const plantIds = new Set<string>();
      for (const alert of filteredAlerts) {
        if (alert.affected_plant_ids) {
          for (const id of alert.affected_plant_ids) {
            plantIds.add(id);
          }
        }
      }

      let plantNames: Record<string, string> = {};
      if (plantIds.size > 0) {
        const { data: plants } = await supabase
          .from('grow_user_plants')
          .select('id, plant_name')
          .in('id', Array.from(plantIds));

        plantNames = Object.fromEntries(
          (plants || []).map(p => [p.id, p.plant_name])
        );
      }

      // Format alerts with plant names
      const formattedAlerts = filteredAlerts.map((a: {
        id: string;
        alert_type: string;
        severity: string;
        title: string;
        message: string | null;
        forecast_date: string;
        forecast_value: number | null;
        affected_plant_ids: string[] | null;
        is_read: boolean;
        created_at: string;
      }) => ({
        id: a.id,
        type: a.alert_type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        forecastDate: a.forecast_date,
        forecastValue: a.forecast_value,
        affectedPlants: (a.affected_plant_ids || []).map(id => ({
          id,
          name: plantNames[id] || 'Unknown Plant',
        })),
        isRead: a.is_read,
        createdAt: a.created_at,
      }));

      // Get unread count by severity
      const unreadCount = {
        critical: filteredAlerts.filter((a: { severity: string; is_read: boolean }) => a.severity === 'critical' && !a.is_read).length,
        warning: filteredAlerts.filter((a: { severity: string; is_read: boolean }) => a.severity === 'warning' && !a.is_read).length,
        info: filteredAlerts.filter((a: { severity: string; is_read: boolean }) => a.severity === 'info' && !a.is_read).length,
        total: filteredAlerts.filter((a: { is_read: boolean }) => !a.is_read).length,
      };

      return res.status(200).json({
        alerts: formattedAlerts,
        unreadCount,
      });
    } catch (error) {
      console.error('[Weather Alerts] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH - Update alert status
  if (req.method === 'PATCH') {
    const body = req.body as UpdateAlertRequest;

    if (!body.alertId) {
      return res.status(400).json({ error: 'alertId is required' });
    }

    try {
      // Verify ownership
      const { data: existing } = await supabase
        .from('grow_weather_alerts')
        .select('user_id')
        .eq('id', body.alertId)
        .single();

      if (!existing || existing.user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this alert' });
      }

      const updates: Record<string, boolean> = {};
      if (body.markAsRead) updates.is_read = true;
      if (body.dismiss) updates.is_dismissed = true;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const { error } = await supabase
        .from('grow_weather_alerts')
        .update(updates)
        .eq('id', body.alertId);

      if (error) {
        console.error('[Weather Alerts] Error updating:', error);
        return res.status(500).json({ error: 'Failed to update alert' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Weather Alerts] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
