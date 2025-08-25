// components/MapPicker.tsx
'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState } from 'react';

const MapPicker = ({ homeLocation, onSelect }) => {
  const [position, setPosition] = useState(null);
  const [hasClicked, setHasClicked] = useState(false);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        setPosition({ lat, lon });
        setHasClicked(true);
        onSelect(lat, lon);
      },
    });

    return position ? <Marker position={[position.lat, position.lon]} /> : null;
  };

  return (
    <div className="map-picker-container">
      {!hasClicked && (
        <div className="map-picker-instructions">
          📍 Click on the map to select a location
        </div>
      )}
      {!hasClicked && <div className="map-picker-crosshair"></div>}
      
      <MapContainer
        center={[homeLocation?.lat || 43.48, homeLocation?.lon || -5.27]}
        zoom={8}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <LocationMarker />
      </MapContainer>
    </div>
  );
};

export default MapPicker;