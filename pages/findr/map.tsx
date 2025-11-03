// pages/findr/map.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { MapContainer, TileLayer, Marker, Popup, useMap, WMSTileLayer } from 'react-leaflet';
import { LatLngExpression, Map as LeafletMap, DivIcon } from 'leaflet';
import L from 'leaflet';
import { useUnifiedLocation } from '@/context/UnifiedLocationContext';

// Fix for default markers in react-leaflet
const defaultIconPrototype = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string };
if (defaultIconPrototype._getIconUrl) {
  delete defaultIconPrototype._getIconUrl;
}
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LayerControlProps {
  activeLayer: 'clear' | 'depth' | 'seabed';
  onLayerChange: (layer: 'clear' | 'depth' | 'seabed') => void;
  depthOpacity: number;
  seabedOpacity: number;
  onDepthOpacityChange: (opacity: number) => void;
  onSeabedOpacityChange: (opacity: number) => void;
}

const LayerControls: React.FC<LayerControlProps> = ({
  activeLayer,
  onLayerChange,
  depthOpacity,
  seabedOpacity,
  onDepthOpacityChange,
  onSeabedOpacityChange
}) => {
  return (
    <div className="absolute top-4 left-4 bg-base-100/95 rounded-lg shadow-xl p-4 z-[1000] max-w-xs">
      <h3 className="font-semibold mb-3 text-sm">Map Layers</h3>

      {/* Layer toggle buttons */}
      <div className="flex gap-2 mb-4">
        <button
          className={`btn btn-xs ${activeLayer === 'clear' ? 'btn-neutral' : 'btn-ghost'}`}
          onClick={() => onLayerChange('clear')}
          type="button"
        >
          Clear
        </button>
        <button
          className={`btn btn-xs ${activeLayer === 'depth' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onLayerChange('depth')}
          type="button"
        >
          Depth
        </button>
        <button
          className={`btn btn-xs ${activeLayer === 'seabed' ? 'btn-success' : 'btn-ghost'}`}
          onClick={() => onLayerChange('seabed')}
          type="button"
        >
          Seabed
        </button>
      </div>

      {/* Opacity controls */}
      {activeLayer === 'depth' && (
        <div className="space-y-2">
          <label className="text-xs font-medium">Depth Opacity: {Math.round(depthOpacity * 100)}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={depthOpacity * 100}
            onChange={(e) => onDepthOpacityChange(Number(e.target.value) / 100)}
            className="range range-xs range-primary"
          />
        </div>
      )}

      {activeLayer === 'seabed' && (
        <div className="space-y-2">
          <label className="text-xs font-medium">Seabed Opacity: {Math.round(seabedOpacity * 100)}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={seabedOpacity * 100}
            onChange={(e) => onSeabedOpacityChange(Number(e.target.value) / 100)}
            className="range range-xs range-success"
          />
        </div>
      )}
    </div>
  );
};

interface MapLegendProps {
  activeLayer: 'clear' | 'depth' | 'seabed';
}

const MapLegend: React.FC<MapLegendProps> = ({ activeLayer }) => {
  if (activeLayer === 'clear') return null;

  return (
    <div className="absolute bottom-4 left-4 bg-base-100/95 rounded-lg shadow-xl p-4 z-[1000] max-w-xs">
      {activeLayer === 'depth' && (
        <>
          <h4 className="font-semibold mb-3 text-sm">Depth (Bathymetry)</h4>
          <div className="text-xs text-base-content/70 mb-3">
            High-resolution seafloor depth from EMODnet EBWBL
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#8B0000' }}></div>
              <span className="text-xs">0-50m</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#FF4500' }}></div>
              <span className="text-xs">50-100m</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#FFD700' }}></div>
              <span className="text-xs">100-200m</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#90EE90' }}></div>
              <span className="text-xs">200-500m</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#4169E1' }}></div>
              <span className="text-xs">500-1000m</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#000080' }}></div>
              <span className="text-xs">1000m+</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-base-300 text-xs text-base-content/60">
            Resolution: &lt;100m | Zoom: 2-14
          </div>
        </>
      )}

      {activeLayer === 'seabed' && (
        <>
          <h4 className="font-semibold mb-3 text-sm">Seabed Substrate</h4>
          <div className="text-xs text-base-content/70 mb-3">
            Seafloor composition from EMODnet Geology
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#ADD8E6' }}></div>
              <span className="text-xs font-medium">Muddy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#FFFFE0' }}></div>
              <span className="text-xs font-medium">Sandy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#A8B896' }}></div>
              <span className="text-xs font-medium">Stony</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#D8BFD8' }}></div>
              <span className="text-xs font-medium">Mixed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: '#800020' }}></div>
              <span className="text-xs font-medium">Rocky</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-base-300 text-xs text-base-content/60">
            Scale: 1:1,000,000
          </div>
        </>
      )}
    </div>
  );
};

const GeolocationButton: React.FC = () => {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleGeolocate = () => {
    setLocating(true);
    map.locate({ setView: true, maxZoom: 10 });

    map.on('locationfound', () => {
      setLocating(false);
    });

    map.on('locationerror', () => {
      setLocating(false);
      alert('Unable to get your location. Please enable location services.');
    });
  };

  return (
    <button
      className={`absolute top-4 right-4 btn btn-circle btn-sm bg-base-100 shadow-xl z-[1000] ${locating ? 'loading' : ''}`}
      onClick={handleGeolocate}
      type="button"
      title="Center map on your location"
    >
      {!locating && (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      )}
    </button>
  );
};

const ZoomControls: React.FC = () => {
  const map = useMap();

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[1000]">
      <button
        className="btn btn-circle btn-sm bg-base-100 shadow-xl"
        onClick={() => map.zoomIn()}
        type="button"
        title="Zoom in"
      >
        <span className="text-lg font-bold">+</span>
      </button>
      <button
        className="btn btn-circle btn-sm bg-base-100 shadow-xl"
        onClick={() => map.zoomOut()}
        type="button"
        title="Zoom out"
      >
        <span className="text-lg font-bold">−</span>
      </button>
    </div>
  );
};

const LocationMarker: React.FC<{ position: [number, number]; name: string }> = ({ position, name }) => {
  const locationIcon = new DivIcon({
    html: `<div style="
      background-color: #ef4444;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    className: 'custom-location-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  return (
    <Marker position={position} icon={locationIcon}>
      <Popup>
        <div className="text-sm">
          <strong>📍 {name}</strong><br />
          <span className="text-xs text-base-content/70">
            {position[0].toFixed(4)}°N, {position[1].toFixed(4)}°E
          </span>
        </div>
      </Popup>
    </Marker>
  );
};

export default function FullScreenMapPage() {
  const router = useRouter();
  const { activeLocation, findrLocation } = useUnifiedLocation();
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'clear' | 'depth' | 'seabed'>('depth');
  const [depthOpacity, setDepthOpacity] = useState(0.6);
  const [seabedOpacity, setSeabedOpacity] = useState(0.7);
  const mapRef = useRef<LeafletMap | null>(null);

  // Use findrLocation first, then activeLocation as fallback
  const userLocation = findrLocation || activeLocation;

  // Get initial coordinates from URL or context
  const initialLat = router.query.lat ? parseFloat(router.query.lat as string) : userLocation?.lat || 43.5;
  const initialLon = router.query.lon ? parseFloat(router.query.lon as string) : userLocation?.lon || -5.5;
  const initialZoom = router.query.zoom ? parseInt(router.query.zoom as string) : 8;

  useEffect(() => {
    setMapReady(true);
  }, []);

  // Update URL when map moves (for sharing)
  const handleMapMove = () => {
    if (!mapRef.current) return;

    const center = mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom();

    router.replace(
      {
        pathname: '/findr/map',
        query: {
          lat: center.lat.toFixed(4),
          lon: center.lng.toFixed(4),
          zoom: zoom.toString(),
          layer: activeLayer
        }
      },
      undefined,
      { shallow: true }
    );
  };

  if (!mapReady) {
    return (
      <div className="fixed inset-0 bg-base-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="text-base-content/60">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-base-200">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-base-100/95 shadow-lg z-[1001] flex items-center justify-between px-4">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.back()}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="ml-2">Back</span>
        </button>

        <h1 className="text-lg font-semibold">Marine Data Map</h1>

        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 top-16">
        <MapContainer
          ref={mapRef}
          center={[initialLat, initialLon] as LatLngExpression}
          zoom={initialZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={true}
          whenReady={() => {
            if (mapRef.current) {
              mapRef.current.on('moveend', handleMapMove);
            }
          }}
        >
          {/* Base layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            maxZoom={18}
          />

          {/* EBWBL Depth Layer */}
          {activeLayer === 'depth' && (
            <>
              <TileLayer
                url="https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.emodnet-bathymetry.eu/">EMODnet Bathymetry Consortium (EBWBL)</a>'
                maxZoom={14}
                minZoom={2}
                opacity={depthOpacity}
                errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
              />

              <WMSTileLayer
                url="https://ows.emodnet-bathymetry.eu/wms"
                params={{
                  layers: 'emodnet:mean_rainbowcolour',
                  format: 'image/png',
                  transparent: true,
                  version: '1.3.0'
                }}
                opacity={depthOpacity * 0.5}
                attribution='<a href="https://www.emodnet-bathymetry.eu/">EMODnet Bathymetry</a>'
              />
            </>
          )}

          {/* Seabed Substrate Layer */}
          {activeLayer === 'seabed' && (
            <WMSTileLayer
              url="https://drive.emodnet-geology.eu/geoserver/wms"
              params={{
                layers: 'seabed_substrate_1m',
                styles: 'folk_7_substrate_class',
                format: 'image/png',
                transparent: true,
                version: '1.3.0'
              }}
              opacity={seabedOpacity}
              attribution='<a href="https://emodnet.ec.europa.eu/en/geology">EMODnet Geology</a>'
            />
          )}

          {/* User location marker */}
          {userLocation && (
            <LocationMarker
              position={[userLocation.lat, userLocation.lon]}
              name="Your Location"
            />
          )}

          {/* Controls */}
          <GeolocationButton />
          <ZoomControls />
        </MapContainer>

        {/* Layer Controls */}
        <LayerControls
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          depthOpacity={depthOpacity}
          seabedOpacity={seabedOpacity}
          onDepthOpacityChange={setDepthOpacity}
          onSeabedOpacityChange={setSeabedOpacity}
        />

        {/* Legend */}
        <MapLegend activeLayer={activeLayer} />
      </div>
    </div>
  );
}
