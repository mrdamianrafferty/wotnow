'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Calendar, ChevronDown, ChevronUp, Target, Trash2, Fish, Clock } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { TranslatedFishName, TranslatedText } from '../translation/TranslatedFishCard';
import { getImmediateFishingTimes } from '../../utils/fishingTimeDataService';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { EnvironmentalInfo } from './EnvironmentalInfo';

interface GoodSpeciesCardProps {
  species: {
    id: string;
    name: string;
    scientificName?: string;
    emoji: string;
    image?: { src: string; alt: string } | null;
    confidence: number;
    forecast: number[];
    season: string;
    bestBait: string;
    isPriority: boolean;
    // Phase 10: Environmental data
    data_freshness?: 'fresh' | 'recent' | 'older' | 'stale';
    environmental_factors?: {
      temperature?: { actual: number; match: string; score: number };
      salinity?: { actual: number; match: string; score: number };
      depth?: { actual: number; match: string; score: number };
      substrate?: { actual: string; match: string; score: number };
      data_age_hours?: number;
      data_source?: string;
    };
  };
  onRemove: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onAction?: (id: string) => void;
}

/**
 * GoodSpeciesCard - For species with 70-84% confidence
 * Medium card with yellow theme and "Plan Trip" call to action
 */
export const GoodSpeciesCard: React.FC<GoodSpeciesCardProps> = ({
  species,
  onRemove,
  onTogglePriority,
  onAction,
}) => {
  const [expanded, setExpanded] = useState(false);

  const nextPeakDay = getNextPeakDay(species.forecast);
  // Get real fishing time data based on species preferences
  const fishingTimeResult = getImmediateFishingTimes([species], 'good');
  const fishingTime = {
    time: fishingTimeResult.primaryWindow ? 
      `${fishingTimeResult.primaryWindow.startHour}:00-${fishingTimeResult.primaryWindow.endHour}:00` :
      'Dawn/Dusk',
    emoji: fishingTimeResult.emoji,
    reason: fishingTimeResult.recommendation
  };

  return (
    <div className="card bg-gradient-to-br from-warning/10 via-warning/5 to-base-100 border border-warning/30 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="card-body p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Species Image/Emoji */}
            <div className="flex-shrink-0">
              {species.image ? (
                <div className="w-12 h-12 sm:w-16 sm:h-16 relative rounded-lg overflow-hidden bg-base-200">
                  <Image
                    src={species.image.src}
                    alt={species.image.alt}
                    fill
                    className="object-contain"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-3xl sm:text-4xl">
                  {species.emoji}
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg sm:text-xl font-bold text-base-content">
                  <TranslatedFishName name={species.name} />
                </h3>
                {species.isPriority && (
                  <Target size={14} className="text-warning flex-shrink-0" />
                )}
              </div>
              
              {/* Confidence Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="badge badge-warning gap-1 py-2 px-3">
                  <span className="font-bold">{species.confidence}%</span>
                </div>
                <span className="text-xs font-semibold text-warning uppercase">
                  ⚡ <TranslatedText text="Good conditions" />
                </span>
              </div>

              {/* Best Fishing Time */}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="badge badge-info gap-1 py-2 px-3">
                  <Clock size={12} />
                  <span className="font-semibold text-xs">{fishingTime.time}</span>
                </div>
                <span className="text-xs text-info">
                  {fishingTime.emoji} {fishingTime.reason}
                </span>
              </div>

              {/* Environmental Conditions - Compact View */}
              {species.environmental_factors && (
                <div className="mt-2">
                  <EnvironmentalInfo 
                    factors={species.environmental_factors} 
                    compact={true}
                    className="text-xs"
                  />
                </div>
              )}

              {/* Data Freshness Badge */}
              {species.data_freshness && (
                <div className="mt-1">
                  <DataFreshnessBadge 
                    freshness={species.data_freshness}
                    dataAgeHours={species.environmental_factors?.data_age_hours}
                    size="xs"
                    showLabel={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => onTogglePriority(species.id)}
              className={`btn btn-xs ${species.isPriority ? 'btn-warning' : 'btn-ghost'}`}
              title={species.isPriority ? 'Remove priority' : 'Make priority'}
            >
              <Target size={14} />
            </button>
            <button
              onClick={() => onRemove(species.id)}
              className="btn btn-ghost btn-xs text-error"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Timing Message */}
        <div className="alert alert-warning mt-3 py-2">
          <Calendar size={16} />
          <p className="text-sm flex-1">
            {nextPeakDay ? (
              <TranslatedText text={`Peak conditions ${nextPeakDay}`} />
            ) : (
              <TranslatedText text="Good time to plan a fishing trip" />
            )}
          </p>
        </div>

        {/* 7-Day Forecast */}
        <div className="mt-3">
          <MiniCalendar forecast={species.forecast} compact={true} />
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-ghost btn-xs w-full mt-3"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} /> <TranslatedText text="Hide" />
            </>
          ) : (
            <>
              <ChevronDown size={14} /> <TranslatedText text="Show details" />
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-3 mt-3 pt-3 border-t border-base-300">
            {/* How to Catch */}
            <div className="bg-base-200 rounded-lg p-3 space-y-1">
              <p className="text-sm">
                <span className="font-medium"><TranslatedText text="Best bait:" /></span>{' '}
                <TranslatedText text={species.bestBait} />
              </p>
              <p className="text-sm">
                <span className="font-medium"><TranslatedText text="Season:" /></span>{' '}
                <TranslatedText text={species.season} />
              </p>
              {species.scientificName && (
                <p className="text-xs italic text-base-content/60">{species.scientificName}</p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={() => onAction?.(species.id)}
              className="btn btn-warning btn-sm w-full gap-2"
            >
              <Fish size={16} />
              <TranslatedText text="Plan Trip" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Find next peak day in forecast
 */
function getNextPeakDay(forecast: number[]): string | null {
  for (let i = 1; i < Math.min(forecast.length, 7); i++) {
    if (forecast[i] >= 85) {
      const days = ['Tomorrow', 'in 2 days', 'in 3 days', 'in 4 days', 'in 5 days', 'in 6 days'];
      return days[i - 1] || null;
    }
  }
  return null;
}

export default GoodSpeciesCard;
