/**
 * Server-side geocoding: OpenStreetMap Nominatim (free, no key) primary,
 * OpenWeather Geocoding API as a fallback for resilience.
 *
 * Nominatim usage policy requires a descriptive User-Agent and caps at
 * ~1 req/sec — fine for our traffic, most calls are cached by callers anyway.
 */

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


/**
 * The second opinion, from Open-Meteo rather than OpenWeather.
 *
 * No key, and it is the same geocoder `/start` searches with — so a place the
 * onboarding flow can name is a place this can resolve, which was not true
 * before. Open-Meteo publishes no REVERSE geocoder, so there is no second
 * opinion for coordinates any more: Nominatim answers or nothing does. That is
 * the one capability lost in dropping OpenWeather, and it is a fallback to a
 * fallback rather than a feature.
 */
async function fetchOpenMeteoForward(query: string, limit: number): Promise<GeocodeResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
    `&count=${limit}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forward geocode failed: ${res.status}`);
  const data = (await res.json()) as {
    results?: Array<{ name: string; latitude: number; longitude: number; country?: string; admin1?: string }>;
  };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    // Open-Meteo has no single display string, so it is composed from the parts
    // it does publish — the same "Town, Region, Country" Nominatim returns.
    displayName: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    country: r.country,
    state: r.admin1,
  }));
}

/** Forward geocode: place name -> coordinates. Nominatim primary, Open-Meteo second. */
export async function geocodeForward(query: string, limit = 5): Promise<GeocodeResult[]> {
  try {
    const results = await fetchNominatimForward(query, limit);
    if (results.length) return results;
  } catch (err) {
    console.warn('[serverGeocode] Nominatim forward failed, trying Open-Meteo:', err);
  }

  try {
    return await fetchOpenMeteoForward(query, limit);
  } catch (err) {
    console.warn('[serverGeocode] Open-Meteo forward geocode failed:', err);
    return [];
  }
}

/** Reverse geocode: coordinates -> place name. Nominatim only — see `fetchOpenMeteoForward`. */
export async function geocodeReverse(lat: number, lon: number): Promise<GeocodeResult | null> {
  try {
    const result = await fetchNominatimReverse(lat, lon);
    if (result) return result;
  } catch (err) {
    console.warn('[serverGeocode] Nominatim reverse failed:', err);
  }
  return null;
}
