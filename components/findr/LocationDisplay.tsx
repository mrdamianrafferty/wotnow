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
  const { location: legacyLocation, coastalLocation, findrLocation, updateLocationBySlot, syncing } = useUnifiedLocation();

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [locationName, setLocationName] = useState('Set location');

  // Prefer findrLocation, then fall back to coastalLocation, then legacyLocation
  const effectiveLocation = findrLocation
    ? convertToLegacy(findrLocation)
    : coastalLocation
      ? convertToLegacy(coastalLocation)
      : legacyLocation;

  useEffect(() => {
    if (effectiveLocation?.rectangleLabel) {
      const cleaned = effectiveLocation.rectangleLabel.replace(/\s*\([^)]*\)\s*$/, '').trim();
      setLocationName(cleaned || effectiveLocation.rectangleLabel);
    } else if (effectiveLocation?.rectangleCode) {
      setLocationName(effectiveLocation.rectangleCode);
    }
  }, [effectiveLocation?.rectangleCode, effectiveLocation?.rectangleLabel]);

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
        className="flex items-center gap-2 px-3 py-2 bg-base-100 hover:bg-base-200 rounded-lg border border-base-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingState ? (
          <Loader2 size={16} className="text-cyan-500 animate-spin" />
        ) : (
          <MapPin size={16} className="text-cyan-500" />
        )}
        <span className="text-sm font-medium text-base-content">
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
