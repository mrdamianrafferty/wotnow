// React hook for syncing pending catches from IndexedDB when online
import { useEffect, useState } from 'react';
import { getAllPendingCatches, deletePendingCatch, PendingCatch } from './pendingCatchLogs';

export function usePendingCatchSync(logCatch: (data: any) => Promise<any>) {
  const [pending, setPending] = useState<PendingCatch[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load pending on mount and when sync completes
  async function refreshPending() {
    const all = await getAllPendingCatches();
    setPending(all);
  }

  useEffect(() => {
    refreshPending();
  }, []);

  // Sync when online
  useEffect(() => {
    function handleOnline() {
      if (pending.length > 0 && !syncing) {
        syncPending();
      }
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pending, syncing]);

  async function syncPending() {
    setSyncing(true);
    setError(null);
    for (const item of pending) {
      try {
        // logCatch expects the same shape as normal catch log
        await logCatch({ ...item.data, photo: item.image });
        await deletePendingCatch(item.id);
      } catch (err) {
        setError('Failed to upload some catches. Will retry when online.');
        break;
      }
    }
    setLastSync(Date.now());
    setSyncing(false);
    refreshPending();
  }

  // Optionally, auto-sync on mount if online
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.onLine && pending.length > 0 && !syncing) {
      syncPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.length]);

  return { pending, syncing, lastSync, error, refreshPending };
}
