import React, { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import type { BasicLocation } from '../CoastalLocationDialog';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import { getTodayIso } from '../../lib/date/today';

// Dynamically import CoastalLocationDialog with no SSR
const CoastalLocationDialog = dynamic(
  () => import('../CoastalLocationDialog'),
  { ssr: false }
);

export function LocationDisplay() {
  const router = useRouter();
  const { selectedCode: _selectedCode, setSelectedCode, setManualCode } = usePersistentFindrSettings({
    predictionDate: getTodayIso(),
    language: 'en',
  });
  
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Store location name in localStorage so it persists across component instances
  // (LocationDisplay is rendered twice: once for desktop, once for mobile)
  const [locationName, setLocationName] = useState(() => {
    if (typeof window === 'undefined') return 'Set location';
    return localStorage.getItem('findr_location_name') || 'Set location';
  });
  
  // Sync locationName to localStorage whenever it changes
  const updateLocationName = (name: string) => {
    setLocationName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('findr_location_name', name);
    }
  };

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
      
      const { rectangleCode, region, distance } = await res.json();
      
      console.log('[LocationDisplay] Found rectangle:', {
        rectangleCode,
        region,
        distance,
        location,
      });
      
      // Update selected code (triggers data refetch via usePersistentFindrSettings)
      // This updates localStorage and the selectedCode state
      setSelectedCode(rectangleCode);
      setManualCode(''); // Clear manual input
      
      // Update display name and persist to localStorage
      const displayName = distance && distance > 10
        ? `${location.name} (~${Math.round(distance)}km to ${region})`
        : `${location.name} (${region})`;
      updateLocationName(displayName);
      
      // Close the picker
      setShowLocationPicker(false);
      
      // Navigate to conditions page if not already there
      // Don't use router.reload() - it causes race condition with localStorage
      // The useFindrConditions hook will automatically refetch when selectedCode changes
      if (router.pathname !== '/findr/conditions') {
        await router.push('/findr/conditions');
      }
      
      console.log('[LocationDisplay] Location updated successfully:', {
        rectangleCode,
        region,
        pathname: router.pathname,
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
        disabled={isLookingUp}
        className="flex items-center gap-2 px-3 py-2 bg-base-100 hover:bg-base-200 rounded-lg border border-base-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLookingUp ? (
          <Loader2 size={16} className="text-cyan-500 animate-spin" />
        ) : (
          <MapPin size={16} className="text-cyan-500" />
        )}
        <span className="text-sm font-medium">
          {isLookingUp ? 'Finding area...' : locationName}
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
