import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { BasicLocation } from '../CoastalLocationDialog';

// Dynamically import CoastalLocationDialog with no SSR
const CoastalLocationDialog = dynamic(
  () => import('../CoastalLocationDialog'),
  { ssr: false }
);

export function LocationDisplay() {
  const [locationName, setLocationName] = useState('Set location');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleLocationSave = (location: BasicLocation) => {
    setLocationName(location.name);
    setShowLocationPicker(false);
  };

  return (
    <>
      <button
        onClick={() => setShowLocationPicker(true)}
        className="flex items-center gap-2 px-3 py-2 bg-base-100 hover:bg-base-200 rounded-lg border border-base-300 transition-colors"
      >
        <MapPin size={16} className="text-cyan-500" />
        <span className="text-sm font-medium">{locationName}</span>
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
