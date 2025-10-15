/**
 * Hook to fetch real tide data for a location
 * Caches results to avoid excessive API calls
 */

import { useEffect, useState } from 'react';

export interface TidePhaseInfo {
  currentPhase: 'rising' | 'falling' | 'high_slack' | 'low_slack';
  timeToNextChange?: number; // minutes
  currentStrength?: 'weak' | 'moderate' | 'strong';
}

interface TideAPIResponse {
  success: boolean;
  data: Array<{
    time: string;
    type: 'high' | 'low';
    height: number;
  }>;
  limited?: boolean;
}

// Simple in-memory cache with 10-minute TTL
const tideCache = new Map<string, { data: TidePhaseInfo; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useTideData(location: { lat: number; lon: number } | null): TidePhaseInfo | null {
  const [tideInfo, setTideInfo] = useState<TidePhaseInfo | null>(null);

  useEffect(() => {
    if (!location) {
      setTideInfo(null);
      return;
    }

    const cacheKey = `${location.lat.toFixed(4)},${location.lon.toFixed(4)}`;
    const now = Date.now();

    // Check cache first
    const cached = tideCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      setTideInfo(cached.data);
      return;
    }

    // Fetch from API
    const fetchTideData = async () => {
      try {
        const response = await fetch(`/api/tides?lat=${location.lat}&lon=${location.lon}`);
        
        if (!response.ok) {
          console.warn('Tide API error:', response.status);
          return;
        }

        const result = await response.json() as TideAPIResponse;

        if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
          console.warn('No tide data available');
          return;
        }

        // Process tide extremes to determine current phase
        const tidePhase = processTideExtremes(result.data);
        
        // Cache the result
        tideCache.set(cacheKey, { data: tidePhase, timestamp: now });
        
        setTideInfo(tidePhase);
      } catch (error) {
        console.error('Error fetching tide data:', error);
      }
    };

    fetchTideData();
  }, [location]);

  return tideInfo;
}

/**
 * Process tide extremes to determine current phase
 * Simplified version of the logic in lib/weather/stormglass.ts
 */
function processTideExtremes(extremes: Array<{ time: string; type: 'high' | 'low'; height: number }>): TidePhaseInfo {
  const now = new Date();
  
  // Filter upcoming tides
  const upcomingTides = extremes.filter(tide => new Date(tide.time) > now);
  
  if (upcomingTides.length === 0) {
    // Fallback if no upcoming tides
    return {
      currentPhase: 'rising',
      timeToNextChange: 360,
      currentStrength: 'moderate',
    };
  }

  const nextTide = upcomingTides[0];
  const timeToNext = Math.round((new Date(nextTide.time).getTime() - now.getTime()) / (1000 * 60));

  // Determine current phase based on next tide type and time
  let currentPhase: 'rising' | 'falling' | 'high_slack' | 'low_slack';
  let currentStrength: 'weak' | 'moderate' | 'strong';

  if (timeToNext < 30) {
    // Near tide change - slack water
    currentPhase = nextTide.type === 'high' ? 'high_slack' : 'low_slack';
    currentStrength = 'weak';
  } else {
    // Active tide
    currentPhase = nextTide.type === 'high' ? 'rising' : 'falling';
    currentStrength = timeToNext < 120 ? 'strong' : 'moderate';
  }

  return {
    currentPhase,
    timeToNextChange: timeToNext,
    currentStrength,
  };
}
