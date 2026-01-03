'use client';

import React from 'react';
import Link from 'next/link';
import { TranslatedText } from '../translation/TranslatedFishCard';
import {
  Sunrise,
  Sunset,
  Moon,
  Waves,
  Fish,
  Compass,
  BookOpen,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

interface OfflineFallbackContentProps {
  isOffline: boolean;
  predictionDate: string;
  region?: string | null;
  hasCachedData?: boolean;
  onRetry?: () => void;
}

const GENERAL_TIPS = [
  {
    icon: Sunrise,
    title: 'Dawn is prime time',
    description: 'Fish are most active in the first two hours after sunrise. The low light gives you the advantage.',
  },
  {
    icon: Sunset,
    title: 'Golden hour feeds',
    description: 'As light fades, predators become active. Dusk is excellent for many species.',
  },
  {
    icon: Moon,
    title: 'Moon phases matter',
    description: 'New and full moons often trigger feeding activity, especially around tide changes.',
  },
  {
    icon: Waves,
    title: 'Tide movement is key',
    description: 'Fish feed when water moves. Target the 2 hours before and after tide changes.',
  },
];

const ACTIVITY_LEVELS = [
  { time: 'Dawn (5-8am)', level: 'high', description: 'Peak activity as fish begin feeding' },
  { time: 'Morning (8-11am)', level: 'medium', description: 'Good activity continues' },
  { time: 'Midday (11am-2pm)', level: 'low', description: 'Fish often rest in deeper water' },
  { time: 'Afternoon (2-5pm)', level: 'medium', description: 'Activity picks up again' },
  { time: 'Dusk (5-8pm)', level: 'high', description: 'Second peak as predators hunt' },
  { time: 'Night (8pm+)', level: 'medium', description: 'Some species active, others rest' },
];

function ActivityLevel({ level }: { level: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-success',
    medium: 'bg-warning',
    low: 'bg-base-300',
  };

  return (
    <div className="flex gap-1">
      <div className={`w-2 h-2 rounded-full ${colors[level]}`} />
      <div className={`w-2 h-2 rounded-full ${level !== 'low' ? colors[level] : 'bg-base-300'}`} />
      <div className={`w-2 h-2 rounded-full ${level === 'high' ? colors[level] : 'bg-base-300'}`} />
    </div>
  );
}

export function OfflineFallbackContent({
  isOffline,
  predictionDate,
  region,
  hasCachedData,
  onRetry,
}: OfflineFallbackContentProps) {
  const dateDisplay = new Date(predictionDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`alert ${isOffline ? 'alert-info' : 'alert-warning'}`}>
        <div className="flex items-center gap-3">
          {isOffline ? (
            <WifiOff className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Fish className="w-5 h-5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {isOffline ? (
                <TranslatedText text="You're offline - showing general fishing guidance" />
              ) : (
                <TranslatedText text="No specific predictions for this location today" />
              )}
            </p>
            {region && (
              <p className="text-sm opacity-80">
                {region} - {dateDisplay}
              </p>
            )}
          </div>
        </div>
        {onRetry && !isOffline && (
          <button onClick={onRetry} className="btn btn-sm btn-ghost gap-1">
            <RefreshCw className="w-4 h-4" />
            <TranslatedText text="Retry" />
          </button>
        )}
      </div>

      {/* General activity timeline */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <TranslatedText text="General Fishing Activity" />
          </h3>
          <p className="text-base-content/70 text-sm mb-4">
            <TranslatedText text="Typical activity patterns for most species" />
          </p>

          <div className="space-y-3">
            {ACTIVITY_LEVELS.map((period) => (
              <div key={period.time} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium text-sm">{period.time}</div>
                  <div className="text-xs text-base-content/60">{period.description}</div>
                </div>
                <ActivityLevel level={period.level as 'high' | 'medium' | 'low'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* General tips grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GENERAL_TIPS.map((tip) => (
          <div key={tip.title} className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <tip.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{tip.title}</h4>
                  <p className="text-xs text-base-content/70 mt-1">{tip.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Browse species link */}
      <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-full">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                <TranslatedText text="Browse Species Guide" />
              </h3>
              <p className="text-sm text-base-content/70">
                <TranslatedText text="Explore all species and their habits - works offline" />
              </p>
            </div>
            <Link href="/findr/species" className="btn btn-primary btn-sm">
              <TranslatedText text="Browse" />
            </Link>
          </div>
        </div>
      </div>

      {/* Cached data hint */}
      {!hasCachedData && isOffline && (
        <div className="text-center text-sm text-base-content/60 py-4">
          <p>
            <TranslatedText text="Tip: View predictions online first to cache them for offline use" />
          </p>
        </div>
      )}
    </div>
  );
}

export default OfflineFallbackContent;
