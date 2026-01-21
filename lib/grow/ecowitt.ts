/**
 * Ecowitt API Client
 *
 * Client for interacting with Ecowitt weather stations via their cloud API.
 * API Reference: https://doc.ecowitt.net/web/#/apiv3en
 *
 * @module lib/grow/ecowitt
 */

import { WeatherStationData } from './integrations';

// =============================================================================
// CONSTANTS
// =============================================================================

const ECOWITT_API_BASE = 'https://api.ecowitt.net/api/v3';

// Application key (registered with Ecowitt)
const ECOWITT_APP_KEY = process.env.ECOWITT_APP_KEY;

// =============================================================================
// TYPES
// =============================================================================

export interface EcowittDevice {
  mac: string;
  name: string;
  type: string;
  timezone: string;
  createtime: string;
  latitude?: number;
  longitude?: number;
}

export interface EcowittRealTimeData {
  outdoor?: {
    temperature: { value: string; unit: string };
    humidity: { value: string; unit: string };
    feels_like?: { value: string; unit: string };
    dew_point?: { value: string; unit: string };
  };
  indoor?: {
    temperature: { value: string; unit: string };
    humidity: { value: string; unit: string };
  };
  pressure?: {
    relative: { value: string; unit: string };
    absolute: { value: string; unit: string };
  };
  wind?: {
    wind_speed: { value: string; unit: string };
    wind_gust: { value: string; unit: string };
    wind_direction: { value: string; unit: string };
  };
  rainfall?: {
    rain_rate: { value: string; unit: string };
    daily: { value: string; unit: string };
    weekly?: { value: string; unit: string };
    monthly?: { value: string; unit: string };
    yearly?: { value: string; unit: string };
  };
  solar_and_uvi?: {
    solar: { value: string; unit: string };
    uvi: { value: string; unit: string };
  };
  // Soil sensors (up to 8)
  soil_ch1?: {
    soilmoisture: { value: string; unit: string };
    soiltemp?: { value: string; unit: string };
  };
  soil_ch2?: {
    soilmoisture: { value: string; unit: string };
    soiltemp?: { value: string; unit: string };
  };
  soil_ch3?: {
    soilmoisture: { value: string; unit: string };
    soiltemp?: { value: string; unit: string };
  };
  soil_ch4?: {
    soilmoisture: { value: string; unit: string };
    soiltemp?: { value: string; unit: string };
  };
  // Lightning sensor
  lightning?: {
    distance: { value: string; unit: string };
    count: { value: string; unit: string };
    time?: { value: string; unit: string };
  };
  // Battery levels
  battery?: {
    outdoor?: { value: string };
    soil_ch1?: { value: string };
    soil_ch2?: { value: string };
  };
}

export interface EcowittDeviceListResponse {
  code: number;
  msg: string;
  data: {
    list: EcowittDevice[];
  };
}

export interface EcowittRealtimeResponse {
  code: number;
  msg: string;
  data: EcowittRealTimeData;
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Validate an Ecowitt API key and fetch device list
 */
export async function validateEcowittKey(apiKey: string): Promise<{
  valid: boolean;
  devices?: EcowittDevice[];
  error?: string;
}> {
  if (!ECOWITT_APP_KEY) {
    return { valid: false, error: 'Ecowitt app key not configured' };
  }

  try {
    const response = await fetch(`${ECOWITT_API_BASE}/device/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        application_key: ECOWITT_APP_KEY,
        api_key: apiKey,
      }).toString(),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }
      if (response.status === 429) {
        return { valid: false, error: 'Rate limit exceeded. Please try again later.' };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data: EcowittDeviceListResponse = await response.json();

    if (data.code !== 0) {
      return { valid: false, error: data.msg || 'API error' };
    }

    if (!data.data?.list || data.data.list.length === 0) {
      return { valid: false, error: 'No devices found for this account' };
    }

    return { valid: true, devices: data.data.list };
  } catch (error) {
    console.error('[Ecowitt] Validation error:', error);
    return { valid: false, error: 'Failed to connect to Ecowitt API' };
  }
}

/**
 * Fetch real-time data from an Ecowitt device
 */
export async function fetchEcowittData(
  mac: string,
  apiKey: string
): Promise<{
  success: boolean;
  data?: WeatherStationData;
  raw?: EcowittRealTimeData;
  soilData?: {
    temp1?: number;
    temp2?: number;
    temp3?: number;
    temp4?: number;
    moisture1?: number;
    moisture2?: number;
    moisture3?: number;
    moisture4?: number;
  };
  error?: string;
}> {
  if (!ECOWITT_APP_KEY) {
    return { success: false, error: 'Ecowitt app key not configured' };
  }

  try {
    const response = await fetch(`${ECOWITT_API_BASE}/device/real_time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        application_key: ECOWITT_APP_KEY,
        api_key: apiKey,
        mac: mac,
        call_back: 'all', // Get all available data
      }).toString(),
    });

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    const result: EcowittRealtimeResponse = await response.json();

    if (result.code !== 0) {
      return { success: false, error: result.msg || 'Failed to fetch data' };
    }

    const raw = result.data;

    // Parse numeric values from strings
    const parseValue = (obj?: { value: string }): number | undefined => {
      if (!obj?.value) return undefined;
      const num = parseFloat(obj.value);
      return isNaN(num) ? undefined : num;
    };

    // Normalize to our format (convert units as needed)
    const tempC = parseValue(raw.outdoor?.temperature);
    const normalized: WeatherStationData = {
      temperature_c: tempC,
      humidity_percent: parseValue(raw.outdoor?.humidity),
      pressure_mb: parseValue(raw.pressure?.relative),
      wind_speed_mps: parseValue(raw.wind?.wind_speed), // May need unit conversion
      wind_direction_deg: parseValue(raw.wind?.wind_direction),
      wind_gust_mps: parseValue(raw.wind?.wind_gust),
      rain_mm_hour: parseValue(raw.rainfall?.rain_rate),
      rain_mm_day: parseValue(raw.rainfall?.daily),
      uv_index: parseValue(raw.solar_and_uvi?.uvi),
      solar_radiation_wm2: parseValue(raw.solar_and_uvi?.solar),
      lightning_count: parseValue(raw.lightning?.count),
      lightning_distance_km: parseValue(raw.lightning?.distance),
      feels_like_c: parseValue(raw.outdoor?.feels_like),
      dew_point_c: parseValue(raw.outdoor?.dew_point),
    };

    // Extract soil sensor data
    const soilData = {
      temp1: parseValue(raw.soil_ch1?.soiltemp),
      temp2: parseValue(raw.soil_ch2?.soiltemp),
      temp3: parseValue(raw.soil_ch3?.soiltemp),
      temp4: parseValue(raw.soil_ch4?.soiltemp),
      moisture1: parseValue(raw.soil_ch1?.soilmoisture),
      moisture2: parseValue(raw.soil_ch2?.soilmoisture),
      moisture3: parseValue(raw.soil_ch3?.soilmoisture),
      moisture4: parseValue(raw.soil_ch4?.soilmoisture),
    };

    return { success: true, data: normalized, raw, soilData };
  } catch (error) {
    console.error('[Ecowitt] Fetch error:', error);
    return { success: false, error: 'Failed to fetch data' };
  }
}

/**
 * Get device info
 */
export async function getEcowittDevice(
  mac: string,
  apiKey: string
): Promise<{
  success: boolean;
  device?: EcowittDevice;
  error?: string;
}> {
  const result = await validateEcowittKey(apiKey);

  if (!result.valid || !result.devices) {
    return { success: false, error: result.error };
  }

  const device = result.devices.find(d => d.mac === mac);

  if (!device) {
    return { success: false, error: 'Device not found' };
  }

  return { success: true, device };
}
