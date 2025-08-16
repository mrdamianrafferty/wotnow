import React, { useState, useEffect } from 'react';
import countryNameToFlagEmoji from '../utils/flags';
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";

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

  const [recentLocationsState, setRecentLocationsState] = useState<{ name: string; lat: number; lon: number }[]>([]);

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
            const locationName = data[0].name + (data[0].state ? `, ${data[0].state}` : "");
            
            // Call onSave with the location data
            onSave({
              name: locationName,
              lat: latitude,
              lon: longitude
            });
            const existing = JSON.parse(localStorage.getItem("recentCoastalLocations") || "[]");
            const updated = [ { name: locationName, lat: latitude, lon: longitude }, ...existing.filter(l => l.name !== locationName) ].slice(0, 5);
            localStorage.setItem("recentCoastalLocations", JSON.stringify(updated));
          } else {
            throw new Error("No location data found in API response");
          }
        } catch (error) {
          console.error("Error getting location:", error);
          setLocationError(`Damn, we failed to determine your location: ${error.message}. Please try again or enter manually.`);
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

  // Use CSS classes from index.css for styling
  return (
    <div className="coastal-dialog-backdrop coastal-dialog-modal">
      <div className="coastal-dialog coastal-dialog-content" style={{ padding: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', borderRadius: '12px' }}>
        {/* Close button */}
        <button className="coastal-dialog-close" onClick={onClose}>&times;</button>
        
        {/* Dialog title */}
        <h3 className="coastal-dialog-title" style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px' }}>
          <span className="coastal-dialog-icon">📍</span> {title}
        </h3>
        
        {/* Current location button */}
        <button
          className="coastal-dialog-current-location"
          onClick={() => {
            // Add this confirmation before requesting location
            if (confirm("This will request access to your location. Continue?")) {
              getCurrentLocation();
            }
          }}
          disabled={isGettingLocation}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '12px 16px',
            marginBottom: '16px',
            background: '#e0f2fe',
            border: '2px solid #0284c7',
            borderRadius: '8px',
            fontSize: '1.05rem',
            color: '#0369a1',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: '500'
          }}
        >
          {isGettingLocation ? (
            <span>Getting your location...</span>
          ) : (
            <>
              <span style={{ marginRight: '8px' }}>📍</span>
              <span>Use my current location</span>
            </>
          )}
        </button>
        
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
            <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '8px' }}>Recent Locations</h4>
            <ul className="coastal-dialog-recent-list" style={{ padding: 0, listStyle: 'none' }}>
              {recentLocationsState.map((loc, index) => (
                <li key={index} className="coastal-dialog-list-item">
                  <button
                    className="coastal-dialog-list-btn"
                    onClick={() => {
                      onSave(loc);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '10px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    <span>{loc.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Search input */}
        <input
          type="text"
          value={value}
          autoFocus
          disabled={!ready}
          placeholder="Search for location"
          onChange={e => setValue(e.target.value)}
          className="coastal-dialog-input location-banner__input"
          style={{ marginBottom: '12px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', width: '100%' }}
        />
        
        {status === "OK" && (
          <ul
            className="coastal-dialog-list"
            style={{
              padding: 0,
              marginTop: '16px',
              listStyle: 'none'
            }}
          >
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
                      } catch (error) {
                        console.error("Error selecting place:", error);
                      }
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '10px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    <span>
                      {(() => {
                        const parts = description.split(',');
                        if (parts.length < 2) return description;

                        const countryName = parts[parts.length - 1].trim();
                        const flag = countryNameToFlagEmoji(countryName);
                        parts[parts.length - 1] = ` ${flag}`; // Add space before the flag, no comma
                        return parts.join(',').replace(/,\s+$/, '').trim(); // Clean trailing commas
                      })()}
                    </span>
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