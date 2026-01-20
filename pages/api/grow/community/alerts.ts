/**
 * /api/grow/community/alerts
 *
 * API endpoint for community pest/disease alerts.
 * Users can share sightings with their local community groups.
 *
 * GET: Fetch alerts from user's groups or nearby
 * POST: Create a new alert
 *
 * @module pages/api/grow/community/alerts
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

interface CreateAlertRequest {
  groupId: string;
  alertType: 'pest' | 'disease' | 'weather' | 'wildlife' | 'other';
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high';
  affectedPlants?: string[];
  latitude?: number;
  longitude?: number;
  photoUrls?: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate user
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

  if (req.method === 'GET') {
    try {
      const groupId = req.query.groupId as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const alertType = req.query.type as string;
      const activeOnly = req.query.activeOnly !== 'false';

      // If groupId provided, get alerts for that specific group
      if (groupId) {
        // Verify user is a member of this group
        const { data: membership } = await supabase
          .from('grow_community_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (!membership) {
          return res.status(403).json({ error: 'Not a member of this group' });
        }

        let query = supabase
          .from('grow_community_alerts')
          .select(`
            id,
            alert_type,
            title,
            description,
            severity,
            affected_plants,
            latitude,
            longitude,
            photo_urls,
            confirmation_count,
            is_active,
            created_at,
            expires_at
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (alertType) {
          query = query.eq('alert_type', alertType);
        }

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data: alerts, error: alertsError } = await query;

        if (alertsError) {
          console.error('[Community Alerts] Error fetching:', alertsError);
          return res.status(500).json({ error: 'Failed to fetch alerts' });
        }

        return res.status(200).json({ alerts: alerts || [] });
      }

      // Get alerts from all user's groups
      const { data: memberships, error: memberError } = await supabase
        .from('grow_community_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberError || !memberships || memberships.length === 0) {
        return res.status(200).json({ alerts: [], message: 'Not a member of any groups' });
      }

      const groupIds = memberships.map(m => m.group_id);

      let query = supabase
        .from('grow_community_alerts')
        .select(`
          id,
          group_id,
          alert_type,
          title,
          description,
          severity,
          affected_plants,
          latitude,
          longitude,
          photo_urls,
          confirmation_count,
          is_active,
          created_at,
          expires_at,
          grow_community_groups!inner (
            name
          )
        `)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (alertType) {
        query = query.eq('alert_type', alertType);
      }

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data: alerts, error: alertsError } = await query;

      if (alertsError) {
        console.error('[Community Alerts] Error fetching:', alertsError);
        return res.status(500).json({ error: 'Failed to fetch alerts' });
      }

      // Flatten the response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedAlerts = alerts?.map((a: any) => ({
        ...a,
        group_name: a.grow_community_groups?.name,
        grow_community_groups: undefined,
      })) || [];

      return res.status(200).json({ alerts: formattedAlerts });
    } catch (error) {
      console.error('[Community Alerts] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    const body = req.body as CreateAlertRequest;

    if (!body.groupId || !body.alertType || !body.title || !body.severity) {
      return res.status(400).json({
        error: 'groupId, alertType, title, and severity are required',
      });
    }

    // Validate severity
    if (!['low', 'medium', 'high'].includes(body.severity)) {
      return res.status(400).json({ error: 'severity must be low, medium, or high' });
    }

    // Validate alertType
    if (!['pest', 'disease', 'weather', 'wildlife', 'other'].includes(body.alertType)) {
      return res.status(400).json({ error: 'Invalid alert type' });
    }

    try {
      // Verify user is a member of this group
      const { data: membership } = await supabase
        .from('grow_community_members')
        .select('id')
        .eq('group_id', body.groupId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }

      // Calculate expiration (default 7 days for pest/disease, 3 days for weather)
      const expirationDays = body.alertType === 'weather' ? 3 : 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      // Create the alert
      const { data: alert, error: createError } = await supabase
        .from('grow_community_alerts')
        .insert({
          group_id: body.groupId,
          created_by: userId,
          alert_type: body.alertType,
          title: body.title,
          description: body.description,
          severity: body.severity,
          affected_plants: body.affectedPlants,
          latitude: body.latitude,
          longitude: body.longitude,
          photo_urls: body.photoUrls,
          is_active: true,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (createError || !alert) {
        console.error('[Community Alerts] Error creating:', createError);
        return res.status(500).json({ error: 'Failed to create alert' });
      }

      return res.status(201).json({
        success: true,
        alert,
      });
    } catch (error) {
      console.error('[Community Alerts] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
