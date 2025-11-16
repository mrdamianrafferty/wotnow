import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { loadGoogleMapsAPI } from '../../lib/grow/googleMaps';

type GoogleMarker = google.maps.Marker;

type LeafletMap = {
  on: (event: string, handler: (event: unknown) => void) => void;
  remove?: () => void;
};

type LeafletMarker = {
  setLatLng: (coords: [number, number]) => void;
};

declare global {
  interface Window {
    google: typeof google;
    __googleMapsPermissionError?: boolean;
  }
}

interface MapPickerProps {
  homeLocation?: { lat: number; lon: number };
  onSelect: (lat: number, lon: number) => void;
}

export function MapPicker({ homeLocation, onSelect }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | LeafletMap | null>(null);
  const markerRef = useRef<GoogleMarker | LeafletMarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapType, setMapType] = useState<'google' | 'leaflet' | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      const hasPermissionError = Boolean(window.__googleMapsPermissionError);

      if (hasPermissionError) {
        console.log('Google Maps permission error detected, using OpenStreetMap');
        await initLeafletMap();
        return;
      }

      try {
        await loadGoogleMapsAPI();

        if (window.__googleMapsPermissionError) {
          console.log('Google Maps permission error occurred during load, using OpenStreetMap');
          await initLeafletMap();
          return;
        }

        const center = homeLocation
          ? { lat: homeLocation.lat, lng: homeLocation.lon }
          : { lat: 48.8566, lng: 2.3522 };

        const map = new window.google.maps.Map(mapRef.current!, {
          center,
          zoom: homeLocation ? 12 : 6,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
        });

        if (!isMounted) {
          return;
        }

        mapInstanceRef.current = map;
        setMapType('google');

        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) {
            return;
          }

          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          if (markerRef.current instanceof window.google.maps.Marker) {
            markerRef.current.setPosition(event.latLng);
          } else {
            markerRef.current = new window.google.maps.Marker({
              position: event.latLng,
              map,
              title: 'Selected location',
            });
          }

          onSelect(lat, lng);
        });

        if (homeLocation) {
          markerRef.current = new window.google.maps.Marker({
            position: center,
            map,
            title: 'Home location',
          });
        }

        setIsLoading(false);
      } catch (_error) {
        console.log('Google Maps not available, falling back to OpenStreetMap');
        await initLeafletMap();
      }
    };

    const initLeafletMap = async () => {
      try {
        const L = await import('leaflet');

        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (
          mapInstanceRef.current &&
          typeof (mapInstanceRef.current as LeafletMap).remove === 'function'
        ) {
          try {
            ((mapInstanceRef.current as LeafletMap).remove as () => void)();
          } catch (removeError) {
            console.warn('Error removing existing map:', removeError);
          }
          mapInstanceRef.current = null;
        }

        if (mapRef.current) {
          (mapRef.current as unknown as { _leaflet_id?: string })._leaflet_id = undefined;
        }

        const center: [number, number] = homeLocation
          ? [homeLocation.lat, homeLocation.lon]
          : [48.8566, 2.3522];

        const map = L.map(mapRef.current!, {
          center,
          zoom: homeLocation ? 12 : 6,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        if (!isMounted) {
          return;
        }

        mapInstanceRef.current = map;
        setMapType('leaflet');

        map.on('click', (event: unknown) => {
          const finalEvent = event as { latlng: { lat: number; lng: number } };
          const lat = finalEvent.latlng.lat;
          const lng = finalEvent.latlng.lng;

          if (markerRef.current && 'setLatLng' in markerRef.current) {
            (markerRef.current as LeafletMarker).setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng]).addTo(map);
          }

          onSelect(lat, lng);
        });

        if (homeLocation) {
          markerRef.current = L.marker(center).addTo(map);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize Leaflet map:', error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        if (mapType === 'leaflet') {
          const leafletMap = mapInstanceRef.current as LeafletMap;
          if (typeof leafletMap.remove === 'function') {
            leafletMap.remove();
          }
        }
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, [homeLocation, onSelect, mapType]);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      {!isLoading && (
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg border shadow-sm z-[1000]">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Click on the map to select a location
          </p>
          {mapType === 'leaflet' && (
            <p className="text-xs text-blue-600 mt-1">Using OpenStreetMap</p>
          )}
        </div>
      )}
    </div>
  );
}
