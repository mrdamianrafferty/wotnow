/**
 * /api/grow/integrations/ambient/connect
 *
 * Connect an Ambient Weather station using an API key.
 *
 * POST: Validate key and create integration
 * DELETE: Disconnect integration
 *
 * @module pages/api/grow/integrations/ambient/connect
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { validateAmbientKey, AmbientDevice } from '@/lib/grow/ambient-weather';
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
  macAddress?: string;
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
    const { apiKey, macAddress } = req.body as ConnectRequest;

    if (!apiKey) {
      return res.status(400).json({ error: 'Ambient Weather API key is required' });
    }

    try {
      // Validate the key and get devices
      const validation = await validateAmbientKey(apiKey);

      if (!validation.valid || !validation.devices) {
        return res.status(400).json({
          error: validation.error || 'Invalid Ambient Weather API key',
        });
      }

      // If macAddress specified, find that device
      // Otherwise, use the first device
      let selectedDevice: AmbientDevice;

      if (macAddress) {
        const found = validation.devices.find(d => d.macAddress === macAddress);
        if (!found) {
          return res.status(400).json({ error: 'Device not found in your account' });
        }
        selectedDevice = found;
      } else {
        selectedDevice = validation.devices[0];
      }

      // Check if already connected
      const { data: existing } = await supabase
        .from('grow_user_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'ambient_weather')
        .eq('device_id', selectedDevice.macAddress)
        .eq('status', 'active')
        .single();

      if (existing) {
        return res.status(409).json({
          error: 'This device is already connected',
          integrationId: existing.id,
        });
      }

      // Extract location if available
      const coords = selectedDevice.info.coords?.coords;

      // Create the integration record
      const { data: integration, error: insertError } = await supabase
        .from('grow_user_integrations')
        .insert({
          user_id: userId,
          provider: 'ambient_weather',
          provider_name: 'Ambient Weather',
          external_id: selectedDevice.macAddress,
          device_id: selectedDevice.macAddress,
          device_name: selectedDevice.info.name || 'Ambient Weather Station',
          status: 'active',
          metadata: {
            location: selectedDevice.info.location,
            latitude: coords?.lat,
            longitude: coords?.lon,
            has_soil_sensors: !!(selectedDevice.lastData?.soiltemp1 || selectedDevice.lastData?.soilhum1),
            has_pm25: !!selectedDevice.lastData?.pm25,
            has_lightning: !!selectedDevice.lastData?.lightning_day,
          },
        })
        .select()
        .single();

      if (insertError || !integration) {
        console.error('[Ambient Connect] Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create integration' });
      }

      // Store the API key securely
      await storeIntegrationToken(supabase, integration.id, apiKey);

      return res.status(201).json({
        success: true,
        integration: {
          id: integration.id,
          mac_address: selectedDevice.macAddress,
          device_name: selectedDevice.info.name,
          location: selectedDevice.info.location,
          has_soil_sensors: !!(selectedDevice.lastData?.soiltemp1 || selectedDevice.lastData?.soilhum1),
        },
        availableDevices: validation.devices.map(d => ({
          macAddress: d.macAddress,
          name: d.info.name,
          location: d.info.location,
          has_soil_sensors: !!(d.lastData?.soiltemp1 || d.lastData?.soilhum1),
        })),
      });
    } catch (error) {
      console.error('[Ambient Connect] Error:', error);
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
          status: 'disconnected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Ambient Connect] Delete error:', updateError);
        return res.status(500).json({ error: 'Failed to disconnect integration' });
      }

      // Delete the token
      await supabase
        .from('grow_integration_tokens')
        .delete()
        .eq('integration_id', integrationId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Ambient Connect] Delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
