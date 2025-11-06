/**
 * Network Status Indicator
 *
 * Displays current network status and sync information
 * Shows offline banner and sync progress
 */

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useNetworkStatus, useSyncStatus } from '@/hooks/useOfflineStorage';

interface NetworkStatusIndicatorProps {
  /**
   * Position of the indicator
   * @default 'top'
   */
  position?: 'top' | 'bottom';

  /**
   * Show sync button
   * @default true
   */
  showSyncButton?: boolean;

  /**
   * Compact mode (smaller UI)
   * @default false
   */
  compact?: boolean;
}

export function NetworkStatusIndicator({
  position = 'top',
  showSyncButton = true,
  compact = false,
}: NetworkStatusIndicatorProps) {
  const { connected, connectionType, isLoading } = useNetworkStatus();
  const { pendingCount, isSyncing, lastSyncResult, syncNow } = useSyncStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Show/hide banner based on connection status
  useEffect(() => {
    if (isLoading) return;

    if (!connected) {
      setShowBanner(true);
    } else {
      // When reconnecting, show for 3 seconds then hide
      if (showBanner) {
        setTimeout(() => setShowBanner(false), 3000);
      }
    }
  }, [connected, isLoading, showBanner]);

  // Show success message after sync
  useEffect(() => {
    if (lastSyncResult && lastSyncResult.syncedCount > 0) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [lastSyncResult]);

  // Don't render anything if loading or if online with no pending items
  if (isLoading) return null;
  if (!showBanner && !showSuccess && pendingCount === 0) return null;

  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';
  const sizeClasses = compact ? 'text-xs py-1 px-2' : 'text-sm py-2 px-4';

  return (
    <div className={`fixed ${positionClasses} left-0 right-0 z-50`}>
      {/* Offline Banner */}
      {showBanner && !connected && (
        <div className={`bg-warning text-warning-content ${sizeClasses} flex items-center justify-center gap-2`}>
          <WifiOff size={compact ? 14 : 16} />
          <span className="font-medium">Offline Mode</span>
          {pendingCount > 0 && (
            <span className="ml-2 opacity-90">
              ({pendingCount} {pendingCount === 1 ? 'item' : 'items'} pending sync)
            </span>
          )}
        </div>
      )}

      {/* Reconnected Banner */}
      {showBanner && connected && (
        <div className={`bg-success text-success-content ${sizeClasses} flex items-center justify-center gap-2`}>
          <Wifi size={compact ? 14 : 16} />
          <span className="font-medium">Back Online</span>
          {connectionType !== 'unknown' && (
            <span className="ml-1 opacity-90">({connectionType})</span>
          )}
        </div>
      )}

      {/* Sync Success Banner */}
      {showSuccess && lastSyncResult && (
        <div className={`bg-success text-success-content ${sizeClasses} flex items-center justify-center gap-2`}>
          <Check size={compact ? 14 : 16} />
          <span className="font-medium">
            Synced {lastSyncResult.syncedCount} {lastSyncResult.syncedCount === 1 ? 'item' : 'items'}
          </span>
          {lastSyncResult.failedCount > 0 && (
            <span className="ml-2 opacity-90">
              ({lastSyncResult.failedCount} failed)
            </span>
          )}
        </div>
      )}

      {/* Syncing Indicator */}
      {isSyncing && (
        <div className={`bg-info text-info-content ${sizeClasses} flex items-center justify-center gap-2`}>
          <RefreshCw size={compact ? 14 : 16} className="animate-spin" />
          <span className="font-medium">Syncing...</span>
        </div>
      )}

      {/* Pending Sync Items (when online) */}
      {!showBanner && connected && pendingCount > 0 && showSyncButton && !isSyncing && (
        <div className={`bg-base-300 text-base-content ${sizeClasses} flex items-center justify-center gap-3`}>
          <AlertCircle size={compact ? 14 : 16} className="text-warning" />
          <span>
            {pendingCount} {pendingCount === 1 ? 'item' : 'items'} waiting to sync
          </span>
          <button
            onClick={syncNow}
            className="btn btn-xs btn-primary"
            disabled={isSyncing}
          >
            <RefreshCw size={12} />
            Sync Now
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Network Status Badge
 *
 * Shows a small badge with connection status
 * Useful for navigation bars
 */
export function NetworkStatusBadge() {
  const { connected, isLoading } = useNetworkStatus();
  const { pendingCount } = useSyncStatus();

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-1">
      {connected ? (
        <Wifi size={14} className="text-success" />
      ) : (
        <WifiOff size={14} className="text-warning" />
      )}
      {pendingCount > 0 && (
        <span className="badge badge-xs badge-warning">{pendingCount}</span>
      )}
    </div>
  );
}
