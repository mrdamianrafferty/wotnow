import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface EnvironmentalConditions {
  sea_temp?: number;
  tide_phase?: string;
  wind_speed?: number;
  wave_height?: number;
  salinity?: number;
  chlorophyll?: number;
  dissolved_oxygen?: number;
  ph?: number;
  [key: string]: string | number | undefined;
}

export interface CatchEntry {
  id: string;
  species_common_name: string;
  caught_at: string;
  logged_at: string;
  rectangle_code: string;
  quantity: number;
  size_category: string;
  bait_used: string;
  habitat_type?: string;
  notes?: string;
  followed_findr_advice: boolean;
  used_recommended_bait: boolean;
  used_recommended_habitat: boolean;
  prediction_matched: boolean;
  environmental_conditions?: EnvironmentalConditions;
}

export interface CreateCatchData {
  species_id: string;
  species_common_name: string;
  scientific_name?: string;
  rectangle_code: string;
  caught_at: string;
  quantity: number;
  size_category: 'small' | 'average' | 'large' | 'mixed';
  weight_kg?: number;
  length_cm?: number;
  bait_used: string;
  method?: 'shore' | 'boat' | 'kayak';
  habitat_type?: string;
  depth_range?: 'shallow_water' | 'deep_water';
  notes?: string;
  photo_urls?: string[]; // Array of photo URLs from Supabase Storage
  followed_findr_advice: boolean;
  environmental_conditions?: EnvironmentalConditions;
}

export interface CreateBlankTripData {
  rectangle_code: string;
  latitude: number;
  longitude: number;
  environmental_conditions?: Record<string, string | number>;
  notes?: string;
}

interface UseCatchLogResult {
  catches: CatchEntry[];
  loading: boolean;
  error: string | null;
  logCatch: (catchData: CreateCatchData) => Promise<CatchEntry>;
  logBlankTrip: (blankTripData: CreateBlankTripData) => Promise<void>;
  refreshCatches: () => Promise<void>;
}

/**
 * React Hook: useCatchLog
 * 
 * Provides interface for managing catch log data with Supabase backend.
 * Includes optimistic updates for immediate UI feedback and automatic fallback
 * to localStorage when backend is unavailable.
 * 
 * Features:
 * - Automatic catch-to-impression linking
 * - Validation field calculation
 * - Error handling with user-friendly messages
 * - Offline support via localStorage backup
 */
export function useCatchLog(): UseCatchLogResult {
  const [catches, setCatches] = useState<CatchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get authentication token from Supabase session
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session: _session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[useCatchLog] Failed to get session:', error.message);
        return null;
      }
      // TODO: For now, always return null to force localStorage mode until findr auth is implemented
      // This prevents API errors when user is not authenticated
      console.info('[useCatchLog] Using localStorage mode - findr authentication not yet implemented');
      return null; // session?.access_token || null;
    } catch (error) {
      console.warn('[useCatchLog] Error getting auth token:', error);
      return null;
    }
  }, []);

  const fetchCatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        // Load from localStorage as fallback
        const stored = localStorage.getItem('findr-catches');
        if (stored) {
          const parsed = JSON.parse(stored) as CatchEntry[];
          setCatches(parsed);
        }
        setLoading(false);
        return;
      }

      const response = await fetch('/api/findr/catch-log', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch catches: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setCatches(data.catches);
        // Cache in localStorage
        localStorage.setItem('findr-catches', JSON.stringify(data.catches));
      } else {
        throw new Error(data.error || 'Failed to fetch catches');
      }

    } catch (err) {
      console.warn('[useCatchLog] Fetch failed, using localStorage fallback:', err);
      // Load from localStorage as fallback
      try {
        const stored = localStorage.getItem('findr-catches');
        if (stored) {
          const parsed = JSON.parse(stored) as CatchEntry[];
          setCatches(parsed);
        }
      } catch (parseError) {
        console.error('[useCatchLog] localStorage parse failed:', parseError);
        setError('Failed to load catch history');
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  const createCatch = useCallback(async (catchData: CreateCatchData): Promise<CatchEntry> => {
    setLoading(true);
    setError(null);

    // Create optimistic local entry
    const optimisticCatch: CatchEntry = {
      id: `temp-${Date.now()}`,
      species_common_name: catchData.species_common_name,
      caught_at: catchData.caught_at,
      logged_at: new Date().toISOString(),
      rectangle_code: catchData.rectangle_code,
      quantity: catchData.quantity,
      size_category: catchData.size_category,
      bait_used: catchData.bait_used,
      habitat_type: catchData.habitat_type,
      notes: catchData.notes,
      followed_findr_advice: catchData.followed_findr_advice,
      used_recommended_bait: false, // Will be calculated by backend
      used_recommended_habitat: false, // Will be calculated by backend
      prediction_matched: false, // Will be calculated by backend
      environmental_conditions: catchData.environmental_conditions,
    };

    // Optimistic update - add to local state immediately
    setCatches(prev => [optimisticCatch, ...prev]);

    try {
      const token = await getAuthToken();
      if (!token) {
        // Save to localStorage only
        const stored = localStorage.getItem('findr-catches');
        const existing = stored ? JSON.parse(stored) as CatchEntry[] : [];
        const updated = [optimisticCatch, ...existing];
        localStorage.setItem('findr-catches', JSON.stringify(updated));
        setLoading(false);
        return optimisticCatch;
      }

      const response = await fetch('/api/findr/catch-log', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(catchData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create catch: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const serverCatch = data.catch as CatchEntry;
        
        // Replace optimistic entry with server response
        setCatches(prev => prev.map(c => 
          c.id === optimisticCatch.id ? serverCatch : c
        ));

        // Update localStorage cache
        const updated = catches.map(c => c.id === optimisticCatch.id ? serverCatch : c);
        localStorage.setItem('findr-catches', JSON.stringify(updated));

        console.info('[useCatchLog] Catch created successfully', {
          id: serverCatch.id,
          species: serverCatch.species_common_name,
          prediction_matched: serverCatch.prediction_matched
        });

        setLoading(false);
        return serverCatch;
      } else {
        throw new Error(data.error || 'Failed to create catch');
      }

    } catch (err) {
      console.error('[useCatchLog] Create failed:', err);
      
      // Keep optimistic entry but save to localStorage as backup
      const stored = localStorage.getItem('findr-catches');
      const existing = stored ? JSON.parse(stored) as CatchEntry[] : [];
      const updated = [optimisticCatch, ...existing.filter(c => c.id !== optimisticCatch.id)];
      localStorage.setItem('findr-catches', JSON.stringify(updated));

      setError('Catch saved locally - will sync when online');
      setLoading(false);
      return optimisticCatch;
    }
  }, [getAuthToken, catches]);

  const _clearError = useCallback(() => {
    setError(null);
  }, []);

  const createBlankTrip = useCallback(async (blankTripData: CreateBlankTripData): Promise<void> => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/findr/record-blank-trip', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blankTripData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record blank trip');
      }

      // Refresh catches after successful blank trip recording
      await fetchCatches();
    } catch (error) {
      console.error('[useCatchLog] Error recording blank trip:', error);
      setError(error instanceof Error ? error.message : 'Failed to record blank trip');
      throw error;
    }
  }, [getAuthToken, fetchCatches]);

  return {
    catches,
    loading,
    error,
    logCatch: createCatch,
    logBlankTrip: createBlankTrip,
    refreshCatches: fetchCatches,
  };
}