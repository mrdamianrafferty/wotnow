/**
 * /api/grow/integrations/netatmo/sync
 *
 * Sync data from a connected Netatmo weather station.
 *
 * POST: Fetch latest observations and store in database
 * GET: Get latest synced data for a station
 *
 * @module pages/api/grow/integrations/netatmo/sync
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fetchNetatmoData, refreshNetatmoToken } from '@/lib/grow/netatmo';
import {
  storeWeatherStationData,
  storeIntegrationToken,
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

async function getValidToken(integrationId: string): Promise<{
  token: string | null;
  error?: string;
}> {
  // Get stored tokens
  const { data: tokenData, error: tokenError } = await supabase
    .from('grow_integration_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('integration_id', integrationId)
    .single();

  if (tokenError || !tokenData) {
    return { token: null, error: 'Token not found' };
  }

  // Check if token is expired or will expire in next 5 minutes
  const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
  const bufferTime = 5 * 60 * 1000; // 5 minutes

  if (!expiresAt || expiresAt.getTime() - Date.now() < bufferTime) {
    // Token expired or expiring soon, refresh it
    if (!tokenData.refresh_token) {
      return { token: null, error: 'No refresh token available' };
    }

    const refreshResult = await refreshNetatmoToken(tokenData.refresh_token);

    if (!refreshResult.success || !refreshResult.accessToken) {
      return { token: null, error: refreshResult.error || 'Token refresh failed' };
    }

    // Store new tokens
    const newExpiresAt = new Date(Date.now() + (refreshResult.expiresIn || 10800) * 1000);
    await storeIntegrationToken(
      supabase,
      integrationId,
      refreshResult.accessToken,
      refreshResult.refreshToken,
      newExpiresAt
    );

    return { token: refreshResult.accessToken };
  }

  return { token: tokenData.access_token };
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

  if (integration.provider !== 'netatmo') {
    return res.status(400).json({ error: 'This endpoint is for Netatmo integrations only' });
  }

  if (req.method === 'POST') {
    try {
      // Get a valid token (refreshing if needed)
      const { token, error: tokenError } = await getValidToken(integrationId);

      if (!token) {
        return res.status(401).json({
          error: tokenError || 'Integration token not found or expired. Please reconnect.',
          requiresReconnect: true,
        });
      }

      // Fetch data from Netatmo API (accessToken first, then optional deviceId)
      const result = await fetchNetatmoData(token, integration.device_id);

      if (!result.success || !result.data) {
        return res.status(502).json({
          error: result.error || 'Failed to fetch Netatmo data',
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
      console.error('[Netatmo Sync] Error:', error);
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
        console.error('[Netatmo Sync] Fetch error:', dataError);
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
      console.error('[Netatmo Sync] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
