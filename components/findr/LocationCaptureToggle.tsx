// components/findr/LocationCaptureToggle.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUserLocation } from '../../hooks/useUserLocation';
import { detectUserLocation } from '../../lib/findr/locationDetection';

interface LocationCaptureToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onLocationCaptured?: (location: { lat: number; lon: number; accuracy?: number }) => void;
  className?: string;
}

export function LocationCaptureToggle({ 
  enabled, 
  onToggle, 
  onLocationCaptured,
  className = ''
}: LocationCaptureToggleProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCaptured, setLastCaptured] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const { location: userLocation } = useUserLocation();

  // Auto-capture location when enabled
  useEffect(() => {
    const shouldCapture = enabled && !lastCaptured && !isCapturing;
    
    if (shouldCapture) {
      const captureLocation = async () => {
        if (isCapturing) return;
        
        try {
          setIsCapturing(true);
          
          // First try GPS
          const gpsLocation = await detectUserLocation('gps');
          if (gpsLocation) {
            const locationData = {
              lat: gpsLocation.latitude,
              lon: gpsLocation.longitude,
              accuracy: gpsLocation.accuracy
            };
            setLastCaptured(locationData);
            onLocationCaptured?.(locationData);
            return;
          }
          
          // Fallback to user's stored location
          if (userLocation?.coordinates) {
            const locationData = {
              lat: userLocation.coordinates.lat,
              lon: userLocation.coordinates.lon,
              accuracy: userLocation.source === 'gps' ? 10 : 1000 // Rough accuracy estimate
            };
            setLastCaptured(locationData);
            onLocationCaptured?.(locationData);
          }
          
        } catch (error) {
          console.warn('Failed to capture location:', error);
          // Silently fail - location is optional
        } finally {
          setIsCapturing(false);
        }
      };
      
      captureLocation();
    }
  }, [enabled, lastCaptured, isCapturing, userLocation, onLocationCaptured]);

  const captureCurrentLocation = async () => {
    if (isCapturing) return;
    
    try {
      setIsCapturing(true);
      
      // First try GPS
      const gpsLocation = await detectUserLocation('gps');
      if (gpsLocation) {
        const locationData = {
          lat: gpsLocation.latitude,
          lon: gpsLocation.longitude,
          accuracy: gpsLocation.accuracy
        };
        setLastCaptured(locationData);
        onLocationCaptured?.(locationData);
        return;
      }
      
      // Fallback to user's stored location
      if (userLocation?.coordinates) {
        const locationData = {
          lat: userLocation.coordinates.lat,
          lon: userLocation.coordinates.lon,
          accuracy: userLocation.source === 'gps' ? 10 : 1000 // Rough accuracy estimate
        };
        setLastCaptured(locationData);
        onLocationCaptured?.(locationData);
      }
      
    } catch (error) {
      console.warn('Failed to capture location:', error);
      // Silently fail - location is optional
    } finally {
      setIsCapturing(false);
    }
  };

  const formatAccuracy = (accuracy?: number) => {
    if (!accuracy) return '';
    if (accuracy < 10) return ' (~10m)';
    if (accuracy < 100) return ` (~${Math.round(accuracy)}m)`;
    if (accuracy < 1000) return ` (~${Math.round(accuracy/100)*100}m)`;
    return ' (~1km+)';
  };

  const getLocationIcon = () => {
    if (isCapturing) return '⏳';
    if (lastCaptured) {
      if (lastCaptured.accuracy && lastCaptured.accuracy < 20) return '📍'; // High accuracy GPS
      return '📌'; // Lower accuracy or manual
    }
    return '🗺️';
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Toggle Switch */}
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const newEnabled = e.target.checked;
            onToggle(newEnabled);
            if (!newEnabled) {
              setLastCaptured(null);
            }
          }}
          className="sr-only"
        />
        <div className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        }`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            enabled ? 'transform translate-x-5' : ''
          }`} />
        </div>
        <span className="ml-3 text-sm font-medium">
          Include precise location
        </span>
      </label>

      {/* Location Status */}
      {enabled && (
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getLocationIcon()}</span>
          {isCapturing && (
            <span className="text-xs text-gray-600">Getting location...</span>
          )}
          {lastCaptured && !isCapturing && (
            <div className="text-xs text-gray-600">
              <span className="text-green-600">✓ Location captured</span>
              <span>{formatAccuracy(lastCaptured.accuracy)}</span>
            </div>
          )}
          {enabled && !lastCaptured && !isCapturing && (
            <button
              onClick={captureCurrentLocation}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Capture now
            </button>
          )}
        </div>
      )}

      {/* Privacy Note */}
      {enabled && (
        <div className="text-xs text-gray-500 max-w-xs">
          <span>🔒 GPS coordinates help analyze fishing patterns privately</span>
        </div>
      )}
    </div>
  );
}