/**
 * useFavourites Hook
 * 
 * Manages user favourites with hybrid localStorage + Supabase sync
 * - Uses localStorage for unauthenticated users
 * - Syncs to Supabase for authenticated users
 * - Migrates localStorage favourites to Supabase on auth
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { SPECIES_IMAGE_MAP } from '../data/speciesImageMap';

const LOCAL_STORAGE_KEY = 'findrFavorites';

interface UseFavouritesOptions {
  autoSync?: boolean; // Auto-sync to Supabase when user authenticates
}

interface ToggleFavouriteOptions {
  speciesCode?: string;
  speciesName?: string;
  favouriteId?: string;
}

interface FavouriteDetail {
  id: string | null;
  speciesId: string;
  speciesCode: string | null;
  name: string | null;
  scientificName: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Always store UUIDs lowercase (DB canonical) and species codes uppercase so comparisons stay stable.
const normalizeFavouriteId = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (UUID_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed.toUpperCase();
};

const speciesInfoForCode = (code?: string | null) => {
  if (!code) return null;
  return SPECIES_IMAGE_MAP[code.trim().toUpperCase()] ?? null;
};

const buildLocalFavouriteDetails = (ids: string[]): FavouriteDetail[] => {
  return ids.map((id) => {
    const normalizedId = normalizeFavouriteId(id);
    const speciesCode = UUID_PATTERN.test(normalizedId) ? null : normalizedId;
    const info = speciesInfoForCode(speciesCode);
    return {
      id: null,
      speciesId: normalizedId,
      speciesCode,
      name: info?.name ?? speciesCode ?? normalizedId,
      scientificName: info?.scientificName ?? null,
    };
  });
};

const mapApiFavouriteToDetail = (fav: Record<string, unknown>): FavouriteDetail | null => {
  const rawSpeciesId = typeof fav.speciesId === 'string' ? fav.speciesId : null;
  if (!rawSpeciesId) return null;
  const normalizedId = normalizeFavouriteId(rawSpeciesId);
  const speciesCode = typeof fav.speciesCode === 'string' ? fav.speciesCode.trim().toUpperCase() : null;
  const info = speciesInfoForCode(speciesCode ?? normalizedId);

  return {
    id: typeof fav.id === 'string' ? fav.id : null,
    speciesId: normalizedId,
    speciesCode,
    name: (typeof fav.name === 'string' ? fav.name : null) ?? info?.name ?? speciesCode ?? normalizedId,
    scientificName: (typeof fav.scientificName === 'string' ? fav.scientificName : null) ?? info?.scientificName ?? null,
  };
};

// Module-level flag to prevent duplicate fetches across hook instances
let globalFavouritesLoading = false;

export function useFavourites(options: UseFavouritesOptions = {}) {
  const { autoSync = true } = options;
  
  const [favourites, setFavourites] = useState<string[]>([]);
  const favouritesRef = useRef<string[]>([]); // Keep track of current favourites for immediate reads
  const pendingTogglesRef = useRef<Set<string>>(new Set()); // Track pending toggle operations
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading, null = not authenticated
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [favouriteDetails, setFavouriteDetails] = useState<FavouriteDetail[]>([]);
  const favouriteDetailsRef = useRef<FavouriteDetail[]>([]);

  // Sync ref whenever favourites state changes
  useEffect(() => {
    favouritesRef.current = favourites;
  }, [favourites]);

  useEffect(() => {
    favouriteDetailsRef.current = favouriteDetails;
  }, [favouriteDetails]);

  // Load user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load favourites from localStorage or Supabase
  useEffect(() => {
    // Wait until auth state is determined (not undefined)
    if (user === undefined) return;
    // Prevent concurrent loads across all hook instances
    if (globalFavouritesLoading) return;
    
    const loadFavourites = async () => {
      globalFavouritesLoading = true;
      console.log('[useFavourites] Loading favourites, authenticated:', Boolean(user));
      setLoading(true);
      
      try {
        if (user && autoSync) {
          // Authenticated: Load from Supabase
          try {
            console.log('[useFavourites] Fetching from Supabase...');
            const response = await fetch('/api/findr/favourites', {
              credentials: 'include', // Send cookies for authentication
            });
            const data = await response.json();
            
            if (data.success && Array.isArray(data.favourites)) {
              const speciesIds: string[] = Array.from(
                new Set(
                  data.favourites
                    .map((fav: { speciesId?: string }) =>
                      typeof fav.speciesId === 'string' ? normalizeFavouriteId(fav.speciesId) : null
                    )
                    .filter((id: string | null): id is string => Boolean(id))
                )
              );
              console.log('[useFavourites] Loaded from Supabase:', speciesIds.length, 'favourites');
              setFavourites(speciesIds);

              const details = data.favourites
                .map((fav: Record<string, unknown>) => mapApiFavouriteToDetail(fav))
                .filter((detail: FavouriteDetail | null): detail is FavouriteDetail => Boolean(detail));
              setFavouriteDetails(details);

              // Update localStorage to match Supabase
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(speciesIds));
            } else {
              setFavouriteDetails([]);
            }
          } catch (error) {
            console.error('Failed to load favourites from Supabase:', error);
            // Fall back to localStorage
            loadFromLocalStorage();
          }
        } else {
          // Not authenticated: Load from localStorage
          loadFromLocalStorage();
        }
      } finally {
        setLoading(false);
        // Reset after delay to allow re-fetch if user changes
        setTimeout(() => { globalFavouritesLoading = false; }, 2000);
      }
    };

    loadFavourites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, autoSync]); // Only reload when user ID changes, not when user object reference changes

  // Helper: Load from localStorage
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const normalized = Array.from(
            new Set(
              parsed
                .map((item) => (typeof item === 'string' ? normalizeFavouriteId(item) : null))
                .filter((id): id is string => Boolean(id))
            )
          );
          setFavourites(normalized);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
          setFavouriteDetails(buildLocalFavouriteDetails(normalized));
          return;
        }
      }
      setFavouriteDetails([]);
    } catch (error) {
      console.warn('Failed to load favourites from localStorage:', error);
      setFavouriteDetails([]);
    }
  };

  // Sync localStorage to Supabase (migration)
  const syncToSupabase = useCallback(async () => {
    if (!user) return;
    
    setSyncing(true);
    try {
      // Get current favourites from localStorage
      const localFavourites = favourites.length > 0 ? favourites : (() => {
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              return Array.from(
                new Set(
                  parsed
                    .map((item) => (typeof item === 'string' ? normalizeFavouriteId(item) : null))
                    .filter((id): id is string => Boolean(id))
                )
              );
            }
          }
        } catch {
          return [];
        }
        return [];
      })();

      // Sync each favourite to Supabase
      for (const speciesId of localFavourites) {
        try {
          const normalizedId = normalizeFavouriteId(speciesId);
          const payload: Record<string, string> = { speciesId: normalizedId };
          if (!UUID_PATTERN.test(normalizedId)) {
            payload.speciesCode = normalizedId;
          }
          await fetch('/api/findr/favourites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Send cookies for authentication
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.error(`Failed to sync favourite ${speciesId}:`, error);
        }
      }

      console.log(`Synced ${localFavourites.length} favourites to Supabase`);
    } finally {
      setSyncing(false);
    }
  }, [user, favourites]);

  // Add favourite
  const addFavourite = useCallback(async (speciesId: string, options?: ToggleFavouriteOptions) => {
    const normalizedId = normalizeFavouriteId(speciesId);
    const previousIds = favouritesRef.current.slice();
    const previousDetails = favouriteDetailsRef.current.slice();

    console.log('[useFavourites] Adding favourite:', { speciesId, normalizedId, isAuthenticated: Boolean(user) });

    const fallbackCode = options?.speciesCode?.trim().toUpperCase() ?? (UUID_PATTERN.test(normalizedId) ? null : normalizedId);
    const fallbackInfo = speciesInfoForCode(fallbackCode ?? normalizedId);
    const optimisticDetail: FavouriteDetail = {
      id: null,
      speciesId: normalizedId,
      speciesCode: fallbackCode,
      name: options?.speciesName ?? fallbackInfo?.name ?? fallbackCode ?? normalizedId,
      scientificName: fallbackInfo?.scientificName ?? null,
    };

    // Optimistically update UI
    setFavourites((prev) => {
      if (prev.includes(normalizedId)) {
        console.log('[useFavourites] Already favourited, skipping');
        return prev;
      }
      console.log('[useFavourites] Optimistic update: adding to local state');
      return [...prev, normalizedId];
    });
    setFavouriteDetails((prev) => {
      if (prev.some((detail) => detail.speciesId === normalizedId)) {
        return prev;
      }
      return [...prev, optimisticDetail];
    });

    const revertOptimisticUpdate = () => {
      setFavourites(previousIds);
      setFavouriteDetails(previousDetails);
    };

    // Sync to storage
    if (user && autoSync) {
      // Authenticated: Sync to Supabase
      try {
        const bodyPayload: Record<string, string> = {
          speciesId: normalizedId,
        };
        if (options?.speciesCode) {
          bodyPayload.speciesCode = options.speciesCode.trim().toUpperCase();
        }
        if (options?.speciesName) {
          bodyPayload.speciesName = options.speciesName;
        }

        console.log('[useFavourites] Sending to API:', bodyPayload);

        const response = await fetch('/api/findr/favourites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Send cookies for authentication
          body: JSON.stringify(bodyPayload),
        });

        const data = await response.json();

        console.log('[useFavourites] API response:', { success: data.success, error: data.error, status: response.status });

        // Treat 409 (already favorited) as success - species is in database
        if (!data.success && response.status !== 409) {
          console.error('Failed to add favourite to Supabase:', data.error);
          revertOptimisticUpdate();
        } else {
          console.log('[useFavourites] Successfully added to Supabase (or already exists)');
          if (data.favourite) {
            const detail = mapApiFavouriteToDetail(data.favourite);
            if (detail) {
              setFavouriteDetails((prev) => {
                const updated = [...prev];
                const matchById = updated.findIndex((item) => item.speciesId === detail.speciesId);
                if (matchById !== -1) {
                  updated[matchById] = detail;
                  return updated;
                }

                if (detail.speciesCode) {
                  const matchByCode = updated.findIndex((item) => item.speciesCode === detail.speciesCode);
                  if (matchByCode !== -1) {
                    updated[matchByCode] = detail;
                    return updated;
                  }
                }

                updated.push(detail);
                return updated;
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to add favourite:', error);
        revertOptimisticUpdate();
      }
    } else {
      // Not authenticated: Save to localStorage
      const updated = favouritesRef.current.includes(normalizedId)
        ? favouritesRef.current
        : [...favouritesRef.current, normalizedId];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      setFavouriteDetails(buildLocalFavouriteDetails(updated));
    }
  }, [user, autoSync]);

  // Remove favourite
  const removeFavourite = useCallback(async (speciesId: string, favouriteId?: string) => {
    const normalizedId = normalizeFavouriteId(speciesId);
    const previousIds = favouritesRef.current.slice();
    const previousDetails = favouriteDetailsRef.current.slice();
    
    console.log('[useFavourites] Removing favourite:', { speciesId, normalizedId, favouriteId, isAuthenticated: Boolean(user) });
    
    // Optimistically update UI
    setFavourites((prev) => {
      console.log('[useFavourites] Optimistic update: removing from local state');
      return prev.filter((id) => id !== normalizedId);
    });
    setFavouriteDetails((prev) => prev.filter((detail) => {
      if (detail.speciesId === normalizedId) return false;
      if (favouriteId && detail.id === favouriteId) return false;
      return true;
    }));

    const revertOptimisticUpdate = () => {
      setFavourites(previousIds);
      setFavouriteDetails(previousDetails);
    };

    // Sync to storage
    if (user && autoSync) {
      // Authenticated: Remove from Supabase
      try {
        // Need to get the favourite ID if not provided
        const params = new URLSearchParams();
        if (favouriteId) {
          params.set('id', favouriteId);
        } else if (normalizedId) {
          params.set('id', normalizedId);
        }
        if (normalizedId) {
          params.set('speciesId', normalizedId);
        }

        const response = await fetch(`/api/findr/favourites?${params.toString()}`, {
          method: 'DELETE',
          credentials: 'include', // Send cookies for authentication
        });

        const data = await response.json();
        if (!data.success) {
          console.error('Failed to remove favourite from Supabase:', data.error);
          revertOptimisticUpdate();
        }
      } catch (error) {
        console.error('Failed to remove favourite:', error);
        revertOptimisticUpdate();
      }
    } else {
      // Not authenticated: Save to localStorage
      const updated = favouritesRef.current.filter((id) => id !== normalizedId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      setFavouriteDetails(buildLocalFavouriteDetails(updated));
    }
  }, [user, autoSync]);

  // Toggle favourite (add if not present, remove if present)
  const toggleFavourite = useCallback(async (speciesId: string, options?: ToggleFavouriteOptions) => {
    const normalizedId = normalizeFavouriteId(speciesId);
    
    // Prevent concurrent toggles of the same species
    if (pendingTogglesRef.current.has(normalizedId)) {
      console.log('[useFavourites] Toggle already in progress for', normalizedId);
      return;
    }
    
    pendingTogglesRef.current.add(normalizedId);
    
    try {
      // Use ref to get current state immediately, avoiding stale closure
      if (favouritesRef.current.includes(normalizedId)) {
        await removeFavourite(normalizedId, options?.favouriteId);
      } else {
        await addFavourite(normalizedId, options);
      }
    } finally {
      // Always clear pending state, even if operation fails
      pendingTogglesRef.current.delete(normalizedId);
    }
  }, [addFavourite, removeFavourite]);

  // Check if species is favourited
  const isFavourited = useCallback((speciesId: string) => {
    return favourites.includes(normalizeFavouriteId(speciesId));
  }, [favourites]);

  return {
    favourites,
    favouriteDetails,
    user,
    loading,
    syncing,
    addFavourite,
    removeFavourite,
    toggleFavourite,
    isFavourited,
    syncToSupabase,
  };
}
