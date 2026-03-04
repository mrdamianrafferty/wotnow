/**
 * /api/grow/integrations/rachio/control
 *
 * Control a connected Rachio irrigation controller.
 *
 * POST: Execute control actions (start zone, stop, rain delay)
 * GET: Get device and zone status
 *
 * @module pages/api/grow/integrations/rachio/control
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  getRachioDevice,
  getRachioDeviceState,
  getRachioSchedule,
  startRachioZone,
  stopRachioDevice,
  setRachioRainDelay,
} from '@/lib/grow/rachio';
import { getIntegrationToken, updateLastSync } from '@/lib/grow/integrations';

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

interface ControlRequest {
  action: 'start_zone' | 'stop' | 'rain_delay';
  zoneId?: string;
  duration?: number; // seconds for zone, days for rain delay
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
  const integrationId = req.query.integrationId as string;

  if (!integrationId) {
    return res.status(400).json({ error: 'integrationId is required' });
  }

  // Verify user owns this integration
  const { data: integration, error: integrationError } = await supabase
    .from('grow_user_integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (integrationError || !integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  if (integration.provider !== 'rachio') {
    return res.status(400).json({ error: 'This endpoint is for Rachio integrations only' });
  }

  // Get the stored API key
  const apiKey = await getIntegrationToken(supabase, integrationId);

  if (!apiKey) {
    return res.status(401).json({
      error: 'Integration API key not found. Please reconnect.',
    });
  }

  const deviceId = integration.device_id;

  if (req.method === 'POST') {
    const { action, zoneId, duration } = req.body as ControlRequest;

    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    try {
      let result;

      switch (action) {
        case 'start_zone':
          if (!zoneId) {
            return res.status(400).json({ error: 'zoneId is required for start_zone action' });
          }
          if (!duration || duration < 1 || duration > 10800) {
            return res.status(400).json({
              error: 'duration must be between 1 and 10800 seconds (3 hours)',
            });
          }

          // Verify the zone belongs to this device
          const { data: zone } = await supabase
            .from('grow_irrigation_zones')
            .select('external_zone_id')
            .eq('integration_id', integrationId)
            .eq('external_zone_id', zoneId)
            .single();

          if (!zone) {
            return res.status(400).json({ error: 'Zone not found for this device' });
          }

          result = await startRachioZone(zoneId, duration, apiKey);

          // Log the watering event
          if (result.success && zone) {
            // Look up the internal zone UUID
            const { data: zoneRow } = await supabase
              .from('grow_irrigation_zones')
              .select('id')
              .eq('integration_id', integrationId)
              .eq('external_zone_id', zoneId)
              .single();

            if (zoneRow) {
              await supabase.from('grow_irrigation_history').insert({
                zone_id: zoneRow.id,
                user_id: userId,
                started_at: new Date().toISOString(),
                event_type: 'manual',
                duration_minutes: Math.ceil(duration / 60),
                trigger_source: 'grow_app',
              });
            }
          }
          break;

        case 'stop':
          result = await stopRachioDevice(deviceId, apiKey);

          // Note: stop events don't have a specific zone, skip history logging
          break;

        case 'rain_delay':
          if (!duration || duration < 1 || duration > 14) {
            return res.status(400).json({
              error: 'duration must be between 1 and 14 days',
            });
          }

          result = await setRachioRainDelay(deviceId, duration, apiKey);

          // Note: rain delay applies to device, not a specific zone, skip history logging
          break;

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }

      if (!result.success) {
        return res.status(502).json({ error: result.error });
      }

      await updateLastSync(supabase, integrationId);

      return res.status(200).json({
        success: true,
        action,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Rachio Control] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      // Get device details and state
      const [deviceResult, stateResult, scheduleResult] = await Promise.all([
        getRachioDevice(deviceId, apiKey),
        getRachioDeviceState(deviceId, apiKey),
        getRachioSchedule(deviceId, apiKey),
      ]);

      if (!deviceResult.success || !deviceResult.device) {
        return res.status(502).json({ error: deviceResult.error });
      }

      // Get recent watering history from our database
      const { data: recentHistory } = await supabase
        .from('grow_irrigation_history')
        .select('*')
        .eq('integration_id', integrationId)
        .order('started_at', { ascending: false })
        .limit(10);

      // Get zones from our database with last watered info
      const { data: zones } = await supabase
        .from('grow_irrigation_zones')
        .select('*')
        .eq('integration_id', integrationId)
        .eq('enabled', true)
        .order('zone_number', { ascending: true });

      return res.status(200).json({
        device: {
          id: deviceResult.device.id,
          name: deviceResult.device.name,
          model: deviceResult.device.model,
          status: deviceResult.device.status,
        },
        state: stateResult.state,
        zones: zones || [],
        upcomingSchedule: scheduleResult.events || [],
        recentHistory: recentHistory || [],
        lastSyncAt: integration.last_sync_at,
      });
    } catch (error) {
      console.error('[Rachio Control] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
