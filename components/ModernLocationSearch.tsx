import React, { useState, useCallback, useRef } from 'react';

// Simple debounce implementation
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Type for location suggestions
interface LocationSuggestion {
  name: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
  local_names?: Record<string, string>;
}

// Alternative implementation that doesn't rely on deprecated Google Places APIs
const ModernLocationSearch: React.FC<{
  onSelect: (location: { name: string; lat: number; lon: number }) => void;
  homeLocation?: { lat: number; lon: number };
  placeholder?: string;
  onInputFocus?: () => void;
}> = ({ onSelect, placeholder = "Search for location", onInputFocus }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use OpenWeather Geocoding API as fallback
  const searchLocations = useCallback((searchQuery: string) => {
    const debouncedSearch = debounce(async () => {
      if (!searchQuery.trim() || searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        if (!apiKey) {
          throw new Error('API key not configured');
        }

        // Use OpenWeather Geocoding API for location search
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchQuery)}&limit=5&appid=${apiKey}`,
          { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          }
        );

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Transform to consistent format
        const transformedSuggestions = data.map((item: {
          name: string;
          lat: number;
          lon: number;
          country?: string;
          state?: string;
          local_names?: Record<string, string>;
        }) => {
          let displayName = item.name;
          
          if (item.state && item.state !== item.name) {
            displayName += `, ${item.state}`;
          }
          
          if (item.country) {
            displayName += `, ${item.country}`;
          }

          return {
            name: displayName,
            lat: item.lat,
            lon: item.lon,
            country: item.country,
            state: item.state,
            local_names: item.local_names
          };
        });

        setSuggestions(transformedSuggestions);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Location search error:', err);
          setError('Search temporarily unavailable. Please try again.');
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    
    debouncedSearch();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    searchLocations(value);
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    onSelect({
      name: suggestion.name,
      lat: suggestion.lat,
      lon: suggestion.lon
    });
    setQuery('');
    setSuggestions([]);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="modern-location-search">
      <div className="coastal-dialog-search-container">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={onInputFocus}
          placeholder={loading ? "Searching..." : placeholder}
          className="coastal-dialog-input"
          disabled={loading}
        />
        {query && (
          <button
            className="coastal-dialog-search-clear"
            onClick={clearSearch}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div style={{
          color: '#dc2626',
          fontSize: '0.9rem',
          marginTop: '8px',
          padding: '8px',
          background: '#fee2e2',
          borderRadius: '6px'
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{
          color: '#7c2d12',
          fontSize: '0.9rem',
          marginTop: '8px',
          padding: '8px',
          background: '#fef3c7',
          borderRadius: '6px'
        }}>
          🔍 Searching locations...
        </div>
      )}

      {suggestions.length > 0 && (
        <ul className="coastal-dialog-list" style={{ marginTop: '8px' }}>
          {suggestions.map((suggestion, index) => (
            <li key={index} className="coastal-dialog-list-item">
              <button
                className="coastal-dialog-list-btn"
                onClick={() => handleSelect(suggestion)}
              >
                <div className="coastal-dialog-search-result">
                  <span className="coastal-dialog-result-type">📍</span>
                  <div className="coastal-dialog-result-content">
                    <span className="coastal-dialog-result-main">{suggestion.name}</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ModernLocationSearch;
