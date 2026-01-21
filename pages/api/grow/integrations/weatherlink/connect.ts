/**
 * /api/grow/integrations/weatherlink/connect
 *
 * Connect a Davis WeatherLink weather station.
 *
 * POST: Validate credentials and create integration
 * DELETE: Disconnect integration
 *
 * @module pages/api/grow/integrations/weatherlink/connect
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { validateWeatherLinkCredentials, WeatherLinkStation, fetchWeatherLinkCurrent } from '@/lib/grow/weatherlink';
import { storeIntegrationToken, checkIntegrationAccess } from '@/lib/grow/integrations';

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
  apiKey: string;
  apiSecret: string;
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

  // Check subscription access for hardware integrations
  const { hasAccess } = await checkIntegrationAccess(supabase, userId);
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Hardware integrations require a paid subscription',
      upgradeRequired: true,
    });
  }

  if (req.method === 'POST') {
    const { apiKey, apiSecret, stationId } = req.body as ConnectRequest;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'WeatherLink API key and secret are required' });
    }

    try {
      // Validate the credentials and get stations
      const validation = await validateWeatherLinkCredentials(apiKey, apiSecret);

      if (!validation.valid || !validation.stations) {
        return res.status(400).json({
          error: validation.error || 'Invalid WeatherLink credentials',
        });
      }

      // If stationId specified, find that station
      let selectedStation: WeatherLinkStation;

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
        .eq('integration_type', 'weatherlink')
        .eq('station_id', selectedStation.station_id.toString())
        .eq('is_active', true)
        .single();

      if (existing) {
        return res.status(409).json({
          error: 'This station is already connected',
          integrationId: existing.id,
        });
      }

      // Get initial data to check for soil sensors
      const initialData = await fetchWeatherLinkCurrent(selectedStation.station_id, apiKey, apiSecret);
      const hasSoilSensors = !!(
        initialData.soilData?.temp1 !== undefined ||
        initialData.soilData?.moisture1 !== undefined
      );

      // Create the integration record
      const { data: integration, error: insertError } = await supabase
        .from('grow_user_integrations')
        .insert({
          user_id: userId,
          integration_type: 'weatherlink',
          station_id: selectedStation.station_id.toString(),
          device_name: selectedStation.station_name || 'Davis Weather Station',
          is_active: true,
          metadata: {
            gateway_id: selectedStation.gateway_id,
            product_number: selectedStation.product_number,
            latitude: selectedStation.latitude,
            longitude: selectedStation.longitude,
            elevation: selectedStation.elevation,
            timezone: selectedStation.time_zone,
            city: selectedStation.city,
            region: selectedStation.region,
            country: selectedStation.country,
            has_soil_sensors: hasSoilSensors,
          },
        })
        .select()
        .single();

      if (insertError || !integration) {
        console.error('[WeatherLink Connect] Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create integration' });
      }

      // Store both API key and secret (combined with separator)
      // Format: apiKey|apiSecret
      await storeIntegrationToken(supabase, integration.id, `${apiKey}|${apiSecret}`);

      return res.status(201).json({
        success: true,
        integration: {
          id: integration.id,
          station_id: selectedStation.station_id,
          station_name: selectedStation.station_name,
          product_number: selectedStation.product_number,
          location: {
            latitude: selectedStation.latitude,
            longitude: selectedStation.longitude,
            city: selectedStation.city,
            region: selectedStation.region,
          },
          has_soil_sensors: hasSoilSensors,
        },
        availableStations: validation.stations.map(s => ({
          station_id: s.station_id,
          station_name: s.station_name,
          product_number: s.product_number,
          city: s.city,
        })),
      });
    } catch (error) {
      console.error('[WeatherLink Connect] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    const integrationId = req.query.integrationId as string;

    if (!integrationId) {
      return res.status(400).json({ error: 'integrationId is required' });
    }

    try {
      // Deactivate the integration
      const { error: updateError } = await supabase
        .from('grow_user_integrations')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[WeatherLink Connect] Delete error:', updateError);
        return res.status(500).json({ error: 'Failed to disconnect integration' });
      }

      // Delete the token
      await supabase
        .from('grow_integration_tokens')
        .delete()
        .eq('integration_id', integrationId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[WeatherLink Connect] Delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
