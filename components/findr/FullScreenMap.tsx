// components/findr/FullScreenMap.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { MapContainer, TileLayer, Marker, Popup, useMap, WMSTileLayer } from 'react-leaflet';
import { LatLngExpression, Map as LeafletMap, DivIcon } from 'leaflet';
import L from 'leaflet';
import { X } from 'lucide-react';
import { useUnifiedLocation } from '@/context/UnifiedLocationContext';
import { toast } from '@/lib/ui/toast';

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

interface FullScreenMapProps {
  initialLat: number;
  initialLon: number;
  initialZoom: number;
  initialLayer: 'clear' | 'depth' | 'seabed';
}

interface LayerControlProps {
  activeLayer: 'clear' | 'depth' | 'seabed';
  onLayerChange: (layer: 'clear' | 'depth' | 'seabed') => void;
}

const LayerControls: React.FC<LayerControlProps> = ({
  activeLayer,
  onLayerChange
}) => {
  return (
    <div className="absolute top-2 left-2 bg-base-100/95 rounded-lg shadow-xl p-2 sm:p-3 z-[1000]">
      {/* Layer toggle buttons */}
      <div className="flex gap-1 sm:gap-2">
        <button
          className={`btn btn-xs ${activeLayer === 'clear' ? 'btn-neutral' : 'btn-ghost'} px-2 sm:px-3 min-h-[24px] h-6`}
          onClick={() => onLayerChange('clear')}
          type="button"
          title="Clear overlay"
        >
          <X className="h-3 w-3" />
        </button>
        <button
          className={`btn btn-xs ${activeLayer === 'depth' ? 'btn-primary' : 'btn-ghost'} px-2 sm:px-3 min-h-[24px] h-6`}
          onClick={() => onLayerChange('depth')}
          type="button"
        >
          <span className="text-[10px] sm:text-xs">Depth</span>
        </button>
        <button
          className={`btn btn-xs ${activeLayer === 'seabed' ? 'btn-success' : 'btn-ghost'} px-2 sm:px-3 min-h-[24px] h-6`}
          onClick={() => onLayerChange('seabed')}
          type="button"
        >
          <span className="text-[10px] sm:text-xs">Seabed</span>
        </button>
      </div>
    </div>
  );
};

interface MapLegendProps {
  activeLayer: 'clear' | 'depth' | 'seabed';
}

const MapLegend: React.FC<MapLegendProps> = ({ activeLayer }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (activeLayer === 'clear') return null;

  return (
    <div className="absolute bottom-2 left-2 bg-base-100/95 rounded-lg shadow-xl p-2 sm:p-3 z-[1000] max-w-[160px] sm:max-w-xs">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2"
        type="button"
      >
        <h4 className="font-semibold text-[10px] sm:text-sm text-base-content">
          {activeLayer === 'depth' ? 'Depth' : 'Seabed'}
        </h4>
        <span className="text-[10px] sm:text-xs text-base-content">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <>
          {activeLayer === 'depth' && (
            <>
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#8B0000' }}></div>
                  <span className="text-[9px] sm:text-xs">0-50m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#FF4500' }}></div>
                  <span className="text-[9px] sm:text-xs">50-100m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#FFD700' }}></div>
                  <span className="text-[9px] sm:text-xs">100-200m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#90EE90' }}></div>
                  <span className="text-[9px] sm:text-xs">200-500m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#4169E1' }}></div>
                  <span className="text-[9px] sm:text-xs">500-1000m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#000080' }}></div>
                  <span className="text-[9px] sm:text-xs">1000m+</span>
                </div>
              </div>
            </>
          )}

          {activeLayer === 'seabed' && (
            <>
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#ADD8E6' }}></div>
                  <span className="text-[9px] sm:text-xs font-medium text-base-content">Muddy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#FFFFE0' }}></div>
                  <span className="text-[9px] sm:text-xs font-medium text-base-content">Sandy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#A8B896' }}></div>
                  <span className="text-[9px] sm:text-xs font-medium text-base-content">Stony</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#D8BFD8' }}></div>
                  <span className="text-[9px] sm:text-xs font-medium text-base-content">Mixed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: '#800020' }}></div>
                  <span className="text-[9px] sm:text-xs font-medium text-base-content">Rocky</span>
                </div>
              </div>
            </>
          )}
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
      toast.error('Unable to get your location. Please enable location services.');
    });
  };

  return (
    <button
      className={`absolute top-24 right-4 btn btn-circle bg-base-100 shadow-xl z-[1000] min-w-[56px] min-h-[56px] ${locating ? 'loading' : ''}`}
      onClick={handleGeolocate}
      type="button"
      title="Center map on your location"
    >
      {!locating && (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
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
      background-color: #3b82f6;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6), 0 0 0 8px rgba(59,130,246,0.2);
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    "></div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.9; }
      }
    </style>`,
    className: 'custom-location-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
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

export default function FullScreenMap({ initialLat, initialLon, initialZoom, initialLayer }: FullScreenMapProps) {
  const router = useRouter();
  const { activeLocation, findrLocation } = useUnifiedLocation();
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'clear' | 'depth' | 'seabed'>(initialLayer);
  const mapRef = useRef<LeafletMap | null>(null);

  // Use findrLocation first, then activeLocation as fallback
  const userLocation = findrLocation || activeLocation;

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
      {/* Close button - mobile optimized, top-right */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 right-4 z-[1002] btn btn-circle bg-red-600 border-4 border-white text-white hover:bg-red-700 min-w-[72px] min-h-[72px] shadow-2xl sm:min-w-[64px] sm:min-h-[64px]"
        type="button"
        title="Close map"
      >
        <X className="w-10 h-10 sm:w-8 sm:h-8 stroke-[3]" />
      </button>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-base-100/95 shadow-lg z-[1001] flex items-center justify-center px-4">
        <h1 className="text-lg font-semibold">Marine Data Map</h1>
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
                attribution='© <a href="https://www.emodnet-bathymetry.eu/">EMODnet (EBWBL)</a>'
                maxZoom={14}
                minZoom={2}
                opacity={1.0}
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
                opacity={0.5}
                attribution='<a href="https://www.emodnet-bathymetry.eu/">EMODnet Bathymetry</a>'
              />
            </>
          )}

          {/* Seabed Substrate Layer - Using proper namespace */}
          {activeLayer === 'seabed' && (
            <WMSTileLayer
              url="https://drive.emodnet-geology.eu/geoserver/wms"
              params={{
                layers: 'gtk:seabed_substrate_1m',
                styles: 'folk_7_substrate_class',
                format: 'image/png',
                transparent: true,
                version: '1.3.0'
              }}
              opacity={1.0}
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
        />

        {/* Legend */}
        <MapLegend activeLayer={activeLayer} />
      </div>
    </div>
  );
}
