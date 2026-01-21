/**
 * Hydrawise (Hunter Industries) API Client
 *
 * Client for interacting with Hydrawise smart irrigation controllers.
 * API Reference: https://www.hunterirrigation.com/en-metric/support/hydrawise-api-information
 *
 * @module lib/grow/hydrawise
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const HYDRAWISE_API_BASE = 'https://api.hydrawise.com/api/v1';

// =============================================================================
// TYPES
// =============================================================================

export interface HydrawiseController {
  controller_id: number;
  name: string;
  serial_number: string;
  last_contact: number;
  status: string;
}

export interface HydrawiseZone {
  relay_id: number;
  relay: number;
  name: string;
  time: number; // Seconds until next run
  run: number; // Run time in seconds
  type: number;
  is_running: boolean;
  period_id?: number;
}

export interface HydrawiseCustomerDetails {
  customer_id: number;
  current_controller: HydrawiseController;
  controllers: HydrawiseController[];
}

export interface HydrawiseStatusSchedule {
  controller_id: number;
  nextpoll: number;
  relays: HydrawiseZone[];
  running?: HydrawiseZone[];
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Validate a Hydrawise API key and get customer details
 */
export async function validateHydrawiseKey(apiKey: string): Promise<{
  valid: boolean;
  customer?: HydrawiseCustomerDetails;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${HYDRAWISE_API_BASE}/customerdetails.php?api_key=${encodeURIComponent(apiKey)}`,
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
        return { valid: false, error: 'Rate limit exceeded. Please try again later.' };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    // Check for API error response
    if (data.error_msg) {
      return { valid: false, error: data.error_msg };
    }

    if (!data.customer_id) {
      return { valid: false, error: 'Invalid response from Hydrawise' };
    }

    return { valid: true, customer: data };
  } catch (error) {
    console.error('[Hydrawise] Validation error:', error);
    return { valid: false, error: 'Failed to connect to Hydrawise API' };
  }
}

/**
 * Get current status and schedule for all zones
 */
export async function getHydrawiseStatus(apiKey: string): Promise<{
  success: boolean;
  status?: HydrawiseStatusSchedule;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${HYDRAWISE_API_BASE}/statusschedule.php?api_key=${encodeURIComponent(apiKey)}`,
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

    if (data.error_msg) {
      return { success: false, error: data.error_msg };
    }

    return { success: true, status: data };
  } catch (error) {
    console.error('[Hydrawise] Status error:', error);
    return { success: false, error: 'Failed to fetch status' };
  }
}

/**
 * Start a zone for a specified duration
 */
export async function startHydrawiseZone(
  apiKey: string,
  relayId: number,
  durationSeconds: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      action: 'run',
      relay_id: relayId.toString(),
      custom: durationSeconds.toString(),
    });

    const response = await fetch(
      `${HYDRAWISE_API_BASE}/setzone.php?${params.toString()}`,
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

    if (data.error_msg) {
      return { success: false, error: data.error_msg };
    }

    return { success: true };
  } catch (error) {
    console.error('[Hydrawise] Start zone error:', error);
    return { success: false, error: 'Failed to start zone' };
  }
}

/**
 * Stop a running zone
 */
export async function stopHydrawiseZone(
  apiKey: string,
  relayId: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      action: 'stop',
      relay_id: relayId.toString(),
    });

    const response = await fetch(
      `${HYDRAWISE_API_BASE}/setzone.php?${params.toString()}`,
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

    if (data.error_msg) {
      return { success: false, error: data.error_msg };
    }

    return { success: true };
  } catch (error) {
    console.error('[Hydrawise] Stop zone error:', error);
    return { success: false, error: 'Failed to stop zone' };
  }
}

/**
 * Suspend all zones
 */
export async function suspendHydrawiseAll(
  apiKey: string,
  durationSeconds: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      action: 'suspendall',
      period_id: '999', // Custom period
      custom: durationSeconds.toString(),
    });

    const response = await fetch(
      `${HYDRAWISE_API_BASE}/setzone.php?${params.toString()}`,
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

    if (data.error_msg) {
      return { success: false, error: data.error_msg };
    }

    return { success: true };
  } catch (error) {
    console.error('[Hydrawise] Suspend error:', error);
    return { success: false, error: 'Failed to suspend zones' };
  }
}

/**
 * Run all zones
 */
export async function runAllHydrawiseZones(
  apiKey: string,
  durationSeconds: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      action: 'runall',
      custom: durationSeconds.toString(),
    });

    const response = await fetch(
      `${HYDRAWISE_API_BASE}/setzone.php?${params.toString()}`,
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

    if (data.error_msg) {
      return { success: false, error: data.error_msg };
    }

    return { success: true };
  } catch (error) {
    console.error('[Hydrawise] Run all error:', error);
    return { success: false, error: 'Failed to run all zones' };
  }
}
