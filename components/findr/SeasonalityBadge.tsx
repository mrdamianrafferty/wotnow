'use client';

import React from 'react';
import { Sun, CloudSun, CloudOff } from 'lucide-react';

interface SeasonalityBadgeProps {
  multiplier: number;
  compact?: boolean;
}

/**
 * SeasonalityBadge - Shows seasonal availability status
 * 1.0 = Peak season (green)
 * 0.7 = Shoulder season (amber)
 * 0.3 = Off-season (red)
 */
export const SeasonalityBadge: React.FC<SeasonalityBadgeProps> = ({
  multiplier,
  compact = false
}) => {
  const getSeasonalStatus = () => {
    if (multiplier >= 0.9) {
      return {
        label: 'Peak Season',
        color: 'badge-success',
        icon: Sun,
        emoji: '🟢'
      };
    } else if (multiplier >= 0.6) {
      return {
        label: 'Shoulder',
        color: 'badge-warning',
        icon: CloudSun,
        emoji: '🟡'
      };
    } else {
      return {
        label: 'Off-Season',
        color: 'badge-error',
        icon: CloudOff,
        emoji: '🔴'
      };
    }
  };

  const status = getSeasonalStatus();
  const Icon = status.icon;

  if (compact) {
    return (
      <div
        className={`badge ${status.color} badge-sm gap-1`}
        title={`${status.label} (${(multiplier * 100).toFixed(0)}%)`}
      >
        <Icon size={12} />
        <span className="text-xs">{status.label}</span>
      </div>
    );
  }

  return (
    <div className={`badge ${status.color} gap-2`}>
      <Icon size={14} />
      <span>{status.label}</span>
      <span className="opacity-75">({(multiplier * 100).toFixed(0)}%)</span>
    </div>
  );
};

/**
 * SeasonalityIndicator - Inline text indicator for score breakdowns
 */
export const SeasonalityIndicator: React.FC<{ multiplier: number }> = ({ multiplier }) => {
  if (multiplier >= 0.9) {
    return <span className="text-success font-medium">🟢 Peak</span>;
  } else if (multiplier >= 0.6) {
    return <span className="text-warning font-medium">🟡 Shoulder</span>;
  } else {
    return <span className="text-error font-medium">🔴 Off-Season</span>;
  }
};
