import React from 'react';
import { Sprout, Flower2, Sun, Apple, Snowflake, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { LocationSettings } from '../LocationSettings';
import type { SeasonalTint } from '../../../lib/grow/seasonalColors';

const SEASON_ICONS = { Sprout, Flower2, Sun, Apple, Snowflake } as const;

interface HomepageHeaderProps {
  seasonal: SeasonalTint;
  currentLocation?: string;
  onLocationUpdate?: (location: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  t: (value: string) => string;
}

export function HomepageHeader({
  seasonal,
  currentLocation,
  onLocationUpdate,
  onRefresh,
  isRefreshing,
  t,
}: HomepageHeaderProps) {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const SeasonIcon = SEASON_ICONS[seasonal.iconName] || Sprout;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SeasonIcon
          size={28}
          style={{ color: seasonal.accentColor }}
          className="motion-safe:animate-gentle-sway"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('My Garden')}</h1>
          <p className="text-xs text-muted-foreground">
            {dateStr}
            <span
              className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundImage: seasonal.gradient,
                borderWidth: '1px',
                borderColor: seasonal.borderColor,
                color: seasonal.accentColor,
              }}
            >
              {seasonal.label}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LocationSettings
          currentLocation={currentLocation}
          onLocationUpdate={onLocationUpdate}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh"
          className="h-9 w-9"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </Button>
      </div>
    </div>
  );
}
