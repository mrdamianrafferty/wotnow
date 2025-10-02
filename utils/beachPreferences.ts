/**
 * Beach orientation preferences utility
 * Allows saving and retrieving user-selected beach orientations
 */

const ORIENTATION_PREFS_KEY = 'wotnow.beach.user.orientation.v1';

/**
 * Save user-selected beach orientation for a specific location
 */
import { roundCoord } from './coordinatePrecision';

export function saveBeachOrientation(locationId: string, orientationDeg: number | null): void {
  try {
    const stored = localStorage.getItem(ORIENTATION_PREFS_KEY);
    const preferences = stored ? JSON.parse(stored) : {};
    
    if (orientationDeg === null) {
      // Remove the preference if null
      delete preferences[locationId];
    } else {
      // Save the preference
      preferences[locationId] = normalizeAngle(orientationDeg);
    }
    
    localStorage.setItem(ORIENTATION_PREFS_KEY, JSON.stringify(preferences));
  } catch (e) {
    console.error('Failed to save beach orientation:', e);
  }
}

/**
 * Get user-selected beach orientation for a specific location
 */
export function getBeachOrientation(locationId: string): number | null {
  try {
    const stored = localStorage.getItem(ORIENTATION_PREFS_KEY);
    if (!stored) return null;
    
    const preferences = JSON.parse(stored);
    return preferences[locationId] || null;
  } catch (e) {
    console.error('Failed to get beach orientation:', e);
    return null;
  }
}

/**
 * Generate a location ID from coordinates
 */
export function generateLocationId(lat: number, lon: number): string {
  // Round to 5 decimal places for consistent IDs
// Update generateLocationId function (line ~48):

const roundedLat = roundCoord(lat);
const roundedLon = roundCoord(lon);
  return `${roundedLat},${roundedLon}`;
}

/**
 * Normalize angle to be between 0 and 359
 */
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Convert compass direction to degrees
 */
export function compassToDegrees(direction: string): number | null {
  const directions: Record<string, number> = {
    'N': 0,
    'NNE': 22.5,
    'NE': 45,
    'ENE': 67.5,
    'E': 90,
    'ESE': 112.5,
    'SE': 135,
    'SSE': 157.5,
    'S': 180,
    'SSW': 202.5,
    'SW': 225,
    'WSW': 247.5,
    'W': 270,
    'WNW': 292.5,
    'NW': 315,
    'NNW': 337.5
  };
  
  return directions[direction] !== undefined ? directions[direction] : null;
}

/**
 * Convert degrees to compass direction
 */
export function degreesToCompass(degrees: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
}
