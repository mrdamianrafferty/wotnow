// src/lib/googleMaps.ts
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
  libraries: ['places'],
});

let googlePromise: Promise<typeof google> | null = null;
let isLoaded = false;

export function loadGoogleMaps(): Promise<typeof google> {
  if (isLoaded && window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }
  
  if (!googlePromise) {
    googlePromise = loader.load().then((google) => {
      isLoaded = true;
      return google;
    });
  }
  return googlePromise;
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded && window.google?.maps?.places !== undefined;
}

export default loadGoogleMaps;
