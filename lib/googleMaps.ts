// src/lib/googleMaps.ts
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: import.meta.env.VITE_GMAPS_KEY || process.env.NEXT_PUBLIC_GMAPS_KEY!,
  version: 'weekly',
  libraries: ['places'],
});

let googlePromise: Promise<typeof google> | null = null;

export function loadGoogleMaps() {
  if (!googlePromise) {
    googlePromise = loader.load();   // loads once and caches
  }
  return googlePromise;
}