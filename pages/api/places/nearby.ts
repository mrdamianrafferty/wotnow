// pages/api/places/nearby.ts
/**
 * Nearby Places API
 *
 * Searches for nearby businesses using Google Places API.
 * Used for finding tackle shops and bait suppliers near fishing locations.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface PlaceResult {
  name: string;
  address: string;
  rating?: number;
  totalRatings?: number;
  isOpen?: boolean;
  phone?: string;
  website?: string;
  distance?: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
  };
  formatted_phone_number?: string;
  website?: string;
}

interface GooglePlacesResponse {
  results: GooglePlaceResult[];
  status: string;
  error_message?: string;
}

// Calculate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format distance for display
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

// Simple in-memory cache (5 minute TTL)
const cache = new Map<string, { data: PlaceResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lng, type, radius = '25000' } = req.query;

  // Validate parameters
  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const searchRadius = parseInt(radius as string, 10);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  // Check cache
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)},${type}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json({ results: cached.data, cached: true });
  }

  // Get Google API key
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('[Places API] Google Maps API key not configured');
    return res.status(500).json({ error: 'Places search not configured' });
  }

  try {
    // Search for tackle shops and fishing-related businesses
    const searchQueries = [
      'tackle shop',
      'fishing bait',
      'angling supplies',
      'fishing shop',
    ];

    const allResults: PlaceResult[] = [];
    const seenPlaceIds = new Set<string>();

    // Run searches in parallel for different keywords
    const searchPromises = searchQueries.slice(0, 2).map(async (query) => {
      const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      url.searchParams.set('location', `${latitude},${longitude}`);
      url.searchParams.set('radius', String(Math.min(searchRadius, 50000))); // Max 50km
      url.searchParams.set('keyword', query);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.warn(`[Places API] Search failed for "${query}":`, response.status);
        return [];
      }

      const data: GooglePlacesResponse = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.warn(`[Places API] Google returned status: ${data.status}`, data.error_message);
        return [];
      }

      return data.results || [];
    });

    const searchResults = await Promise.all(searchPromises);

    // Combine and deduplicate results
    for (const results of searchResults) {
      for (const place of results) {
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        const distance = calculateDistance(
          latitude,
          longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        allResults.push({
          name: place.name,
          address: place.vicinity || place.formatted_address || '',
          rating: place.rating,
          totalRatings: place.user_ratings_total,
          isOpen: place.opening_hours?.open_now,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          placeId: place.place_id,
          distance: formatDistance(distance),
        });
      }
    }

    // Sort by distance
    allResults.sort((a, b) => {
      const distA = parseFloat(a.distance?.replace(/[^\d.]/g, '') || '999');
      const distB = parseFloat(b.distance?.replace(/[^\d.]/g, '') || '999');
      return distA - distB;
    });

    // Limit to top 20 results
    const results = allResults.slice(0, 20);

    // Cache the results
    cache.set(cacheKey, { data: results, timestamp: Date.now() });

    return res.status(200).json({ results });
  } catch (error) {
    console.error('[Places API] Error:', error);
    return res.status(500).json({ error: 'Failed to search for places' });
  }
}
