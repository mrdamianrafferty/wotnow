/**
 * Hook to fetch tide extremes for a location
 * Returns array of tide high/low times for the day
 */

import { useEffect, useState } from 'react';
import type { TideExtreme } from '../lib/findr/conditionHelpers';

interface TideAPIResponse {
  success: boolean;
  data: Array<{
    time: string;
    type: 'high' | 'low';
    height: number;
  }>;
  limited?: boolean;
}

// Simple in-memory cache with 30-minute TTL
const tideExtremesCache = new Map<string, { data: TideExtreme[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useTideExtremes(
  location: { lat: number; lon: number } | null
): { extremes: TideExtreme[] | null; loading: boolean } {
  const [extremes, setExtremes] = useState<TideExtreme[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) {
      setExtremes(null);
      return;
    }

    const cacheKey = `${location.lat.toFixed(3)},${location.lon.toFixed(3)}`;
    const now = Date.now();

    // Check cache first
    const cached = tideExtremesCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      setExtremes(cached.data);
      return;
    }

    // Fetch from API
    const fetchTides = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/tides?lat=${location.lat}&lon=${location.lon}`);

        if (!response.ok) {
          console.warn('Tide API error:', response.status);
          setExtremes(null);
          return;
        }

        const result = await response.json() as TideAPIResponse;

        if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
          console.warn('No tide data available');
          setExtremes(null);
          return;
        }

        // Transform to TideExtreme format
        const tideExtremes: TideExtreme[] = result.data.map(item => ({
          time: item.time,
          type: item.type,
          height: item.height,
        }));

        // Cache the result
        tideExtremesCache.set(cacheKey, { data: tideExtremes, timestamp: now });

        setExtremes(tideExtremes);
      } catch (error) {
        console.error('Error fetching tide extremes:', error);
        setExtremes(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTides();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to refetch when lat/lon actually change
  }, [location?.lat, location?.lon]);

  return { extremes, loading };
}
