'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Zap, ChevronDown, ChevronUp, Info, Heart, Fish, Waves, Clock, Share2, Bell, BellOff, BellPlus } from 'lucide-react';
import { shareText } from '@/lib/capacitor/share';
import { scheduleLocalNotification, checkPermissions, requestPermissions, NotificationException } from '@/lib/capacitor/notifications';
import { trackNotification } from './NotificationManager';
import { MiniCalendar } from './MiniCalendar';
import { TranslatedFishName, TranslatedText } from '../translation/TranslatedFishCard';
import { GradientFish } from '../GradientFish';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { EnvironmentalInfo } from './EnvironmentalInfo';
import { ScoreBreakdown, type ScoreBreakdownData } from './ScoreBreakdown';
import { TideConditions, type TideInfo } from './TideConditions';
import { SeasonalityBadge } from './SeasonalityBadge';
import { ConfidenceBreakdownCard } from './ConfidenceBreakdownCard';
import { Phase1SpeciesInfo } from './Phase1SpeciesInfo';

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
    // Phase 1: Structured fishing content
    recommendedBaits?: string[] | null;
    preferredHabitats?: string[] | null;
    effectiveTechniques?: string[] | null;
    bestTimes?: string[] | null;
    funFact?: string | null;
    conservationStatus?: string | null;
    // Weather conditions
    weatherConditions?: {
      windSpeedMS?: number;
      pressureHPA?: number;
    };
  };
  location?: { lat: number; lon: number } | null;
  tideInfo?: TideInfo | null;
  onRemove: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onAction?: (id: string) => void;
  notificationsEnabled?: boolean;
  onSetupNotifications?: (id: string) => void;
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
  onTogglePriority: _onTogglePriority,
  onAction,
  notificationsEnabled,
  onSetupNotifications,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [alertScheduled, setAlertScheduled] = useState(false);

  const nextPeakHours = getNextPeakTime(species.forecast);

  // Share handler
  const handleShare = async () => {
    try {
      const shareContent = `🎣 ${species.name} - ${species.confidence}% confidence!\n\nBest conditions right NOW! Drop everything — they're biting! 🔥\n\nCheck predictions at fishfindr.eu`;
      await shareText(shareContent, `Fishing Prediction: ${species.name}`);
    } catch (error) {
      console.error('[ActiveSpeciesCard] Share failed:', error);
    }
  };

  // Notification alert handler
  const handleSetAlert = async () => {
    try {
      // Check permissions first
      const permissionStatus = await checkPermissions();

      if (permissionStatus !== 'granted') {
        const newStatus = await requestPermissions();
        if (newStatus !== 'granted') {
          console.warn('[ActiveSpeciesCard] Notification permission denied');
          return;
        }
      }

      const title = `🔥 ${species.name} - Hot Bite Alert!`;
      const body = `${species.confidence}% confidence! They're biting right now - drop everything and go fishing!`;

      // Schedule immediate notification (for hot bites happening NOW)
      const notificationId = await scheduleLocalNotification({
        title,
        body,
        extra: {
          speciesId: species.id,
          speciesName: species.name,
          confidence: species.confidence,
          type: 'hot_bite_alert',
        },
      });

      // Track notification for management UI
      trackNotification({
        id: notificationId,
        title,
        body,
        scheduledAt: new Date().toISOString(),
        speciesName: species.name,
        speciesId: species.id,
        type: 'hot_bite_alert',
      });

      console.log('[ActiveSpeciesCard] Alert scheduled:', notificationId);
      setAlertScheduled(true);

      // Auto-reset after 5 seconds to allow re-scheduling
      setTimeout(() => setAlertScheduled(false), 5000);
    } catch (error) {
      if (error instanceof NotificationException) {
        console.error('[ActiveSpeciesCard] Notification error:', error.type, error.message);
      } else {
        console.error('[ActiveSpeciesCard] Failed to set alert:', error);
      }
    }
  };
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
                {/* Notification Setup Button - Prominent header position */}
                {onSetupNotifications && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSetupNotifications(species.id); }}
                    className={`btn btn-sm ${notificationsEnabled ? 'btn-primary' : 'btn-outline btn-primary'}`}
                    title={notificationsEnabled ? 'Auto-alerts enabled - click to manage' : 'Set up auto-alerts'}
                  >
                    {notificationsEnabled ? <BellOff size={18} /> : <BellPlus size={18} />}
                  </button>
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
              onClick={(e) => { e.stopPropagation(); onAction?.(species.id); }}
              className="btn btn-sm btn-ghost"
              title="View species details"
            >
              <Info size={16} className="text-base-content" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="btn btn-sm btn-ghost"
              title="Share prediction"
            >
              <Share2 size={16} className="text-base-content" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleSetAlert(); }}
              className={`btn btn-sm ${alertScheduled ? 'btn-success' : 'btn-ghost'}`}
              title={alertScheduled ? 'Alert scheduled!' : 'Set fishing alert'}
              disabled={alertScheduled}
            >
              {alertScheduled ? <BellOff size={16} /> : <Bell size={16} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(species.id); }}
              className="btn btn-ghost btn-sm text-error"
              title="Remove from favourites"
            >
              <Heart size={16} fill="currentColor" />
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
          <h4 className="text-xs font-semibold text-base-content/70 mb-2">
            <TranslatedText text="7-Day Confidence Forecast" />
          </h4>
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
            {/* Phase 1: Structured Species Information */}
            <Phase1SpeciesInfo
              recommendedBaits={species.recommendedBaits}
              preferredHabitats={species.preferredHabitats}
              effectiveTechniques={species.effectiveTechniques}
              bestTimes={species.bestTimes}
              funFact={species.funFact}
              conservationStatus={species.conservationStatus}
              compact={false}
            />

            {/* Fallback: Show legacy data if no Phase 1 data available */}
            {!species.recommendedBaits && !species.preferredHabitats && (
              <>
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
                    {species.scientificName && (
                      <p className="text-xs italic text-base-content/60">{species.scientificName}</p>
                    )}
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
              </>
            )}

            {/* Confidence Breakdown */}
            <ConfidenceBreakdownCard
              speciesName={species.name}
              confidence={species.confidence}
              originalConfidence={species.original_confidence}
              seasonalMultiplier={species.seasonal_multiplier}
              environmentalFactors={species.environmental_factors}
              dataFreshness={species.data_freshness}
              biteScore={species.scoreBreakdown?.biteScore}
              biteScoreFactors={species.scoreBreakdown ? {
                tempScore: species.scoreBreakdown.tempScore,
                tideScore: species.scoreBreakdown.tideScore,
                lightScore: species.scoreBreakdown.lightScore,
                lunarScore: species.scoreBreakdown.lunarScore,
                weatherScore: species.scoreBreakdown.weatherScore,
                bioBandScore: species.scoreBreakdown.bioBandScore,
                habitatBonus: species.scoreBreakdown.habitatBonus,
              } : undefined}
              weatherConditions={species.weatherConditions}
              compact={false}
            />
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
