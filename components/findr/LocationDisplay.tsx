import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import type { BasicLocation } from '../CoastalLocationDialog';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';
import { toLegacyFormat as convertToLegacy } from '@/types/multiLocation';
import { toast } from '@/lib/ui/toast';

// Dynamically import CoastalLocationDialog with no SSR
const CoastalLocationDialog = dynamic(
  () => import('../CoastalLocationDialog'),
  { ssr: false }
);

export function LocationDisplay() {
  const router = useRouter();
  const { location: legacyLocation, homeLocation, coastalLocation, findrLocation, updateLocationBySlot, syncing } = useUnifiedLocation();

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [locationName, setLocationName] = useState('Set location');

  // Memoize effectiveLocation to prevent unnecessary recalculations
  // Prefer findrLocation, then coastalLocation, then homeLocation, then legacyLocation
  const effectiveLocation = useMemo(() => {
    if (findrLocation) return convertToLegacy(findrLocation);
    if (coastalLocation) return convertToLegacy(coastalLocation);
    if (homeLocation) return convertToLegacy(homeLocation);
    return legacyLocation;
  }, [findrLocation, coastalLocation, homeLocation, legacyLocation]);

  // Extract stable primitive values for dependency tracking
  const locLabel = effectiveLocation?.rectangleLabel;
  const locRegion = effectiveLocation?.rectangleRegion;
  const locCode = effectiveLocation?.rectangleCode;
  const locLat = effectiveLocation?.lat;
  const locLon = effectiveLocation?.lon;

  // Look up region name from rectangle code if we only have code but no region/label
  useEffect(() => {
    // Skip generic fallback values
    const isGenericLabel = !locLabel || locLabel === 'Saved Location' || locLabel === 'Unknown';
    
    if (!isGenericLabel && locLabel) {
      // Use the user's chosen name (clean up any trailing parenthetical like "(~5km away)")
      const cleaned = locLabel.replace(/\s*\([^)]*\)\s*$/, '').trim();
      setLocationName(cleaned || locLabel);
    } else if (locRegion) {
      // Fall back to region name (e.g., "Bay of Biscay")
      setLocationName(locRegion);
    } else if (locCode && locLat && locLon) {
      // Have code but no region - look it up from coordinates
      setLocationName(locCode); // Show code immediately while loading
      
      fetch(`/api/findr/rectangle-lookup?lat=${locLat}&lon=${locLon}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.region) {
            setLocationName(data.region);
          }
        })
        .catch(() => {
          // Keep showing the code on error
        });
    } else if (locCode) {
      // Fall back to rectangle code (e.g., "25E0")
      setLocationName(locCode);
    }
    // Otherwise keep the current value (either "Set location" or a previous valid name)
  }, [locCode, locLabel, locRegion, locLat, locLon]);

  const loadingState = useMemo(() => isLookingUp || syncing, [isLookingUp, syncing]);

  const handleLocationSave = async (location: BasicLocation) => {
    setIsLookingUp(true);

    try {
      // Try to find ICES rectangle (European waters)
      // If not found, use worldwide location with raw coordinates
      const res = await fetch(
        `/api/findr/rectangle-lookup?lat=${location.lat}&lon=${location.lon}`
      );

      let rectangleCode: string | null = null;
      let region: string | null = null;
      let distance: number | null = null;
      let _useRectangleCenter = false;

      if (res.ok) {
        // European waters - has ICES rectangle
        const data = await res.json();
        rectangleCode = data.rectangleCode;
        region = data.region;
        distance = data.distance;
        _useRectangleCenter = true;

        console.log('[LocationDisplay] Found ICES rectangle:', {
          rectangleCode,
          region,
          distance,
          location,
        });
      } else {
        // Non-European waters - use worldwide location
        console.log('[LocationDisplay] No ICES rectangle, using worldwide location:', location);
      }

      const displayName =
        typeof distance === 'number' && distance > 10
          ? `${location.name} (~${Math.round(distance)}km away)`
          : location.name;

      // Save to 'findr' slot (Findr-specific location)
      const _unified = await updateLocationBySlot({
        slot: 'findr',
        coordinates: {
          lat: location.lat, // Keep user's chosen coordinates
          lon: location.lon
        },
        rectangleCode,
        rectangleRegion: region,
        name: displayName,
        source: 'manual',
        accuracy: typeof distance === 'number' ? distance : null,
        makeActive: true,
      });

      setLocationName(displayName);

      // Close the picker
      setShowLocationPicker(false);

      // Update URL parameters on current page (no navigation)
      if (rectangleCode) {
        // European waters - add rectangle param
        await router.replace(
          {
            pathname: router.pathname,
            query: { ...router.query, rectangle: rectangleCode },
          },
          undefined,
          { shallow: true }
        );
      } else {
        // Worldwide location - remove rectangle param if present
        const { rectangle: _rectangle, ...restQuery } = router.query;
        await router.replace(
          {
            pathname: router.pathname,
            query: restQuery,
          },
          undefined,
          { shallow: true }
        );
      }

      console.log('[LocationDisplay] Location updated successfully:', {
        rectangleCode,
        region,
        worldwide: !rectangleCode,
        pathname: router.pathname,
      });
    } catch (error) {
      console.error('[LocationDisplay] Failed to save location:', error);
      await toast.error(`Could not save location: ${(error as Error).message}`);
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <>
      <button
        data-testid="location-button"
        onClick={() => setShowLocationPicker(true)}
        disabled={loadingState}
        className="flex items-center gap-2 px-3 py-2 bg-base-100 hover:bg-base-200 rounded-lg border border-base-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] max-w-[200px]"
      >
        {loadingState ? (
          <Loader2 size={16} className="text-cyan-500 animate-spin flex-shrink-0" />
        ) : (
          <MapPin size={16} className="text-cyan-500 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-base-content truncate">
          {loadingState ? 'Finding area...' : locationName}
        </span>
      </button>

      {showLocationPicker && (
        <CoastalLocationDialog
          open={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSave={handleLocationSave}
          title="Set Your Fishing Location"
        />
      )}
    </>
  );
}

export default LocationDisplay;
