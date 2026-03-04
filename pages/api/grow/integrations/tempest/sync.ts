/**
 * /api/grow/integrations/tempest/sync
 *
 * Sync data from a connected Tempest weather station.
 *
 * POST: Fetch latest observations and store in database
 * GET: Get latest synced data for a station
 *
 * @module pages/api/grow/integrations/tempest/sync
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fetchTempestObservations } from '@/lib/grow/tempest';
import {
  getIntegrationToken,
  storeWeatherStationData,
  updateLastSync,
} from '@/lib/grow/integrations';

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
    .eq('status', 'active')
    .single();

  if (integrationError || !integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  if (integration.provider !== 'tempest') {
    return res.status(400).json({ error: 'This endpoint is for Tempest integrations only' });
  }

  if (req.method === 'POST') {
    try {
      // Get the stored token
      const token = await getIntegrationToken(supabase, integrationId);

      if (!token) {
        return res.status(401).json({
          error: 'Integration token not found or expired. Please reconnect.',
        });
      }

      // Fetch observations from Tempest API
      const result = await fetchTempestObservations(integration.device_id, token);

      if (!result.success || !result.data) {
        return res.status(502).json({
          error: result.error || 'Failed to fetch Tempest data',
        });
      }

      // Store the data
      const stored = await storeWeatherStationData(supabase, integrationId, result.data);

      if (!stored) {
        return res.status(500).json({ error: 'Failed to store weather data' });
      }

      // Update last sync time
      await updateLastSync(supabase, integrationId);

      return res.status(200).json({
        success: true,
        data: result.data,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Tempest Sync] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      // Get the latest stored data
      const { data: latestData, error: dataError } = await supabase
        .from('grow_weather_station_data')
        .select('*')
        .eq('integration_id', integrationId)
        .order('observed_at', { ascending: false })
        .limit(1)
        .single();

      if (dataError && dataError.code !== 'PGRST116') {
        console.error('[Tempest Sync] Fetch error:', dataError);
        return res.status(500).json({ error: 'Failed to fetch data' });
      }

      return res.status(200).json({
        data: latestData || null,
        integration: {
          id: integration.id,
          station_id: integration.device_id,
          device_name: integration.device_name,
          last_sync_at: integration.last_sync_at,
        },
      });
    } catch (error) {
      console.error('[Tempest Sync] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
