// components/MapPicker.tsx
'use client';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap, MapContainerProps } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

declare module 'react-leaflet' {
  interface MapContainerProps {
    center: [number, number];
    zoom: number;
  }
}

interface MapPickerProps {
  homeLocation?: {
    lat: number;
    lon: number;
  };
  onSelect: (lat: number, lon: number) => void;
}

const MapPicker = ({ homeLocation, onSelect }: MapPickerProps) => {
  const [position, setPosition] = useState<[number, number]>([
    homeLocation?.lat || 43.48,
    homeLocation?.lon || -5.27,
  ]);
  const [hasClicked, setHasClicked] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (mapRef.current && homeLocation) {
      mapRef.current.setView([homeLocation.lat, homeLocation.lon], mapRef.current.getZoom());
    }
  }, [homeLocation]);

  const LocationMarker = () => {
    const map = useMap();
    
    useMapEvents({
      click(e: { latlng: { lat: number; lng: number } }) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        setPosition([lat, lon]);
        setHasClicked(true);
        onSelect(lat, lon);
      },
    });

    return position ? <Marker position={position} /> : null;
  };

  return (
    <div data-theme="wotnow" className="space-y-2">
      {!hasClicked && (
        <>
          <div className="alert alert-info py-2">
            <span>📍 Click on the map to select a location</span>
          </div>
          <div className="map-picker-crosshair relative text-center">
            <span className="text-xs text-base-content/60">🎯 Crosshair shows current centre — click to drop a pin</span>
          </div>
        </>
      )}
      
      <div className="rounded-box border border-base-300 overflow-hidden" style={{ height: '400px', width: '100%' }}>
        <MapContainer
          center={position}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
          ref={(map) => {
            if (map) {
              mapRef.current = map;
            }
          }}
        >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
          <LocationMarker />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPicker;