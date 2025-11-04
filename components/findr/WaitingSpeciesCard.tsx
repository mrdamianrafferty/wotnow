'use client';

import React from 'react';
import Image from 'next/image';
import { TrendingUp, Heart, Fish } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { TranslatedFishName, TranslatedText } from '../translation/TranslatedFishCard';
import { SeasonalityBadge } from './SeasonalityBadge';
import { ConfidenceBreakdownCard } from './ConfidenceBreakdownCard';
import { EnvironmentalInfo } from './EnvironmentalInfo';
import { Phase1SpeciesInfo } from './Phase1SpeciesInfo';

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
    // Phase 1: Structured fishing content
    recommendedBaits?: string[] | null;
    preferredHabitats?: string[] | null;
    effectiveTechniques?: string[] | null;
    bestTimes?: string[] | null;
    funFact?: string | null;
    conservationStatus?: string | null;
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
  // const trend = getForecastTrend(species.forecast); // removed, not needed after UI cleanup

  // For low confidence species, show general timing rather than specific hours


  // const nextBestTime = getGeneralTiming(); // removed, not needed after UI cleanup

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
            </div>
            <div className="flex items-center gap-1 mt-1">
              {/* Removed clock and timing message for cleaner mobile UI */}
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
            {/* Info button removed for cleaner mobile UI */}
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

        {/* Environmental Info (Phase 10) */}
        {species.environmental_factors && (
          <div className="mt-2">
            <EnvironmentalInfo factors={species.environmental_factors} data-testid="environmental-info" />
          </div>
        )}

        {/* Phase 1: Structured Species Information */}
        {(species.recommendedBaits || species.preferredHabitats || species.effectiveTechniques || species.bestTimes || species.funFact || species.conservationStatus) && (
          <div className="mt-2">
            <Phase1SpeciesInfo
              recommendedBaits={species.recommendedBaits}
              preferredHabitats={species.preferredHabitats}
              effectiveTechniques={species.effectiveTechniques}
              bestTimes={species.bestTimes}
              funFact={species.funFact}
              conservationStatus={species.conservationStatus}
              compact={true}
            />
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


export default WaitingSpeciesCard;
