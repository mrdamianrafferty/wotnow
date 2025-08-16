import React, { useState } from 'react';

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
}> = ({ 
  open, 
  onClose, 
  title = "Pick your coastal location",
  onSave, 
  homeLocation,
  coastalLocation,
  setHomeLocation,
  setCoastalLocation
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; lat: number; lon: number; country?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const doSearch = async () => {
    if (!query) return;
    setLoading(true);
    setResults([]);
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
      const resp = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
      );
      const data = await resp.json();
      setResults(
        Array.isArray(data)
          ? data.map((r: any) => ({
            name: `${r.name}${r.state ? ', ' + r.state : ''}${r.country ? ', ' + r.country : ''}`,
            lat: r.lat,
            lon: r.lon,
            country: r.country
          }))
          : []
      );
    } catch (e) {
      setResults([]);
    }
    setLoading(false);
  };

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
        
        {/* Search input */}
        <input
          type="text"
          value={query}
          autoFocus
          placeholder="Search for location"
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          className="coastal-dialog-input location-banner__input"
          style={{ marginBottom: '12px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', width: '100%' }}
        />
        
        {/* Search button */}
        <button
          className="coastal-dialog-search location-banner__button"
          onClick={doSearch}
          disabled={loading || !query}
          style={{ marginTop: '8px', padding: '10px 16px', backgroundColor: '#10b981', color: '#fff', fontSize: '1rem', borderRadius: '6px', border: 'none', width: '100%' }}
        >
          Search
        </button>
        
        {/* Loading indicator */}
        {loading && <div className="coastal-dialog-loading">Searching…</div>}
        
        {/* Results list */}
        {!loading && results.length > 0 && (
          <ul className="coastal-dialog-list" style={{ padding: 0, marginTop: '16px', listStyle: 'none' }}>
            {results.map((r, i) => (
              <li key={i} className="coastal-dialog-list-item">
                <button
                  className="coastal-dialog-list-btn"
                  onClick={() => {
                    // Save the selected location and close the dialog
                    onSave(r);
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
                    {r.country ? `${String.fromCodePoint(...[...r.country.toUpperCase()].map(c => 0x1f1e6 - 65 + c.charCodeAt(0)))} ` : ''}
                    {r.name}
                  </span>
                  <span className="coastal-dialog-list-coords">
                    ({r.lat.toFixed(3)}, {r.lon.toFixed(3)})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CoastalLocationDialog;