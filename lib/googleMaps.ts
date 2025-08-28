// src/lib/googleMaps.ts
import { Loader } from '@googlemaps/js-api-loader';

let googlePromise: Promise<typeof google> | null = null;
let loader: Loader | null = null;

export function loadGoogleMaps() {
  if (!googlePromise) {
    // Check if Google Maps is already loaded
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      googlePromise = Promise.resolve(window.google);
    } else {
      // Only create loader if one doesn't exist
      if (!loader) {
        loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places'],
        });
      }
      googlePromise = loader.load();
    }
  }
  return googlePromise;
}