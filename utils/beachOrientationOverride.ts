// Beach Orientation Override Utility
// Allows users to override the automatically calculated beach orientation

const STORAGE_KEY = 'wot-now-beach-orientation-overrides';

/**
 * Save a user-defined beach orientation override for a specific location
 * @param locationId Unique identifier for the location
 * @param orientationDeg Orientation in degrees (0-359) or null to remove override
 */
export function saveBeachOrientationOverride(locationId: string, orientationDeg: number | null): void {
  try {
    // Get existing overrides
    const stored = localStorage.getItem(STORAGE_KEY);
    const overrides = stored ? JSON.parse(stored) : {};
    
    if (orientationDeg === null) {
      // Remove override if null is passed
      delete overrides[locationId];
    } else {
      // Store normalized angle (0-359)
      overrides[locationId] = ((orientationDeg % 360) + 360) % 360;
    }
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save beach orientation override:', e);
  }
}

/**
 * Get user-defined beach orientation override for a location
 * @param locationId Unique identifier for the location
 * @returns Orientation in degrees or null if no override exists
 */
export function getBeachOrientationOverride(locationId: string): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const overrides = JSON.parse(stored);
    return overrides[locationId] !== undefined ? overrides[locationId] : null;
  } catch (e) {
    console.error('Failed to get beach orientation override:', e);
    return null;
  }
}

/**
 * Apply beach orientation override if it exists
 * @param locationId Location identifier
 * @param data Data object containing beachFacingDeg
 * @returns New data object with override applied, or original if no override exists
 */
export function applyBeachOrientationOverride<T extends { beachFacingDeg?: number }>(
  locationId: string, 
  data: T
): T {
  const override = getBeachOrientationOverride(locationId);
  
  if (override === null) {
    return data; // No override, return original data
  }
  
  // Return new object with override applied
  return {
    ...data,
    beachFacingDeg: override
  };
}
