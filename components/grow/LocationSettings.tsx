import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { MapPin, Save, Loader2, CheckCircle, AlertCircle, Navigation, Map } from 'lucide-react';
import { api } from '../../lib/grow/api';
import {
  usePlacesAutocompleteNew as usePlacesAutocomplete,
  getGeocode,
  getLatLng,
  type PlacePrediction,
} from '../../lib/hooks/usePlacesAutocompleteNew';
import { MapPicker } from './MapPicker';

interface LocationSettingsProps {
  currentLocation?: string;
  onLocationUpdate?: (location: string) => void;
}

interface BasicLocation {
  name: string;
  lat: number;
  lon: number;
}

interface NominatimResponse {
  name?: string;
  display_name?: string;
  address?: {
    beach?: string;
    water?: string;
    amenity?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city?: string;
    county?: string;
    state?: string;
    region?: string;
  };
}

export function LocationSettings({ currentLocation = '', onLocationUpdate }: LocationSettingsProps) {
  const [location, setLocation] = useState(currentLocation);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [climateZone, setClimateZone] = useState<string | null>(null);
  
  // New state for enhanced features
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);
  const [recentLocations, setRecentLocations] = useState<BasicLocation[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const RECENT_KEY = 'grow_daisy_recent_locations';

  // Google Places Autocomplete
  const {
    ready,
    value: searchValue,
    suggestions: { status, data },
    setValue: setSearchValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    requestOptions: {
      types: ['geocode']
    },
  });

  useEffect(() => {
    setLocation(currentLocation);
  }, [currentLocation]);

  // Load saved home location from database when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadSavedLocation = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const { createClient } = await import('@supabase/supabase-js');
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../../lib/supabase/env');

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prefs } = await supabase
            .from('user_location_preferences')
            .select('home_place_name, home_coordinates')
            .eq('user_id', user.id)
            .maybeSingle();

          if (prefs?.home_place_name) {
            setLocation(prefs.home_place_name);
            if (prefs.home_coordinates && typeof prefs.home_coordinates === 'object') {
              const coords = prefs.home_coordinates as { lat?: number; lon?: number };
              if (coords.lat && coords.lon) {
                setSelectedCoords({ lat: coords.lat, lon: coords.lon });
              }
            }
          }
        }
      } catch (error) {
        // Silent failure - will use prop value
      }
    };

    loadSavedLocation();
  }, [isOpen]);

  // Load recent locations
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BasicLocation[];
        setRecentLocations(parsed.slice(0, 5));
      }
    } catch (_error) {
      // Silent failure - will show empty recent list
    }
  }, [isOpen]);

  // Add location to recents
  const addRecentLocation = (loc: BasicLocation) => {
    setRecentLocations(prev => {
      const filtered = prev.filter(r => r.name !== loc.name);
      const updated = [loc, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch (_error) {
        // Silent failure
      }
      return updated;
    });
  };

  // Set timeout for Google Maps loading
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      setShowLoadingTimeout(true);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  // Reverse geocode coordinates to friendly name
  const reverseGeocodeName = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=14`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GrowDaisy/1.0'
        }
      });
      if (!res.ok) return null;
      const json: NominatimResponse = await res.json();
      
      // Build friendly name
      const disp = json?.name || json?.display_name;
      if (disp) return disp;
      
      const addr = json?.address || {};
      const name = addr.village || addr.town || addr.city || addr.county;
      const region = addr.state || addr.region;
      
      if (name && region) return `${name}, ${region}`;
      if (name) return name;
      return null;
    } catch {
      return null;
    }
  };

  // Get current location using browser geolocation
  const getCurrentLocation = async () => {
    setErrorMessage('');
    if (!('geolocation' in navigator)) {
      setErrorMessage('Geolocation is not available in this browser.');
      return;
    }

    try {
      setIsLocating(true);
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // Get friendly name
      const friendly = await reverseGeocodeName(lat, lon);
      const locationName = friendly || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      
      // Save this location
      const locData: BasicLocation = { name: locationName, lat, lon };
      addRecentLocation(locData);
      await saveLocation(locationName, lat, lon);
      
    } catch (err: unknown) {
      let msg = 'Unable to get your location.';
      if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code: number }).code;
        if (code === 1) msg = 'Location permission denied.';
        else if (code === 2) msg = 'Position unavailable.';
        else if (code === 3) msg = 'Location timeout.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLocating(false);
    }
  };

  // Handle Google Places suggestion click
  const handleSuggestionClick = async (suggestion: PlacePrediction) => {
    setErrorMessage('');
    setIsLoadingSuggestion(true);

    try {
      const results = await getGeocode({ placeId: suggestion.place_id });
      if (!results?.length) {
        throw new Error('Unable to find coordinates for this location');
      }

      const { lat, lng } = getLatLng(results[0]);
      const locationName = suggestion.structured_formatting?.main_text || suggestion.description;
      
      const locData: BasicLocation = { name: locationName, lat, lon: lng };
      addRecentLocation(locData);
      await saveLocation(locationName, lat, lng);
      
    } catch (err) {
      console.error('Failed to geocode location:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to get location details');
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Handle map selection
  const handleMapSelect = async (lat: number, lon: number) => {
    const friendly = await reverseGeocodeName(lat, lon);
    const locationName = friendly || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    
    const locData: BasicLocation = { name: locationName, lat, lon };
    addRecentLocation(locData);
    setSelectedCoords({ lat, lon });
    await saveLocation(locationName, lat, lon);
  };

  // Handle recent location click
  const handleRecentClick = async (loc: BasicLocation) => {
    await saveLocation(loc.name, loc.lat, loc.lon);
  };

  // Save location (extracted common logic)
  const saveLocation = async (locationName: string, lat?: number, lon?: number) => {
    if (!locationName.trim()) {
      setErrorMessage('Please enter a location');
      setSaveStatus('error');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      // Always update localStorage first (offline-first)
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          user.location = locationName;
          localStorage.setItem('currentUser', JSON.stringify(user));
        } catch (_error) {
          // Invalid JSON
        }
      }

      const interestsStr = localStorage.getItem('userInterests');
      let interests: Record<string, unknown> = {};
      if (interestsStr) {
        try {
          interests = JSON.parse(interestsStr);
        } catch (_error) {
          // Invalid JSON
        }
      }
      
      interests.location = locationName;
      if (lat !== undefined && lon !== undefined) {
        interests.latitude = lat;
        interests.longitude = lon;
      }
      localStorage.setItem('userInterests', JSON.stringify(interests));

      // Try to sync with backend if authenticated
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const response = await api.updateUserLocation(locationName);
          if (response.climate_zone) {
            setClimateZone(response.climate_zone);

            // Update localStorage with climate zone from backend
            interests.climate_zone = response.climate_zone;
            if (response.coordinates) {
              interests.latitude = response.coordinates.lat;
              interests.longitude = response.coordinates.lon;
            }
            localStorage.setItem('userInterests', JSON.stringify(interests));
          }
        }
      } catch (error: unknown) {
        // Backend sync failed - location still saved locally
      }
      
      setSaveStatus('success');
      setLocation(locationName);
      
      // Update parent component
      if (onLocationUpdate) {
        onLocationUpdate(locationName);
      }

      // Clear suggestions and close dialog after 1 second
      clearSuggestions();
      setSearchValue('');
      setTimeout(() => {
        setIsOpen(false);
        setSaveStatus('idle');
        setShowMapPicker(false);
      }, 1000);
    } catch (error: unknown) {
      console.error('Failed to update location:', error);
      const message = error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : 'Failed to save location. Please try again.';
      setErrorMessage(message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Legacy text input save (for typing custom location)
  const handleManualSave = async () => {
    await saveLocation(location);
  };

  const getDisplayLocation = () => {
    if (currentLocation) {
      return currentLocation;
    }
    return 'Not set';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">{getDisplayLocation()}</span>
          <span className="sm:hidden">Location</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Set Your Location
          </DialogTitle>
          <DialogDescription>
            Enter your garden location to get personalized growing recommendations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Current Saved Location - Show at top */}
          {currentLocation && !isSaving && saveStatus === 'idle' && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs text-green-900 mb-1 font-medium">Current location:</p>
              <Badge variant="secondary" className="text-sm bg-white">
                <MapPin className="h-3 w-3 mr-1" />
                {currentLocation}
              </Badge>
            </div>
          )}
          {/* Google Places Search - Only show if available */}
          {ready && (
            <div className="space-y-2">
              <Label htmlFor="search">Search for your location</Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="search"
                  type="text"
                  placeholder="Search for a town or postcode..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  disabled={isLoadingSuggestion}
                  className="pr-10"
                />
                {isLoadingSuggestion && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {status === 'OK' && data?.length > 0 && (
                <div className="absolute z-50 w-full max-w-[calc(100%-3rem)] mt-1 bg-background rounded-lg border shadow-lg max-h-64 overflow-auto">
                  {data.map((suggestion, idx) => {
                    const main = suggestion.structured_formatting?.main_text || suggestion.description;
                    const secondary = suggestion.structured_formatting?.secondary_text;
                    return (
                      <button
                        key={suggestion.place_id || idx}
                        className="w-full text-left px-3 py-2 hover:bg-muted focus:bg-muted transition-colors"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-sm">{main}</span>
                          {secondary && (
                            <span className="text-xs text-muted-foreground">{secondary}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Permission error message */}
              {status === 'ERROR' && searchValue && (
                <div className="absolute z-50 w-full max-w-[calc(100%-3rem)] mt-1 bg-destructive/10 border border-destructive/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Google Maps API configuration needed
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Autocomplete requires API setup. Meanwhile, you can:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use &quot;Current location&quot; button below</li>
                    <li>• Pick from map</li>
                    <li>• Type manually and press Enter</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    See console (F12) for setup instructions
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Or use current location, pick from map, or type manually below
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isLocating}
              className="flex items-center gap-2"
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {isLocating ? 'Locating...' : 'Current location'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMapPicker(!showMapPicker)}
              className="flex items-center gap-2"
            >
              <Map className="h-4 w-4" />
              {showMapPicker ? 'Hide map' : 'Pick from map'}
            </Button>
          </div>

          {/* Loading message */}
          {!ready && showLoadingTimeout && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              <p className="font-medium mb-1">Enhanced search not available</p>
              <p className="text-xs">You can still use &quot;Current location&quot; or type your location manually below.</p>
            </div>
          )}

          {/* Map Picker */}
          {showMapPicker && (
            <div className="mt-3">
              <MapPicker
                homeLocation={selectedCoords || undefined}
                onSelect={handleMapSelect}
              />
            </div>
          )}

          {/* Recent Locations */}
          {recentLocations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Recent locations</Label>
              <div className="flex flex-wrap gap-2">
                {recentLocations.map((loc, idx) => (
                  <Badge
                    key={`${loc.name}-${idx}`}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleRecentClick(loc)}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {loc.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Manual Input (fallback) */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="location" className="text-xs">Or type manually</Label>
            <Input
              id="location"
              placeholder="e.g., Colunga, Asturias"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualSave();
                }
              }}
            />
          </div>

          {/* Status Messages */}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <div className="flex-1">
                <span className="text-sm font-medium">Location saved successfully!</span>
                {climateZone && (
                  <div className="text-xs mt-1 text-green-700">
                    Climate zone: <strong>{climateZone.replace(/_/g, ' ')}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleManualSave}
              disabled={isSaving || !location.trim()}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Location
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setSaveStatus('idle');
                setErrorMessage('');
                setSearchValue('');
                clearSuggestions();
                setShowMapPicker(false);
              }}
            >
              Cancel
            </Button>
          </div>

          {/* Info Box - More concise */}
          <div className="text-xs text-muted-foreground text-center">
            <strong>Why location matters:</strong> Determines your climate zone and frost dates for personalized recommendations
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}