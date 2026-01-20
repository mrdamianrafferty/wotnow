/**
 * Rachio Smart Irrigation API Client
 *
 * Client for interacting with Rachio smart irrigation controllers.
 * API Reference: https://rachio.readme.io/
 *
 * @module lib/grow/rachio
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const RACHIO_API_BASE = 'https://api.rach.io/1';

// =============================================================================
// TYPES
// =============================================================================

export interface RachioPerson {
  id: string;
  username: string;
  fullName: string;
  email: string;
  devices: RachioDevice[];
}

export interface RachioDevice {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  latitude?: number;
  longitude?: number;
  timeZone: string;
  utcOffset: number;
  zones: RachioZone[];
  scheduleModeType?: string;
  rainDelayExpirationDate?: number;
  rainDelayStartDate?: number;
}

export interface RachioZone {
  id: string;
  zoneNumber: number;
  name: string;
  enabled: boolean;
  customNozzle?: {
    name: string;
    inchesPerHour: number;
  };
  customSoil?: {
    name: string;
  };
  customSlope?: {
    name: string;
  };
  customCrop?: {
    name: string;
  };
  availableWater?: number;
  rootZoneDepth?: number;
  saturatedDepthOfWater?: number;
  depthOfWater?: number;
  efficiency?: number;
  imageUrl?: string;
  lastWateredDate?: number;
  lastWateredDuration?: number;
}

export interface RachioScheduleEvent {
  id: string;
  deviceId: string;
  zoneId?: string;
  eventType: string;
  summary: string;
  startTime: number;
  endTime: number;
  duration: number;
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Make authenticated request to Rachio API
 */
async function rachioFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    const response = await fetch(`${RACHIO_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Invalid or expired API key' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Try again later.' };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    // Some endpoints return empty response
    const text = await response.text();
    if (!text) {
      return { success: true };
    }

    const data = JSON.parse(text) as T;
    return { success: true, data };
  } catch (error) {
    console.error('[Rachio] Fetch error:', error);
    return { success: false, error: 'Failed to connect to Rachio API' };
  }
}

/**
 * Validate a Rachio API key and get user info
 */
export async function validateRachioToken(token: string): Promise<{
  valid: boolean;
  person?: RachioPerson;
  error?: string;
}> {
  // First get the person ID
  const selfResult = await rachioFetch<{ id: string }>(
    '/public/person/info',
    token
  );

  if (!selfResult.success || !selfResult.data?.id) {
    return { valid: false, error: selfResult.error || 'Failed to get user info' };
  }

  // Then get full person details with devices
  const personResult = await rachioFetch<RachioPerson>(
    `/public/person/${selfResult.data.id}`,
    token
  );

  if (!personResult.success || !personResult.data) {
    return { valid: false, error: personResult.error || 'Failed to get person details' };
  }

  if (!personResult.data.devices || personResult.data.devices.length === 0) {
    return { valid: false, error: 'No Rachio devices found for this account' };
  }

  return { valid: true, person: personResult.data };
}

/**
 * Get device details
 */
export async function getRachioDevice(
  deviceId: string,
  token: string
): Promise<{
  success: boolean;
  device?: RachioDevice;
  error?: string;
}> {
  const result = await rachioFetch<RachioDevice>(
    `/public/device/${deviceId}`,
    token
  );

  return {
    success: result.success,
    device: result.data,
    error: result.error,
  };
}

/**
 * Get zone details
 */
export async function getRachioZone(
  zoneId: string,
  token: string
): Promise<{
  success: boolean;
  zone?: RachioZone;
  error?: string;
}> {
  const result = await rachioFetch<RachioZone>(
    `/public/zone/${zoneId}`,
    token
  );

  return {
    success: result.success,
    zone: result.data,
    error: result.error,
  };
}

/**
 * Get upcoming schedule events
 */
export async function getRachioSchedule(
  deviceId: string,
  token: string,
  startTime?: number,
  endTime?: number
): Promise<{
  success: boolean;
  events?: RachioScheduleEvent[];
  error?: string;
}> {
  const start = startTime || Date.now();
  const end = endTime || start + 7 * 24 * 60 * 60 * 1000; // 7 days from now

  const result = await rachioFetch<RachioScheduleEvent[]>(
    `/public/device/${deviceId}/scheduleitem?startTime=${start}&endTime=${end}`,
    token
  );

  return {
    success: result.success,
    events: result.data || [],
    error: result.error,
  };
}

/**
 * Start a zone for a specific duration
 */
export async function startRachioZone(
  zoneId: string,
  durationSeconds: number,
  token: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const result = await rachioFetch(
    '/public/zone/start',
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        id: zoneId,
        duration: durationSeconds,
      }),
    }
  );

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Stop watering on a device
 */
export async function stopRachioDevice(
  deviceId: string,
  token: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const result = await rachioFetch(
    '/public/device/stop_water',
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ id: deviceId }),
    }
  );

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Set rain delay on a device
 */
export async function setRachioRainDelay(
  deviceId: string,
  durationDays: number,
  token: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const durationSeconds = durationDays * 24 * 60 * 60;

  const result = await rachioFetch(
    '/public/device/rain_delay',
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        id: deviceId,
        duration: durationSeconds,
      }),
    }
  );

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Get current zone state (is it watering?)
 */
export async function getRachioDeviceState(
  deviceId: string,
  token: string
): Promise<{
  success: boolean;
  state?: {
    isWatering: boolean;
    activeZone?: {
      id: string;
      name: string;
      zoneNumber: number;
    };
    rainDelayActive: boolean;
    rainDelayExpiration?: Date;
  };
  error?: string;
}> {
  const result = await getRachioDevice(deviceId, token);

  if (!result.success || !result.device) {
    return { success: false, error: result.error };
  }

  const device = result.device;

  // Check if any zone is currently watering
  let activeZone: { id: string; name: string; zoneNumber: number } | undefined;

  for (const zone of device.zones) {
    // If lastWateredDate is very recent (within last minute), it might be active
    // Note: Rachio API doesn't directly expose "currently watering" state,
    // so this is an approximation
    if (zone.lastWateredDate && Date.now() - zone.lastWateredDate < 60000) {
      activeZone = {
        id: zone.id,
        name: zone.name,
        zoneNumber: zone.zoneNumber,
      };
      break;
    }
  }

  const rainDelayActive = device.rainDelayExpirationDate
    ? device.rainDelayExpirationDate > Date.now()
    : false;

  return {
    success: true,
    state: {
      isWatering: !!activeZone,
      activeZone,
      rainDelayActive,
      rainDelayExpiration: device.rainDelayExpirationDate
        ? new Date(device.rainDelayExpirationDate)
        : undefined,
    },
  };
}
