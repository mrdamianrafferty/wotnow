/**
 * /api/grow/integrations/hydrawise/connect
 *
 * Connect a Hydrawise (Hunter Industries) smart irrigation controller.
 *
 * POST: Validate API key and create integration
 * DELETE: Disconnect integration
 *
 * @module pages/api/grow/integrations/hydrawise/connect
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { validateHydrawiseKey, getHydrawiseStatus } from '@/lib/grow/hydrawise';
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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  const accessToken = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  const userId = user.id;

  // Check subscription access for hardware integrations
  const { hasAccess } = await checkIntegrationAccess(supabase, userId);
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Connecting devices is a premium feature. Upgrade your plan to get started.',
      upgradeRequired: true,
    });
  }

  if (req.method === 'POST') {
    const { apiKey } = req.body as ConnectRequest;

    if (!apiKey) {
      return res.status(400).json({ error: 'Please paste your Hydrawise connection key.' });
    }

    try {
      // Validate the key and get customer details
      const validation = await validateHydrawiseKey(apiKey);

      if (!validation.valid || !validation.customer) {
        return res.status(400).json({
          error: validation.error || 'We couldn\'t verify this key. Please check you copied it correctly from app.hydrawise.com.',
        });
      }

      const controller = validation.customer.current_controller;

      // Check if already connected
      const { data: existing } = await supabase
        .from('grow_user_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'hydrawise')
        .eq('device_id', controller.controller_id.toString())
        .eq('status', 'active')
        .single();

      if (existing) {
        return res.status(409).json({
          error: 'This controller is already connected.',
          integrationId: existing.id,
        });
      }

      // Get zone info
      const status = await getHydrawiseStatus(apiKey);
      const zoneCount = status.status?.relays?.length || 0;

      // Create the integration record
      const { data: integration, error: insertError } = await supabase
        .from('grow_user_integrations')
        .insert({
          user_id: userId,
          provider: 'hydrawise',
          provider_name: 'Hydrawise',
          external_id: controller.controller_id.toString(),
          device_id: controller.controller_id.toString(),
          device_name: controller.name || 'Hydrawise Controller',
          status: 'active',
          metadata: {
            external_user_id: validation.customer.customer_id.toString(),
            serial_number: controller.serial_number,
            zone_count: zoneCount,
            status: controller.status,
          },
        })
        .select()
        .single();

      if (insertError || !integration) {
        console.error('[Hydrawise Connect] Insert error:', insertError);
        return res.status(500).json({ error: 'Could not save the connection. Please try again.' });
      }

      // Store zones in irrigation_zones table
      if (status.status?.relays && status.status.relays.length > 0) {
        const zonesToInsert = status.status.relays.map(zone => ({
          integration_id: integration.id,
          user_id: userId,
          external_zone_id: zone.relay_id.toString(),
          zone_number: zone.relay,
          zone_name: zone.name,
          enabled: true,
          metadata: {
            type: zone.type,
          },
        }));

        const { error: zonesError } = await supabase
          .from('grow_irrigation_zones')
          .insert(zonesToInsert);

        if (zonesError) {
          console.error('[Hydrawise Connect] Zones insert error:', zonesError);
        }
      }

      // Store the API key securely
      await storeIntegrationToken(supabase, integration.id, apiKey);

      return res.status(201).json({
        success: true,
        integration: {
          id: integration.id,
          controller_id: controller.controller_id,
          controller_name: controller.name,
          zone_count: zoneCount,
        },
        availableControllers: validation.customer.controllers.map(c => ({
          controller_id: c.controller_id,
          name: c.name,
          serial_number: c.serial_number,
        })),
      });
    } catch (error) {
      console.error('[Hydrawise Connect] Error:', error);
      return res.status(500).json({ error: 'Something went wrong on our end. Please try again in a few minutes.' });
    }
  } else if (req.method === 'DELETE') {
    const integrationId = req.query.integrationId as string;

    if (!integrationId) {
      return res.status(400).json({ error: 'Could not identify the device to disconnect. Please refresh and try again.' });
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
        console.error('[Hydrawise Connect] Delete error:', updateError);
        return res.status(500).json({ error: 'Could not disconnect this device. Please try again.' });
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
      console.error('[Hydrawise Connect] Delete error:', error);
      return res.status(500).json({ error: 'Something went wrong on our end. Please try again in a few minutes.' });
    }
  } else {
    return res.status(405).json({ error: 'This action is not supported.' });
  }
}
