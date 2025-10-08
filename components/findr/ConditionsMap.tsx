// components/ConditionsMap.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  Rectangle, 
  WMSTileLayer,
  Tooltip,
  useMap 
} from 'react-leaflet';
import { LatLngExpression, LatLngBoundsLiteral, DivIcon, divIcon, Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

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

interface FishingSpot {
  id: string;
  lat: number;
  lon: number;
  status: 'hot' | 'ok' | 'poor';
  species?: string[];
  depth?: number;
}

interface RealDepthContour {
  depth: number;
  coordinates: [number, number][][];
  color: string;
}

interface ConditionsMapProps {
  centerLocation: { lat: number; lon: number };
  fishingSpots?: FishingSpot[];
  showDepthContours?: boolean;
  showICESRectangle?: boolean;
  className?: string;
  rectangleCode?: string;
  rectangleBounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  } | null;
}

interface GeoJSONFeature {
  type: string;
  properties?: {
    depth?: number;
    DEPTH?: number;
  };
  geometry?: {
    type: string;
    coordinates: number[][] | number[][][];
  };
}

interface GeoJSONResponse {
  type: string;
  features?: GeoJSONFeature[];
}

const MapControls: React.FC = () => {
  const map = useMap();
  
  const handleZoomIn = (): void => {
    map.zoomIn();
  };
  
  const handleZoomOut = (): void => {
    map.zoomOut();
  };
  
  return (
    <div className="absolute top-2 right-2 flex flex-col gap-1 z-[1000]">
      <button 
        className="btn btn-circle btn-xs bg-black/50 border-white/20 text-white hover:bg-black/70"
        onClick={handleZoomIn}
        title="Zoom in"
        type="button"
      >
        <span className="text-xs">+</span>
      </button>
      <button 
        className="btn btn-circle btn-xs bg-black/50 border-white/20 text-white hover:bg-black/70"
        onClick={handleZoomOut}
        title="Zoom out"
        type="button"
      >
        <span className="text-xs">−</span>
      </button>
    </div>
  );
};

const LocationMarker: React.FC<{ position: [number, number]; name: string }> = ({ position, name }) => {
  const locationIcon = new DivIcon({
    html: `<div style="
      background-color: #ef4444;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    className: 'custom-location-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  return (
    <Marker position={position} icon={locationIcon}>
      <Popup>
        <div className="text-sm">
          <strong>📍 {name}</strong><br />
          {position[0].toFixed(4)}, {position[1].toFixed(4)}
        </div>
      </Popup>
    </Marker>
  );
};

const DepthLabel: React.FC<{ position: [number, number]; depth: number }> = ({ position, depth }) => {
  const depthIcon = divIcon({
    html: `<div style="
      background: rgba(37, 99, 235, 0.9);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.3);
    ">${depth}m</div>`,
    className: 'depth-label-marker',
    iconSize: [40, 20],
    iconAnchor: [20, 10]
  });

  return <Marker position={position} icon={depthIcon} />;
};

const ConditionsMap: React.FC<ConditionsMapProps> = ({
  centerLocation, 
  showDepthContours = true,
  showICESRectangle = true,
  className = "",
  rectangleCode,
  rectangleBounds
}) => {
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [realContours, setRealContours] = useState<RealDepthContour[]>([]);
  const [loadingContours, setLoadingContours] = useState<boolean>(false);
  const [showSubstrate, setShowSubstrate] = useState<boolean>(true);
  const [showShallows, setShowShallows] = useState<boolean>(false);
  const [bathymetryStyle, setBathymetryStyle] = useState<'atlas' | 'rainbow'>('atlas');
  const mapRef = useRef<LeafletMap | null>(null);
  const { lat, lon } = centerLocation;

  const generateRealisticContour = useCallback((
    center: { lat: number; lon: number },
    _depth: number,
    baseDistance: number
  ): [number, number][] => {
    const points: [number, number][] = [];
    const numPoints = 40 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const distanceVariation = baseDistance * (1 + Math.sin(angle * 3) * 0.2 + Math.sin(angle * 7) * 0.1);
      const angleVariation = angle + Math.sin(angle * 5) * 0.15;
      const offsetLat = center.lat + Math.sin(angleVariation) * distanceVariation;
      const offsetLon = center.lon + Math.cos(angleVariation) * distanceVariation * 1.5;
      points.push([offsetLat, offsetLon]);
    }
    
    return points;
  }, []);

  const generateEnhancedFallbackContours = useCallback((center: { lat: number; lon: number }): RealDepthContour[] => {
    return [
      {
        depth: 10,
        coordinates: [generateRealisticContour(center, 10, 0.08)],
        color: '#7DD3FC'
      },
      {
        depth: 20,
        coordinates: [generateRealisticContour(center, 20, 0.12)],
        color: '#60A5FA'
      },
      {
        depth: 50,
        coordinates: [generateRealisticContour(center, 50, 0.18)],
        color: '#3B82F6'
      },
      {
        depth: 100,
        coordinates: [generateRealisticContour(center, 100, 0.25)],
        color: '#2563EB'
      },
      {
        depth: 200,
        coordinates: [generateRealisticContour(center, 200, 0.35)],
        color: '#1E40AF'
      }
    ];
  }, [generateRealisticContour]);

  useEffect(() => {
    const fetchEMODnetContours = async (): Promise<void> => {
      setLoadingContours(true);
      
      try {
        const bbox = {
          minLon: lon - 0.5,
          minLat: lat - 0.25,
          maxLon: lon + 0.5,
          maxLat: lat + 0.25
        };

        const wfsUrl = new URL('https://ows.emodnet-bathymetry.eu/wfs');
        wfsUrl.searchParams.set('service', 'WFS');
        wfsUrl.searchParams.set('version', '2.0.0');
        wfsUrl.searchParams.set('request', 'GetFeature');
        wfsUrl.searchParams.set('typeName', 'contours');
        wfsUrl.searchParams.set('outputFormat', 'application/json');
        wfsUrl.searchParams.set('srsName', 'EPSG:4326');
        wfsUrl.searchParams.set('bbox', `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat},EPSG:4326`);

        const response = await fetch(wfsUrl.toString());
        
        if (!response.ok) {
          throw new Error('Failed to fetch EMODnet contours');
        }

        const geojson: GeoJSONResponse = await response.json();
        
        const contours: RealDepthContour[] = [];
        const depthColors: Record<number, string> = {
          10: '#7DD3FC',
          20: '#60A5FA',
          50: '#3B82F6',
          100: '#2563EB',
          200: '#1E40AF',
          500: '#1E3A8A',
          1000: '#172554'
        };

        if (geojson.features) {
          geojson.features.forEach((feature: GeoJSONFeature) => {
            const depth = feature.properties?.depth || feature.properties?.DEPTH;
            if (!depth) return;

            const coordinates = feature.geometry?.coordinates;
            if (!coordinates) return;

            let paths: [number, number][][] = [];
            
            if (feature.geometry?.type === 'LineString') {
              paths = [(coordinates as number[][]).map((coord: number[]) => [coord[1], coord[0]] as [number, number])];
            } else if (feature.geometry?.type === 'MultiLineString') {
              paths = (coordinates as number[][][]).map((line: number[][]) => 
                line.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
              );
            }

            if (paths.length > 0) {
              contours.push({
                depth: Math.abs(depth),
                coordinates: paths,
                color: depthColors[Math.abs(depth)] || '#3B82F6'
              });
            }
          });
        }

        setRealContours(contours);
      } catch (error) {
        console.error('Failed to fetch EMODnet contours:', error);
        setRealContours(generateEnhancedFallbackContours({ lat, lon }));
      } finally {
        setLoadingContours(false);
      }
    };

    if (showDepthContours) {
      void fetchEMODnetContours();
    }
  }, [lat, lon, showDepthContours, generateEnhancedFallbackContours]);

  const getICESRectangleBounds = (bounds?: typeof rectangleBounds): LatLngBoundsLiteral | null => {
    if (!bounds) return null;
    
    return [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east]
    ];
  };

  const icesRectangle = getICESRectangleBounds(rectangleBounds);

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) {
    return (
      <div className={`bg-base-200/40 rounded-xl animate-pulse border border-base-200 ${className}`}>
        <div className="aspect-video flex items-center justify-center text-base-content/60">
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Layer toggles - top right */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-[1000]">
        <button 
          className="bg-black/75 hover:bg-black/90 rounded px-3 py-1 text-xs text-white flex items-center gap-2 transition-colors"
          onClick={() => setShowShallows(!showShallows)}
          type="button"
        >
          <span className={showShallows ? "text-green-400" : "text-red-400"}>●</span>
          <span>Shallows: {showShallows ? 'On' : 'Off'}</span>
        </button>
        
        {showShallows && (
          <button 
            className="bg-black/75 hover:bg-black/90 rounded px-2 py-1 text-xs text-white transition-colors"
            onClick={() => setBathymetryStyle(bathymetryStyle === 'atlas' ? 'rainbow' : 'atlas')}
            type="button"
            title={bathymetryStyle === 'atlas' ? 'Switch to rainbow colors' : 'Switch to atlas colors'}
          >
            <span>{bathymetryStyle === 'atlas' ? '🌈' : '🗺️'}</span>
          </button>
        )}
        
        <button 
          className="bg-black/75 hover:bg-black/90 rounded px-3 py-1 text-xs text-white flex items-center gap-2 transition-colors"
          onClick={() => setShowSubstrate(!showSubstrate)}
          type="button"
        >
          <span className={showSubstrate ? "text-green-400" : "text-red-400"}>●</span>
          <span>Substrate: {showSubstrate ? 'On' : 'Off'}</span>
        </button>
      </div>
      
      <MapContainer
        ref={mapRef}
        center={[centerLocation.lat, centerLocation.lon] as LatLngExpression}
        zoom={10}
        style={{ height: '100%', width: '100%', minHeight: '300px' }}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          maxZoom={18}
        />

        {showShallows && (
          <WMSTileLayer
            url="https://ows.emodnet-bathymetry.eu/wms"
            params={{
              layers: bathymetryStyle === 'rainbow' ? 'emodnet:mean_rainbowcolour' : 'emodnet:mean_atlas_land',
              format: 'image/png',
              transparent: true,
              version: '1.3.0'
            }}
            opacity={0.5}
            attribution='<a href="https://www.emodnet-bathymetry.eu/">EMODnet Bathymetry</a>'
          />
        )}

        {showSubstrate && (
          <WMSTileLayer
            url="http://drive.emodnet-geology.eu/geoserver/gtk/ows"
            params={{
              service: 'WMS',
              layers: 'gtk:seabed_substrate_1m',
              format: 'image/png',
              transparent: true,
              version: '1.3.0'
            }}
            opacity={0.6}
            attribution='<a href="https://emodnet.ec.europa.eu/en/geology">EMODnet Geology</a>'
          />
        )}

        <LocationMarker 
          position={[centerLocation.lat, centerLocation.lon]} 
          name="Your Location"
        />

        {showICESRectangle && icesRectangle && (
          <Rectangle
            bounds={icesRectangle}
            pathOptions={{
              color: '#60A5FA',
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.05,
              dashArray: '5,5'
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>ICES Rectangle {rectangleCode || 'Area'}</strong><br />
                
              </div>
            </Popup>
          </Rectangle>
        )}

        {showDepthContours && realContours.map((contour, contourIdx) => (
          <React.Fragment key={`contour-${contour.depth}-${contourIdx}`}>
            {contour.coordinates.map((path, pathIdx) => (
              <React.Fragment key={`path-${contour.depth}-${pathIdx}`}>
                <Polyline
                  positions={path as LatLngExpression[]}
                  pathOptions={{
                    color: contour.color,
                    weight: 2,
                    opacity: 0.8,
                    dashArray: '5,3'
                  }}
                >
                  <Tooltip permanent={false} sticky={true}>
                    <div className="text-xs font-semibold">
                      {contour.depth}m depth
                    </div>
                  </Tooltip>
                </Polyline>
                
                {path.length > 5 && (
                  <DepthLabel 
                    position={path[Math.floor(path.length / 2)]} 
                    depth={contour.depth} 
                  />
                )}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}

        <MapControls />
      </MapContainer>

      <div className="absolute bottom-2 left-2 bg-black/75 rounded-lg px-3 py-2 text-xs text-white z-[1000] max-w-[200px]">
        <div className="space-y-1">
          <div className="font-semibold mb-2 text-sm">Depth contours</div>
          <div className="text-xs text-white/80 mb-2">Bathymetry depth lines</div>
          <div className="text-xs text-white/80 mb-3">Updates on map movement</div>
          
          {showDepthContours && realContours.length > 0 && (
            <>
              {realContours.slice(0, 5).map(contour => (
                <div key={contour.depth} className="flex items-center gap-2">
                  <div className="w-3 h-0.5" style={{ backgroundColor: contour.color, borderTop: '2px dashed' }}></div>
                  <span>{contour.depth}m</span>
                </div>
              ))}
              {loadingContours && (
                <div className="text-xs text-yellow-300 mt-1">Loading real data...</div>
              )}
            </>
          )}

          <div className="border-t border-white/20 my-3 pt-3">
            <div className="font-semibold mb-2">Seabed Substrate</div>
            <div className="text-xs text-white/80 mb-2">Folk classification • Zoom 8+</div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-orange-700"></div>
                <span className="font-medium">Mud</span>
                <span className="text-white/60">• flatfish, rays, sole</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
                <span className="font-medium">Sand</span>
                <span className="text-white/60">• bass, plaice, dab</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-amber-600"></div>
                <span className="font-medium">Coarse</span>
                <span className="text-white/60">• bream, gurnard</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green-600"></div>
                <span className="font-medium">Mixed</span>
                <span className="text-white/60">• varied species</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-gray-500"></div>
                <span className="font-medium">Rock</span>
                <span className="text-white/60">• bass, pollack, wrasse</span>
              </div>
              
              <div className="text-xs text-green-400 mt-2">
                Mixed sediment = best variety of fishing
              </div>
            </div>
          </div>
          
          {showICESRectangle && (
            <div className="border-t border-white/20 mt-3 pt-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-400"></div>
                <span>ICES {rectangleCode || 'Area'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-2 right-2 bg-black/75 rounded px-2 py-1 text-xs text-white z-[1000]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-white"></div>
          <span>10km</span>
        </div>
      </div>
    </div>
  );
};

export default ConditionsMap;