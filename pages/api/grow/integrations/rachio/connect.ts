/**
 * /api/grow/integrations/rachio/connect
 *
 * Connect a Rachio smart irrigation controller.
 *
 * POST: Validate token and create integration
 * DELETE: Disconnect integration
 *
 * @module pages/api/grow/integrations/rachio/connect
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { validateRachioToken, RachioDevice } from '@/lib/grow/rachio';
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
  deviceId?: string;
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
    const { apiKey, deviceId } = req.body as ConnectRequest;

    if (!apiKey) {
      return res.status(400).json({ error: 'Rachio API key is required' });
    }

    try {
      // Validate the token and get person info
      const validation = await validateRachioToken(apiKey);

      if (!validation.valid || !validation.person) {
        return res.status(400).json({
          error: validation.error || 'Invalid Rachio API key',
        });
      }

      const devices = validation.person.devices;

      // If deviceId specified, find that device
      // Otherwise, use the first device
      let selectedDevice: RachioDevice;

      if (deviceId) {
        const found = devices.find(d => d.id === deviceId);
        if (!found) {
          return res.status(400).json({ error: 'Device not found in your account' });
        }
        selectedDevice = found;
      } else {
        selectedDevice = devices[0];
      }

      // Check if already connected
      const { data: existing } = await supabase
        .from('grow_user_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('integration_type', 'rachio')
        .eq('station_id', selectedDevice.id)
        .eq('is_active', true)
        .single();

      if (existing) {
        return res.status(409).json({
          error: 'This device is already connected',
          integrationId: existing.id,
        });
      }

      // Create the integration record
      const { data: integration, error: insertError } = await supabase
        .from('grow_user_integrations')
        .insert({
          user_id: userId,
          integration_type: 'rachio',
          external_user_id: validation.person.id,
          station_id: selectedDevice.id,
          device_name: selectedDevice.name || 'Rachio Controller',
          is_active: true,
          metadata: {
            model: selectedDevice.model,
            serial: selectedDevice.serialNumber,
            latitude: selectedDevice.latitude,
            longitude: selectedDevice.longitude,
            timezone: selectedDevice.timeZone,
            zone_count: selectedDevice.zones?.length || 0,
          },
        })
        .select()
        .single();

      if (insertError || !integration) {
        console.error('[Rachio Connect] Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create integration' });
      }

      // Store zones in the irrigation_zones table
      if (selectedDevice.zones && selectedDevice.zones.length > 0) {
        const zonesToInsert = selectedDevice.zones.map(zone => ({
          integration_id: integration.id,
          zone_id: zone.id,
          zone_number: zone.zoneNumber,
          zone_name: zone.name,
          is_enabled: zone.enabled,
          metadata: {
            nozzle: zone.customNozzle,
            soil: zone.customSoil,
            slope: zone.customSlope,
            crop: zone.customCrop,
            imageUrl: zone.imageUrl,
          },
        }));

        const { error: zonesError } = await supabase
          .from('grow_irrigation_zones')
          .insert(zonesToInsert);

        if (zonesError) {
          console.error('[Rachio Connect] Zones insert error:', zonesError);
          // Don't fail the whole operation, zones can be synced later
        }
      }

      // Store the API key securely
      await storeIntegrationToken(supabase, integration.id, apiKey);

      return res.status(201).json({
        success: true,
        integration: {
          id: integration.id,
          device_id: selectedDevice.id,
          device_name: selectedDevice.name,
          model: selectedDevice.model,
          status: selectedDevice.status,
          zone_count: selectedDevice.zones?.length || 0,
          zones: selectedDevice.zones?.map(z => ({
            id: z.id,
            number: z.zoneNumber,
            name: z.name,
            enabled: z.enabled,
          })),
        },
        availableDevices: devices.map(d => ({
          id: d.id,
          name: d.name,
          model: d.model,
          status: d.status,
          zone_count: d.zones?.length || 0,
        })),
      });
    } catch (error) {
      console.error('[Rachio Connect] Error:', error);
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
        console.error('[Rachio Connect] Delete error:', updateError);
        return res.status(500).json({ error: 'Failed to disconnect integration' });
      }

      // Delete the token
      await supabase
        .from('grow_integration_tokens')
        .delete()
        .eq('integration_id', integrationId);

      // Delete associated zones
      await supabase
        .from('grow_irrigation_zones')
        .delete()
        .eq('integration_id', integrationId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Rachio Connect] Delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
