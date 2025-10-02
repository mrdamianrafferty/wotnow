'use client';

import React from 'react';
import Image from 'next/image';
import { TrendingUp, Target, Trash2, Clock } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { TranslatedFishName, TranslatedText } from '../translation/TranslatedFishCard';
import { getImmediateFishingTimes } from '../../utils/fishingTimeDataService';

interface WaitingSpeciesCardProps {
  species: {
    id: string;
    name: string;
    emoji: string;
    image?: { src: string; alt: string } | null;
    confidence: number;
    forecast: number[];
    isPriority: boolean;
  };
  onRemove: (id: string) => void;
  onTogglePriority: (id: string) => void;
}

/**
 * WaitingSpeciesCard - For species with <60% confidence
 * Compact card with gray theme showing when conditions are improving
 */
export const WaitingSpeciesCard: React.FC<WaitingSpeciesCardProps> = ({
  species,
  onRemove,
  onTogglePriority,
}) => {
  const improvingDay = getImprovingDay(species.forecast);
  const trend = getForecastTrend(species.forecast);
  
  // Get conservative fishing time data for waiting species
  const fishingTimeResult = getImmediateFishingTimes([species], 'waiting');
  const nextBestTime = fishingTimeResult.primaryWindow ? 
    `${fishingTimeResult.primaryWindow.startHour}:00` : 
    'Tomorrow 7am';

  return (
    <div className="card bg-base-100 border border-base-300 shadow hover:shadow-md transition-all duration-200">
      <div className="card-body p-3">
        <div className="flex items-center gap-3">
          {/* Species Emoji/Image */}
          <div className="flex-shrink-0">
            {species.image ? (
              <div className="w-10 h-10 relative rounded overflow-hidden bg-base-200">
                <Image
                  src={species.image.src}
                  alt={species.image.alt}
                  fill
                  className="object-contain"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center text-2xl">
                {species.emoji}
              </div>
            )}
          </div>

          {/* Name & Confidence */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-base-content truncate">
                <TranslatedFishName name={species.name} />
              </h3>
              {species.isPriority && (
                <Target size={12} className="text-warning flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-sm badge-outline">{species.confidence}%</span>
              {trend === 'improving' && (
                <span className="text-xs text-success flex items-center gap-1">
                  <TrendingUp size={12} /> <TranslatedText text="Improving" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Clock size={10} className="text-neutral" />
              <span className="text-xs text-neutral">{nextBestTime}</span>
            </div>
          </div>

          {/* Mini Forecast */}
          <div className="w-24 flex-shrink-0">
            <MiniCalendar forecast={species.forecast} compact={true} showLabels={false} />
          </div>

          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onTogglePriority(species.id)}
              className={`btn btn-xs ${species.isPriority ? 'btn-warning' : 'btn-ghost'}`}
              title={species.isPriority ? 'Remove priority' : 'Make priority'}
            >
              <Target size={12} />
            </button>
            <button
              onClick={() => onRemove(species.id)}
              className="btn btn-ghost btn-xs"
              title="Remove"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Improving message */}
        {improvingDay && (
          <div className="mt-2 text-xs text-base-content/60 flex items-center gap-1">
            <TrendingUp size={12} className="text-info" />
            <TranslatedText text={`Conditions improving ${improvingDay}`} />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Find when conditions start improving
 */
function getImprovingDay(forecast: number[]): string | null {
  for (let i = 1; i < Math.min(forecast.length, 7); i++) {
    if (forecast[i] >= 70 && forecast[i] > forecast[0] + 10) {
      const days = ['tomorrow', 'in 2 days', 'in 3 days', 'in 4 days', 'in 5 days', 'in 6 days'];
      return days[i - 1] || null;
    }
  }
  return null;
}

/**
 * Determine if forecast is improving or declining
 */
function getForecastTrend(forecast: number[]): 'improving' | 'stable' | 'declining' {
  const first3 = forecast.slice(0, 3);
  const next3 = forecast.slice(3, 6);
  
  if (next3.length < 3) return 'stable';
  
  const avgFirst = first3.reduce((a, b) => a + b, 0) / first3.length;
  const avgNext = next3.reduce((a, b) => a + b, 0) / next3.length;
  
  if (avgNext > avgFirst + 10) return 'improving';
  if (avgNext < avgFirst - 10) return 'declining';
  return 'stable';
}

export default WaitingSpeciesCard;
