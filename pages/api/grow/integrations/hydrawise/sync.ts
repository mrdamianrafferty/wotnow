/**
 * /api/grow/integrations/hydrawise/sync
 *
 * Sync data from a connected Hydrawise irrigation controller.
 *
 * POST: Fetch latest zone status and store
 * GET: Get latest synced status
 *
 * @module pages/api/grow/integrations/hydrawise/sync
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getHydrawiseStatus } from '@/lib/grow/hydrawise';
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
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  if (integration.integration_type !== 'hydrawise') {
    return res.status(400).json({ error: 'This endpoint is for Hydrawise integrations only' });
  }

  if (req.method === 'POST') {
    try {
      // Get the stored API key
      const apiKey = await getIntegrationToken(supabase, integrationId);

      if (!apiKey) {
        return res.status(401).json({
          error: 'Integration token not found or expired. Please reconnect.',
        });
      }

      // Fetch status from Hydrawise API
      const result = await getHydrawiseStatus(apiKey);

      if (!result.success || !result.status) {
        return res.status(502).json({
          error: result.error || 'Failed to fetch Hydrawise status',
        });
      }

      // Update zones in database
      if (result.status.relays && result.status.relays.length > 0) {
        for (const relay of result.status.relays) {
          await supabase
            .from('grow_irrigation_zones')
            .update({
              metadata: {
                ...((await supabase
                  .from('grow_irrigation_zones')
                  .select('metadata')
                  .eq('integration_id', integrationId)
                  .eq('zone_id', relay.relay_id.toString())
                  .single()).data?.metadata || {}),
                last_run_time: relay.run,
                time_remaining: relay.time,
                type: relay.type,
                is_running: relay.is_running,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('integration_id', integrationId)
            .eq('zone_id', relay.relay_id.toString());
        }
      }

      // Update last sync time
      await updateLastSync(supabase, integrationId);

      return res.status(200).json({
        success: true,
        status: result.status,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Hydrawise Sync] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      // Get zones for this integration
      const { data: zones, error: zonesError } = await supabase
        .from('grow_irrigation_zones')
        .select('*')
        .eq('integration_id', integrationId)
        .order('zone_number', { ascending: true });

      if (zonesError) {
        console.error('[Hydrawise Sync] Fetch error:', zonesError);
        return res.status(500).json({ error: 'Failed to fetch zones' });
      }

      return res.status(200).json({
        zones: zones || [],
        integration: {
          id: integration.id,
          station_id: integration.station_id,
          device_name: integration.device_name,
          last_sync_at: integration.last_sync_at,
        },
      });
    } catch (error) {
      console.error('[Hydrawise Sync] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
