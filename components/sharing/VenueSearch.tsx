"use client";

import { useState, useEffect, useCallback } from 'react';
import { loadGoogleMaps } from '../../lib/googleMaps';
import { useUserPreferences } from '../../context/UserPreferencesContext';

interface Venue {
  placeId: string;
  name: string;
  address: string;
  latLng: { lat: number; lng: number };
  rating?: number;
  priceLevel?: number;
  photoUrl?: string;
}

interface VenueSearchProps {
  activityName: string;
  maxSelections: number;
  onVenuesSelected: (venues: Venue[]) => void;
}

// -----------------------------------------------------------------------------
// Cost-safe sessionStorage cache for Places Text Search.
// Added 2026-07-02 after a €400 (Mar) + €363 (Jun) Places API — Text Search bill.
// Text Search is billed per call ($32/1000). Backspace-and-retype, or two users
// typing the same phrase, previously re-billed. This cache eliminates that.
// -----------------------------------------------------------------------------
const CACHE_KEY_PREFIX = 'venue-search:v1:';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min per session — long enough for a browse session, short enough that "recently updated" places refresh
const CACHE_MAX_ENTRIES = 100;       // hard cap so sessionStorage doesn't bloat

function cacheKeyFor(query: string, activityName: string, lat: number, lng: number): string {
  // Round coords to ~1km so that trivial GPS jitter doesn't bust the cache.
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `${CACHE_KEY_PREFIX}${activityName}|${roundedLat},${roundedLng}|${query.trim().toLowerCase()}`;
}

function readCache(key: string): Venue[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; results: Venue[] };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed.results;
  } catch {
    return null;
  }
}

function writeCache(key: string, results: Venue[]): void {
  try {
    if (typeof window === 'undefined') return;
    // Only cache non-empty results — ZERO_RESULTS is often a transient input, and
    // caching empty results would prevent the user seeing a real hit if they
    // finish typing.
    if (results.length === 0) return;
    // Best-effort eviction: if we're at cap, drop 10 oldest venue-search entries.
    const allKeys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(CACHE_KEY_PREFIX)) allKeys.push(k);
    }
    if (allKeys.length >= CACHE_MAX_ENTRIES) {
      // Sort by write timestamp ascending; drop the oldest 10.
      const withTs = allKeys.map(k => {
        try {
          const p = JSON.parse(window.sessionStorage.getItem(k) || '{}');
          return { k, ts: typeof p.ts === 'number' ? p.ts : 0 };
        } catch { return { k, ts: 0 }; }
      }).sort((a, b) => a.ts - b.ts);
      for (const e of withTs.slice(0, 10)) window.sessionStorage.removeItem(e.k);
    }
    window.sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), results }));
  } catch {
    // sessionStorage can throw (quota, private mode). Silently fall through — we
    // still return the fetched results to the user; we just won't cache them.
  }
}

export const VenueSearch: React.FC<VenueSearchProps> = ({
  activityName,
  maxSelections,
  onVenuesSelected
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Venue[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<Venue[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const { preferences } = useUserPreferences();

  // Initialize Google Maps Places service
  useEffect(() => {
    loadGoogleMaps().then((google) => {
      const map = new google.maps.Map(document.createElement('div'));
      const service = new google.maps.places.PlacesService(map);
      setPlacesService(service);
    }).catch(console.error);
  }, []);

  // Search for places using Google Places API
  const searchPlaces = useCallback((query: string) => {
    if (!placesService || !query.trim()) {
      setSearchResults([]);
      return;
    }

    // Get user's home location or fallback to London
    const homeLocation = preferences.locations.find(l => l.type === 'home') || preferences.locations[0];
    const lat = homeLocation ? homeLocation.lat : 51.5074;
    const lng = homeLocation ? homeLocation.lon : -0.1278; // London fallback
    const searchLocation = new google.maps.LatLng(lat, lng);

    // ---- Cache check first (avoids billing on backspace-and-retype) ----
    const cacheKey = cacheKeyFor(query, activityName, lat, lng);
    const cached = readCache(cacheKey);
    if (cached) {
      setSearchResults(cached);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const request: google.maps.places.TextSearchRequest = {
      query: `${query} ${activityName}`,
      location: searchLocation,
      radius: 50000, // 50km radius
    };

    placesService.textSearch(request, (results, status) => {
      setIsSearching(false);

      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const venues: Venue[] = results.slice(0, 10).map(place => ({
          placeId: place.place_id || '',
          name: place.name || '',
          address: place.formatted_address || '',
          latLng: {
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0
          },
          rating: place.rating,
          priceLevel: place.price_level,
          photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 200 })
        }));
        setSearchResults(venues);
        writeCache(cacheKey, venues);
      } else {
        setSearchResults([]);
      }
    });
  }, [placesService, preferences.locations, activityName]);

  useEffect(() => {
    // Require >=3 chars AND a longer 500ms debounce so a user typing "salmon
    // river" doesn't fire 5 Text Search calls on the way. Each keystroke
    // charged $0.032 before this change.
    if (searchQuery.trim().length >= 3) {
      const timer = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchPlaces]);

  useEffect(() => {
    onVenuesSelected(selectedVenues);
  }, [selectedVenues, onVenuesSelected]);

  const toggleVenueSelection = (venue: Venue) => {
    setSelectedVenues(prev => {
      const isSelected = prev.some(v => v.placeId === venue.placeId);
      if (isSelected) {
        return prev.filter(v => v.placeId !== venue.placeId);
      } else if (prev.length < maxSelections) {
        return [...prev, venue];
      }
      return prev;
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder={`Search venues for ${activityName.replace(/_/g, ' ')}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        />
        <svg
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {selectedVenues.length > 0 && (
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-2">
            Selected ({selectedVenues.length}/{maxSelections})
          </h4>
          <div className="space-y-2">
            {selectedVenues.map(venue => (
              <div key={venue.placeId} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{venue.name}</div>
                  <div className="text-xs text-gray-600">{venue.address.split(',')[0]}</div>
                </div>
                <button
                  onClick={() => toggleVenueSelection(venue)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div>
          <h4 className="font-medium text-sm text-gray-900 mb-3">Available venues</h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {searchResults.map(venue => {
              const isSelected = selectedVenues.some(v => v.placeId === venue.placeId);
              return (
                <div
                  key={venue.placeId}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleVenueSelection(venue)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 text-sm leading-tight mb-1">{venue.name}</h5>
                      <p className="text-xs text-gray-600 mb-2">{venue.address}</p>
                      <div className="flex items-center gap-2">
                        {venue.rating && (
                          <div className="flex items-center text-xs">
                            <span className="text-yellow-400 mr-1">★</span>
                            <span className="text-gray-700">{venue.rating}</span>
                          </div>
                        )}
                        {venue.priceLevel && (
                          <div className="text-sm text-gray-600">
                            {'£'.repeat(venue.priceLevel)}
                            {Array.from({ length: Math.max(0, 3 - venue.priceLevel) }).map((_, i) => (
                              <span key={i} className="text-gray-300">£</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-blue-600 flex-shrink-0">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searchQuery.length > 2 && searchResults.length === 0 && !isSearching && (
        <div className="text-center py-4 text-gray-500">
          No venues found. Try a different search term.
        </div>
      )}
    </div>
  );
};
