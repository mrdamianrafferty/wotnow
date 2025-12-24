/**
 * Offline Initialization Component
 *
 * Initializes offline storage and sync service on app startup
 * Runs in the background and starts automatic sync when online
 */

'use client';

import { useEffect } from 'react';

export function OfflineInit() {
  useEffect(() => {
    // Initialize offline services on mount
    const initOffline = async () => {
      try {
        // Initialize IndexedDB
        const { initDB } = await import('@/lib/offline/db');
        await initDB();
        if (process.env.NODE_ENV === 'development') {
          console.log('[OfflineInit] IndexedDB initialized');
        }

        // Start sync service
        const { getSyncService } = await import('@/lib/offline/sync');
        const sync = getSyncService();
        sync.start();
        if (process.env.NODE_ENV === 'development') {
          console.log('[OfflineInit] Sync service started');
        }

        // Cleanup on unmount
        return () => {
          sync.stop();
        };
      } catch (error) {
        console.error('[OfflineInit] Failed to initialize offline services:', error);
      }
    };

    initOffline();
  }, []);

  // This component doesn't render anything
  return null;
}
