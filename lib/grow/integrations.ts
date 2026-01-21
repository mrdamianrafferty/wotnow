/**
 * Integration Base Utilities
 *
 * Shared utilities for third-party integrations in Grow Daisy.
 *
 * @module lib/grow/integrations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export type IntegrationType =
  | 'tempest'
  | 'ambient_weather'
  | 'rachio'
  | 'netatmo'
  | 'hydrawise'
  | 'ecowitt'
  | 'weatherlink';

export interface Integration {
  id: string;
  user_id: string;
  integration_type: IntegrationType;
  external_user_id?: string;
  station_id?: string;
  device_name?: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
}

export interface IntegrationToken {
  id: string;
  integration_id: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at?: string;
}

export interface WeatherStationData {
  temperature_c?: number;
  humidity_percent?: number;
  pressure_mb?: number;
  wind_speed_mps?: number;
  wind_direction_deg?: number;
  wind_gust_mps?: number;
  rain_mm_hour?: number;
  rain_mm_day?: number;
  uv_index?: number;
  solar_radiation_wm2?: number;
  lightning_count?: number;
  lightning_distance_km?: number;
  feels_like_c?: number;
  dew_point_c?: number;
  // Soil sensors (Ambient Weather)
  soil_temp_1_c?: number;
  soil_temp_2_c?: number;
  soil_temp_3_c?: number;
  soil_temp_4_c?: number;
  soil_moisture_1_pct?: number;
  soil_moisture_2_pct?: number;
  soil_moisture_3_pct?: number;
  soil_moisture_4_pct?: number;
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getServiceClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =============================================================================
// INTEGRATION HELPERS
// =============================================================================

/**
 * Get user's integrations of a specific type
 */
export async function getUserIntegrations(
  supabase: SupabaseClient,
  userId: string,
  type?: IntegrationType
): Promise<Integration[]> {
  let query = supabase
    .from('grow_user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (type) {
    query = query.eq('integration_type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Integrations] Error fetching:', error);
    return [];
  }

  return data || [];
}

/**
 * Get access token for an integration (service role only)
 */
export async function getIntegrationToken(
  supabase: SupabaseClient,
  integrationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('grow_integration_tokens')
    .select('access_token, expires_at')
    .eq('integration_id', integrationId)
    .single();

  if (error || !data) {
    console.error('[Integrations] Error fetching token:', error);
    return null;
  }

  // Check if token is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    console.warn('[Integrations] Token expired for integration:', integrationId);
    return null;
  }

  return data.access_token;
}

/**
 * Store integration token (service role only)
 */
export async function storeIntegrationToken(
  supabase: SupabaseClient,
  integrationId: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<boolean> {
  const { error } = await supabase
    .from('grow_integration_tokens')
    .upsert({
      integration_id: integrationId,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_at: expiresAt?.toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[Integrations] Error storing token:', error);
    return false;
  }

  return true;
}

/**
 * Update integration last sync time
 */
export async function updateLastSync(
  supabase: SupabaseClient,
  integrationId: string
): Promise<void> {
  await supabase
    .from('grow_user_integrations')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId);
}

/**
 * Store weather station data
 */
export async function storeWeatherStationData(
  supabase: SupabaseClient,
  integrationId: string,
  data: WeatherStationData,
  soilData?: {
    temp1?: number;
    temp2?: number;
    temp3?: number;
    temp4?: number;
    moisture1?: number;
    moisture2?: number;
    moisture3?: number;
    moisture4?: number;
  }
): Promise<boolean> {
  // Build the insert object with weather data
  const insertData: Record<string, unknown> = {
    integration_id: integrationId,
    temperature_c: data.temperature_c,
    humidity_percent: data.humidity_percent,
    pressure_mb: data.pressure_mb,
    wind_speed_mps: data.wind_speed_mps,
    wind_direction_deg: data.wind_direction_deg,
    wind_gust_mps: data.wind_gust_mps,
    rain_mm_hour: data.rain_mm_hour,
    rain_mm_day: data.rain_mm_day,
    uv_index: data.uv_index,
    solar_radiation_wm2: data.solar_radiation_wm2,
    lightning_count: data.lightning_count,
    lightning_distance_km: data.lightning_distance_km,
    feels_like_c: data.feels_like_c,
    dew_point_c: data.dew_point_c,
  };

  // Add soil sensor data if provided
  if (soilData) {
    insertData.soil_temp_1_c = soilData.temp1;
    insertData.soil_temp_2_c = soilData.temp2;
    insertData.soil_temp_3_c = soilData.temp3;
    insertData.soil_temp_4_c = soilData.temp4;
    insertData.soil_moisture_1_pct = soilData.moisture1;
    insertData.soil_moisture_2_pct = soilData.moisture2;
    insertData.soil_moisture_3_pct = soilData.moisture3;
    insertData.soil_moisture_4_pct = soilData.moisture4;
  }

  const { error } = await supabase
    .from('grow_weather_station_data')
    .insert(insertData);

  if (error) {
    console.error('[Integrations] Error storing weather data:', error);
    return false;
  }

  return true;
}

/**
 * Deactivate an integration
 */
export async function deactivateIntegration(
  supabase: SupabaseClient,
  integrationId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('grow_user_integrations')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId)
    .eq('user_id', userId);

  if (error) {
    console.error('[Integrations] Error deactivating:', error);
    return false;
  }

  // Also delete the token
  await supabase
    .from('grow_integration_tokens')
    .delete()
    .eq('integration_id', integrationId);

  return true;
}
