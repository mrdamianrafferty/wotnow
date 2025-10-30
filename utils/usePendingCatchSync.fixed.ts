import { useEffect, useState, useCallback } from 'react';
import { getAllPendingCatches, deletePendingCatch, PendingCatch } from './pendingCatchLogs';
import type { CatchLogInput } from '../hooks/useCatchLogger';

export function usePendingCatchSync(logCatch: (data: CatchLogInput) => Promise<unknown>) {
  const [pending, setPending] = useState<PendingCatch[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load pending on mount and when sync completes
  const refreshPending = useCallback(async () => {
    const all = await getAllPendingCatches();
    setPending(all);
  }, []);

  const syncPending = useCallback(async () => {
    setSyncing(true);
    setError(null);
    for (const item of pending) {
      try {
        // logCatch expects the same shape as normal catch log
        await logCatch({ ...item.data, photo: item.image });
        await deletePendingCatch(item.id);
      } catch (_err) {
        setError('Failed to upload some catches. Will retry when online.');
        break;
      }
    }
    setLastSync(Date.now());
    setSyncing(false);
    refreshPending();
  }, [logCatch, pending, refreshPending]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  // Sync when online
  useEffect(() => {
    function handleOnline() {
      if (pending.length > 0 && !syncing) {
        syncPending();
      }
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pending, syncing, syncPending]);

  // Optionally, auto-sync on mount if online
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.onLine && pending.length > 0 && !syncing) {
      syncPending();
    }
  }, [pending.length, syncing, syncPending]);

  return { pending, syncing, lastSync, error, refreshPending };
}
