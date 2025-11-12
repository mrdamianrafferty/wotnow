'use client';

import React from 'react';
import type { CardData } from '../../lib/findr/mapPrediction';

interface EnvironmentalInfoProps {
  factors?: CardData['environmental_factors'];
  compact?: boolean;
  className?: string;
}

/**
 * EnvironmentalInfo - Displays current environmental conditions
 * 
 * Shows temperature, salinity, depth, and substrate with match quality indicators:
 * - Green (✅): Optimal conditions
 * - Yellow (😐): Tolerable/acceptable conditions
 * - Red (❌): Poor conditions
 */
export const EnvironmentalInfo: React.FC<EnvironmentalInfoProps> = ({
  factors,
  compact = false,
  className = ''
}) => {
  if (!factors) return null;

  const getMatchColor = (match: string): string => {
    const normalized = match.toLowerCase();
    if (normalized === 'optimal' || normalized === 'preferred') {
      return 'text-success';
    }
    if (normalized === 'tolerable' || normalized === 'acceptable' || normalized === 'suitable') {
      return 'text-warning';
    }
    return 'text-error';
  };

  const getMatchIcon = (match: string): string => {
    const normalized = match.toLowerCase();
    if (normalized === 'optimal' || normalized === 'preferred') {
      return '✅';
    }
    if (normalized === 'tolerable' || normalized === 'acceptable' || normalized === 'suitable') {
      return '⚠️';
    }
    return '❌';
  };

  // Compact view for small spaces
  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 text-xs ${className}`}>
        {factors.temperature && factors.temperature.actual != null && (
          <span className={`flex items-center gap-1 ${getMatchColor(factors.temperature.match)}`}>
            <span role="img" aria-label="Temperature">🌡️</span>
            <span className="font-medium">{factors.temperature.actual}°C</span>
            <span className="opacity-60">{getMatchIcon(factors.temperature.match)}</span>
          </span>
        )}
        {factors.salinity && factors.salinity.actual != null && (
          <span className={`flex items-center gap-1 ${getMatchColor(factors.salinity.match)}`}>
            <span role="img" aria-label="Salinity">🧂</span>
            <span className="font-medium">{factors.salinity.actual} ppt</span>
            <span className="opacity-60">{getMatchIcon(factors.salinity.match)}</span>
          </span>
        )}
        {factors.substrate && factors.substrate.actual != null && (
          <span className={`flex items-center gap-1 ${getMatchColor(factors.substrate.match)}`}>
            <span role="img" aria-label="Substrate">🪨</span>
            <span className="font-medium capitalize">{factors.substrate.actual}</span>
            <span className="opacity-60">{getMatchIcon(factors.substrate.match)}</span>
          </span>
        )}
      </div>
    );
  }

  // Full view with grid layout
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {factors.temperature && factors.temperature.actual != null && (
          <div className="flex items-center justify-between">
            <span className="text-base-content/60 flex items-center gap-1">
              <span role="img" aria-label="Temperature">🌡️</span>
              <span>Temp:</span>
            </span>
            <span className={`font-semibold flex items-center gap-1 ${getMatchColor(factors.temperature.match)}`}>
              <span>{factors.temperature.actual}°C</span>
              <span className="text-xs">{getMatchIcon(factors.temperature.match)}</span>
            </span>
          </div>
        )}

        {factors.salinity && factors.salinity.actual != null && (
          <div className="flex items-center justify-between">
            <span className="text-base-content/60 flex items-center gap-1">
              <span role="img" aria-label="Salinity">🧂</span>
              <span>Salinity:</span>
            </span>
            <span className={`font-semibold flex items-center gap-1 ${getMatchColor(factors.salinity.match)}`}>
              <span>{factors.salinity.actual} ppt</span>
              <span className="text-xs">{getMatchIcon(factors.salinity.match)}</span>
            </span>
          </div>
        )}

        {factors.depth && factors.depth.actual != null && (
          <div className="flex items-center justify-between">
            <span className="text-base-content/60 flex items-center gap-1">
              <span role="img" aria-label="Depth">📏</span>
              <span>Depth:</span>
            </span>
            <span className={`font-semibold flex items-center gap-1 ${getMatchColor(factors.depth.match)}`}>
              <span>{factors.depth.actual}m</span>
              <span className="text-xs">{getMatchIcon(factors.depth.match)}</span>
            </span>
          </div>
        )}

        {factors.substrate && factors.substrate.actual != null && (
          <div className="flex items-center justify-between">
            <span className="text-base-content/60 flex items-center gap-1">
              <span role="img" aria-label="Substrate">🪨</span>
              <span>Seabed:</span>
            </span>
            <span className={`font-semibold flex items-center gap-1 ${getMatchColor(factors.substrate.match)} capitalize`}>
              <span>{factors.substrate.actual}</span>
              <span className="text-xs">{getMatchIcon(factors.substrate.match)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Data source and age */}
      {(factors.data_source || factors.data_age_hours !== undefined) && (
        <div className="text-xs text-base-content/50 flex items-center gap-2 pt-1 border-t border-base-300">
          {factors.data_source && (
            <span className="flex items-center gap-1">
              <span role="img" aria-label="Source">📡</span>
              <span className="capitalize">{factors.data_source}</span>
            </span>
          )}
          {factors.data_age_hours !== undefined && (
            <span className="flex items-center gap-1">
              <span role="img" aria-label="Updated">🕐</span>
              <span>
                {factors.data_age_hours < 1 
                  ? 'Just now'
                  : factors.data_age_hours < 24 
                  ? `${Math.round(factors.data_age_hours)}h ago`
                  : `${Math.round(factors.data_age_hours / 24)}d ago`}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
