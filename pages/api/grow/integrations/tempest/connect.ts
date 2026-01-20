/**
 * /api/grow/integrations/tempest/connect
 *
 * Connect a Tempest weather station using a personal access token.
 *
 * POST: Validate token and create integration
 * DELETE: Disconnect integration
 *
 * @module pages/api/grow/integrations/tempest/connect
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { validateTempestToken, TempestStation } from '@/lib/grow/tempest';
import { storeIntegrationToken } from '@/lib/grow/integrations';

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

interface ConnectRequest {
  token: string;
  stationId?: number;
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

  if (req.method === 'POST') {
    const { token, stationId } = req.body as ConnectRequest;

    if (!token) {
      return res.status(400).json({ error: 'Tempest API token is required' });
    }

    try {
      // Validate the token and get stations
      const validation = await validateTempestToken(token);

      if (!validation.valid || !validation.stations) {
        return res.status(400).json({
          error: validation.error || 'Invalid Tempest token',
        });
      }

      // If stationId specified, find that station
      // Otherwise, use the first station
      let selectedStation: TempestStation;

      if (stationId) {
        const found = validation.stations.find(s => s.station_id === stationId);
        if (!found) {
          return res.status(400).json({ error: 'Station not found in your account' });
        }
        selectedStation = found;
      } else {
        selectedStation = validation.stations[0];
      }

      // Check if already connected
      const { data: existing } = await supabase
        .from('grow_user_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('integration_type', 'tempest')
        .eq('station_id', selectedStation.station_id.toString())
        .eq('is_active', true)
        .single();

      if (existing) {
        return res.status(409).json({
          error: 'This station is already connected',
          integrationId: existing.id,
        });
      }

      // Create the integration record
      const { data: integration, error: insertError } = await supabase
        .from('grow_user_integrations')
        .insert({
          user_id: userId,
          integration_type: 'tempest',
          station_id: selectedStation.station_id.toString(),
          device_name: selectedStation.name || selectedStation.public_name,
          is_active: true,
          metadata: {
            latitude: selectedStation.latitude,
            longitude: selectedStation.longitude,
            timezone: selectedStation.timezone,
            devices: selectedStation.devices?.map(d => ({
              device_id: d.device_id,
              device_type: d.device_type,
              serial: d.serial_number,
            })),
          },
        })
        .select()
        .single();

      if (insertError || !integration) {
        console.error('[Tempest Connect] Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create integration' });
      }

      // Store the token securely
      await storeIntegrationToken(supabase, integration.id, token);

      return res.status(201).json({
        success: true,
        integration: {
          id: integration.id,
          station_id: selectedStation.station_id,
          station_name: selectedStation.name || selectedStation.public_name,
          location: {
            latitude: selectedStation.latitude,
            longitude: selectedStation.longitude,
          },
        },
        availableStations: validation.stations.map(s => ({
          station_id: s.station_id,
          name: s.name || s.public_name,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
      });
    } catch (error) {
      console.error('[Tempest Connect] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    const integrationId = req.query.integrationId as string;

    if (!integrationId) {
      return res.status(400).json({ error: 'integrationId is required' });
    }

    try {
      // Deactivate the integration (user must own it)
      const { error: updateError } = await supabase
        .from('grow_user_integrations')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Tempest Connect] Delete error:', updateError);
        return res.status(500).json({ error: 'Failed to disconnect integration' });
      }

      // Delete the token
      await supabase
        .from('grow_integration_tokens')
        .delete()
        .eq('integration_id', integrationId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Tempest Connect] Delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
