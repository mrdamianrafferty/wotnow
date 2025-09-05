import React, { useEffect, useState } from 'react';
import countryNameToFlagEmoji from '../utils/flags';
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import dynamic from 'next/dynamic';
import { computeSimulatedOrientation } from '../utils/orientation';
import { runComprehensiveDiagnostics } from '../utils/diagnostics';
import { advancedGeolocation, LocationResult } from '../utils/advancedGeolocation';
import ModernLocationSearch from './ModernLocationSearch';


const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

// Define the component interface
const CoastalLocationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  onSave: (loc: { name: string; lat: number; lon: number }) => void;
  homeLocation?: { name: string; lat: number; lon: number };
  coastalLocation?: { name: string; lat: number; lon: number };
  setHomeLocation?: (loc: { name: string; lat: number; lon: number }) => void;
  setCoastalLocation?: (loc: { name: string; lat: number; lon: number }) => void;
  recentLocations?: { name: string; lat: number; lon: number }[];
}> = ({ 
  open, 
  onClose, 
  title = "Pick your coastal location",
  onSave, 
  homeLocation,
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [useModernSearch, setUseModernSearch] = useState(false);
  const [geolocationAbortController, setGeolocationAbortController] = useState<AbortController | null>(null);

  const [recentLocationsState, setRecentLocationsState] = useState<{ name: string; lat: number; lon: number }[]>([]);

  // Added new state hooks as per instructions
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedName, setSelectedName] = useState<string>('Pinned location');

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      locationBias: {
        center: {
          lat: homeLocation?.lat || 43.48,
          lng: homeLocation?.lon || -5.27,
        },
        radius: 100000, // 100 km in metres
      }
    },
    debounce: 300,
  });

  useEffect(() => {
    const saved = localStorage.getItem("recentCoastalLocations");
    if (saved) {
      try {
        setRecentLocationsState(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing recent locations", e);
      }
    }
    
    // Run diagnostics in development (only once)
    if (process.env.NODE_ENV === 'development') {
      const hasRunDiagnostics = sessionStorage.getItem('hasRunLocationDiagnostics');
      if (!hasRunDiagnostics) {
        setTimeout(() => {
          console.log('🔧 Running enhanced location diagnostics...');
          runComprehensiveDiagnostics();
          sessionStorage.setItem('hasRunLocationDiagnostics', 'true');
        }, 2000);
      }
      
      // Check if Google Places API fails to load and switch to modern search
      setTimeout(() => {
        if (!ready && !useModernSearch) {
          console.warn("Google Places API took too long to load, switching to alternative search");
          // No need to show error message - just switch silently
          setUseModernSearch(true);
        }
      }, 5000);
    }

    // Check for macOS CoreLocation issues and suggest alternative search silently
    const isMacOS = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isMacOS) {
      const hasLocationIssues = localStorage.getItem('hasLocationIssues');
      if (hasLocationIssues === 'true') {
        setTimeout(() => {
          // Skip the warning message - just enable alternative search
          setUseModernSearch(true);
        }, 1000);
      }
    }
  }, [ready, useModernSearch]);

  // Cancel geolocation when switching to modern search
  useEffect(() => {
    if (useModernSearch) {
      cancelGpsButAllowIpFallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useModernSearch]);

  // Cleanup geolocation on unmount
  useEffect(() => {
    return () => {
      if (geolocationAbortController) {
        geolocationAbortController.abort();
      }
    };
  }, [geolocationAbortController]);

  // Advanced geolocation function with multiple fallback strategies
  const getCurrentLocation = async () => {
    setLocationError(null);
    setIsGettingLocation(true);
    
    // Create new abort controller for this geolocation request
    const controller = new AbortController();
    setGeolocationAbortController(controller);
    
    try {
      console.log('Starting advanced geolocation...');
      
      // Use advanced geolocation service with all fallback strategies
      const result: LocationResult = await advancedGeolocation.getLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
        useWatchPosition: true, // Enable watchPosition for macOS
        enableIpFallback: true, // Enable IP fallback
        ipApiKey: undefined, // Could add IP geolocation API key here if available
        abortSignal: controller.signal
      });
      
      console.log('Advanced geolocation result:', result);
      
      // Clear any previous error messages since we got a successful result
      setLocationError(null);
      
      // Create location object
      const location = {
        name: result.name || `${result.method} Location (${result.lat.toFixed(4)}, ${result.lon.toFixed(4)})`,
        lat: result.lat,
        lon: result.lon
      };
      
      // Call onSave with the location data
      onSave(location);
      
      // Update recent locations
      const existing = JSON.parse(localStorage.getItem("recentCoastalLocations") || "[]");
      const updated = [location, ...existing.filter((l: { name: string; lat: number; lon: number }) => l.name !== location.name)].slice(0, 5);
      localStorage.setItem("recentCoastalLocations", JSON.stringify(updated));
      
      // Add likely beach caching logic if it looks like a coastal location
      const isLikelyBeach = (name: string) =>
        /\b(playa|beach|strand|baie|spiaggia|praia|plage|plaja|kumsal|bay|coast|shore|marina|harbor|harbour|pier|wharf)\b/i.test(name);
      
      if (isLikelyBeach(location.name)) {
        const orientation = computeSimulatedOrientation(location.lat, location.lon);
        const cached = JSON.parse(localStorage.getItem("cachedBeaches") || "[]");
        const exists = cached.some((b: { name: string; lat: number; lon: number }) => 
          b.name === location.name || (Math.abs(b.lat - location.lat) < 0.005 && Math.abs(b.lon - location.lon) < 0.005)
        );
        
        if (!exists) {
          const newBeach = {
            name: location.name,
            lat: location.lat,
            lon: location.lon,
            orientation,
            added: new Date().toISOString(),
            source: 'advancedGeolocation',
            method: result.method,
            confidence: result.confidence,
            sourceCoords: { lat: location.lat, lon: location.lon }
          };
          const updated = [newBeach, ...cached].slice(0, 100);
          localStorage.setItem("cachedBeaches", JSON.stringify(updated));
        }
      }
      
      // Display success message with method used
      let successMessage = `Location found`;
      if (result.method === 'gps-high' || result.method === 'gps-low') {
        successMessage += ` using GPS (${result.confidence} confidence)`;
      } else if (result.method === 'watch') {
        successMessage += ` using continuous location tracking`;
      } else if (result.method === 'ip') {
        successMessage += ` using your internet connection`;
      }
      
      if (result.accuracy) {
        successMessage += ` - accuracy: ${Math.round(result.accuracy)}m`;
      }
      
      console.log(successMessage);
      
    } catch (error) {
      console.error("Advanced geolocation failed:", error);
      
      // Don't show error if it was aborted by user (they likely started typing)
      if (error instanceof Error && error.message.includes('aborted')) {
        console.log('Geolocation was aborted by user action');
        return;
      }
      
      // Handle graceful automatic location unavailable (don't show error message)
      if (error instanceof Error && error.message === 'automatic_location_unavailable') {
        console.log('Automatic location unavailable, user can use manual search');
        // Don't set any error message - just let them use the search interface
        return;
      }
      
      let errorMessage = "Failed to get your location. ";
      
      // Detect if we're on macOS for better error messaging
      const isMacOS = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
      
      if (error instanceof Error) {
        if (error.message.includes('not supported')) {
          errorMessage += "Your browser doesn't support location services. Please search for your location manually.";
        } else if (error.message.includes('denied')) {
          errorMessage += "Location access was denied. Please enable location permissions in your browser settings and try again.";
        } else if (error.message.includes('unavailable') || error.message.includes('CoreLocation')) {
          if (isMacOS) {
            errorMessage += "macOS CoreLocation is having issues. This is common and usually related to system location settings. ";
            errorMessage += "Try: System Preferences > Security & Privacy > Location Services, ensure it's enabled for your browser.";
          } else {
            errorMessage += "Location services are currently unavailable. This might be due to poor signal or system settings.";
          }
        } else if (error.message.includes('timeout')) {
          if (isMacOS) {
            errorMessage += "Location request timed out - this is very common on macOS due to CoreLocation limitations. ";
            errorMessage += "The app will remember this and use alternative methods next time.";
          } else {
            errorMessage += "Location request timed out. Please check your network connection and try again.";
          }
          // Remember that this device has location issues
          localStorage.setItem('hasLocationIssues', 'true');
        } else if (error.message.includes('IP geolocation')) {
          errorMessage += "All location methods failed including internet-based location. Please search manually.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Unknown error occurred.";
      }
      
      errorMessage += " Please try searching manually or using the map picker.";
      setLocationError(errorMessage);
    } finally {
      setIsGettingLocation(false);
      setGeolocationAbortController(null);
    }
  };

  // Handle location selection from modern search
  const handleModernSearchSelect = (location: { name: string; lat: number; lon: number }) => {
    onSave(location);
    
    // Update recent locations
    const existing = JSON.parse(localStorage.getItem("recentCoastalLocations") || "[]");
    const updated = [location, ...existing.filter((l: { name: string; lat: number; lon: number }) => l.name !== location.name)].slice(0, 5);
    localStorage.setItem("recentCoastalLocations", JSON.stringify(updated));
    
    // Add likely beach caching logic
    const isLikelyBeach = (name: string) =>
      /\b(playa|beach|strand|baie|spiaggia|praia|plage|plaja|kumsal|bay|coast|shore|marina|harbor|harbour|pier|wharf)\b/i.test(name);
    if (isLikelyBeach(location.name)) {
      const orientation = computeSimulatedOrientation(location.lat, location.lon);
      const cached = JSON.parse(localStorage.getItem("cachedBeaches") || "[]");
      const exists = cached.some((b: { name: string; lat: number; lon: number }) => b.name === location.name || (Math.abs(b.lat - location.lat) < 0.005 && Math.abs(b.lon - location.lon) < 0.005));
      if (!exists) {
        const newBeach = {
          name: location.name,
          lat: location.lat,
          lon: location.lon,
          orientation,
          added: new Date().toISOString(),
          source: 'modernSearch',
          sourceCoords: { lat: location.lat, lon: location.lon }
        };
        const updated = [newBeach, ...cached].slice(0, 100);
        localStorage.setItem("cachedBeaches", JSON.stringify(updated));
      }
    }
  };

  // Cancel any ongoing geolocation when user starts typing
  const cancelGeolocation = () => {
    if (geolocationAbortController) {
      console.log('🚫 Cancelling geolocation due to user input');
      geolocationAbortController.abort();
      setGeolocationAbortController(null);
      setIsGettingLocation(false);
      setLocationError(null);
    }
  };

  // Smart cancellation that allows IP fallback to continue
  const cancelGpsButAllowIpFallback = () => {
    if (geolocationAbortController && isGettingLocation) {
      console.log('🚫 Cancelling GPS geolocation but allowing IP fallback');
      // Don't abort the controller immediately - let the geolocation service handle IP fallback
      // Just update UI state - no need to show a warning message
      // Don't set isGettingLocation to false - let the geolocation complete naturally
    }
  };

  // If dialog is not open, don't render anything
  if (!open) return null;

  // Show map picker modal
  if (showMapPicker) {
    return (
      <div className="coastal-dialog-backdrop coastal-dialog-modal">
        <div className="coastal-dialog coastal-dialog-content" style={{ padding: '24px', borderRadius: '12px' }}>
          <button className="coastal-dialog-close" onClick={() => setShowMapPicker(false)}>&times;</button>
          <h3 className="coastal-dialog-title" style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
            📍 Pick location from map
          </h3>
          <MapPicker
            homeLocation={homeLocation}
            onSelect={async (lat: number, lon: number) => {
              setSelectedCoords({ lat, lon });

              try {
                const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
                if (!apiKey) {
                  setSelectedName('Pinned location');
                  return;
                }
                
                const response = await fetch(
                  `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`,
                  { 
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(5000)
                  }
                );
                
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                if (data && data.length > 0) {
                  const location = data[0];
                  
                  // Build a more descriptive location name
                  let locationName = '';
                  
                  // Try to build a meaningful name using available components
                  if (location.name && location.name !== location.country) {
                    locationName = location.name;
                  } else if (location.local_names && location.local_names.en) {
                    locationName = location.local_names.en;
                  } else {
                    locationName = 'Pinned location';
                  }
                  
                  // Add state/region if available and different from name
                  if (location.state && location.state !== locationName) {
                    locationName += `, ${location.state}`;
                  }
                  
                  // Add country if it's not already obvious and we have a specific local name
                  if (location.country && locationName !== 'Pinned location' && !locationName.includes(location.country)) {
                    locationName += `, ${location.country}`;
                  }
                  
                  setSelectedName(locationName);
                } else {
                  setSelectedName('Pinned location');
                }
              } catch (err) {
                console.error("Reverse geocoding failed", err);
                setSelectedName('Pinned location');
              }
            }}
          />
          {selectedCoords && (
            <>
              <div style={{ margin: '12px 0', fontSize: '0.95rem', fontWeight: '500' }}>
                📍 Selected: {selectedName}
              </div>
              <button
                onClick={() => {
                  if (selectedCoords) {
                    const { lat, lon } = selectedCoords;
                    onSave({ name: selectedName, lat, lon });
                    const existing = JSON.parse(localStorage.getItem("recentCoastalLocations") || "[]");
                    const updated = [{ name: selectedName, lat, lon }, ...existing.filter((l: { name: string; lat: number; lon: number }) => l.name !== selectedName)].slice(0, 5);
                    localStorage.setItem("recentCoastalLocations", JSON.stringify(updated));
                    // Add likely beach caching logic
                    const isLikelyBeach = (name: string) =>
                      /\b(playa|beach|strand|baie|spiaggia|praia|plage|plaja|kumsal)\b/i.test(name);
                    if (isLikelyBeach(selectedName)) {
                      const orientation = computeSimulatedOrientation(lat, lon);
                      const cached = JSON.parse(localStorage.getItem("cachedBeaches") || "[]");
                      const exists = cached.some((b: { name: string; lat: number; lon: number }) => b.name === selectedName || (Math.abs(b.lat - lat) < 0.005 && Math.abs(b.lon - lon) < 0.005));
                      if (!exists) {
                        const updated = [{
                          name: selectedName,
                          lat,
                          lon,
                          orientation,
                          added: new Date().toISOString(),
                          source: 'userSearch',
                          sourceCoords: { lat, lon }
                        }, ...cached].slice(0, 100);
                        localStorage.setItem("cachedBeaches", JSON.stringify(updated));
                      }
                    }
                    setShowMapPicker(false);
                  }
                }}
                style={{
                  background: '#4ade80',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#fff',
                  marginBottom: '12px'
                }}
              >
                ✅ Save this location
              </button>
            </>
          )}
          <button
            onClick={() => setShowMapPicker(false)}
            style={{
              background: '#e5e7eb',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Use CSS classes from index.css for styling
  return (
    <div className="coastal-dialog-backdrop">
      <div className="coastal-dialog">
        {/* Close button */}
        <button className="coastal-dialog-close" onClick={onClose}>&times;</button>
        
        {/* Dialog title */}
        <h3 className="coastal-dialog-title">
          <span className="coastal-dialog-icon">📍</span> {title}
        </h3>
        
        {/* Search input at the top */}
        {useModernSearch ? (
          <ModernLocationSearch
            onSelect={(location) => {
              // Cancel any ongoing geolocation when user selects from modern search
              cancelGeolocation();
              handleModernSearchSelect(location);
            }}
            homeLocation={homeLocation}
            placeholder="Search for location"
            onInputFocus={cancelGeolocation}
          />
        ) : (
          <div className="coastal-dialog-search-container">
            <input
              type="text"
              value={value}
              autoFocus
              disabled={!ready}
              placeholder={!ready ? "Loading..." : "Search for location"}
              onChange={(e) => {
                // Cancel any ongoing geolocation immediately when user starts typing
                cancelGeolocation();
                setValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setValue('');
                  clearSuggestions();
                }
              }}
              onFocus={() => {
                // Also cancel geolocation when user focuses on input (in case they click to type)
                cancelGeolocation();
              }}
              className="coastal-dialog-input"
            />
            {value && (
              <button
                className="coastal-dialog-search-clear"
                onClick={() => {
                  setValue('');
                  clearSuggestions();
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Two action buttons side by side */}
        <div className="coastal-dialog-actions">
          {isGettingLocation ? (
            // Show cancel button when geolocation is in progress
            <button
              className="coastal-dialog-action-btn coastal-dialog-cancel-btn"
              onClick={cancelGeolocation}
              style={{ 
                backgroundColor: '#ff6b6b', 
                color: 'white',
                border: 'none'
              }}
            >
              ✕ Cancel location search
            </button>
          ) : (
            <>
              {(() => {
                const isMacOS = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
                return (
                  <button
                    className={`coastal-dialog-action-btn ${isMacOS ? 'coastal-dialog-location-btn-secondary' : 'coastal-dialog-location-btn'}`}
                    onClick={() => {
                      // Clear any previous errors
                      setLocationError(null);
                      
                      // No confirmation needed - we handle failures gracefully
                      getCurrentLocation();
                    }}
                    disabled={isGettingLocation}
                    title={isMacOS 
                      ? "Try automatic location (may fall back to manual search)" 
                      : "Advanced location detection: GPS, WiFi positioning, network location, and IP-based fallback"
                    }
                  >
                    <span style={{ marginRight: '6px' }}>📍</span>
                    <span>{isMacOS ? 'Try my location' : 'Use my location'}</span>
                  </button>
                );
              })()}
              
              <button
                className="coastal-dialog-action-btn coastal-dialog-map-btn"
                onClick={() => setShowMapPicker(true)}
              >
                🗺️ Find on map
              </button>
            </>
          )}
        </div>
        
        {/* Show error message if there is one */}
        {locationError && (
          <div 
            style={{ 
              color: '#dc2626', 
              marginBottom: '16px', 
              padding: '8px', 
              background: '#fee2e2', 
              borderRadius: '6px',
              fontSize: '0.9rem',
              position: 'relative'
            }}
          >
            {locationError}
            {(locationError.includes('timed out') || locationError.includes('taking too long') || locationError.includes('timeout')) && !useModernSearch ? (
              <div style={{ marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setLocationError(null);
                    setUseModernSearch(true);
                  }}
                  style={{
                    background: '#dc2626',
                    border: 'none',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginRight: '8px'
                  }}
                >
                  Use manual search instead
                </button>
              </div>
            ) : null}
            <button
              onClick={() => setLocationError(null)}
              style={{
                position: 'absolute',
                top: '4px',
                right: '8px',
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Show helpful message when Places API is not ready */}
        {!ready && !locationError && !useModernSearch && (
          <div 
            style={{ 
              color: '#7c2d12', 
              marginBottom: '16px', 
              padding: '8px', 
              background: '#fef3c7', 
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            🔄 Loading search functionality...
            <button
              onClick={() => setUseModernSearch(true)}
              style={{
                marginLeft: '8px',
                background: 'none',
                border: '1px solid #d97706',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                color: '#d97706'
              }}
            >
              Use alternative search
            </button>
          </div>
        )}

        {/* Show suggestion to use alternative search if geolocation keeps failing */}
        {!useModernSearch && (
          <div 
            style={{ 
              color: '#7c2d12', 
              marginBottom: '16px', 
              padding: '8px', 
              background: '#fef3c7', 
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            💡 Tip: If location detection isn't working on your device, try the alternative search below
            <button
              onClick={() => setUseModernSearch(true)}
              style={{
                marginLeft: '8px',
                background: '#d97706',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              Use alternative search
            </button>
          </div>
        )}

        {recentLocationsState && recentLocationsState.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4>Recent Locations</h4>
            <ul className="coastal-dialog-recent-list">
              {recentLocationsState.map((loc, index) => (
                <li key={index} className="coastal-dialog-recent-item coastal-location-item">
                  <button
                    onClick={() => {
                      onSave(loc);
                    }}
                    title={loc.name} // Show full name on hover
                    className="coastal-dialog-recent-btn"
                  >
                    <span className="location-icon">🏖️</span>
                    <span>{loc.name.split(',')[0]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Show home location as a recent option if available */}
        {homeLocation && (
          <div style={{ marginBottom: '16px' }}>
            <h4>Quick Options</h4>
            <ul className="coastal-dialog-recent-list">
              <li className="coastal-dialog-recent-item home-location-item">
                <button
                  onClick={() => {
                    onSave(homeLocation);
                  }}
                  title={homeLocation.name}
                  className="coastal-dialog-recent-btn home-location-btn"
                >
                  <span className="location-icon">🏡</span>
                  <span>{homeLocation.name.split(',')[0]} (Home)</span>
                </button>
              </li>
            </ul>
          </div>
        )}
        
        {status === "OK" && !useModernSearch && (
          <ul className="coastal-dialog-list">
            {data.map((suggestion) => {
              const { place_id, description } = suggestion;

              return (
                <li key={place_id} className="coastal-dialog-list-item">
                  <button
                    className="coastal-dialog-list-btn"
                    onClick={async () => {
                      try {
                        setValue(description, false);
                        clearSuggestions();

                        const results = await getGeocode({ address: description });
                        if (!results || results.length === 0) {
                          throw new Error("No geocoding results found");
                        }
                        
                        const { lat, lng } = await getLatLng(results[0]);

                        onSave({
                          name: description,
                          lat,
                          lon: lng,
                        });
                        const existing = JSON.parse(localStorage.getItem("recentCoastalLocations") || "[]");
                        const updated = [ { name: description, lat, lon: lng }, ...existing.filter((l: { name: string; lat: number; lon: number }) => l.name !== description) ].slice(0, 5);
                        localStorage.setItem("recentCoastalLocations", JSON.stringify(updated));
                        // Add likely beach caching logic
                        const isLikelyBeach = (name: string) =>
                          /\b(playa|beach|strand|baie|spiaggia|praia|plage|plaja|kumsal)\b/i.test(name);
                        if (isLikelyBeach(description)) {
                          const orientation = computeSimulatedOrientation(lat, lng);
                          const cached = JSON.parse(localStorage.getItem("cachedBeaches") || "[]");
                          const exists = cached.some((b: { name: string; lat: number; lon: number }) => b.name === description || (Math.abs(b.lat - lat) < 0.005 && Math.abs(b.lon - lng) < 0.005));
                          if (!exists) {
                            // Save new beach with placeId and sourceCoords
                            const newBeach = {
  name: description,
  lat,
  lon: lng,
  orientation,
  added: new Date().toISOString(),
  source: 'userSearch',
  placeId: place_id,
  sourceCoords: { lat, lon: lng }
};
                            const updated = [newBeach, ...cached].slice(0, 100);
                            localStorage.setItem("cachedBeaches", JSON.stringify(updated));
                          }
                        }
                      } catch (error) {
                        console.error("Error selecting place:", error);
                        setLocationError(`Failed to select location: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or use a different search term.`);
                        setValue('', false);
                        clearSuggestions();
                      }
                    }}
                  >
                    <div className="coastal-dialog-search-result">
                      {(() => {
                        const parts = description.split(',');
                        if (parts.length < 2) {
                          return (
                            <>
                              <span className="coastal-dialog-result-type">🏖️</span>
                              <span className="coastal-dialog-result-main">{description}</span>
                            </>
                          );
                        }

                        const mainLocation = parts[0].trim();
                        const countryName = parts[parts.length - 1].trim();
                        const flag = countryNameToFlagEmoji(countryName);
                        const details = parts.slice(1).join(',').trim();
                        
                        // Detect if this looks like a coastal/beach location
                        const isLikelyBeach = /\b(playa|beach|strand|baie|spiaggia|praia|plage|plaja|kumsal|bay|coast|shore|marina|harbor|harbour|pier|wharf)\b/i.test(description);
                        const locationIcon = isLikelyBeach ? '🏖️' : '📍';
                        
                        return (
                          <>
                            <span className="coastal-dialog-result-type">{locationIcon}</span>
                            <div className="coastal-dialog-result-content">
                              <span className="coastal-dialog-result-main">{mainLocation} {flag}</span>
                              <span className="coastal-dialog-result-details">{details}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CoastalLocationDialog;