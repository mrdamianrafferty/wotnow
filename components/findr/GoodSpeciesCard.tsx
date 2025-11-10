
'use client';
import { GuildBadge } from './GuildBadge';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, ChevronDown, ChevronUp, Target, Trash2, Fish, Clock, Info, Share2, BellOff, BellPlus } from 'lucide-react';
import { shareText } from '@/lib/capacitor/share';
import { scheduleLocalNotification, cancelLocalNotification, checkPermissions, requestPermissions, NotificationException } from '@/lib/capacitor/notifications';
import { trackNotification, getNotificationForSpecies, untrackNotification } from './NotificationManager';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toast } from '@/lib/ui/toast';
import { MiniCalendar } from './MiniCalendar';
import { TranslatedFishName, TranslatedText } from '../translation/TranslatedFishCard';
import { GradientFish } from '../GradientFish';
import { getImmediateFishingTimes } from '../../utils/fishingTimeDataService';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { EnvironmentalInfo } from './EnvironmentalInfo';
import { SeasonalityBadge } from './SeasonalityBadge';
import { useTideData } from '../../hooks/useTideData';
import { ConfidenceBreakdownCard } from './ConfidenceBreakdownCard';
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
  weight_profile?: string; // Add this for GuildBadge support
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
  notificationsEnabled?: boolean;
  onSetupNotifications?: (id: string) => void;
}

/**
 * GoodSpeciesCard - For species with 70-84% confidence
 * Medium card with yellow theme and "Plan Trip" call to action
 */
export const GoodSpeciesCard: React.FC<GoodSpeciesCardProps> = ({
  species,
  location,
  onRemove,
  onTogglePriority,
  onAction,
  notificationsEnabled: _notificationsEnabled,
  onSetupNotifications: _onSetupNotifications,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [notificationId, setNotificationId] = useState<number | null>(null);
  const { shouldNotify, preferences } = useNotificationPreferences();

  // Fetch real tide data for location
  const tideInfo = useTideData(location ?? null);

  const nextPeakDay = getNextPeakDay(species.forecast);

  // Check on mount if notification already exists for this species
  useEffect(() => {
    const existingId = getNotificationForSpecies(species.id);
    setNotificationId(existingId);
  }, [species.id]);

  // Share handler
  const handleShare = async () => {
    try {
      const shareContent = `🎣 ${species.name} - ${species.confidence}% confidence!

⚡ Good fishing conditions predicted!
${nextPeakDay ? `Peak conditions ${nextPeakDay}` : 'Great time to plan a fishing trip'}

Check predictions at fishfindr.eu`;
      await shareText(shareContent, `Fishing Prediction: ${species.name}`);
    } catch (error) {
      console.error('[GoodSpeciesCard] Share failed:', error);
    }
  };

  // Notification reminder handler - Toggle between scheduling and cancelling
  const handleSetReminder = async () => {
    try {
      // If notification exists, cancel it
      if (notificationId !== null) {
        await cancelLocalNotification(notificationId);
        untrackNotification(notificationId);
        setNotificationId(null);
        console.log('[GoodSpeciesCard] Reminder cancelled:', notificationId);
        await toast.success('Reminder cancelled');
        return;
      }

      // Check user preferences before scheduling
      if (!shouldNotify(species.confidence)) {
        if (!preferences.enabled) {
          await toast.warning('Notifications are disabled. Enable them in notification settings.');
        } else if (!preferences.peakRemindersEnabled) {
          await toast.warning('Peak conditions reminders are disabled. Enable them in notification settings.');
        } else if (species.confidence < preferences.minConfidence) {
          await toast.warning(`Confidence (${species.confidence}%) is below your threshold (${preferences.minConfidence}%). Lower your threshold in notification settings.`);
        } else {
          await toast.warning('Peak conditions reminders are disabled in your notification settings.');
        }
        return;
      }

      // Otherwise, schedule new notification
      const permissionStatus = await checkPermissions();
      if (permissionStatus !== 'granted') {
        const newStatus = await requestPermissions();
        if (newStatus !== 'granted') {
          console.warn('[GoodSpeciesCard] Notification permission denied');
          await toast.error('Notification permission denied. Please enable notifications in your device settings.');
          return;
        }
      }

      // Calculate when to send reminder (24 hours from now for "tomorrow" peak)
      const reminderTime = new Date();
      if (nextPeakDay && nextPeakDay.includes('tomorrow')) {
        // Set reminder for tomorrow morning at 8am
        reminderTime.setDate(reminderTime.getDate() + 1);
        reminderTime.setHours(8, 0, 0, 0);
      } else if (nextPeakDay && nextPeakDay.includes('2 days')) {
        // Set reminder for day after tomorrow at 8am
        reminderTime.setDate(reminderTime.getDate() + 2);
        reminderTime.setHours(8, 0, 0, 0);
      } else {
        // Default to 2 hours from now if no specific peak day
        reminderTime.setHours(reminderTime.getHours() + 2);
      }

      const title = `🎣 ${species.name} - Peak Conditions Reminder`;
      const body = `${species.confidence}% confidence! ${nextPeakDay ? `Peak conditions ${nextPeakDay}` : 'Great time to go fishing!'}`;

      const newNotificationId = await scheduleLocalNotification({
        title,
        body,
        schedule: { at: reminderTime },
        extra: {
          speciesId: species.id,
          speciesName: species.name,
          confidence: species.confidence,
          type: 'peak_conditions_reminder',
        },
      });

      // Track notification for management UI
      trackNotification({
        id: newNotificationId,
        title,
        body,
        scheduledAt: reminderTime.toISOString(),
        speciesName: species.name,
        speciesId: species.id,
        type: 'peak_conditions_reminder',
      });

      console.log('[GoodSpeciesCard] Reminder scheduled:', newNotificationId, 'for', reminderTime);
      setNotificationId(newNotificationId);
      await toast.success('Peak conditions reminder set!');
    } catch (error) {
      if (error instanceof NotificationException) {
        console.error('[GoodSpeciesCard] Notification error:', error.type, error.message);
      } else {
        console.error('[GoodSpeciesCard] Failed to toggle reminder:', error);
      }
    }
  };
  // Get real fishing time data based on species preferences, location, and tides
  const fishingTimeResult = getImmediateFishingTimes(
    [species], 
    'good',
    location?.lat,
    location?.lon,
    tideInfo ?? undefined
  );
  const fishingTime = {
    time: fishingTimeResult.primaryWindow ? 
      `${fishingTimeResult.primaryWindow.startHour}:00-${fishingTimeResult.primaryWindow.endHour}:00` :
      'Dawn/Dusk',
    emoji: fishingTimeResult.emoji,
    reason: fishingTimeResult.recommendation
  };

  return (
    <div 
      data-testid="species-card"
      data-species-id={species.id}
      data-confidence={species.confidence}
      className="card bg-gradient-to-br from-info/10 via-info/5 to-base-100 border-2 border-info shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.01]"
      onClick={() => onAction?.(species.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onAction?.(species.id)}
    >
      <div className="card-body p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
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
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg bg-gradient-to-br from-info/10 to-primary/10">
                  <GradientFish size={40} />
                </div>
              )}
            </button>

            {/* Title & Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-base-content truncate min-w-0">
                  <TranslatedFishName name={species.name} />
                </h3>
                {/* Notification Setup Button - Toggle on/off */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleSetReminder(); }}
                  className={`btn btn-xs ${notificationId !== null ? 'btn-primary' : 'btn-outline btn-primary'} flex-shrink-0`}
                  title={notificationId !== null ? 'Cancel peak conditions reminder' : 'Set peak conditions reminder'}
                >
                  {notificationId !== null ? <BellOff size={14} /> : <BellPlus size={14} />}
                </button>
                {species.isPriority && (
                  <Target size={14} className="text-warning flex-shrink-0" />
                )}
                {species.seasonal_multiplier && (
                  <SeasonalityBadge multiplier={species.seasonal_multiplier} compact />
                )}
                <span className="text-xs font-semibold text-warning uppercase">
                  ⚡ <TranslatedText text="Good conditions" />
                </span>
                <GuildBadge guild={species.weight_profile || 'default_coastal'} size="sm" />
                <div className="badge badge-warning gap-1 py-1.5 px-2.5 sm:py-2 sm:px-3 flex-shrink-0" data-testid="confidence-score" style={{ boxShadow: 'none', filter: 'none' }}>
                  <span className="font-bold">{species.confidence}%</span>
                  {species.seasonal_multiplier && species.original_confidence && (
                    <span className="text-xs opacity-75">
                      (from {Math.round(species.original_confidence)}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Best Fishing Time */}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="badge badge-info gap-1 py-1.5 px-2.5 sm:py-2 sm:px-3" style={{ boxShadow: 'none', filter: 'none' }}>
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
              onClick={(e) => { e.stopPropagation(); onAction?.(species.id); }}
              className="btn btn-xs btn-ghost text-base-content"
              title="View species details"
            >
              <Info size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="btn btn-xs btn-ghost text-base-content"
              title="Share prediction"
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePriority(species.id); }}
              className={`btn btn-xs ${species.isPriority ? 'btn-warning' : 'btn-ghost'}`}
              title={species.isPriority ? 'Remove priority' : 'Make priority'}
            >
              <Target size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(species.id); }}
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
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
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
            {/* Phase 1: Structured Species Information */}
            <Phase1SpeciesInfo
              recommendedBaits={species.recommendedBaits}
              preferredHabitats={species.preferredHabitats}
              effectiveTechniques={species.effectiveTechniques}
              bestTimes={species.bestTimes}
              funFact={species.funFact}
              conservationStatus={species.conservationStatus}
              compact={true}
            />

            {/* Fallback: Show legacy data if no Phase 1 data available */}
            {!species.recommendedBaits && !species.preferredHabitats && (
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
            )}

            {/* Confidence Breakdown */}
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
