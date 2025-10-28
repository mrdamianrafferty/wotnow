// src/lib/googleMaps.ts
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
  libraries: ['places'],
});

let googlePromise: Promise<typeof google> | null = null;
let isLoaded = false;
let loadError: Error | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (isLoaded && window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (loadError) {
    return Promise.reject(loadError);
  }

  if (!googlePromise) {
    googlePromise = loader.load()
      .then((google) => {
        isLoaded = true;
        loadError = null;
        return google;
      })
      .catch((error) => {
        loadError = error;
        googlePromise = null; // Allow retry

        // Provide helpful error messages for common issues
        if (error.message?.includes('RefererNotAllowedMapError')) {
          const helpfulError = new Error(
            'Google Maps API key not authorized for this domain. ' +
            'Please add this domain to the API key restrictions in Google Cloud Console. ' +
            'See docs/GOOGLE_MAPS_API_SETUP.md for instructions.'
          );
          (helpfulError as Error & { originalError?: Error }).originalError = error;
          throw helpfulError;
        }

        if (error.message?.includes('ApiNotActivatedMapError')) {
          const helpfulError = new Error(
            'Google Maps JavaScript API is not enabled. ' +
            'Please enable it in Google Cloud Console > APIs & Services > Library.'
          );
          (helpfulError as Error & { originalError?: Error }).originalError = error;
          throw helpfulError;
        }

        throw error;
      });
  }
  return googlePromise;
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded && window.google?.maps?.places !== undefined;
}

export default loadGoogleMaps;
