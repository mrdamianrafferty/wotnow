/**
 * /api/grow/integrations/ambient/sync
 *
 * Sync data from a connected Ambient Weather station.
 *
 * POST: Fetch latest data and store in database
 * GET: Get latest synced data
 *
 * @module pages/api/grow/integrations/ambient/sync
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fetchAmbientData } from '@/lib/grow/ambient-weather';
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
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  if (integration.integration_type !== 'ambient_weather') {
    return res.status(400).json({ error: 'This endpoint is for Ambient Weather integrations only' });
  }

  if (req.method === 'POST') {
    try {
      // Get the stored API key
      const apiKey = await getIntegrationToken(supabase, integrationId);

      if (!apiKey) {
        return res.status(401).json({
          error: 'Integration API key not found. Please reconnect.',
        });
      }

      // Fetch data from Ambient Weather API
      const result = await fetchAmbientData(integration.station_id, apiKey);

      if (!result.success || !result.data) {
        return res.status(502).json({
          error: result.error || 'Failed to fetch Ambient Weather data',
        });
      }

      // Store the weather data
      const stored = await storeWeatherStationData(supabase, integrationId, result.data);

      if (!stored) {
        return res.status(500).json({ error: 'Failed to store weather data' });
      }

      // Update last sync time
      await updateLastSync(supabase, integrationId);

      return res.status(200).json({
        success: true,
        data: result.data,
        soilData: result.soilData,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Ambient Sync] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      // Get the latest stored data
      const { data: latestData, error: dataError } = await supabase
        .from('grow_weather_station_data')
        .select('*')
        .eq('integration_id', integrationId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (dataError && dataError.code !== 'PGRST116') {
        console.error('[Ambient Sync] Fetch error:', dataError);
        return res.status(500).json({ error: 'Failed to fetch data' });
      }

      return res.status(200).json({
        data: latestData || null,
        integration: {
          id: integration.id,
          mac_address: integration.station_id,
          device_name: integration.device_name,
          last_sync_at: integration.last_sync_at,
          has_soil_sensors: integration.metadata?.has_soil_sensors || false,
        },
      });
    } catch (error) {
      console.error('[Ambient Sync] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
