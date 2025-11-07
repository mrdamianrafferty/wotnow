/**
 * Data Freshness Indicator
 *
 * Shows the age and freshness of cached prediction data
 * with color-coded visual indicators
 */

import { Clock, AlertTriangle } from 'lucide-react';
import { FreshnessLevel } from '@/lib/offline/storage';

interface DataFreshnessIndicatorProps {
  /**
   * Timestamp when data was cached (milliseconds)
   */
  timestamp: number;

  /**
   * Freshness level
   */
  freshness?: FreshnessLevel;

  /**
   * Compact mode (smaller UI)
   * @default false
   */
  compact?: boolean;

  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function DataFreshnessIndicator({
  timestamp,
  freshness,
  compact = false,
  showIcon = true,
}: DataFreshnessIndicatorProps) {
  // Calculate age
  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  // Format age text
  let ageText: string;
  if (ageMinutes < 1) {
    ageText = 'Just now';
  } else if (ageMinutes < 60) {
    ageText = `${ageMinutes}m ago`;
  } else if (ageHours < 24) {
    ageText = `${ageHours}h ago`;
  } else if (ageDays === 1) {
    ageText = 'Yesterday';
  } else {
    ageText = `${ageDays} days ago`;
  }

  // Determine freshness if not provided
  const calculatedFreshness: FreshnessLevel = freshness || (() => {
    if (ageHours < 3) return 'fresh';
    if (ageHours < 12) return 'recent';
    if (ageHours < 24) return 'stale';
    return 'very-stale';
  })();

  // Style based on freshness
  const freshnessConfig = {
    fresh: {
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      label: 'Fresh',
    },
    recent: {
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
      label: 'Recent',
    },
    stale: {
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      label: 'Older',
    },
    'very-stale': {
      color: 'text-error',
      bgColor: 'bg-error/10',
      borderColor: 'border-error/20',
      label: 'Old',
    },
  };

  const config = freshnessConfig[calculatedFreshness];

  const sizeClasses = compact ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';
  const iconSize = compact ? 12 : 14;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bgColor} ${config.borderColor} ${sizeClasses}`}
    >
      {showIcon && (
        calculatedFreshness === 'very-stale' ? (
          <AlertTriangle size={iconSize} className={config.color} />
        ) : (
          <Clock size={iconSize} className={config.color} />
        )
      )}
      <span className={`font-medium ${config.color}`}>
        {ageText}
      </span>
    </div>
  );
}

/**
 * Freshness Badge
 *
 * Simple badge showing freshness status
 */
interface FreshnessBadgeProps {
  freshness: FreshnessLevel;
  compact?: boolean;
}

export function FreshnessBadge({ freshness, compact = false }: FreshnessBadgeProps) {
  const badgeClass = {
    fresh: 'badge-success',
    recent: 'badge-warning',
    stale: 'badge-warning',
    'very-stale': 'badge-error',
  }[freshness];

  const label = {
    fresh: 'Fresh',
    recent: 'Recent',
    stale: 'Older',
    'very-stale': 'Old',
  }[freshness];

  return (
    <span className={`badge ${badgeClass} ${compact ? 'badge-xs' : 'badge-sm'}`}>
      {label}
    </span>
  );
}

/**
 * Offline Data Notice
 *
 * Shows when data is loaded from offline cache
 */
interface OfflineDataNoticeProps {
  timestamp: number;
  freshness: FreshnessLevel;
}

export function OfflineDataNotice({ timestamp, freshness }: OfflineDataNoticeProps) {
  const showWarning = freshness === 'stale' || freshness === 'very-stale';

  return (
    <div
      className={`alert ${showWarning ? 'alert-warning' : 'alert-info'} shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} />
        <div>
          <h3 className="font-bold text-sm">
            {showWarning ? 'Using Older Cached Data' : 'Offline Mode'}
          </h3>
          <p className="text-xs mt-1">
            {showWarning
              ? 'This data may be outdated. Connect to the internet for the latest predictions.'
              : 'Showing cached predictions from your last online session.'}
          </p>
          <DataFreshnessIndicator
            timestamp={timestamp}
            freshness={freshness}
            compact
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}
