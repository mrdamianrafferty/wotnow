import React, { useEffect, useState, useRef } from 'react';
import countryNameToFlagEmoji from '../utils/flags';
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import dynamic from 'next/dynamic';
import { computeSimulatedOrientation } from '../utils/orientation';


const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

// Define the component interface
const CoastalLocationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  onSave: (loc: { name: string; lat: number; lon: number }) => void;
  homeLocation?: any;
  coastalLocation?: any;
  setHomeLocation?: (loc: any) => void;
  setCoastalLocation?: (loc: any) => void;
  recentLocations?: { name: string; lat: number; lon: number }[];
}> = ({ 
  open, 
  onClose, 
  title = "Pick your coastal location",
  onSave, 
  homeLocation,
  coastalLocation,
  setHomeLocation,
  setCoastalLocation,
  recentLocations,
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [recentLocationsState, setRecentLocationsState] = useState<{ name: string; lat: number; lon: number }[]>([]);

  // Added new state hooks as per instructions
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedName, setSelectedName] = useState<string>('Pinned location');

  useEffect(() => {
    const saved = localStorage.getItem("recentCoastalLocations");
    if (saved) {
      try {
        setRecentLocationsState(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing recent locations", e);
      }
    }
  }, []);

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

  // Fix the API key inconsistency in the getCurrentLocation function
  const getCurrentLocation = () => {
    setLocationError(null);
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use the same API key variable that's used in the search function
          const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
          
          // Add logging to debug API call
          console.log(`Getting location name for coordinates: ${latitude}, ${longitude}`);
          
          // Reverse geocode to get location name
          const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Reverse geocoding failed, bad robot:", response.status, errorText);
            throw new Error(`Damn, we failed to get your location (${response.status})`);
          }
          
          const data = await response.json();
          console.log("Reverse geocoding response:", data);
          
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
              locationName = 'Current Location';
            }
            
            // Add state/region if available and different from name
            if (location.state && location.state !== locationName) {
              locationName += `, ${location.state}`;
            }
            
            // Add country if it's not already obvious and we have a specific local name
            if (location.country && locationName !== 'Current Location' && !locationName.includes(location.country)) {
              locationName += `, ${location.country}`;
            }
            
            console.log(`Constructed location name: "${locationName}" from data:`, location);
            
            // Call onSave with the location data
            onSave({
              name: locationName,
              lat: latitude,
              lon: longitude
            });
            const existing = JSON.parse(localStorage.getItem("recentCoastalLocations") || "[]");
            const updated = [ { name: locationName, lat: latitude, lon: longitude }, ...existing.filter((l: { name: string; lat: number; lon: number }) => l.name !== locationName) ].slice(0, 5);
            localStorage.setItem("recentCoastalLocations", JSON.stringify(updated));
          } else {
            throw new Error("No location data found in API response");
          }
        } catch (error) {
          console.error("Error getting location:", error);
          setLocationError(`Damn, we failed to determine your location: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or enter manually.`);
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Failed to get your location.";
        
        if (error.code === 1) {
          errorMessage = "Location permission denied. Please allow location access.";
        } else if (error.code === 2) {
          errorMessage = "Please try again or enter manually.";
        } else if (error.code === 3) {
          errorMessage = "Location request timed out. Please try again.";
        }
        
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
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
                const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`);
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
                      const exists = cached.some((b: any) => b.name === selectedName || (Math.abs(b.lat - lat) < 0.005 && Math.abs(b.lon - lon) < 0.005));
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
        <div className="coastal-dialog-search-container">
          <input
            type="text"
            value={value}
            autoFocus
            disabled={!ready}
            placeholder={!ready ? "Loading..." : "Search for location"}
            onChange={e => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setValue('');
                clearSuggestions();
              }
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

        {/* Two action buttons side by side */}
        <div className="coastal-dialog-actions">
          <button
            className="coastal-dialog-action-btn coastal-dialog-location-btn"
            onClick={() => {
              // Add this confirmation before requesting location
              if (confirm("This will request access to your location. Continue?")) {
                getCurrentLocation();
              }
            }}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <span>Getting location...</span>
            ) : (
              <>
                <span style={{ marginRight: '6px' }}>📍</span>
                <span>Use my location</span>
              </>
            )}
          </button>
          
          <button
            className="coastal-dialog-action-btn coastal-dialog-map-btn"
            onClick={() => setShowMapPicker(true)}
          >
            🗺️ Find on map
          </button>
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
              fontSize: '0.9rem'
            }}
          >
            {locationError}
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
        
        {status === "OK" && (
          <ul className="coastal-dialog-list">
            {data.map((suggestion, i) => {
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
                          const exists = cached.some((b: any) => b.name === description || (Math.abs(b.lat - lat) < 0.005 && Math.abs(b.lon - lng) < 0.005));
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