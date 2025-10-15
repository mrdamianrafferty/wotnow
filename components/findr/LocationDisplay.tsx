import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import type { BasicLocation } from '../CoastalLocationDialog';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';

// Dynamically import CoastalLocationDialog with no SSR
const CoastalLocationDialog = dynamic(
  () => import('../CoastalLocationDialog'),
  { ssr: false }
);

export function LocationDisplay() {
  const router = useRouter();
  const { location, updateLocation, syncing } = useUnifiedLocation();

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [locationName, setLocationName] = useState('Set location');

  useEffect(() => {
    if (location?.rectangleLabel) {
      const cleaned = location.rectangleLabel.replace(/\s*\([^)]*\)\s*$/, '').trim();
      setLocationName(cleaned || location.rectangleLabel);
    } else if (location?.rectangleCode) {
      setLocationName(location.rectangleCode);
    }
  }, [location?.rectangleCode, location?.rectangleLabel]);

  const loadingState = useMemo(() => isLookingUp || syncing, [isLookingUp, syncing]);

  const handleLocationSave = async (location: BasicLocation) => {
    setIsLookingUp(true);

    try {
      // Look up which ICES rectangle contains this location
      const res = await fetch(
        `/api/findr/rectangle-lookup?lat=${location.lat}&lon=${location.lon}`
      );
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to find fishing area');
      }
      
      const { rectangleCode, region, distance, centerLat, centerLon } = await res.json();
      
      console.log('[LocationDisplay] Found rectangle:', {
        rectangleCode,
        region,
        distance,
        location,
      });

      const displayName =
        typeof distance === 'number' && distance > 10
          ? `${location.name} (~${Math.round(distance)}km away)`
          : location.name;

      const unified = await updateLocation({
        coordinates: { lat: centerLat, lon: centerLon },
        rectangleCode,
        rectangleRegion: region,
        rectangleLabel: displayName,
        source: 'manual',
        accuracy: typeof distance === 'number' ? distance : null,
      });

      setLocationName(displayName);

      // Close the picker
      setShowLocationPicker(false);
      
      const targetRectangle = unified?.rectangleCode ?? rectangleCode;
      
      // Only navigate if not already on conditions page
      // Otherwise the context update will trigger a re-render automatically
      if (router.pathname !== '/findr/conditions') {
        await router.push(`/findr/conditions?rectangle=${targetRectangle}`, undefined, { shallow: false });
      } else {
        // Already on conditions page - just update URL query parameter
        await router.replace(
          {
            pathname: router.pathname,
            query: { ...router.query, rectangle: targetRectangle },
          },
          undefined,
          { shallow: true }
        );
      }
      
      console.log('[LocationDisplay] Location updated successfully:', {
        rectangleCode: targetRectangle,
        region,
        pathname: router.pathname,
        navigated: router.pathname !== '/findr/conditions',
      });
    } catch (error) {
      console.error('[LocationDisplay] Failed to look up rectangle:', error);
      alert(`Could not find fishing area for this location: ${(error as Error).message}`);
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowLocationPicker(true)}
        disabled={loadingState}
        className="flex items-center gap-2 px-3 py-2 bg-base-100 hover:bg-base-200 rounded-lg border border-base-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingState ? (
          <Loader2 size={16} className="text-cyan-500 animate-spin" />
        ) : (
          <MapPin size={16} className="text-cyan-500" />
        )}
        <span className="text-sm font-medium">
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
