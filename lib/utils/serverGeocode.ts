/**
 * Server-side geocoding: OpenStreetMap Nominatim (free, no key) primary,
 * OpenWeather Geocoding API as a fallback for resilience.
 *
 * Nominatim usage policy requires a descriptive User-Agent and caps at
 * ~1 req/sec — fine for our traffic, most calls are cached by callers anyway.
 */
import { getOpenWeatherKey } from './openWeatherKey';

const NOMINATIM_USER_AGENT = 'WotNow-GoDaisy-GrowDaisy/1.0 (contact: damian@flyglobalmusic.com)';

export interface GeocodeResult {
  lat: number;
  lon: number;
  name: string;
  displayName: string;
  country?: string;
  state?: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name?: string;
  name?: string;
  address?: { country?: string; state?: string };
}

function fromNominatimItem(item: NominatimItem): GeocodeResult {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  const name = item.name || item.display_name?.split(',')[0] || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  return {
    lat,
    lon,
    name,
    displayName: item.display_name || name,
    country: item.address?.country,
    state: item.address?.state,
  };
}

async function fetchNominatimForward(query: string, limit: number): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim forward geocode failed: ${res.status}`);
  const data = (await res.json()) as NominatimItem[];
  return Array.isArray(data) ? data.map(fromNominatimItem) : [];
}

async function fetchNominatimReverse(lat: number, lon: number): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim reverse geocode failed: ${res.status}`);
  const item = (await res.json()) as NominatimItem | { error?: string };
  if (!item || !('lat' in item) || !item.lat) return null;
  return fromNominatimItem(item as NominatimItem);
}

interface OpenWeatherGeoItem {
  name: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
}

function fromOpenWeatherItem(item: OpenWeatherGeoItem): GeocodeResult {
  return {
    lat: item.lat,
    lon: item.lon,
    name: item.name,
    displayName: [item.name, item.state, item.country].filter(Boolean).join(', '),
    country: item.country,
    state: item.state,
  };
}

async function fetchOpenWeatherForward(query: string, limit: number, apiKey: string): Promise<GeocodeResult[]> {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather forward geocode failed: ${res.status}`);
  const data = (await res.json()) as OpenWeatherGeoItem[];
  return Array.isArray(data) ? data.map(fromOpenWeatherItem) : [];
}

async function fetchOpenWeatherReverse(lat: number, lon: number, apiKey: string): Promise<GeocodeResult | null> {
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather reverse geocode failed: ${res.status}`);
  const data = (await res.json()) as OpenWeatherGeoItem[];
  return Array.isArray(data) && data.length ? fromOpenWeatherItem(data[0]) : null;
}

/** Forward geocode: place name -> coordinates. Nominatim primary, OpenWeather fallback. */
export async function geocodeForward(query: string, limit = 5): Promise<GeocodeResult[]> {
  try {
    const results = await fetchNominatimForward(query, limit);
    if (results.length) return results;
  } catch (err) {
    console.warn('[serverGeocode] Nominatim forward failed, falling back to OpenWeather:', err);
  }

  const apiKey = getOpenWeatherKey();
  if (!apiKey) return [];
  try {
    return await fetchOpenWeatherForward(query, limit, apiKey);
  } catch (err) {
    console.warn('[serverGeocode] OpenWeather forward geocode failed:', err);
    return [];
  }
}

/** Reverse geocode: coordinates -> place name. Nominatim primary, OpenWeather fallback. */
export async function geocodeReverse(lat: number, lon: number): Promise<GeocodeResult | null> {
  try {
    const result = await fetchNominatimReverse(lat, lon);
    if (result) return result;
  } catch (err) {
    console.warn('[serverGeocode] Nominatim reverse failed, falling back to OpenWeather:', err);
  }

  const apiKey = getOpenWeatherKey();
  if (!apiKey) return null;
  try {
    return await fetchOpenWeatherReverse(lat, lon, apiKey);
  } catch (err) {
    console.warn('[serverGeocode] OpenWeather reverse geocode failed:', err);
    return null;
  }
}
