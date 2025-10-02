'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Zap, ChevronDown, ChevronUp, Target, Trash2, Fish, Waves, Clock } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { TranslatedFishName, TranslatedText } from '../translation/TranslatedFishCard';
import { getImmediateFishingTimes } from '../../utils/fishingTimeDataService';

interface ActiveSpeciesCardProps {
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
  };
  onRemove: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onAction?: (id: string) => void;
}

/**
 * ActiveSpeciesCard - For species with 85%+ confidence
 * Large, prominent card with red theme and urgent "GO NOW" call to action
 */
export const ActiveSpeciesCard: React.FC<ActiveSpeciesCardProps> = ({
  species,
  onRemove,
  onTogglePriority,
  onAction,
}) => {
  const [expanded, setExpanded] = useState(false);

  const nextPeakHours = getNextPeakTime(species.forecast);
  // Get real fishing time data based on species preferences
  const fishingTimeResult = getImmediateFishingTimes([species], 'active');
  const fishingTime = {
    time: fishingTimeResult.primaryWindow ? 
      `${fishingTimeResult.primaryWindow.startHour}:00-${fishingTimeResult.primaryWindow.endHour}:00` :
      'Dawn/Dusk',
    emoji: fishingTimeResult.emoji,
    reason: fishingTimeResult.recommendation
  };

  return (
    <div className="card bg-gradient-to-br from-error/10 via-error/5 to-base-100 border-2 border-error shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="card-body p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Species Image/Emoji */}
            <div className="flex-shrink-0">
              {species.image ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 relative rounded-xl overflow-hidden bg-base-200">
                  <Image
                    src={species.image.src}
                    alt={species.image.alt}
                    fill
                    className="object-contain"
                    sizes="80px"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-4xl sm:text-5xl">
                  {species.emoji}
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl sm:text-2xl font-bold text-base-content">
                  <TranslatedFishName name={species.name} />
                </h3>
                {species.isPriority && (
                  <Target size={18} className="text-warning flex-shrink-0" />
                )}
              </div>
              {species.scientificName && (
                <p className="text-sm italic text-base-content/60 mb-2">{species.scientificName}</p>
              )}
              
              {/* Confidence Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="badge badge-error badge-lg gap-2 py-3 px-4">
                  <Zap size={16} fill="currentColor" />
                  <span className="font-bold">{species.confidence}%</span>
                </div>
                <span className="text-sm font-semibold text-error uppercase tracking-wide">
                  🔥 <TranslatedText text="PEAK CONDITIONS" />
                </span>
              </div>

              {/* Best Fishing Time */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="badge badge-success badge-lg gap-2 py-3 px-4">
                  <Clock size={16} />
                  <span className="font-bold">{fishingTime.time}</span>
                </div>
                <span className="text-sm font-semibold text-success">
                  {fishingTime.emoji} {fishingTime.reason}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onTogglePriority(species.id)}
              className={`btn btn-sm ${species.isPriority ? 'btn-warning' : 'btn-ghost'}`}
              title={species.isPriority ? 'Remove priority' : 'Make priority'}
            >
              <Target size={16} />
            </button>
            <button
              onClick={() => onRemove(species.id)}
              className="btn btn-ghost btn-sm text-error"
              title="Remove from favourites"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Urgent Message */}
        <div className="alert alert-error mt-4">
          <Zap size={20} />
          <div className="flex-1">
            <p className="font-bold">
              <TranslatedText text="Drop everything — they're biting NOW!" />
            </p>
            {nextPeakHours && (
              <p className="text-sm opacity-90">
                <TranslatedText text={`Peak window for next ${nextPeakHours}h`} />
              </p>
            )}
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="mt-4">
          <MiniCalendar forecast={species.forecast} compact={false} />
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-ghost btn-sm w-full mt-4"
        >
          {expanded ? (
            <>
              <ChevronUp size={16} /> <TranslatedText text="Hide details" />
            </>
          ) : (
            <>
              <ChevronDown size={16} /> <TranslatedText text="Show how to catch" />
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-4 mt-4 pt-4 border-t border-base-300">
            {/* How to Catch */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2 text-base-content">
                <Fish size={16} /> <TranslatedText text="How to catch right now" />
              </h4>
              <div className="bg-base-200 rounded-lg p-3 space-y-2">
                <p className="text-sm">
                  <span className="font-medium"><TranslatedText text="Best bait:" /></span>{' '}
                  <TranslatedText text={species.bestBait} />
                </p>
                <p className="text-sm">
                  <span className="font-medium"><TranslatedText text="Season:" /></span>{' '}
                  <TranslatedText text={species.season} />
                </p>
              </div>
            </div>

            {/* Tactical Advice */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2 text-base-content">
                <Waves size={16} /> <TranslatedText text="Tactical advice" />
              </h4>
              <div className="text-sm text-base-content/70 space-y-1">
                <p>• <TranslatedText text="Fish the tide turns for best results" /></p>
                <p>• <TranslatedText text="Focus on structure and current breaks" /></p>
                <p>• <TranslatedText text="Be ready to move if action slows" /></p>
              </div>
            </div>
          </div>
        )}

        {/* Main Action Button */}
        <button
          onClick={() => onAction?.(species.id)}
          className="btn btn-error btn-lg w-full mt-4 gap-2"
        >
          <Zap size={20} fill="currentColor" />
          <TranslatedText text="GO FISH NOW!" />
        </button>
      </div>
    </div>
  );
};

/**
 * Calculate hours until next peak ends
 */
function getNextPeakTime(forecast: number[]): number | null {
  let hours = 0;
  for (let i = 0; i < forecast.length && i < 24; i++) {
    if (forecast[i] >= 85) {
      hours++;
    } else if (hours > 0) {
      break;
    }
  }
  return hours > 0 ? hours : null;
}

export default ActiveSpeciesCard;
