/**
 * /api/grow/integrations/ecowitt/connect
 *
 * Connect an Ecowitt weather station.
 *
 * POST: Validate API key and create integration
 * DELETE: Disconnect integration
 *
 * @module pages/api/grow/integrations/ecowitt/connect
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { validateEcowittKey, EcowittDevice, fetchEcowittData } from '@/lib/grow/ecowitt';
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
  mac?: string;
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
    const { apiKey, mac } = req.body as ConnectRequest;

    if (!apiKey) {
      return res.status(400).json({ error: 'Ecowitt API key is required' });
    }

    try {
      // Validate the key and get devices
      const validation = await validateEcowittKey(apiKey);

      if (!validation.valid || !validation.devices) {
        return res.status(400).json({
          error: validation.error || 'Invalid Ecowitt API key',
        });
      }

      // If mac specified, find that device
      let selectedDevice: EcowittDevice;

      if (mac) {
        const found = validation.devices.find(d => d.mac === mac);
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
        .eq('provider', 'ecowitt')
        .eq('device_id', selectedDevice.mac)
        .eq('status', 'active')
        .single();

      if (existing) {
        return res.status(409).json({
          error: 'This device is already connected',
          integrationId: existing.id,
        });
      }

      // Get initial data to check for soil sensors
      const initialData = await fetchEcowittData(selectedDevice.mac, apiKey);
      const hasSoilSensors = !!(
        initialData.soilData?.temp1 !== undefined ||
        initialData.soilData?.moisture1 !== undefined
      );

      // Create the integration record
      const { data: integration, error: insertError } = await supabase
        .from('grow_user_integrations')
        .insert({
          user_id: userId,
          provider: 'ecowitt',
          provider_name: 'Ecowitt',
          external_id: selectedDevice.mac,
          device_id: selectedDevice.mac,
          device_name: selectedDevice.name || 'Ecowitt Station',
          status: 'active',
          metadata: {
            type: selectedDevice.type,
            timezone: selectedDevice.timezone,
            latitude: selectedDevice.latitude,
            longitude: selectedDevice.longitude,
            has_soil_sensors: hasSoilSensors,
          },
        })
        .select()
        .single();

      if (insertError || !integration) {
        console.error('[Ecowitt Connect] Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create integration' });
      }

      // Store the API key securely
      await storeIntegrationToken(supabase, integration.id, apiKey);

      return res.status(201).json({
        success: true,
        integration: {
          id: integration.id,
          mac: selectedDevice.mac,
          device_name: selectedDevice.name,
          type: selectedDevice.type,
          has_soil_sensors: hasSoilSensors,
        },
        availableDevices: validation.devices.map(d => ({
          mac: d.mac,
          name: d.name,
          type: d.type,
        })),
      });
    } catch (error) {
      console.error('[Ecowitt Connect] Error:', error);
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
        console.error('[Ecowitt Connect] Delete error:', updateError);
        return res.status(500).json({ error: 'Failed to disconnect integration' });
      }

      // Delete the token
      await supabase
        .from('grow_integration_tokens')
        .delete()
        .eq('integration_id', integrationId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Ecowitt Connect] Delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
