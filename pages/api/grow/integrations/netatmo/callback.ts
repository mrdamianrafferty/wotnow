/**
 * /api/grow/integrations/netatmo/callback
 *
 * Handle Netatmo OAuth callback.
 *
 * GET: Exchange authorization code for tokens and create integration
 *
 * @module pages/api/grow/integrations/netatmo/callback
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { exchangeNetatmoCode, fetchNetatmoStations, NetatmoModule } from '@/lib/grow/netatmo';
import { storeIntegrationToken } from '@/lib/grow/integrations';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://growdaisy.io';
const REDIRECT_URI = `${APP_URL}/api/grow/integrations/netatmo/callback`;

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error: oauthError } = req.query;

  // Handle OAuth errors
  if (oauthError) {
    console.error('[Netatmo Callback] OAuth error:', oauthError);
    return res.redirect(`${APP_URL}/grow/settings/integrations?error=netatmo_denied`);
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`${APP_URL}/grow/settings/integrations?error=invalid_callback`);
  }

  try {
    // Verify state token
    const { data: stateRecord, error: stateError } = await supabase
      .from('grow_oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .eq('provider', 'netatmo')
      .single();

    if (stateError || !stateRecord) {
      console.error('[Netatmo Callback] Invalid state token');
      return res.redirect(`${APP_URL}/grow/settings/integrations?error=invalid_state`);
    }

    // Check if state expired
    if (new Date(stateRecord.expires_at) < new Date()) {
      console.error('[Netatmo Callback] State token expired');
      await supabase.from('grow_oauth_states').delete().eq('state', state);
      return res.redirect(`${APP_URL}/grow/settings/integrations?error=state_expired`);
    }

    const userId = stateRecord.user_id;

    // Delete used state token
    await supabase.from('grow_oauth_states').delete().eq('state', state);

    // Exchange code for tokens
    const tokenResult = await exchangeNetatmoCode(code, REDIRECT_URI);

    if (!tokenResult.success || !tokenResult.accessToken) {
      console.error('[Netatmo Callback] Token exchange failed:', tokenResult.error);
      return res.redirect(`${APP_URL}/grow/settings/integrations?error=token_exchange_failed`);
    }

    const accessToken = tokenResult.accessToken;
    const refreshToken = tokenResult.refreshToken;
    const expiresIn = tokenResult.expiresIn || 10800; // Default 3 hours
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Fetch stations to get device info
    const stationsResult = await fetchNetatmoStations(accessToken);

    if (!stationsResult.success || !stationsResult.devices || stationsResult.devices.length === 0) {
      console.error('[Netatmo Callback] No stations found');
      return res.redirect(`${APP_URL}/grow/settings/integrations?error=no_stations`);
    }

    const station = stationsResult.devices[0];

    // Check if already connected
    const { data: existing } = await supabase
      .from('grow_user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_type', 'netatmo')
      .eq('station_id', station._id)
      .eq('is_active', true)
      .single();

    if (existing) {
      // Update existing integration tokens
      await storeIntegrationToken(supabase, existing.id, accessToken, refreshToken, expiresAt);
      return res.redirect(`${APP_URL}/grow/settings/integrations?success=netatmo_reconnected`);
    }

    // Determine available modules
    const modules = station.modules as NetatmoModule[] | undefined;
    const hasRainGauge = modules?.some((m: NetatmoModule) => m.type === 'NAModule3') ?? false;
    const hasWindGauge = modules?.some((m: NetatmoModule) => m.type === 'NAModule2') ?? false;
    const hasOutdoorModule = modules?.some((m: NetatmoModule) => m.type === 'NAModule1') ?? false;

    // Create the integration record
    const { data: integration, error: insertError } = await supabase
      .from('grow_user_integrations')
      .insert({
        user_id: userId,
        integration_type: 'netatmo',
        station_id: station._id,
        device_name: station.station_name || station.module_name || 'Netatmo Station',
        is_active: true,
        metadata: {
          place: station.place,
          modules: modules?.map((m: NetatmoModule) => ({
            id: m._id,
            type: m.type,
            name: m.module_name,
          })),
          has_rain_gauge: hasRainGauge,
          has_wind_gauge: hasWindGauge,
          has_outdoor_module: hasOutdoorModule,
        },
      })
      .select()
      .single();

    if (insertError || !integration) {
      console.error('[Netatmo Callback] Insert error:', insertError);
      return res.redirect(`${APP_URL}/grow/settings/integrations?error=integration_failed`);
    }

    // Store tokens
    await storeIntegrationToken(supabase, integration.id, accessToken, refreshToken, expiresAt);

    return res.redirect(`${APP_URL}/grow/settings/integrations?success=netatmo_connected`);
  } catch (error) {
    console.error('[Netatmo Callback] Error:', error);
    return res.redirect(`${APP_URL}/grow/settings/integrations?error=internal_error`);
  }
}
