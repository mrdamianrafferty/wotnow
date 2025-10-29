'use client';

import React from 'react';
import Image from 'next/image';
import { TrendingUp, Info, Heart, Clock, Fish } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { TranslatedFishName, TranslatedText } from '../translation/TranslatedFishCard';
import { SeasonalityBadge } from './SeasonalityBadge';
import { ConfidenceBreakdownCard } from './ConfidenceBreakdownCard';

interface WaitingSpeciesCardProps {
  species: {
    id: string;
    name: string;
    emoji: string;
    image?: { src: string; alt: string } | null;
    confidence: number;
    forecast: number[];
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
    // Week 3: Seasonality data
    seasonal_multiplier?: number;
    original_confidence?: number;
  };
  location?: { lat: number; lon: number } | null;
  onRemove: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onAction?: (id: string) => void;
}

/**
 * WaitingSpeciesCard - For species with <60% confidence
 * Compact card with gray theme showing when conditions are improving
 */
export const WaitingSpeciesCard: React.FC<WaitingSpeciesCardProps> = ({
  species,
  location: _location,
  onRemove,
  onTogglePriority: _onTogglePriority,
  onAction,
}) => {
  const improvingDay = getImprovingDay(species.forecast);
  const trend = getForecastTrend(species.forecast);

  // For low confidence species, show general timing rather than specific hours
  const getGeneralTiming = (): string => {
    const now = new Date().getHours();

    // If conditions improve soon, mention that day
    if (improvingDay) {
      return improvingDay;
    }

    // Otherwise suggest dawn/dusk (general good fishing times)
    if (now >= 5 && now < 9) {
      return 'This evening';
    } else if (now >= 9 && now < 17) {
      return 'Dawn/dusk';
    } else {
      return 'Tomorrow dawn';
    }
  };

  const nextBestTime = getGeneralTiming();

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof onAction === 'function') {
      onAction(species.id);
    } else {
      // fallback: log for now
      console.log('Waiting species card clicked:', species.id);
    }
  };

  return (
    <div 
      data-testid="species-card"
      data-species-id={species.id}
      data-confidence={species.confidence}
      className="card bg-base-100 border border-base-300 shadow hover:shadow-md transition-all duration-200"
    >      <div className="card-body p-3">
        <div className="flex items-center gap-3">
          {/* Species Image/Emoji - Clickable */}
          <button
            onClick={handleCardClick}
            className="flex-shrink-0 hover:opacity-80 transition-opacity focus:outline-none"
            type="button"
            aria-label={`View ${species.name} details`}
            tabIndex={-1}
            style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
          >
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
              <div className="w-10 h-10 flex items-center justify-center rounded overflow-hidden bg-gradient-to-br from-info/10 to-primary/10">
                <Fish size={24} className="text-primary" />
              </div>
            )}
          </button>

          {/* Name & Confidence */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-base-content truncate">
                <TranslatedFishName name={species.name} />
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="badge badge-sm badge-outline text-base-content border-base-content" data-testid="confidence-score">
                {species.confidence}%
                {species.seasonal_multiplier && species.original_confidence && (
                  <span className="ml-1 opacity-75 text-xs">
                    (from {Math.round(species.original_confidence)}%)
                  </span>
                )}
              </span>
              {species.seasonal_multiplier && (
                <SeasonalityBadge multiplier={species.seasonal_multiplier} compact />
              )}
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
            <div className="text-[9px] text-base-content/50 text-center mb-0.5">
              <TranslatedText text="7-day" />
            </div>
            <MiniCalendar forecast={species.forecast} compact={true} showLabels={false} />
          </div>

          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onAction?.(species.id); }}
              className="btn btn-xs btn-ghost"
              title="View species details"
            >
              <Info size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(species.id); }}
              className="btn btn-ghost btn-xs text-error"
              title="Remove from favourites"
            >
              <Heart size={12} fill="currentColor" />
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

        {/* Confidence Breakdown */}
        <div className="mt-2">
          <ConfidenceBreakdownCard
            speciesName={species.name}
            confidence={species.confidence}
            originalConfidence={species.original_confidence}
            seasonalMultiplier={species.seasonal_multiplier}
            environmentalFactors={species.environmental_factors}
            dataFreshness={species.data_freshness}
            compact={true}
          />
        </div>
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
