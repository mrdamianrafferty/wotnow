'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Zap, ChevronDown, ChevronUp, Target, Trash2, Fish, Waves, Clock } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { TranslatedFishName, TranslatedText } from '../translation/TranslatedFishCard';
import { GradientFish } from '../GradientFish';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { EnvironmentalInfo } from './EnvironmentalInfo';
import { ScoreBreakdown, type ScoreBreakdownData } from './ScoreBreakdown';
import { TideConditions, type TideInfo } from './TideConditions';
import { SeasonalityBadge } from './SeasonalityBadge';

interface SpeciesAdvice {
  type?: string;
  regions?: string;
  best_time?: string;
  edibility_10?: string;
  tide_sensitivity?: string;
  effect_of_weather?: string;
  effect_of_temperature?: string;
  typical_distance_depth?: string;
  favourite_baits_and_natural_diet?: string;
  restrictions_notes?: string;
  fun_fact?: string;
  conservation_status?: string;
  trusted_authority_rules?: string;
}

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
    advice?: SpeciesAdvice[];
    // Phase 10: Environmental data
    data_freshness?: 'fresh' | 'recent' | 'older' | 'stale';
    weight_profile?: 'pelagic' | 'surf_estuary' | 'reef_kelp' | 'benthic' | 'cephalopod' | 'default_coastal';
    environmental_factors?: {
      temperature?: { actual: number; match: string; score: number };
      salinity?: { actual: number; match: string; score: number };
      depth?: { actual: number; match: string; score: number };
      substrate?: { actual: string; match: string; score: number };
      data_age_hours?: number;
      data_source?: string;
    };
    // Score breakdown data
    scoreBreakdown?: ScoreBreakdownData;
    // Week 3: Seasonality data
    seasonal_multiplier?: number;
    original_confidence?: number;
  };
  location?: { lat: number; lon: number } | null;
  tideInfo?: TideInfo | null;
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
  location: _location,
  tideInfo,
  onRemove,
  onTogglePriority,
  onAction,
}) => {
  const [expanded, setExpanded] = useState(false);

  const nextPeakHours = getNextPeakTime(species.forecast);
  // Note: We now use database bite scores instead of client-side calculation
  const fishingTime = {
    time: 'Now',
    emoji: '🎣',
    reason: 'Optimal conditions right now!'
  };

  return (
    <div 
      data-testid="species-card"
      data-species-id={species.id}
      data-confidence={species.confidence}
      className="card bg-gradient-to-br from-success/10 via-success/5 to-base-100 border-2 border-success shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
      onClick={() => onAction?.(species.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onAction?.(species.id)}
    >
      <div className="card-body p-3 sm:p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Species Image/Emoji (now clickable) */}
            <button
              type="button"
              className="flex-shrink-0 focus:outline-none hover:opacity-90"
              style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
              tabIndex={-1}
              aria-label={`View ${species.name} details`}
              onClick={e => { e.stopPropagation(); onAction?.(species.id); }}
            >
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl bg-gradient-to-br from-info/10 to-primary/10">
                  <GradientFish size={48} />
                </div>
              )}
            </button>

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
                <div className="badge badge-error badge-lg gap-2 py-2 px-3 sm:py-3 sm:px-4" data-testid="confidence-score">
                  <Zap size={16} fill="currentColor" />
                  <span className="font-bold">{species.confidence}%</span>
                  {species.seasonal_multiplier && species.original_confidence && (
                    <span className="text-xs opacity-75">
                      (from {Math.round(species.original_confidence)}%)
                    </span>
                  )}
                </div>
                {species.seasonal_multiplier && (
                  <SeasonalityBadge multiplier={species.seasonal_multiplier} compact />
                )}
                {species.scoreBreakdown && (
                  <ScoreBreakdown data={species.scoreBreakdown} speciesName={species.name} />
                )}
                <span className="text-sm font-semibold text-error uppercase tracking-wide">
                  🔥 <TranslatedText text="PEAK CONDITIONS" />
                </span>
              </div>

              {/* Best Fishing Time */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="badge badge-success badge-lg gap-2 py-2 px-3 sm:py-3 sm:px-4">
                  <Clock size={16} />
                  <span className="font-bold">{fishingTime.time}</span>
                </div>
                <span className="text-sm font-semibold text-success">
                  {fishingTime.emoji} {fishingTime.reason}
                </span>
              </div>

              {/* Tide Conditions */}
              {tideInfo && (
                <div className="mt-2">
                  <TideConditions tide={tideInfo} />
                </div>
              )}

              {/* Environmental Conditions - Compact View */}
              {species.environmental_factors && (
                <div className="mt-3">
                  <EnvironmentalInfo 
                    factors={species.environmental_factors} 
                    compact={true}
                    className="text-xs"
                  />
                </div>
              )}

              {/* Data Freshness Badge */}
              {species.data_freshness && (
                <div className="mt-2">
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
          <div className="flex flex-col gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePriority(species.id); }}
              className={`btn btn-sm ${species.isPriority ? 'btn-warning' : 'btn-ghost'}`}
              title={species.isPriority ? 'Remove priority' : 'Make priority'}
            >
              <Target size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(species.id); }}
              className="btn btn-ghost btn-sm text-error"
              title="Remove from favourites"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Urgent Message */}
        <div className="alert alert-success mt-4">
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
              <div className="text-sm text-base-content/70 space-y-2">
                {species.advice && species.advice.length > 0 ? (
                  <>
                    {species.advice.map((adviceItem, index) => (
                      <div key={index} className="space-y-1">
                        {adviceItem.type && (
                          <p className="font-semibold text-base-content/90">
                            {adviceItem.type === 'Shore' ? '🏖️' : '🚤'} {adviceItem.type}
                          </p>
                        )}
                        {adviceItem.best_time && (
                          <p>• <TranslatedText text={`Best time: ${adviceItem.best_time}`} /></p>
                        )}
                        {adviceItem.favourite_baits_and_natural_diet && (
                          <p>• <TranslatedText text={`Bait: ${adviceItem.favourite_baits_and_natural_diet}`} /></p>
                        )}
                        {adviceItem.tide_sensitivity && (
                          <p>• <TranslatedText text={`Tide: ${adviceItem.tide_sensitivity}`} /></p>
                        )}
                        {adviceItem.typical_distance_depth && (
                          <p>• <TranslatedText text={`Depth: ${adviceItem.typical_distance_depth}`} /></p>
                        )}
                        {adviceItem.effect_of_weather && (
                          <p>• <TranslatedText text={`Weather: ${adviceItem.effect_of_weather}`} /></p>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <p>• <TranslatedText text="Fish the tide turns for best results" /></p>
                    <p>• <TranslatedText text="Focus on structure and current breaks" /></p>
                    <p>• <TranslatedText text="Be ready to move if action slows" /></p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Action Button */}
        <button
          onClick={() => onAction?.(species.id)}
          className="btn btn-success btn-lg w-full mt-4 gap-2"
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
