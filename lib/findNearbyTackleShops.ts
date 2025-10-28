// lib/findNearbyTackleShops.ts
import { loadGoogleMaps } from './googleMaps';

export interface TackleShop {
  name: string;
  placeId: string;
  address: string;
  location: { lat: number; lng: number };
  distance?: number;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  photos?: string[];
  website?: string;
  phoneNumber?: string;
}

interface CachedTackleShops {
  shops: TackleShop[];
  timestamp: number;
  location: { lat: number; lng: number };
}

const CACHE_KEY_PREFIX = 'findr_tackle_shops_';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const COARSE_RADIUS_METERS = 50000; // 50km - generous search radius

/**
 * Round coordinates to reduce cache keys
 * 0.5 degrees ≈ 55km, good for coarse caching
 */
function roundCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 2) / 2, // Round to nearest 0.5
    lng: Math.round(lng * 2) / 2,
  };
}

function getCacheKey(lat: number, lng: number): string {
  const rounded = roundCoordinates(lat, lng);
  return `${CACHE_KEY_PREFIX}${rounded.lat}_${rounded.lng}`;
}

function getCachedShops(lat: number, lng: number): TackleShop[] | null {
  try {
    const cacheKey = getCacheKey(lat, lng);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const data: CachedTackleShops = JSON.parse(cached);
    const age = Date.now() - data.timestamp;

    // Check if cache is still valid (30 days)
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(`[Tackle Shops] Cache hit (age: ${Math.round(age / (24 * 60 * 60 * 1000))} days)`);
    return data.shops;
  } catch (error) {
    console.error('[Tackle Shops] Cache read error:', error);
    return null;
  }
}

function setCachedShops(lat: number, lng: number, shops: TackleShop[]): void {
  try {
    const cacheKey = getCacheKey(lat, lng);
    const data: CachedTackleShops = {
      shops,
      timestamp: Date.now(),
      location: roundCoordinates(lat, lng),
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
    console.log(`[Tackle Shops] Cached ${shops.length} shops for 30 days`);
  } catch (error) {
    console.error('[Tackle Shops] Cache write error:', error);
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearby tackle shops using Google Places API
 * Results are cached for 30 days using coarse location rounding
 */
export async function findNearbyTackleShops(
  latitude: number,
  longitude: number
): Promise<TackleShop[]> {
  // Check cache first
  const cached = getCachedShops(latitude, longitude);
  if (cached) {
    return cached;
  }

  try {
    const google = await loadGoogleMaps();

    const request = {
      location: new google.maps.LatLng(latitude, longitude),
      radius: COARSE_RADIUS_METERS,
      type: 'sporting_goods_store',
      keyword: 'fishing tackle bait shop angling',
    };

    return new Promise((resolve, reject) => {
      const service = new google.maps.places.PlacesService(
        document.createElement('div')
      );

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const shops: TackleShop[] = results
            .filter((place) => {
              // Filter for fishing-related shops
              const name = place.name?.toLowerCase() || '';
              const types = place.types || [];
              return (
                name.includes('fish') ||
                name.includes('tackle') ||
                name.includes('bait') ||
                name.includes('angl') ||
                types.includes('sporting_goods_store')
              );
            })
            .map((place) => {
              const shopLat = place.geometry?.location?.lat() || 0;
              const shopLng = place.geometry?.location?.lng() || 0;
              const distance = calculateDistance(latitude, longitude, shopLat, shopLng);

              return {
                name: place.name || 'Unknown Shop',
                placeId: place.place_id || '',
                address: place.vicinity || '',
                location: { lat: shopLat, lng: shopLng },
                distance: Math.round(distance * 10) / 10, // Round to 1 decimal
                rating: place.rating,
                userRatingsTotal: place.user_ratings_total,
                openNow: place.opening_hours?.open_now,
                photos: place.photos?.slice(0, 1).map((photo) =>
                  photo.getUrl({ maxWidth: 400 })
                ),
              };
            })
            .sort((a, b) => (a.distance || 0) - (b.distance || 0)) // Sort by distance
            .slice(0, 5); // Limit to top 5

          // Cache the results
          setCachedShops(latitude, longitude, shops);

          console.log(`[Tackle Shops] Found ${shops.length} shops within ${COARSE_RADIUS_METERS / 1000}km`);
          resolve(shops);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          // Cache empty result to avoid repeated API calls
          setCachedShops(latitude, longitude, []);
          console.log('[Tackle Shops] No shops found in area');
          resolve([]);
        } else {
          console.error('[Tackle Shops] Search failed:', status);
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error('[Tackle Shops] Error finding shops:', error);
    throw error;
  }
}
