'use client';

import React from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';
import type { SyncProgress, SyncResult } from '@/lib/offline/catchSync';

interface PendingCatchesBadgeProps {
  pendingCount: number;
  isOffline: boolean;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  lastSyncResult: SyncResult | null;
  onSyncNow?: () => void;
  className?: string;
}

export function PendingCatchesBadge({
  pendingCount,
  isOffline,
  isSyncing,
  syncProgress,
  lastSyncResult,
  onSyncNow,
  className = '',
}: PendingCatchesBadgeProps) {
  // Don't show if no pending catches and online
  if (pendingCount === 0 && !isOffline && !lastSyncResult) {
    return null;
  }

  // Show success briefly after sync
  if (lastSyncResult && lastSyncResult.success > 0 && pendingCount === 0) {
    return (
      <div className={`flex items-center gap-2 text-success text-sm ${className}`}>
        <Check className="w-4 h-4" />
        <span>
          {lastSyncResult.success} <TranslatedText text="catch synced" />
        </span>
      </div>
    );
  }

  // Show syncing progress
  if (isSyncing && syncProgress) {
    const percent = syncProgress.total > 0
      ? Math.round((syncProgress.synced / syncProgress.total) * 100)
      : 0;

    return (
      <div className={`flex items-center gap-2 text-info text-sm ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>
          <TranslatedText text="Syncing" /> {syncProgress.synced}/{syncProgress.total}
          {percent > 0 && ` (${percent}%)`}
        </span>
      </div>
    );
  }

  // Show pending count with offline/online status
  if (pendingCount > 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={onSyncNow}
          disabled={isOffline || isSyncing}
          className={`
            btn btn-sm gap-2
            ${isOffline ? 'btn-warning' : 'btn-info'}
            ${isSyncing ? 'btn-disabled' : ''}
          `}
          title={isOffline ? 'Will sync when online' : 'Sync now'}
        >
          {isOffline ? (
            <CloudOff className="w-4 h-4" />
          ) : (
            <Cloud className="w-4 h-4" />
          )}
          <span className="badge badge-sm">
            {pendingCount}
          </span>
          <span className="hidden sm:inline">
            {isOffline ? (
              <TranslatedText text="pending" />
            ) : (
              <TranslatedText text="to sync" />
            )}
          </span>
        </button>
      </div>
    );
  }

  // Show failed syncs
  if (lastSyncResult && lastSyncResult.failed > 0) {
    return (
      <div className={`flex items-center gap-2 text-error text-sm ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>
          {lastSyncResult.failed} <TranslatedText text="failed to sync" />
        </span>
        {onSyncNow && !isOffline && (
          <button
            onClick={onSyncNow}
            className="btn btn-xs btn-ghost"
          >
            <TranslatedText text="Retry" />
          </button>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Compact badge for navigation/header use
 */
export function PendingCatchesCompactBadge({
  pendingCount,
  isOffline,
  isSyncing,
}: {
  pendingCount: number;
  isOffline: boolean;
  isSyncing: boolean;
}) {
  if (pendingCount === 0) return null;

  return (
    <div
      className={`
        badge badge-sm
        ${isOffline ? 'badge-warning' : 'badge-info'}
        ${isSyncing ? 'animate-pulse' : ''}
      `}
      title={`${pendingCount} catches pending sync`}
    >
      {isSyncing ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : isOffline ? (
        <CloudOff className="w-3 h-3" />
      ) : (
        <Cloud className="w-3 h-3" />
      )}
      <span className="ml-1">{pendingCount}</span>
    </div>
  );
}

export default PendingCatchesBadge;
