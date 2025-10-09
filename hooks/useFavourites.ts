/**
 * useFavourites Hook
 * 
 * Manages user favourites with hybrid localStorage + Supabase sync
 * - Uses localStorage for unauthenticated users
 * - Syncs to Supabase for authenticated users
 * - Migrates localStorage favourites to Supabase on auth
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEY = 'findrFavorites';

interface UseFavouritesOptions {
  autoSync?: boolean; // Auto-sync to Supabase when user authenticates
}

export function useFavourites(options: UseFavouritesOptions = {}) {
  const { autoSync = true } = options;
  
  const [favourites, setFavourites] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
    const loadFavourites = async () => {
      setLoading(true);
      
      if (user && autoSync) {
        // Authenticated: Load from Supabase
        try {
          const response = await fetch('/api/findr/favourites');
          const data = await response.json();
          
          if (data.success && data.favourites) {
            const speciesIds = data.favourites.map((fav: { speciesId: string }) => fav.speciesId);
            setFavourites(speciesIds);
            
            // Update localStorage to match Supabase
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(speciesIds));
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
      
      setLoading(false);
    };

    loadFavourites();
  }, [user, autoSync]);

  // Helper: Load from localStorage
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavourites(parsed.filter((item): item is string => typeof item === 'string'));
        }
      }
    } catch (error) {
      console.warn('Failed to load favourites from localStorage:', error);
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
            return Array.isArray(parsed) ? parsed : [];
          }
        } catch {
          return [];
        }
        return [];
      })();

      // Sync each favourite to Supabase
      for (const speciesId of localFavourites) {
        try {
          await fetch('/api/findr/favourites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ speciesId }),
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
  const addFavourite = useCallback(async (speciesId: string) => {
    // Optimistically update UI
    setFavourites((prev) => {
      if (prev.includes(speciesId)) return prev;
      return [...prev, speciesId];
    });

    // Sync to storage
    if (user && autoSync) {
      // Authenticated: Sync to Supabase
      try {
        const response = await fetch('/api/findr/favourites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speciesId }),
        });

        const data = await response.json();
        if (!data.success) {
          console.error('Failed to add favourite to Supabase:', data.error);
          // Revert optimistic update
          setFavourites((prev) => prev.filter((id) => id !== speciesId));
        }
      } catch (error) {
        console.error('Failed to add favourite:', error);
        // Revert optimistic update
        setFavourites((prev) => prev.filter((id) => id !== speciesId));
      }
    } else {
      // Not authenticated: Save to localStorage
      const updated = favourites.includes(speciesId) ? favourites : [...favourites, speciesId];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [user, autoSync, favourites]);

  // Remove favourite
  const removeFavourite = useCallback(async (speciesId: string, favouriteId?: string) => {
    // Optimistically update UI
    setFavourites((prev) => prev.filter((id) => id !== speciesId));

    // Sync to storage
    if (user && autoSync) {
      // Authenticated: Remove from Supabase
      try {
        // Need to get the favourite ID if not provided
        const idToDelete = favouriteId || speciesId;
        
        const response = await fetch(`/api/findr/favourites?id=${idToDelete}`, {
          method: 'DELETE',
        });

        const data = await response.json();
        if (!data.success) {
          console.error('Failed to remove favourite from Supabase:', data.error);
          // Revert optimistic update
          setFavourites((prev) => [...prev, speciesId]);
        }
      } catch (error) {
        console.error('Failed to remove favourite:', error);
        // Revert optimistic update
        setFavourites((prev) => [...prev, speciesId]);
      }
    } else {
      // Not authenticated: Save to localStorage
      const updated = favourites.filter((id) => id !== speciesId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [user, autoSync, favourites]);

  // Toggle favourite (add if not present, remove if present)
  const toggleFavourite = useCallback(async (speciesId: string, favouriteId?: string) => {
    if (favourites.includes(speciesId)) {
      await removeFavourite(speciesId, favouriteId);
    } else {
      await addFavourite(speciesId);
    }
  }, [favourites, addFavourite, removeFavourite]);

  // Check if species is favourited
  const isFavourited = useCallback((speciesId: string) => {
    return favourites.includes(speciesId);
  }, [favourites]);

  return {
    favourites,
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
