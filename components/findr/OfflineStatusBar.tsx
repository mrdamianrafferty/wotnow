/**
 * Offline Status Bar
 *
 * Shows a prominent banner when the user is offline or viewing cached data.
 * Displays cache age and provides a refresh button.
 */

'use client';

import { RefreshCw, WifiOff, Clock, CloudOff } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { FreshnessLevel } from '@/lib/offline/storage';

interface OfflineStatusBarProps {
  /**
   * Whether the device is currently offline
   */
  isOffline: boolean;

  /**
   * Whether data is from cache
   */
  isFromCache?: boolean;

  /**
   * When the cached data was saved (timestamp in ms)
   */
  cacheTimestamp?: number;

  /**
   * Data freshness level
   */
  freshness?: FreshnessLevel;

  /**
   * Callback when refresh is requested
   */
  onRefresh?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format cache age into human-readable string
 */
function formatCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (ageMinutes < 1) return 'just now';
  if (ageMinutes < 60) return `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`;
  if (ageHours < 24) return `${ageHours} hour${ageHours === 1 ? '' : 's'} ago`;
  if (ageDays === 1) return 'yesterday';
  return `${ageDays} days ago`;
}

export function OfflineStatusBar({
  isOffline,
  isFromCache,
  cacheTimestamp,
  freshness,
  onRefresh,
  className = '',
}: OfflineStatusBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Keep refreshing state for at least 1 second for UX
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [onRefresh, isRefreshing]);

  // Don't show anything if online and not from cache
  if (!isOffline && !isFromCache) {
    return null;
  }

  // Determine bar style based on state
  const isStale = freshness === 'stale' || freshness === 'very-stale';
  const bgColor = isOffline
    ? 'bg-warning/90'
    : isStale
      ? 'bg-orange-500/90'
      : 'bg-info/90';
  const textColor = 'text-base-100';

  // Choose icon
  const Icon = isOffline ? WifiOff : isStale ? CloudOff : Clock;

  // Build message
  let message: string;
  let subMessage: string | null = null;

  if (isOffline) {
    message = 'You\'re Offline';
    if (cacheTimestamp) {
      subMessage = `Showing predictions from ${formatCacheAge(cacheTimestamp)}`;
    } else {
      subMessage = 'Viewing cached data';
    }
  } else if (isFromCache) {
    message = 'Cached Data';
    if (cacheTimestamp) {
      subMessage = `Last updated ${formatCacheAge(cacheTimestamp)}`;
    }
  } else {
    return null;
  }

  return (
    <div
      className={`
        ${bgColor} ${textColor}
        px-4 py-2
        flex items-center justify-between gap-3
        shadow-md
        ${className}
      `}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={18} className="shrink-0" />
        <div className="min-w-0">
          <span className="font-semibold text-sm">{message}</span>
          {subMessage && (
            <span className="text-xs opacity-90 block truncate">
              {subMessage}
            </span>
          )}
        </div>
      </div>

      {onRefresh && !isOffline && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isOffline}
          className={`
            btn btn-sm btn-ghost
            ${textColor}
            hover:bg-base-100/20
            disabled:opacity-50
          `}
          title={isOffline ? 'Connect to internet to refresh' : 'Refresh predictions'}
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? 'animate-spin' : ''}
          />
          <span className="hidden sm:inline ml-1">
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </span>
        </button>
      )}

      {isOffline && (
        <span className="text-xs opacity-75 shrink-0">
          Connect to update
        </span>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function OfflineIndicatorBadge({
  isOffline,
  isFromCache,
  freshness,
}: Pick<OfflineStatusBarProps, 'isOffline' | 'isFromCache' | 'freshness'>) {
  if (!isOffline && !isFromCache) return null;

  const isStale = freshness === 'stale' || freshness === 'very-stale';

  if (isOffline) {
    return (
      <span className="badge badge-warning badge-sm gap-1">
        <WifiOff size={12} />
        Offline
      </span>
    );
  }

  return (
    <span className={`badge ${isStale ? 'badge-warning' : 'badge-info'} badge-sm gap-1`}>
      <Clock size={12} />
      Cached
    </span>
  );
}
