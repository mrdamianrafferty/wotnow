/**
 * Netatmo API Client
 *
 * Client for interacting with Netatmo weather stations.
 * Uses OAuth 2.0 for authentication.
 * API Reference: https://dev.netatmo.com/apidocumentation/weather
 *
 * @module lib/grow/netatmo
 */

import { WeatherStationData } from './integrations';

// =============================================================================
// CONSTANTS
// =============================================================================

const NETATMO_API_BASE = 'https://api.netatmo.com/api';
const NETATMO_AUTH_BASE = 'https://api.netatmo.com/oauth2';

// Netatmo OAuth credentials (from environment)
const NETATMO_CLIENT_ID = process.env.NETATMO_CLIENT_ID;
const NETATMO_CLIENT_SECRET = process.env.NETATMO_CLIENT_SECRET;

// =============================================================================
// TYPES
// =============================================================================

export interface NetatmoDevice {
  _id: string;
  type: string;
  station_name: string;
  module_name: string;
  place: {
    city: string;
    country: string;
    timezone: string;
    location: [number, number]; // [longitude, latitude]
    altitude: number;
  };
  dashboard_data: NetatmoDashboardData;
  modules?: NetatmoModule[];
}

export interface NetatmoModule {
  _id: string;
  type: string;
  module_name: string;
  dashboard_data: NetatmoDashboardData;
  battery_percent?: number;
  rf_status?: number;
}

export interface NetatmoDashboardData {
  time_utc: number;
  Temperature?: number;
  Humidity?: number;
  CO2?: number;
  Noise?: number;
  Pressure?: number;
  AbsolutePressure?: number;
  Rain?: number;
  sum_rain_1?: number;
  sum_rain_24?: number;
  WindStrength?: number;
  WindAngle?: number;
  GustStrength?: number;
  GustAngle?: number;
  min_temp?: number;
  max_temp?: number;
  date_min_temp?: number;
  date_max_temp?: number;
  temp_trend?: string;
  pressure_trend?: string;
}

export interface NetatmoStationsResponse {
  body: {
    devices: NetatmoDevice[];
    user: {
      mail: string;
      administrative: {
        lang: string;
        reg_locale: string;
        country: string;
        unit: number;
        windunit: number;
        pressureunit: number;
        feel_like_algo: number;
      };
    };
  };
  status: string;
  time_exec: number;
  time_server: number;
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Get OAuth authorization URL for Netatmo
 */
export function getNetatmoAuthUrl(
  redirectUri: string,
  state: string
): string {
  if (!NETATMO_CLIENT_ID) {
    throw new Error('NETATMO_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: NETATMO_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'read_station',
    state: state,
  });

  return `${NETATMO_AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeNetatmoCode(
  code: string,
  redirectUri: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  if (!NETATMO_CLIENT_ID || !NETATMO_CLIENT_SECRET) {
    return { success: false, error: 'Netatmo OAuth not configured' };
  }

  try {
    const response = await fetch(`${NETATMO_AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: NETATMO_CLIENT_ID,
        client_secret: NETATMO_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.error || `OAuth error: ${response.status}` };
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('[Netatmo] OAuth exchange error:', error);
    return { success: false, error: 'Failed to exchange authorization code' };
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshNetatmoToken(
  refreshToken: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  if (!NETATMO_CLIENT_ID || !NETATMO_CLIENT_SECRET) {
    return { success: false, error: 'Netatmo OAuth not configured' };
  }

  try {
    const response = await fetch(`${NETATMO_AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: NETATMO_CLIENT_ID,
        client_secret: NETATMO_CLIENT_SECRET,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.error || `Token refresh failed: ${response.status}` };
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('[Netatmo] Token refresh error:', error);
    return { success: false, error: 'Failed to refresh token' };
  }
}

/**
 * Fetch weather station data
 */
export async function fetchNetatmoStations(accessToken: string): Promise<{
  success: boolean;
  devices?: NetatmoDevice[];
  error?: string;
}> {
  try {
    const response = await fetch(`${NETATMO_API_BASE}/getstationsdata`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Token expired or invalid' };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data: NetatmoStationsResponse = await response.json();

    if (data.status !== 'ok') {
      return { success: false, error: 'Invalid response from Netatmo' };
    }

    return { success: true, devices: data.body.devices };
  } catch (error) {
    console.error('[Netatmo] Fetch stations error:', error);
    return { success: false, error: 'Failed to fetch stations' };
  }
}

/**
 * Fetch and normalize weather data from a Netatmo station
 */
export async function fetchNetatmoData(
  accessToken: string,
  deviceId?: string
): Promise<{
  success: boolean;
  data?: WeatherStationData;
  raw?: NetatmoDevice;
  indoorData?: {
    temperature_c?: number;
    humidity_percent?: number;
    co2_ppm?: number;
    noise_db?: number;
  };
  error?: string;
}> {
  const result = await fetchNetatmoStations(accessToken);

  if (!result.success || !result.devices || result.devices.length === 0) {
    return { success: false, error: result.error || 'No devices found' };
  }

  // Find the specified device or use the first one
  const device = deviceId
    ? result.devices.find(d => d._id === deviceId)
    : result.devices[0];

  if (!device) {
    return { success: false, error: 'Device not found' };
  }

  const dashboard = device.dashboard_data;

  // Find outdoor module
  const outdoorModule = device.modules?.find(m => m.type === 'NAModule1');
  const outdoorData = outdoorModule?.dashboard_data;

  // Find rain module
  const rainModule = device.modules?.find(m => m.type === 'NAModule3');
  const rainData = rainModule?.dashboard_data;

  // Find wind module
  const windModule = device.modules?.find(m => m.type === 'NAModule2');
  const windData = windModule?.dashboard_data;

  // Normalize to our format
  const normalized: WeatherStationData = {
    // Outdoor temperature from outdoor module, or indoor from base station
    temperature_c: outdoorData?.Temperature ?? dashboard.Temperature,
    humidity_percent: outdoorData?.Humidity ?? dashboard.Humidity,
    pressure_mb: dashboard.Pressure,
    // Wind data (if wind module present)
    wind_speed_mps: windData?.WindStrength !== undefined
      ? windData.WindStrength * 0.27778 // km/h to m/s
      : undefined,
    wind_direction_deg: windData?.WindAngle,
    wind_gust_mps: windData?.GustStrength !== undefined
      ? windData.GustStrength * 0.27778
      : undefined,
    // Rain data (if rain module present)
    rain_mm_hour: rainData?.sum_rain_1,
    rain_mm_day: rainData?.sum_rain_24,
  };

  // Indoor data (from base station)
  const indoorData = {
    temperature_c: dashboard.Temperature,
    humidity_percent: dashboard.Humidity,
    co2_ppm: dashboard.CO2,
    noise_db: dashboard.Noise,
  };

  return {
    success: true,
    data: normalized,
    raw: device,
    indoorData,
  };
}
