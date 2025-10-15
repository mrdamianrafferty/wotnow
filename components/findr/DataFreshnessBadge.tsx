'use client';

import React from 'react';

interface DataFreshnessBadgeProps {
  freshness: 'fresh' | 'recent' | 'older' | 'stale';
  dataAgeHours?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * DataFreshnessBadge - Shows how recent the environmental data is
 * 
 * - Fresh: < 24 hours (green)
 * - Recent: < 3 days (yellow)
 * - Older: < 1 week (orange)
 * - Stale: > 1 week (red)
 */
export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  freshness,
  dataAgeHours,
  size = 'sm',
  showLabel = true
}) => {
  const config = {
    fresh: { 
      color: 'badge-success', 
      icon: '🟢', 
      label: 'Fresh',
      description: 'Data updated within 24 hours'
    },
    recent: { 
      color: 'badge-warning', 
      icon: '🟡', 
      label: 'Recent',
      description: 'Data updated within 3 days'
    },
    older: { 
      color: 'badge-warning opacity-75', 
      icon: '🟠', 
      label: 'Older',
      description: 'Data updated within 1 week'
    },
    stale: { 
      color: 'badge-error', 
      icon: '🔴', 
      label: 'Stale',
      description: 'Data over 1 week old'
    }
  }[freshness];

  const formatTimeAgo = (hours: number): string => {
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.round(hours)}h ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  };

  const displayText = dataAgeHours !== undefined && showLabel
    ? formatTimeAgo(dataAgeHours)
    : showLabel
    ? config.label
    : null;

  return (
    <div 
      className="tooltip tooltip-bottom" 
      data-tip={config.description}
    >
      <div className={`badge ${config.color} badge-${size} gap-1`}>
        <span role="img" aria-label={config.label}>{config.icon}</span>
        {displayText && <span className="font-medium">{displayText}</span>}
      </div>
    </div>
  );
};
