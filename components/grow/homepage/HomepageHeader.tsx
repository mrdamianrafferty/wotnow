import React from 'react';
import { motion } from 'framer-motion';
import { Sprout, Flower2, Sun, Apple, Snowflake, RefreshCw, Flame } from 'lucide-react';
import { Button } from '../../ui/button';
import { LocationSettings } from '../LocationSettings';
import { haptic } from '../../../lib/grow/haptics';
import type { SeasonalTint } from '../../../lib/grow/seasonalColors';

const SEASON_ICONS = { Sprout, Flower2, Sun, Apple, Snowflake } as const;

interface HomepageHeaderProps {
  seasonal: SeasonalTint;
  greeting: string;
  wisdom: string;
  encouragement: string | null;
  streak: { count: number; isNewDay: boolean; milestone: number | null };
  isWindy?: boolean;
  currentLocation?: string;
  onLocationUpdate?: (location: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  t: (value: string) => string;
}

export function HomepageHeader({
  seasonal,
  greeting,
  wisdom,
  encouragement,
  streak,
  isWindy,
  currentLocation,
  onLocationUpdate,
  onRefresh,
  isRefreshing,
  t: _t,
}: HomepageHeaderProps) {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const SeasonIcon = SEASON_ICONS[seasonal.iconName] || Sprout;

  return (
    <div className="relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileTap={{ scale: 1.3, rotate: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <SeasonIcon
              size={28}
              style={{ color: seasonal.accentColor }}
              className={isWindy ? 'motion-safe:animate-windy-sway' : 'motion-safe:animate-gentle-sway'}
              aria-hidden="true"
            />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{greeting}</h1>
              {streak.count >= 2 && (
                <motion.span
                  className="flex items-center gap-0.5 text-xs font-semibold text-amber-600"
                  initial={streak.milestone ? { scale: 0.5 } : false}
                  animate={streak.milestone ? { scale: [0.5, 1.3, 1] } : undefined}
                  transition={streak.milestone ? { duration: 0.5, ease: 'easeOut' as const } : undefined}
                  title={`${streak.count} day streak`}
                >
                  <Flame size={14} className="text-amber-500" />
                  {streak.count}
                </motion.span>
              )}
            </div>
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
            onClick={() => { haptic('medium'); onRefresh(); }}
            disabled={isRefreshing}
            aria-label="Refresh"
            className="h-9 w-9"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Seasonal wisdom — rotates daily */}
      <p className="mt-2 text-[11px] text-muted-foreground/80 leading-relaxed italic">
        {wisdom}
      </p>

      {/* Encouragement based on garden state */}
      {encouragement && (
        <p className="mt-1 text-[11px] font-medium" style={{ color: seasonal.accentColor }}>
          {encouragement}
        </p>
      )}
    </div>
  );
}
