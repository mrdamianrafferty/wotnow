/**
 * Tempest WeatherFlow API Client
 *
 * Client for interacting with Tempest weather stations.
 * API Reference: https://weatherflow.github.io/Tempest/api/
 *
 * @module lib/grow/tempest
 */

import { WeatherStationData } from './integrations';

// =============================================================================
// CONSTANTS
// =============================================================================

const TEMPEST_API_BASE = 'https://swd.weatherflow.com/swd/rest';
const TEMPEST_AUTH_BASE = 'https://swd.weatherflow.com/id/oauth2';

// =============================================================================
// TYPES
// =============================================================================

export interface TempestStation {
  station_id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  public_name?: string;
  devices: TempestDevice[];
}

export interface TempestDevice {
  device_id: number;
  serial_number: string;
  device_type: string;
  firmware_revision: string;
  hardware_revision: string;
}

export interface TempestObservation {
  timestamp: number;
  air_temperature: number | null;
  barometric_pressure: number | null;
  relative_humidity: number | null;
  wind_avg: number | null;
  wind_direction: number | null;
  wind_gust: number | null;
  uv: number | null;
  solar_radiation: number | null;
  precip_accum_local_day: number | null;
  precip_rate: number | null;
  lightning_strike_count: number | null;
  lightning_strike_avg_distance: number | null;
  feels_like: number | null;
  dew_point: number | null;
}

export interface TempestStationsResponse {
  stations: TempestStation[];
}

export interface TempestObservationsResponse {
  station_id: number;
  station_name: string;
  obs: TempestObservation[];
  status: {
    status_code: number;
    status_message: string;
  };
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Validate a Tempest personal access token by fetching stations
 */
export async function validateTempestToken(token: string): Promise<{
  valid: boolean;
  stations?: TempestStation[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${TEMPEST_API_BASE}/stations?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: 'Invalid or expired token' };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data: TempestStationsResponse = await response.json();

    if (!data.stations || data.stations.length === 0) {
      return { valid: false, error: 'No stations found for this account' };
    }

    return { valid: true, stations: data.stations };
  } catch (error) {
    console.error('[Tempest] Validation error:', error);
    return { valid: false, error: 'Failed to connect to Tempest API' };
  }
}

/**
 * Fetch latest observations from a Tempest station
 */
export async function fetchTempestObservations(
  stationId: number | string,
  token: string
): Promise<{
  success: boolean;
  data?: WeatherStationData;
  raw?: TempestObservation;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${TEMPEST_API_BASE}/observations/station/${stationId}?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    const data: TempestObservationsResponse = await response.json();

    if (!data.obs || data.obs.length === 0) {
      return { success: false, error: 'No observations available' };
    }

    // Get the most recent observation
    const latest = data.obs[0];

    // Convert to our normalized format
    const normalized: WeatherStationData = {
      temperature_c: latest.air_temperature ?? undefined,
      humidity_percent: latest.relative_humidity ?? undefined,
      pressure_mb: latest.barometric_pressure ?? undefined,
      wind_speed_mps: latest.wind_avg ?? undefined,
      wind_direction_deg: latest.wind_direction ?? undefined,
      wind_gust_mps: latest.wind_gust ?? undefined,
      rain_mm_hour: latest.precip_rate ?? undefined,
      rain_mm_day: latest.precip_accum_local_day ?? undefined,
      uv_index: latest.uv ?? undefined,
      solar_radiation_wm2: latest.solar_radiation ?? undefined,
      lightning_count: latest.lightning_strike_count ?? undefined,
      lightning_distance_km: latest.lightning_strike_avg_distance ?? undefined,
      feels_like_c: latest.feels_like ?? undefined,
      dew_point_c: latest.dew_point ?? undefined,
    };

    return { success: true, data: normalized, raw: latest };
  } catch (error) {
    console.error('[Tempest] Fetch error:', error);
    return { success: false, error: 'Failed to fetch observations' };
  }
}

/**
 * Get station details
 */
export async function getTempestStation(
  stationId: number | string,
  token: string
): Promise<{
  success: boolean;
  station?: TempestStation;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${TEMPEST_API_BASE}/stations/${stationId}?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (!data.stations || data.stations.length === 0) {
      return { success: false, error: 'Station not found' };
    }

    return { success: true, station: data.stations[0] };
  } catch (error) {
    console.error('[Tempest] Station fetch error:', error);
    return { success: false, error: 'Failed to fetch station details' };
  }
}

/**
 * Get OAuth authorization URL (for web-based OAuth flow)
 */
export function getTempestAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state,
  });

  return `${TEMPEST_AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token (OAuth flow)
 */
export async function exchangeTempestCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${TEMPEST_AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `OAuth error: ${error}` };
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('[Tempest] OAuth exchange error:', error);
    return { success: false, error: 'Failed to exchange authorization code' };
  }
}
