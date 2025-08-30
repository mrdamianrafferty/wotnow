// src/lib/googleMaps.ts
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GMAPS_KEY || '',
  version: 'weekly',
  libraries: ['places'],
});

let googlePromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (!googlePromise) {
    googlePromise = loader.load();
  }
  return googlePromise;
}

export default loadGoogleMaps;
