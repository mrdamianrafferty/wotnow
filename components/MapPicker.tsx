// components/MapPicker.tsx
'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState } from 'react';

const MapPicker = ({ homeLocation, onSelect }) => {
  const [position, setPosition] = useState(null);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        setPosition({ lat, lon });
        onSelect(lat, lon);
      },
    });

    return position ? <Marker position={[position.lat, position.lon]} /> : null;
  };

  return (
    <MapContainer
      center={[homeLocation?.lat || 43.48, homeLocation?.lon || -5.27]}
      zoom={8}
      style={{ height: '400px', width: '100%', borderRadius: '8px', marginBottom: '16px' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      <LocationMarker />
    </MapContainer>
  );
};

export default MapPicker;