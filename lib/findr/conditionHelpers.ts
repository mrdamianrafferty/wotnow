/**
 * Helper functions for approach scoring conditions
 *
 * Provides tide stage detection and time of day calculation
 * for use in scoreSpeciesApproach and related scoring functions.
 */

/**
 * Tide extreme data point from API
 */
export interface TideExtreme {
  time: string;      // ISO 8601 timestamp
  type: 'high' | 'low';
  height: number;    // meters
}

/**
 * Calculate tide stage from tide extreme data
 *
 * Returns one of:
 * - 'flooding': Rising tide (between low and high)
 * - 'ebbing': Falling tide (between high and low)
 * - 'high_slack': Near high tide (±30 minutes)
 * - 'low_slack': Near low tide (±30 minutes)
 *
 * @param extremes - Array of tide extremes from API
 * @param currentTime - Optional current time (defaults to now)
 * @returns Tide stage string
 *
 * @example
 * const tideData = [
 *   { time: '2025-11-20T10:30:00Z', type: 'high', height: 4.2 },
 *   { time: '2025-11-20T16:45:00Z', type: 'low', height: 0.8 }
 * ];
 * const stage = getTideStage(tideData);
 * // Returns: 'flooding' | 'ebbing' | 'high_slack' | 'low_slack'
 */
export function getTideStage(
  extremes: TideExtreme[] | null | undefined,
  currentTime?: Date
): 'flooding' | 'ebbing' | 'high_slack' | 'low_slack' | null {
  if (!extremes || extremes.length === 0) {
    return null;
  }

  const now = currentTime || new Date();

  // Find the previous and next tide extremes
  const sortedExtremes = [...extremes].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  let previousTide: TideExtreme | null = null;
  let nextTide: TideExtreme | null = null;

  for (let i = 0; i < sortedExtremes.length; i++) {
    const tide = sortedExtremes[i];
    const tideTime = new Date(tide.time);

    if (tideTime <= now) {
      previousTide = tide;
    } else if (tideTime > now && !nextTide) {
      nextTide = tide;
      break;
    }
  }

  // If no next tide, use the last available
  if (!nextTide && sortedExtremes.length > 0) {
    nextTide = sortedExtremes[sortedExtremes.length - 1];
  }

  // If no previous tide, use the first available
  if (!previousTide && sortedExtremes.length > 0) {
    previousTide = sortedExtremes[0];
  }

  if (!nextTide) {
    return null;
  }

  const timeToNextMs = new Date(nextTide.time).getTime() - now.getTime();
  const timeToNextMinutes = timeToNextMs / (1000 * 60);

  // Within 30 minutes of the next tide = slack water
  if (timeToNextMinutes <= 30 && timeToNextMinutes >= 0) {
    return nextTide.type === 'high' ? 'high_slack' : 'low_slack';
  }

  // If we have a previous tide, check if we just passed it (within 30 minutes)
  if (previousTide) {
    const timeSincePreviousMs = now.getTime() - new Date(previousTide.time).getTime();
    const timeSincePreviousMinutes = timeSincePreviousMs / (1000 * 60);

    if (timeSincePreviousMinutes <= 30 && timeSincePreviousMinutes >= 0) {
      return previousTide.type === 'high' ? 'high_slack' : 'low_slack';
    }
  }

  // Active tide flow
  // If next tide is high, we're flooding (rising)
  // If next tide is low, we're ebbing (falling)
  return nextTide.type === 'high' ? 'flooding' : 'ebbing';
}

/**
 * Calculate time of day from timezone and current time
 *
 * Returns one of:
 * - 'dawn': Sunrise period (5:00-7:00)
 * - 'day': Daytime (7:00-18:00)
 * - 'dusk': Sunset period (18:00-20:00)
 * - 'night': Nighttime (20:00-5:00)
 *
 * Note: Uses simple hour ranges. For precise sunrise/sunset times,
 * would need to integrate with a sun position library.
 *
 * @param timezone - IANA timezone string (e.g., 'Europe/London', 'America/New_York')
 * @param currentTime - Optional current time (defaults to now)
 * @returns Time of day string
 *
 * @example
 * const timeOfDay = getTimeOfDay('Europe/London');
 * // Returns: 'dawn' | 'day' | 'dusk' | 'night'
 */
export function getTimeOfDay(
  timezone?: string | null,
  currentTime?: Date
): 'dawn' | 'day' | 'dusk' | 'night' {
  const now = currentTime || new Date();

  // Get hour in specified timezone (or UTC if not provided)
  let hour: number;
  if (timezone) {
    try {
      const timeString = now.toLocaleString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: 'numeric',
      });
      hour = parseInt(timeString, 10);
    } catch (_error) {
      // Invalid timezone, fall back to UTC
      console.warn(`Invalid timezone: ${timezone}, falling back to UTC`);
      hour = now.getUTCHours();
    }
  } else {
    hour = now.getUTCHours();
  }

  // Simple hour-based classification
  // Dawn: 5am-7am
  // Day: 7am-6pm
  // Dusk: 6pm-8pm
  // Night: 8pm-5am
  if (hour >= 5 && hour < 7) {
    return 'dawn';
  } else if (hour >= 7 && hour < 18) {
    return 'day';
  } else if (hour >= 18 && hour < 20) {
    return 'dusk';
  } else {
    return 'night';
  }
}

/**
 * Get timezone from coordinates using heuristic rules
 *
 * This is a simple approximation. For production use, consider
 * integrating a timezone lookup library like 'geo-tz' or calling
 * a timezone API service.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Approximate IANA timezone string
 *
 * @example
 * const tz = getTimezoneFromCoordinates(51.5, -0.1);
 * // Returns: 'Europe/London'
 */
export function getTimezoneFromCoordinates(lat: number, lon: number): string {
  // Simple heuristic based on longitude (very approximate!)
  // For production, use a proper timezone lookup library

  // Europe
  if (lat >= 35 && lat <= 71 && lon >= -10 && lon <= 40) {
    if (lon >= -10 && lon < 5) return 'Europe/London';
    if (lon >= 5 && lon < 15) return 'Europe/Paris';
    if (lon >= 15 && lon < 25) return 'Europe/Berlin';
    if (lon >= 25 && lon < 40) return 'Europe/Athens';
  }

  // US East Coast
  if (lat >= 25 && lat <= 48 && lon >= -85 && lon <= -65) {
    return 'America/New_York';
  }

  // US West Coast
  if (lat >= 32 && lat <= 49 && lon >= -125 && lon <= -115) {
    return 'America/Los_Angeles';
  }

  // Asia - Japan/Korea
  if (lat >= 30 && lat <= 45 && lon >= 125 && lon <= 145) {
    return 'Asia/Tokyo';
  }

  // Australia East Coast
  if (lat >= -38 && lat <= -10 && lon >= 145 && lon <= 155) {
    return 'Australia/Sydney';
  }

  // Atlantic (Iceland, Azores)
  if (lat >= 35 && lat <= 65 && lon >= -30 && lon <= -10) {
    return 'Atlantic/Azores';
  }

  // Default to UTC
  return 'UTC';
}

/**
 * Enhanced time of day calculation using coordinates
 *
 * Attempts to infer timezone from coordinates, then calculates time of day.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param currentTime - Optional current time (defaults to now)
 * @returns Time of day string
 *
 * @example
 * const timeOfDay = getTimeOfDayFromCoordinates(51.5, -0.1);
 * // Returns: 'dawn' | 'day' | 'dusk' | 'night' (based on London time)
 */
export function getTimeOfDayFromCoordinates(
  lat: number,
  lon: number,
  currentTime?: Date
): 'dawn' | 'day' | 'dusk' | 'night' {
  const timezone = getTimezoneFromCoordinates(lat, lon);
  return getTimeOfDay(timezone, currentTime);
}

/**
 * Convert old tide phase format to new format
 *
 * Maps the format used by useTideData hook to approach scoring format:
 * - 'rising' → 'flooding'
 * - 'falling' → 'ebbing'
 * - 'high_slack' → 'high_slack'
 * - 'low_slack' → 'low_slack'
 *
 * @param phase - Old format tide phase
 * @returns New format tide phase
 */
export function convertTidePhase(
  phase: 'rising' | 'falling' | 'high_slack' | 'low_slack' | null | undefined
): 'flooding' | 'ebbing' | 'high_slack' | 'low_slack' | null {
  if (!phase) return null;

  const mapping: Record<string, 'flooding' | 'ebbing' | 'high_slack' | 'low_slack'> = {
    'rising': 'flooding',
    'falling': 'ebbing',
    'high_slack': 'high_slack',
    'low_slack': 'low_slack',
  };

  return mapping[phase] || null;
}
