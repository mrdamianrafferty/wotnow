/**
 * Weather Source Badge
 *
 * A small badge that indicates where weather data is coming from.
 * Shows "Your Garden" for personal stations or "Regional" for forecasts.
 *
 * @module components/grow/WeatherSourceBadge
 */

'use client';

import React from 'react';
import { CloudSun, Radio, AlertCircle } from 'lucide-react';
import { useWeatherDataSource } from '@/hooks/useWeatherDataSource';

interface WeatherSourceBadgeProps {
  /** Show full description instead of just badge */
  showDescription?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function WeatherSourceBadge({
  showDescription = false,
  className = '',
}: WeatherSourceBadgeProps) {
  const { source, accuracyBadge, isLoading, data } = useWeatherDataSource({
    autoRefresh: false, // Don't auto-refresh just for the badge
  });

  if (isLoading || !source || !accuracyBadge) {
    return null;
  }

  const isPersonal = source.type === 'personal_station';
  const Icon = isPersonal ? Radio : CloudSun;
  const isStale = data?.is_stale;

  if (showDescription) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${accuracyBadge.bgColor} ${accuracyBadge.color}`}>
          <Icon className="h-3 w-3" />
          <span>{accuracyBadge.label}</span>
          {isStale && (
            <AlertCircle className="h-3 w-3 text-amber-500" />
          )}
        </div>
        <span className="text-xs text-gray-500">
          {isPersonal
            ? `From ${source.stationName || 'your station'}`
            : 'Regional forecast'
          }
          {isStale && ' (data may be outdated)'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${accuracyBadge.bgColor} ${accuracyBadge.color} ${className}`}
      title={isPersonal
        ? `Real-time data from ${source.stationName || 'your weather station'}`
        : 'Based on regional weather forecast'
      }
    >
      <Icon className="h-2.5 w-2.5" />
      <span>{accuracyBadge.label}</span>
    </div>
  );
}

/**
 * Compact version showing just an icon with tooltip
 */
export function WeatherSourceIcon({ className = '' }: { className?: string }) {
  const { source, isLoading } = useWeatherDataSource({
    autoRefresh: false,
  });

  if (isLoading || !source) {
    return null;
  }

  const isPersonal = source.type === 'personal_station';

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      title={isPersonal
        ? `Using real data from ${source.stationName || 'your weather station'}`
        : 'Using regional weather forecast'
      }
    >
      {isPersonal ? (
        <Radio className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <CloudSun className="h-3.5 w-3.5 text-gray-400" />
      )}
    </div>
  );
}
