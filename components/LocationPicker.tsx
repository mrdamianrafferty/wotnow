// components/LocationPicker.tsx
"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { detectUserLocation, findNearestRectangles } from '../lib/findr/locationDetection';
import { useFindrRectangleOptions } from '../hooks/useFindrRectangleOptions';
import { useUnifiedLocation } from '../context/UnifiedLocationContext';

export function LocationPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const autodetectAttempted = useRef(false);

  const { options: rectangleOptions } = useFindrRectangleOptions([]);
  const { location, updateLocation, syncing } = useUnifiedLocation();

  const currentRectangle = location?.rectangleCode ?? null;
  const currentSource = location?.source ?? null;

  const currentLabel = useMemo(() => {
    if (location?.rectangleLabel) return location.rectangleLabel;
    if (!currentRectangle) return null;
    const match = rectangleOptions.find(option => option.code === currentRectangle);
    if (match) {
      return `${match.code} - ${match.region}`;
    }
    return currentRectangle;
  }, [currentRectangle, location?.rectangleLabel, rectangleOptions]);

  // Auto-detect IP location if no location has been stored yet
  useEffect(() => {
    if (autodetectAttempted.current) return;
    if (currentRectangle) return;
    if (rectangleOptions.length === 0) return;

    autodetectAttempted.current = true;

    const autoDetect = async () => {
      try {
        setIsDetecting(true);
        const ipLocation = await detectUserLocation('ip');
        if (!ipLocation) return;

        const nearest = findNearestRectangles(ipLocation, rectangleOptions);
        if (!nearest) return;

          await updateLocation({
            coordinates: { lat: ipLocation.latitude, lon: ipLocation.longitude },
            rectangleCode: nearest.primary.code,
            rectangleRegion: nearest.primary.region,
            rectangleLabel: `${nearest.primary.code} - ${nearest.primary.region}`,
            source: 'ip',
            accuracy: ipLocation.accuracy ?? 10000,
          });
      } catch (error) {
        console.warn('[LocationPicker] Auto-detect failed', error);
      } finally {
        setIsDetecting(false);
      }
    };

    void autoDetect();
  }, [currentRectangle, rectangleOptions, updateLocation]);

  const requestGPSLocation = useCallback(async () => {
    try {
      setIsDetecting(true);
      const gpsLocation = await detectUserLocation('gps');

      if (gpsLocation && rectangleOptions.length > 0) {
        const nearest = findNearestRectangles(gpsLocation, rectangleOptions);
        if (nearest) {
          await updateLocation({
            coordinates: { lat: gpsLocation.latitude, lon: gpsLocation.longitude },
            rectangleCode: nearest.primary.code,
            rectangleRegion: nearest.primary.region,
            rectangleLabel: `${nearest.primary.code} - ${nearest.primary.region}`,
            source: 'gps',
            accuracy: gpsLocation.accuracy ?? 10,
          });
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error('[LocationPicker] GPS location failed', error);
      alert('Location access denied or unavailable');
    } finally {
      setIsDetecting(false);
    }
  }, [rectangleOptions, updateLocation]);

  const selectRectangle = useCallback(async (rectangleCode: string) => {
    const rectangle = rectangleOptions.find(r => r.code === rectangleCode);
    if (rectangle) {
        await updateLocation({
          coordinates: { lat: rectangle.centerLat, lon: rectangle.centerLon },
          rectangleCode: rectangle.code,
          rectangleRegion: rectangle.region,
          rectangleLabel: `${rectangle.code} - ${rectangle.region}`,
          source: 'manual',
          accuracy: rectangle.distanceToShoreKm ?? null,
        });
      setIsOpen(false);
    }
  }, [rectangleOptions, updateLocation]);

  const getLocationDisplay = useMemo(() => {
    if (currentLabel) return currentLabel;
    return currentRectangle ?? 'Location';
  }, [currentLabel, currentRectangle]);

  const getLocationIcon = () => {
    if (isDetecting || syncing) return '⏳';

    switch (currentSource) {
      case 'gps': return '📍'; // Precise GPS
      case 'manual': return '🗺️'; // User selected
      case 'ip': return '🌐'; // IP detected
      default: return '📌'; // Default
    }
  };

  return (
    <div className="relative">
      {/* Location Button */}
      <button
        data-testid="location-button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
        style={{ color: '#374151' }}
        title={`Current location: ${getLocationDisplay}`}
      >
        <span className="text-lg">{getLocationIcon()}</span>
        <span className="hidden sm:block truncate max-w-32">
          {currentRectangle || 'Location'}
        </span>
        <span className="text-xs" style={{ color: '#6b7280' }}>▼</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Choose Your Fishing Area</h3>
            
            {/* Current Location Display */}
            {currentRectangle && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">{getLocationDisplay}</p>
                    <p className="text-xs text-blue-600">
                      {currentSource === 'gps' && 'GPS detected'}
                      {currentSource === 'ip' && 'IP detected'}
                      {currentSource === 'manual' && 'Manually selected'}
                    </p>
                  </div>
                  <span className="text-xl">{getLocationIcon()}</span>
                </div>
              </div>
            )}

            {/* GPS Option */}
            <button
              onClick={requestGPSLocation}
              disabled={isDetecting || syncing}
              className="w-full p-3 mb-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">📍 Use GPS Location</p>
                  <p className="text-xs text-gray-600">Most accurate for your current position</p>
                </div>
                {(isDetecting || syncing) && <span className="text-sm">⏳</span>}
              </div>
            </button>

            {/* Popular Rectangles */}
            <div className="border-t pt-3 mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Popular Fishing Areas:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {rectangleOptions.slice(0, 10).map((rectangle) => (
                  <button
                    key={rectangle.code}
                    onClick={() => selectRectangle(rectangle.code)}
                    className={`w-full p-2 text-left rounded hover:bg-gray-50 ${
                      currentRectangle === rectangle.code ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{rectangle.code} - {rectangle.label}</p>
                        <p className="text-xs text-gray-600">{rectangle.region}</p>
                      </div>
                      {rectangle.distanceToShoreKm && (
                        <span className="text-xs text-gray-500">{rectangle.distanceToShoreKm}km from shore</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
