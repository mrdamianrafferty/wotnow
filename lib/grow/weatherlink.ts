/**
 * Davis WeatherLink API v2 Client
 *
 * Client for interacting with Davis Instruments weather stations via WeatherLink.
 * API Reference: https://weatherlink.github.io/v2-api/
 *
 * @module lib/grow/weatherlink
 */

import { WeatherStationData } from './integrations';

// =============================================================================
// CONSTANTS
// =============================================================================

const WEATHERLINK_API_BASE = 'https://api.weatherlink.com/v2';

// =============================================================================
// TYPES
// =============================================================================

export interface WeatherLinkStation {
  station_id: number;
  station_name: string;
  gateway_id: number;
  gateway_id_hex: string;
  product_number: string;
  username: string;
  user_email: string;
  company_name?: string;
  active: boolean;
  recording_interval: number;
  time_zone: string;
  city?: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface WeatherLinkSensor {
  lsid: number;
  sensor_type: number;
  category: string;
  manufacturer: string;
  product_name: string;
  product_number: string;
  parent_device_type?: string;
  parent_device_name?: string;
  data_structure_type: number;
}

export interface WeatherLinkCurrentData {
  ts: number; // Timestamp
  temp?: number; // Temperature (F)
  hum?: number; // Humidity (%)
  dew_point?: number; // Dew point (F)
  wet_bulb?: number; // Wet bulb (F)
  heat_index?: number; // Heat index (F)
  wind_chill?: number; // Wind chill (F)
  thw_index?: number; // THW index (F)
  bar?: number; // Barometric pressure (inHg)
  bar_trend?: number; // Pressure trend
  wind_speed_last?: number; // Wind speed (mph)
  wind_dir_last?: number; // Wind direction (deg)
  wind_speed_avg_last_2_min?: number;
  wind_dir_avg_last_2_min?: number;
  wind_speed_hi_last_10_min?: number; // Gust
  wind_dir_at_hi_speed_last_10_min?: number;
  rain_rate_last?: number; // Rain rate (clicks)
  rain_rate_hi?: number;
  rainfall_daily?: number; // Daily rainfall (clicks)
  rainfall_monthly?: number;
  rainfall_year?: number;
  solar_rad?: number; // Solar radiation (W/m²)
  uv_index?: number; // UV index
  // Soil/Leaf sensors
  moist_soil_1?: number;
  moist_soil_2?: number;
  moist_soil_3?: number;
  moist_soil_4?: number;
  temp_soil_1?: number;
  temp_soil_2?: number;
  temp_soil_3?: number;
  temp_soil_4?: number;
}

export interface WeatherLinkStationsResponse {
  stations: WeatherLinkStation[];
}

export interface WeatherLinkCurrentResponse {
  station_id: number;
  sensors: Array<{
    lsid: number;
    sensor_type: number;
    data_structure_type: number;
    data: WeatherLinkCurrentData[];
  }>;
  generated_at: number;
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Make authenticated request to WeatherLink API
 */
async function weatherLinkFetch<T>(
  endpoint: string,
  apiKey: string,
  apiSecret: string
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    const url = `${WEATHERLINK_API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api-key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Secret': apiSecret,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Invalid API key or secret' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Access denied - check API permissions' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json() as T;
    return { success: true, data };
  } catch (error) {
    console.error('[WeatherLink] Fetch error:', error);
    return { success: false, error: 'Failed to connect to WeatherLink API' };
  }
}

/**
 * Validate WeatherLink credentials and get stations
 */
export async function validateWeatherLinkCredentials(
  apiKey: string,
  apiSecret: string
): Promise<{
  valid: boolean;
  stations?: WeatherLinkStation[];
  error?: string;
}> {
  const result = await weatherLinkFetch<WeatherLinkStationsResponse>(
    '/stations',
    apiKey,
    apiSecret
  );

  if (!result.success) {
    return { valid: false, error: result.error };
  }

  if (!result.data?.stations || result.data.stations.length === 0) {
    return { valid: false, error: 'No stations found for this account' };
  }

  return { valid: true, stations: result.data.stations };
}

/**
 * Get current conditions for a station
 */
export async function fetchWeatherLinkCurrent(
  stationId: number,
  apiKey: string,
  apiSecret: string
): Promise<{
  success: boolean;
  data?: WeatherStationData;
  raw?: WeatherLinkCurrentResponse;
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
  const result = await weatherLinkFetch<WeatherLinkCurrentResponse>(
    `/current/${stationId}`,
    apiKey,
    apiSecret
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Find the primary sensor data (ISS - Integrated Sensor Suite)
  // Data structure type 1 is ISS current conditions
  const issSensor = result.data.sensors.find(s =>
    s.data_structure_type === 1 || s.data_structure_type === 10
  );

  if (!issSensor || !issSensor.data || issSensor.data.length === 0) {
    return { success: false, error: 'No sensor data available' };
  }

  const sensorData = issSensor.data[0];

  // Convert units (Davis uses imperial)
  const tempC = sensorData.temp !== undefined
    ? (sensorData.temp - 32) * 5 / 9
    : undefined;

  const dewPointC = sensorData.dew_point !== undefined
    ? (sensorData.dew_point - 32) * 5 / 9
    : undefined;

  const windMps = sensorData.wind_speed_last !== undefined
    ? sensorData.wind_speed_last * 0.44704 // mph to m/s
    : undefined;

  const gustMps = sensorData.wind_speed_hi_last_10_min !== undefined
    ? sensorData.wind_speed_hi_last_10_min * 0.44704
    : undefined;

  // Davis rain is in clicks (0.01" per click)
  const rainDayMm = sensorData.rainfall_daily !== undefined
    ? sensorData.rainfall_daily * 0.254 // clicks to mm (0.01" = 0.254mm)
    : undefined;

  const rainRateMmHr = sensorData.rain_rate_last !== undefined
    ? sensorData.rain_rate_last * 0.254 * 60 // clicks/min to mm/hr
    : undefined;

  // Pressure: convert inHg to mb
  const pressureMb = sensorData.bar !== undefined
    ? sensorData.bar * 33.8639
    : undefined;

  // Convert soil temps from F to C
  const soilTemp1 = sensorData.temp_soil_1 !== undefined
    ? (sensorData.temp_soil_1 - 32) * 5 / 9
    : undefined;
  const soilTemp2 = sensorData.temp_soil_2 !== undefined
    ? (sensorData.temp_soil_2 - 32) * 5 / 9
    : undefined;
  const soilTemp3 = sensorData.temp_soil_3 !== undefined
    ? (sensorData.temp_soil_3 - 32) * 5 / 9
    : undefined;
  const soilTemp4 = sensorData.temp_soil_4 !== undefined
    ? (sensorData.temp_soil_4 - 32) * 5 / 9
    : undefined;

  const normalized: WeatherStationData = {
    temperature_c: tempC,
    humidity_percent: sensorData.hum,
    pressure_mb: pressureMb,
    wind_speed_mps: windMps,
    wind_direction_deg: sensorData.wind_dir_last,
    wind_gust_mps: gustMps,
    rain_mm_hour: rainRateMmHr,
    rain_mm_day: rainDayMm,
    uv_index: sensorData.uv_index,
    solar_radiation_wm2: sensorData.solar_rad,
    dew_point_c: dewPointC,
  };

  const soilData = {
    temp1: soilTemp1,
    temp2: soilTemp2,
    temp3: soilTemp3,
    temp4: soilTemp4,
    moisture1: sensorData.moist_soil_1,
    moisture2: sensorData.moist_soil_2,
    moisture3: sensorData.moist_soil_3,
    moisture4: sensorData.moist_soil_4,
  };

  return {
    success: true,
    data: normalized,
    raw: result.data,
    soilData,
  };
}

/**
 * Get sensors for a station
 */
export async function getWeatherLinkSensors(
  stationId: number,
  apiKey: string,
  apiSecret: string
): Promise<{
  success: boolean;
  sensors?: WeatherLinkSensor[];
  error?: string;
}> {
  const result = await weatherLinkFetch<{ sensors: WeatherLinkSensor[] }>(
    `/sensors?station-ids=${stationId}`,
    apiKey,
    apiSecret
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, sensors: result.data?.sensors };
}

/**
 * Get station details
 */
export async function getWeatherLinkStation(
  stationId: number,
  apiKey: string,
  apiSecret: string
): Promise<{
  success: boolean;
  station?: WeatherLinkStation;
  error?: string;
}> {
  const result = await validateWeatherLinkCredentials(apiKey, apiSecret);

  if (!result.valid || !result.stations) {
    return { success: false, error: result.error };
  }

  const station = result.stations.find(s => s.station_id === stationId);

  if (!station) {
    return { success: false, error: 'Station not found' };
  }

  return { success: true, station };
}
