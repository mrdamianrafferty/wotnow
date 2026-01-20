/**
 * Ambient Weather API Client
 *
 * Client for interacting with Ambient Weather stations.
 * API Reference: https://ambientweather.docs.apiary.io/
 *
 * @module lib/grow/ambient-weather
 */

import { WeatherStationData } from './integrations';

// =============================================================================
// CONSTANTS
// =============================================================================

const AMBIENT_API_BASE = 'https://rt.ambientweather.net/v1';

// Application key registered with Ambient Weather
const AMBIENT_APP_KEY = process.env.AMBIENT_WEATHER_APP_KEY;

// =============================================================================
// TYPES
// =============================================================================

export interface AmbientDevice {
  macAddress: string;
  info: {
    name: string;
    coords?: {
      coords: {
        lat: number;
        lon: number;
      };
    };
    location?: string;
  };
  lastData: AmbientDeviceData;
}

export interface AmbientDeviceData {
  dateutc: number;
  date: string;
  // Indoor sensors
  tempinf?: number;
  humidityin?: number;
  // Outdoor sensors
  tempf?: number;
  humidity?: number;
  baromrelin?: number;
  baromabsin?: number;
  winddir?: number;
  windspeedmph?: number;
  windgustmph?: number;
  maxdailygust?: number;
  // Rain
  hourlyrainin?: number;
  dailyrainin?: number;
  weeklyrainin?: number;
  monthlyrainin?: number;
  // Solar & UV
  uv?: number;
  solarradiation?: number;
  // Calculated
  feelsLike?: number;
  dewPoint?: number;
  // Soil sensors (1-10)
  soiltemp1?: number;
  soiltemp2?: number;
  soiltemp3?: number;
  soiltemp4?: number;
  soilhum1?: number;
  soilhum2?: number;
  soilhum3?: number;
  soilhum4?: number;
  // PM2.5 sensor
  pm25?: number;
  pm25_24h?: number;
  // Lightning
  lightning_day?: number;
  lightning_distance?: number;
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Validate an Ambient Weather API key and fetch devices
 */
export async function validateAmbientKey(apiKey: string): Promise<{
  valid: boolean;
  devices?: AmbientDevice[];
  error?: string;
}> {
  if (!AMBIENT_APP_KEY) {
    return { valid: false, error: 'Ambient Weather app key not configured' };
  }

  try {
    const response = await fetch(
      `${AMBIENT_API_BASE}/devices?apiKey=${encodeURIComponent(apiKey)}&applicationKey=${encodeURIComponent(AMBIENT_APP_KEY)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }
      if (response.status === 429) {
        return { valid: false, error: 'Rate limit exceeded. Please try again in a few seconds.' };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data: AmbientDevice[] = await response.json();

    if (!data || data.length === 0) {
      return { valid: false, error: 'No devices found for this account' };
    }

    return { valid: true, devices: data };
  } catch (error) {
    console.error('[AmbientWeather] Validation error:', error);
    return { valid: false, error: 'Failed to connect to Ambient Weather API' };
  }
}

/**
 * Fetch latest data from an Ambient Weather device
 */
export async function fetchAmbientData(
  macAddress: string,
  apiKey: string,
  limit = 1
): Promise<{
  success: boolean;
  data?: WeatherStationData;
  raw?: AmbientDeviceData;
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
  if (!AMBIENT_APP_KEY) {
    return { success: false, error: 'Ambient Weather app key not configured' };
  }

  try {
    const response = await fetch(
      `${AMBIENT_API_BASE}/devices/${macAddress}?apiKey=${encodeURIComponent(apiKey)}&applicationKey=${encodeURIComponent(AMBIENT_APP_KEY)}&limit=${limit}`,
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

    const results: AmbientDeviceData[] = await response.json();

    if (!results || results.length === 0) {
      return { success: false, error: 'No data available' };
    }

    const latest = results[0];

    // Convert Fahrenheit to Celsius and mph to m/s
    const tempC = latest.tempf !== undefined
      ? ((latest.tempf - 32) * 5) / 9
      : undefined;

    const feelsLikeC = latest.feelsLike !== undefined
      ? ((latest.feelsLike - 32) * 5) / 9
      : undefined;

    const dewPointC = latest.dewPoint !== undefined
      ? ((latest.dewPoint - 32) * 5) / 9
      : undefined;

    const windMps = latest.windspeedmph !== undefined
      ? latest.windspeedmph * 0.44704
      : undefined;

    const gustMps = latest.windgustmph !== undefined
      ? latest.windgustmph * 0.44704
      : undefined;

    // Convert inches to millimeters for rain
    const rainMmHour = latest.hourlyrainin !== undefined
      ? latest.hourlyrainin * 25.4
      : undefined;

    const rainMmDay = latest.dailyrainin !== undefined
      ? latest.dailyrainin * 25.4
      : undefined;

    // Convert inHg to mb for pressure
    const pressureMb = latest.baromrelin !== undefined
      ? latest.baromrelin * 33.8639
      : undefined;

    // Convert soil temps from F to C
    const soilTemp1 = latest.soiltemp1 !== undefined
      ? ((latest.soiltemp1 - 32) * 5) / 9
      : undefined;
    const soilTemp2 = latest.soiltemp2 !== undefined
      ? ((latest.soiltemp2 - 32) * 5) / 9
      : undefined;
    const soilTemp3 = latest.soiltemp3 !== undefined
      ? ((latest.soiltemp3 - 32) * 5) / 9
      : undefined;
    const soilTemp4 = latest.soiltemp4 !== undefined
      ? ((latest.soiltemp4 - 32) * 5) / 9
      : undefined;

    // Normalize to our standard format
    const normalized: WeatherStationData = {
      temperature_c: tempC,
      humidity_percent: latest.humidity,
      pressure_mb: pressureMb,
      wind_speed_mps: windMps,
      wind_direction_deg: latest.winddir,
      wind_gust_mps: gustMps,
      rain_mm_hour: rainMmHour,
      rain_mm_day: rainMmDay,
      uv_index: latest.uv,
      solar_radiation_wm2: latest.solarradiation,
      lightning_count: latest.lightning_day,
      lightning_distance_km: latest.lightning_distance !== undefined
        ? latest.lightning_distance * 1.60934 // miles to km
        : undefined,
      feels_like_c: feelsLikeC,
      dew_point_c: dewPointC,
    };

    // Include soil data separately (Grow-specific value!)
    const soilData = {
      temp1: soilTemp1,
      temp2: soilTemp2,
      temp3: soilTemp3,
      temp4: soilTemp4,
      moisture1: latest.soilhum1,
      moisture2: latest.soilhum2,
      moisture3: latest.soilhum3,
      moisture4: latest.soilhum4,
    };

    return { success: true, data: normalized, raw: latest, soilData };
  } catch (error) {
    console.error('[AmbientWeather] Fetch error:', error);
    return { success: false, error: 'Failed to fetch data' };
  }
}

/**
 * Get device info
 */
export async function getAmbientDevice(
  macAddress: string,
  apiKey: string
): Promise<{
  success: boolean;
  device?: AmbientDevice;
  error?: string;
}> {
  const result = await validateAmbientKey(apiKey);

  if (!result.valid || !result.devices) {
    return { success: false, error: result.error };
  }

  const device = result.devices.find(d => d.macAddress === macAddress);

  if (!device) {
    return { success: false, error: 'Device not found' };
  }

  return { success: true, device };
}
