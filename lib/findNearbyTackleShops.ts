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
  // openNow removed - deprecated API, would need expensive getDetails() calls
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
 * Get place name from coordinates for more specific searches
 */
async function getPlaceName(latitude: number, longitude: number): Promise<string | null> {
  try {
    const geocoder = new google.maps.Geocoder();
    const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
      geocoder.geocode(
        { location: { lat: latitude, lng: longitude } },
        (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        }
      );
    });

    // Try to get locality (city/town) from address components
    for (const res of result) {
      const locality = res.address_components.find(
        (comp) => comp.types.includes('locality') || comp.types.includes('postal_town')
      );
      if (locality) {
        return locality.long_name;
      }
    }

    return null;
  } catch (error) {
    console.warn('[Tackle Shops] Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Find nearby tackle shops using Google Places API
 * Results are cached for 30 days using coarse location rounding
 */
export async function findNearbyTackleShops(
  latitude: number,
  longitude: number
): Promise<TackleShop[]> {
  // TEMPORARILY DISABLED FOR TESTING
  // Check cache first
  // const cached = getCachedShops(latitude, longitude);
  // if (cached) {
  //   return cached;
  // }

  try {
    const google = await loadGoogleMaps();

    // Get place name for more specific query
    const placeName = await getPlaceName(latitude, longitude);

    // Try multiple search strategies
    const searchQueries = placeName
      ? [
          `fishing tackle shop ${placeName}`,
          `bait and tackle near ${placeName}`,
          `fishing tackle bait shop angling`,
        ]
      : [
          `fishing tackle bait shop angling`,
        ];

    console.log(`[Tackle Shops] Searching with queries:`, searchQueries);

    const service = new google.maps.places.PlacesService(
      document.createElement('div')
    );

    // Collect results from multiple searches
    const allResults = new Map<string, google.maps.places.PlaceResult>();

    for (const query of searchQueries) {
      const request = {
        location: new google.maps.LatLng(latitude, longitude),
        radius: COARSE_RADIUS_METERS,
        keyword: query,
      };

      await new Promise<void>((resolveSearch) => {
        service.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            // Add unique results to map (deduplicate by place_id)
            results.forEach((place) => {
              if (place.place_id && !allResults.has(place.place_id)) {
                allResults.set(place.place_id, place);
              }
            });
          }
          resolveSearch();
        });
      });

      // Small delay between searches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Process all collected results
    const results = Array.from(allResults.values());

    const shops: TackleShop[] = results
      .filter((place) => {
        // Light filtering - trust Google's keyword matching, but exclude obviously wrong results
        const name = place.name?.toLowerCase() || '';
        const types = place.types || [];

        // Exclude restaurants, cafes, etc.
        const excludedTypes = ['restaurant', 'cafe', 'bar', 'food'];
        const hasExcludedType = types.some(type => excludedTypes.includes(type));

        if (hasExcludedType) {
          return false;
        }

        // If it has fishing-related keywords or is a sporting goods store, include it
        return (
          name.includes('fish') ||
          name.includes('tackle') ||
          name.includes('bait') ||
          name.includes('angl') ||
          name.includes('pesca') || // Spanish for fishing
          name.includes('nautic') ||
          types.includes('sporting_goods_store') ||
          types.includes('store')
        );
      })
      .map((place) => {
        const shopLat = place.geometry?.location?.lat() || 0;
        const shopLng = place.geometry?.location?.lng() || 0;
        const distance = calculateDistance(latitude, longitude, shopLat, shopLng);

        // Get photo URL if available
        const photoUrl = place.photos && place.photos.length > 0
          ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 400 })
          : undefined;

        // Debug logging
        console.log(`[Tackle Shop] ${place.name}:`, {
          hasPhotos: !!(place.photos && place.photos.length > 0),
          photoUrl,
          placeId: place.place_id,
        });

        return {
          name: place.name || 'Unknown Shop',
          placeId: place.place_id || '',
          address: place.vicinity || '',
          location: { lat: shopLat, lng: shopLng },
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          // Note: open_now is deprecated. Would need getDetails() call per shop to get current status.
          // Removed to avoid deprecation warnings and extra API calls.
          photos: photoUrl ? [photoUrl] : undefined,
        };
      })
      .sort((a, b) => (a.distance || 0) - (b.distance || 0)) // Sort by distance
      .slice(0, 10); // Limit to top 10

    // TEMPORARILY DISABLED FOR TESTING
    // Cache the results
    // setCachedShops(latitude, longitude, shops);

    console.log(`[Tackle Shops] Found ${shops.length} unique shops from ${allResults.size} total results`);
    console.log(`[Tackle Shops] Shops with photos: ${shops.filter(s => s.photos && s.photos.length > 0).length}`);
    return shops;
  } catch (error) {
    console.error('[Tackle Shops] Error finding shops:', error);
    throw error;
  }
}
