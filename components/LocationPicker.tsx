// components/LocationPicker.tsx
"use client";

import { useState, useEffect } from 'react';
import { detectUserLocation, findNearestRectangles } from '../lib/findr/locationDetection';
import { useFindrRectangleOptions } from '../hooks/useFindrRectangleOptions';

interface LocationState {
  selectedRectangle: string | null;
  detectedLocation: { lat: number; lon: number } | null;
  isLoading: boolean;
  source: 'ip' | 'gps' | 'manual' | null;
}

export function LocationPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState<LocationState>({
    selectedRectangle: null,
    detectedLocation: null,
    isLoading: false,
    source: null
  });

  const { options: rectangleOptions } = useFindrRectangleOptions([]);

  // Auto-detect IP location on mount
  useEffect(() => {
    const autoDetectLocation = async () => {
      try {
        setLocation(prev => ({ ...prev, isLoading: true }));
        
        // Try to get stored location first
        const stored = localStorage.getItem('findr-user-location');
        if (stored) {
          const storedLocation = JSON.parse(stored);
          setLocation(prev => ({
            ...prev,
            selectedRectangle: storedLocation.rectangleCode,
            detectedLocation: storedLocation.coordinates,
            source: storedLocation.source,
            isLoading: false
          }));
          return;
        }

        // Fallback to IP detection
        const ipLocation = await detectUserLocation('ip');
        if (ipLocation && rectangleOptions.length > 0) {
          const nearest = findNearestRectangles(ipLocation, rectangleOptions);
          if (nearest) {
            const locationData = {
              rectangleCode: nearest.primary.code,
              coordinates: { lat: ipLocation.latitude, lon: ipLocation.longitude },
              source: 'ip',
              timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('findr-user-location', JSON.stringify(locationData));
            setLocation({
              selectedRectangle: nearest.primary.code,
              detectedLocation: { lat: ipLocation.latitude, lon: ipLocation.longitude },
              source: 'ip',
              isLoading: false
            });
          }
        }
      } catch (error) {
        console.warn('Auto location detection failed:', error);
      } finally {
        setLocation(prev => ({ ...prev, isLoading: false }));
      }
    };

    if (rectangleOptions.length > 0) {
      autoDetectLocation();
    }
  }, [rectangleOptions]);

  const requestGPSLocation = async () => {
    try {
      setLocation(prev => ({ ...prev, isLoading: true }));
      const gpsLocation = await detectUserLocation('gps');
      
      if (gpsLocation && rectangleOptions.length > 0) {
        const nearest = findNearestRectangles(gpsLocation, rectangleOptions);
        if (nearest) {
          const locationData = {
            rectangleCode: nearest.primary.code,
            coordinates: { lat: gpsLocation.latitude, lon: gpsLocation.longitude },
            source: 'gps',
            timestamp: new Date().toISOString()
          };
          
          localStorage.setItem('findr-user-location', JSON.stringify(locationData));
          setLocation({
            selectedRectangle: nearest.primary.code,
            detectedLocation: { lat: gpsLocation.latitude, lon: gpsLocation.longitude },
            source: 'gps',
            isLoading: false
          });
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error('GPS location failed:', error);
      alert('Location access denied or unavailable');
    } finally {
      setLocation(prev => ({ ...prev, isLoading: false }));
    }
  };

  const selectRectangle = (rectangleCode: string) => {
    const rectangle = rectangleOptions.find(r => r.code === rectangleCode);
    if (rectangle) {
      const locationData = {
        rectangleCode,
        coordinates: { lat: rectangle.centerLat, lon: rectangle.centerLon },
        source: 'manual',
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('findr-user-location', JSON.stringify(locationData));
      setLocation({
        selectedRectangle: rectangleCode,
        detectedLocation: { lat: rectangle.centerLat, lon: rectangle.centerLon },
        source: 'manual',
        isLoading: false
      });
      setIsOpen(false);
    }
  };

  const getLocationDisplay = () => {
    if (!location.selectedRectangle) return 'Location';
    
    const rectangle = rectangleOptions.find(r => r.code === location.selectedRectangle);
    return rectangle ? `${rectangle.code} - ${rectangle.region}` : location.selectedRectangle;
  };

  const getLocationIcon = () => {
    if (location.isLoading) return '⏳';
    
    switch (location.source) {
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
        title={`Current location: ${getLocationDisplay()}`}
      >
        <span className="text-lg">{getLocationIcon()}</span>
        <span className="hidden sm:block truncate max-w-32">
          {location.selectedRectangle || 'Location'}
        </span>
        <span className="text-xs text-gray-500">▼</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Choose Your Fishing Area</h3>
            
            {/* Current Location Display */}
            {location.selectedRectangle && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">{getLocationDisplay()}</p>
                    <p className="text-xs text-blue-600">
                      {location.source === 'gps' && 'GPS detected'}
                      {location.source === 'ip' && 'IP detected'}
                      {location.source === 'manual' && 'Manually selected'}
                    </p>
                  </div>
                  <span className="text-xl">{getLocationIcon()}</span>
                </div>
              </div>
            )}

            {/* GPS Option */}
            <button
              onClick={requestGPSLocation}
              disabled={location.isLoading}
              className="w-full p-3 mb-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">📍 Use GPS Location</p>
                  <p className="text-xs text-gray-600">Most accurate for your current position</p>
                </div>
                {location.isLoading && <span className="text-sm">⏳</span>}
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
                      location.selectedRectangle === rectangle.code ? 'bg-blue-50 border border-blue-200' : ''
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