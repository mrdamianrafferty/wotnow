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

interface BiteScoreBreakdown {
  biteScore?: number | null;
  tempScore?: number | null;
  tideScore?: number | null;
  lightScore?: number | null;
  lunarScore?: number | null;
  weatherScore?: number | null;
  bioBandScore?: number | null;
  habitatBonus?: number | null;
}

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
    // Bite score breakdown
    scoreBreakdown?: BiteScoreBreakdown;
    // Weather conditions
    weatherConditions?: {
      windSpeedMS?: number;
      pressureHPA?: number;
    };
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



  return (

    <div 
      data-testid="species-card"
      data-species-id={species.id}
      data-confidence={species.confidence}
      className="card bg-base-100 border border-base-300 shadow hover:shadow-md transition-all duration-200"
    >
      <div className="card-body p-2 sm:p-3">
        {/* Species Name at Top */}
        <h3 className="text-base font-semibold text-base-content truncate mb-1 text-center">
          <TranslatedFishName name={species.name} />
        </h3>
        <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
          {/* Species Image/Emoji - Clickable */}
          <button
            onClick={(e) => { e.stopPropagation(); onAction?.(species.id); }}
            className="flex-shrink-0 hover:opacity-80 transition-opacity focus:outline-none"
            type="button"
            aria-label={`View ${species.name} details`}
            tabIndex={-1}
            style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
          >
            {species.image ? (
              <div className="w-9 h-9 sm:w-10 sm:h-10 relative rounded overflow-hidden bg-base-200">
                <Image
                  src={species.image.src}
                  alt={species.image.alt}
                  fill
                  className="object-contain"
                  sizes="36px"
                />
              </div>
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded overflow-hidden bg-gradient-to-br from-info/10 to-primary/10">
                <Fish size={22} className="text-primary" />
              </div>
            )}
          </button>

          {/* GuildBadge placeholder: add if available */}
          {/* <GuildBadge guild={species.guild || 'default_coastal'} size="sm" /> */}

          {/* Confidence Badge */}
          <span className="badge badge-sm badge-outline text-base-content border-base-content ml-1" data-testid="confidence-score" style={{ boxShadow: 'none', filter: 'none' }}>
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

          {/* Mini Forecast */}
          <div className="w-20 sm:w-24 flex-shrink-0 ml-1">
            <div className="text-[9px] text-base-content/50 text-center mb-0.5">
              <TranslatedText text="7-day" />
            </div>
            <MiniCalendar forecast={species.forecast} compact={true} showLabels={false} />
          </div>

          {/* Actions */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(species.id); }}
            className="btn btn-ghost btn-xs text-error ml-1"
            title="Remove from favourites"
          >
            <Heart size={12} fill="currentColor" />
          </button>
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
            biteScore={species.scoreBreakdown?.biteScore ?? undefined}
            biteScoreFactors={species.scoreBreakdown ? {
              tempScore: species.scoreBreakdown.tempScore ?? undefined,
              tideScore: species.scoreBreakdown.tideScore ?? undefined,
              lightScore: species.scoreBreakdown.lightScore ?? undefined,
              lunarScore: species.scoreBreakdown.lunarScore ?? undefined,
              weatherScore: species.scoreBreakdown.weatherScore ?? undefined,
              bioBandScore: species.scoreBreakdown.bioBandScore ?? undefined,
              habitatBonus: species.scoreBreakdown.habitatBonus ?? undefined,
            } : undefined}
            weatherConditions={species.weatherConditions}
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
