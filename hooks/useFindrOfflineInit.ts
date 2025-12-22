/**
 * Findr Offline Initialization Hook
 *
 * Initializes offline storage and preloads species data for native apps.
 * Call this once at app startup (e.g., in Findr layout or main page).
 *
 * Usage:
 * ```typescript
 * import { useFindrOfflineInit } from '@/hooks/useFindrOfflineInit';
 *
 * function FindrApp() {
 *   const { isReady, speciesCount, isOnline } = useFindrOfflineInit();
 *
 *   if (!isReady) return <LoadingSpinner />;
 *
 *   return <MainContent />;
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface UseFindrOfflineInitState {
  isReady: boolean;
  isOnline: boolean;
  speciesCount: number;
  speciesCachedAt: Date | null;
  error: Error | null;
}

const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

export function useFindrOfflineInit(): UseFindrOfflineInitState {
  const [state, setState] = useState<UseFindrOfflineInitState>({
    isReady: !isNative, // Web is ready immediately
    isOnline: true,
    speciesCount: 0,
    speciesCachedAt: null,
    error: null,
  });

  useEffect(() => {
    if (!isNative) {
      // Web platform - no SQLite init needed
      return;
    }

    const init = async () => {
      try {
        console.log('[FindrOfflineInit] Initializing...');

        // Initialize sync manager (includes database init)
        const { findrSync } = await import('@/lib/offline/findrSync');
        await findrSync.initialize();

        // Subscribe to state changes
        const unsubscribe = findrSync.subscribe((syncState) => {
          setState((prev) => ({
            ...prev,
            isOnline: syncState.isOnline,
            speciesCount: syncState.speciesCount,
            speciesCachedAt: syncState.speciesCachedAt,
          }));
        });

        // Preload species if not cached
        const syncState = findrSync.getState();
        if (syncState.speciesCount === 0) {
          console.log('[FindrOfflineInit] Preloading species data...');
          const { species } = await findrSync.getSpecies();
          console.log('[FindrOfflineInit] Preloaded ' + species.length + ' species');
        } else {
          console.log('[FindrOfflineInit] Species already cached (' + syncState.speciesCount + ')');
        }

        setState((prev) => ({
          ...prev,
          isReady: true,
        }));

        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('[FindrOfflineInit] Initialization failed:', error);
        setState((prev) => ({
          ...prev,
          isReady: true, // Still mark ready so app can function
          error: error instanceof Error ? error : new Error('Unknown error'),
        }));
      }
    };

    init();
  }, []);

  return state;
}

/**
 * Preload species data manually (useful for background refresh)
 */
export async function preloadFindrSpecies(): Promise<number> {
  if (!isNative) return 0;

  try {
    const { findrSync } = await import('@/lib/offline/findrSync');
    await findrSync.initialize();
    const { species } = await findrSync.getSpecies(true); // Force refresh
    return species.length;
  } catch (error) {
    console.error('[preloadFindrSpecies] Failed:', error);
    return 0;
  }
}

/**
 * Get cached species count
 */
export async function getFindrSpeciesCount(): Promise<number> {
  if (!isNative) return 0;

  try {
    const { findrDb } = await import('@/lib/offline/findrDatabase');
    await findrDb.initialize();
    return findrDb.species.getCount();
  } catch {
    return 0;
  }
}
