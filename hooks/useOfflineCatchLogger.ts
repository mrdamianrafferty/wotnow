/**
 * Offline-Capable Catch Logger Hook
 *
 * Wraps the standard catch logger to support offline operation.
 * When offline, catches are stored locally and synced when back online.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useCatchLogger, type QuickLogParams } from './useCatchLogger';
import type { CatchLogInput, CatchLogResponse, UseCatchLoggerOptions } from '@/types/findr-enrichment';
import {
  addPendingCatch,
  getPendingCatchesCount,
} from '@/lib/offline/pendingCatches';
import {
  syncPendingCatches,
  hasPendingCatches,
  type SyncProgress,
  type SyncResult,
} from '@/lib/offline/catchSync';

export interface UseOfflineCatchLoggerResult {
  // Standard catch logger interface
  logCatch: (input: CatchLogInput) => Promise<CatchLogResponse | null>;
  quickLog: (params: QuickLogParams) => Promise<CatchLogResponse | null>;
  reset: () => void;
  loading: boolean;
  error: Error | null;
  response: CatchLogResponse | null;

  // Offline-specific state
  isOffline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  lastSyncResult: SyncResult | null;

  // Offline-specific actions
  syncNow: () => Promise<SyncResult>;
  refreshPendingCount: () => Promise<void>;
}

export function useOfflineCatchLogger(
  options: UseCatchLoggerOptions = {}
): UseOfflineCatchLoggerResult {
  const isOnline = useOnlineStatus();
  const baseCatchLogger = useCatchLogger(options);

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [offlineError, setOfflineError] = useState<Error | null>(null);

  const syncInProgressRef = useRef(false);

  // Load pending count on mount
  useEffect(() => {
    getPendingCatchesCount().then(setPendingCount);
  }, []);

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCatchesCount();
    setPendingCount(count);
  }, []);

  // Sync pending catches
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (syncInProgressRef.current) {
      return { success: 0, failed: 0, errors: [] };
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const result = await syncPendingCatches((progress) => {
        setSyncProgress(progress);
      });

      setLastSyncResult(result);
      await refreshPendingCount();

      return result;
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [refreshPendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOnline) return;

    // Check if there are pending catches and sync them
    const autoSync = async () => {
      const hasPending = await hasPendingCatches();
      if (hasPending && !syncInProgressRef.current) {
        console.log('[useOfflineCatchLogger] Coming online, auto-syncing pending catches');
        await syncNow();
      }
    };

    // Delay auto-sync slightly to ensure network is stable
    const timeout = setTimeout(autoSync, 2000);
    return () => clearTimeout(timeout);
  }, [isOnline, syncNow]);

  // Offline-capable logCatch
  const logCatch = useCallback(
    async (input: CatchLogInput): Promise<CatchLogResponse | null> => {
      setOfflineError(null);

      // If online, use the standard logger
      if (isOnline) {
        return baseCatchLogger.logCatch(input);
      }

      // Offline: store locally
      try {
        const pendingCatch = await addPendingCatch(input);
        await refreshPendingCount();

        console.log('[useOfflineCatchLogger] Stored catch offline:', pendingCatch.id);

        // Return a mock response for offline catches
        const mockResponse: CatchLogResponse = {
          success: true,
          message: 'Catch saved offline - will sync when back online',
          points_earned: 0,
          enrichment: {
            has_exif_gps: false,
            depth_found: false,
            substrate_found: false,
            depth_meters: null,
            substrate: null,
          },
          catch: {
            id: pendingCatch.id,
            depth_meters: null,
            substrate: null,
          },
          warnings: ['Saved offline - enrichment will happen during sync'],
          raw: {} as CatchLogResponse['raw'],
        };

        options.onSuccess?.(mockResponse);
        return mockResponse;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to save catch offline');
        setOfflineError(err);
        options.onError?.(err);
        return null;
      }
    },
    [isOnline, baseCatchLogger, refreshPendingCount, options]
  );

  // Offline-capable quickLog
  const quickLog = useCallback(
    async (params: QuickLogParams): Promise<CatchLogResponse | null> => {
      const now = new Date();
      const catchDate = params.catchDate ?? now.toISOString().split('T')[0];
      const catchTime = params.catchTime ?? now.toISOString().split('T')[1]?.slice(0, 8) ?? undefined;

      const input: CatchLogInput = {
        speciesId: params.speciesId,
        speciesCommonName: params.speciesCommonName,
        scientificName: params.scientificName ?? null,
        rectangleCode: params.rectangleCode ?? null,
        quantity: params.quantity,
        catchDate,
        catchTime,
        entryType: 'quick',
        sizeCategory: 'mixed',
        baitUsed: params.baitUsed ?? 'Mystery bait',
        habitatType: params.habitatType ?? null,
        notes: params.notes ?? null,
        method: 'shore',
        photo: params.photo ?? null,
        userLocation: params.userLocation ?? null,
        isBlankTrip: params.isBlankTrip ?? false,
        // AI identification fields
        aiSuggestedSpeciesId: params.aiSuggestedSpeciesId ?? null,
        aiSuggestedSpeciesName: params.aiSuggestedSpeciesName ?? null,
        aiConfidence: params.aiConfidence ?? null,
        aiMethod: params.aiMethod ?? null,
        aiReasoning: params.aiReasoning ?? null,
        aiWasCorrected: params.aiWasCorrected,
        aiGaveUp: params.aiGaveUp,
        identificationSource: params.identificationSource ?? null,
      };

      return logCatch(input);
    },
    [logCatch]
  );

  // Combine errors
  const combinedError = baseCatchLogger.error || offlineError;

  return {
    logCatch,
    quickLog,
    reset: baseCatchLogger.reset,
    loading: baseCatchLogger.loading,
    error: combinedError,
    response: baseCatchLogger.response,
    isOffline: !isOnline,
    pendingCount,
    isSyncing,
    syncProgress,
    lastSyncResult,
    syncNow,
    refreshPendingCount,
  };
}

export default useOfflineCatchLogger;
