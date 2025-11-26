import { useEffect, useRef } from 'react';
import { useUnifiedLocation } from '../context/UnifiedLocationContext';

/**
 * Migrates old findrSettings localStorage to UnifiedLocationContext
 *
 * This hook runs once on mount and:
 * 1. Checks for old 'findrSettings' localStorage key
 * 2. If found, migrates the selectedCode to UnifiedLocationContext's 'findr' slot
 * 3. Deletes the old localStorage key
 *
 * This ensures users don't lose their saved location when we remove usePersistentFindrSettings
 */
export function useMigrateFindrSettings() {
  const { findrLocation, updateLocationBySlot } = useUnifiedLocation();
  const hasMigrated = useRef(false);

  useEffect(() => {
    // Only migrate once, and only if there's no existing findr location
    if (hasMigrated.current || findrLocation) {
      return;
    }
    hasMigrated.current = true;

    // Check for old localStorage key
    const oldSettings = localStorage.getItem('findrSettings');
    if (!oldSettings) {
      return;
    }

    try {
      const parsed = JSON.parse(oldSettings) as { selectedCode?: string; predictionDate?: string };

      if (parsed.selectedCode) {
        console.log('[Migration] Migrating findrSettings to UnifiedLocation:', {
          selectedCode: parsed.selectedCode,
          predictionDate: parsed.predictionDate,
        });

        // Save to UnifiedLocationContext's findr slot
        // The resolveRectangle flag will lookup the rectangle metadata via API
        void updateLocationBySlot({
          slot: 'findr',
          coordinates: { lat: 0, lon: 0 }, // Will be resolved by API via rectangle code
          rectangleCode: parsed.selectedCode,
          name: parsed.selectedCode, // Temporary, will be updated by API
          source: 'manual',
          makeActive: true,
          resolveRectangle: true, // Important: lookup lat/lon/region from rectangle code
        }).then(() => {
          console.log('[Migration] Successfully migrated findrSettings');

          // Delete old localStorage key
          localStorage.removeItem('findrSettings');
          console.log('[Migration] Removed old findrSettings from localStorage');
        }).catch((error) => {
          console.error('[Migration] Failed to migrate findrSettings:', error);
          // Don't delete the old key if migration failed
        });
      }
    } catch (error) {
      console.warn('[Migration] Failed to parse findrSettings', error);
    }
  }, [findrLocation, updateLocationBySlot]);
}
