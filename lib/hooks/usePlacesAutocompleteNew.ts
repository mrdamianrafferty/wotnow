import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Custom hook for Google Maps Places Autocomplete using the new API
 * Migrated from use-places-autocomplete to use google.maps.places.AutocompleteService (old) 
 * but properly loaded via dynamic import
 * 
 * Note: We're still using the old AutocompleteService for now since the new AutocompleteSuggestion
 * has complex type requirements. This hook properly loads the library dynamically.
 * 
 * @see https://developers.google.com/maps/documentation/javascript/places-migration-overview
 */

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface UsePlacesAutocompleteOptions {
  debounce?: number;
  requestOptions?: {
    types?: string[];
    componentRestrictions?: { country: string | string[] };
  };
}

export interface UsePlacesAutocompleteReturn {
  ready: boolean;
  value: string;
  suggestions: {
    status: string;
    data: PlacePrediction[];
  };
  setValue: (value: string, shouldFetchData?: boolean) => void;
  clearSuggestions: () => void;
}

export function usePlacesAutocompleteNew(
  options: UsePlacesAutocompleteOptions = {}
): UsePlacesAutocompleteReturn {
  const { debounce = 300, requestOptions = {} } = options;
  
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<{
    status: string;
    data: PlacePrediction[];
  }>({
    status: '',
    data: [],
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  // Load Google Maps Places library dynamically using event-based pattern
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initService = async () => {
      try {
        console.log('🔄 Initializing Google Places Autocomplete service...');
        // Use dynamic import as recommended
        const { AutocompleteService } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
        autocompleteServiceRef.current = new AutocompleteService();
        setReady(true);
        console.log('✅ Google Places Autocomplete ready');
      } catch (error) {
        console.error('❌ Failed to load Google Maps Places library:', error);
        setReady(false);
      }
    };

    const handleGoogleMapsLoaded = () => {
      console.log('🎉 Received googleMapsLoaded event');
      initService();
    };

    const handleGoogleMapsError = () => {
      console.error('❌ Google Maps failed to load');
      setReady(false);
    };

    // Check if Google Maps is already loaded (fast page loads)
    if (window.google?.maps) {
      console.log('✅ Google Maps already loaded, initializing immediately');
      initService();
    } else {
      // Not loaded yet - wait for the event from _document.tsx
      console.log('⏳ Waiting for Google Maps to load via callback...');
      window.addEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
      window.addEventListener('googleMapsLoadError', handleGoogleMapsError);

      // Cleanup listeners on unmount
      return () => {
        window.removeEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
        window.removeEventListener('googleMapsLoadError', handleGoogleMapsError);
      };
    }
  }, []);

  const fetchSuggestions = useCallback(
    (input: string) => {
      if (!ready || !autocompleteServiceRef.current || !input.trim()) {
        setSuggestions({ status: '', data: [] });
        return;
      }

      const request: google.maps.places.AutocompletionRequest = {
        input,
        ...requestOptions,
      };

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const data: PlacePrediction[] = predictions.map((prediction) => ({
              place_id: prediction.place_id,
              description: prediction.description,
              structured_formatting: {
                main_text: prediction.structured_formatting.main_text,
                secondary_text: prediction.structured_formatting.secondary_text || '',
              },
            }));

            setSuggestions({
              status: 'OK',
              data,
            });
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions({
              status: 'ZERO_RESULTS',
              data: [],
            });
          } else {
            setSuggestions({
              status: 'ERROR',
              data: [],
            });
          }
        }
      );
    },
    [ready, requestOptions]
  );

  const handleSetValue = useCallback(
    (newValue: string, shouldFetchData = true) => {
      setValue(newValue);

      if (!shouldFetchData) {
        return;
      }

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the fetch
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(newValue);
      }, debounce);
    },
    [debounce, fetchSuggestions]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions({ status: '', data: [] });
    
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ready,
    value,
    suggestions,
    setValue: handleSetValue,
    clearSuggestions,
  };
}

// Utility functions to match the old API
export async function getGeocode(args: { placeId?: string; address?: string }): Promise<google.maps.GeocoderResult[]> {
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode(args, (results, status) => {
      if (status === 'OK' && results) {
        resolve(results);
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

export function getLatLng(result: google.maps.GeocoderResult): { lat: number; lng: number } {
  return {
    lat: result.geometry.location.lat(),
    lng: result.geometry.location.lng(),
  };
}
