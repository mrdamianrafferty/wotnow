/**
 * Species Verdict Strip - Per-species timing advice inside cards
 *
 * Shows species-specific verdict based on:
 * - Species confidence score
 * - Current time vs species' preferred times (best_times)
 * - Actual tide times and current tide stage
 * - Light condition scores
 */

'use client';

import React, { useMemo } from 'react';
import { Clock, Sun, Moon, Waves, Sunrise } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { getConfidenceBand } from '../../types/favourites';
import { getTideStage, type TideExtreme } from '../../lib/findr/conditionHelpers';

interface SpeciesVerdictStripProps {
  confidence: number | null;
  bestTimes?: string[] | null;
  tideTips?: string[];
  tideScore?: number | null;
  lightScore?: number | null;
  lunarScore?: number | null;
  tideExtremes?: TideExtreme[] | null;
  compact?: boolean;
}

// Map best_times values to readable labels and icons
const TIME_LABELS: Record<string, { label: string; icon: 'sun' | 'moon' | 'dawn' | 'tide' }> = {
  dawn: { label: 'dawn', icon: 'dawn' },
  dusk: { label: 'dusk', icon: 'dawn' },
  day: { label: 'daytime', icon: 'sun' },
  night: { label: 'night', icon: 'moon' },
  mid_flood: { label: 'rising tide', icon: 'tide' },
  early_ebb: { label: 'falling tide', icon: 'tide' },
  high_slack: { label: 'high water', icon: 'tide' },
  low_slack: { label: 'low water', icon: 'tide' },
};

// Get current time period
function getCurrentTimePeriod(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

// Format time as HH:MM
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Get minutes until a time
function getMinutesUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.round((target - now) / (1000 * 60));
}

// Find next tide extreme
function getNextTide(extremes: TideExtreme[] | null | undefined): TideExtreme | null {
  if (!extremes || extremes.length === 0) return null;

  const now = Date.now();
  const sorted = [...extremes].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return sorted.find(t => new Date(t.time).getTime() > now) || null;
}

// Find the tide extreme after next
function getTideAfterNext(extremes: TideExtreme[] | null | undefined): TideExtreme | null {
  if (!extremes || extremes.length < 2) return null;

  const now = Date.now();
  const sorted = [...extremes].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const futureExtremes = sorted.filter(t => new Date(t.time).getTime() > now);

  return futureExtremes.length >= 2 ? futureExtremes[1] : null;
}

// Get the icon component for a time type
function TimeIcon({ type, size = 14 }: { type: 'sun' | 'moon' | 'dawn' | 'tide' | 'clock'; size?: number }) {
  switch (type) {
    case 'sun':
      return <Sun size={size} className="text-yellow-500" />;
    case 'moon':
      return <Moon size={size} className="text-blue-300" />;
    case 'dawn':
      return <Sunrise size={size} className="text-orange-400" />;
    case 'tide':
      return <Waves size={size} className="text-cyan-400" />;
    default:
      return <Clock size={size} className="text-base-content/60" />;
  }
}

// Generate specific timing message with actual tide times
function generateTimingMessage(
  bestTimes: string[] | null | undefined,
  tideScore: number | null | undefined,
  lightScore: number | null | undefined,
  tideExtremes: TideExtreme[] | null | undefined
): { message: string; icon: 'sun' | 'moon' | 'dawn' | 'tide' | 'clock'; positive: boolean } {
  const currentPeriod = getCurrentTimePeriod();
  const tideStage = getTideStage(tideExtremes);
  const nextTide = getNextTide(tideExtremes);
  const tideAfterNext = getTideAfterNext(tideExtremes);

  // Priority 1: Check if species prefers current tide stage and show actual time
  if (bestTimes && tideStage && nextTide) {
    const tidePrefs = bestTimes.filter(t => ['mid_flood', 'early_ebb', 'high_slack', 'low_slack'].includes(t));

    // Check if current tide stage matches species preference
    const stageMapping: Record<string, string> = {
      'flooding': 'mid_flood',
      'ebbing': 'early_ebb',
      'high_slack': 'high_slack',
      'low_slack': 'low_slack',
    };

    const currentPref = stageMapping[tideStage];
    if (tidePrefs.includes(currentPref)) {
      const minutesUntilChange = getMinutesUntil(nextTide.time);
      if (minutesUntilChange <= 90) {
        return {
          message: `${tideStage === 'flooding' ? 'Rising' : tideStage === 'ebbing' ? 'Falling' : tideStage.replace('_', ' ')} - ${minutesUntilChange}m left`,
          icon: 'tide',
          positive: true,
        };
      }
      return {
        message: `${nextTide.type === 'high' ? 'High' : 'Low'} tide at ${formatTime(nextTide.time)}`,
        icon: 'tide',
        positive: true,
      };
    }

    // Species prefers a different tide stage - show when it will be better
    if (tidePrefs.length > 0) {
      const preferredPref = tidePrefs[0];
      // Figure out when their preferred stage will occur
      if (preferredPref === 'high_slack' && nextTide.type === 'high') {
        const mins = getMinutesUntil(nextTide.time);
        return {
          message: mins <= 60 ? `High water in ${mins}m` : `High water at ${formatTime(nextTide.time)}`,
          icon: 'tide',
          positive: mins <= 60,
        };
      }
      if (preferredPref === 'low_slack' && nextTide.type === 'low') {
        const mins = getMinutesUntil(nextTide.time);
        return {
          message: mins <= 60 ? `Low water in ${mins}m` : `Low water at ${formatTime(nextTide.time)}`,
          icon: 'tide',
          positive: mins <= 60,
        };
      }
      if (preferredPref === 'mid_flood' && tideStage === 'ebbing' && tideAfterNext) {
        // Currently ebbing, flooding will start after next low
        return {
          message: `Rising tide from ${formatTime(nextTide.time)}`,
          icon: 'tide',
          positive: false,
        };
      }
      if (preferredPref === 'early_ebb' && tideStage === 'flooding' && tideAfterNext) {
        return {
          message: `Falling tide from ${formatTime(nextTide.time)}`,
          icon: 'tide',
          positive: false,
        };
      }
    }
  }

  // Priority 2: Check time-of-day preferences
  if (bestTimes && bestTimes.length > 0) {
    const timePrefs = bestTimes.filter(t => ['dawn', 'dusk', 'day', 'night'].includes(t));

    if (timePrefs.includes(currentPeriod)) {
      const timeInfo = TIME_LABELS[currentPeriod];
      return {
        message: `Prime ${timeInfo?.label || currentPeriod} feeding time`,
        icon: timeInfo?.icon || 'sun',
        positive: true,
      };
    }

    // Suggest the next good time period
    if (timePrefs.length > 0) {
      const hour = new Date().getHours();

      // Find next matching time period
      if (timePrefs.includes('dusk') && hour < 17) {
        return {
          message: 'Better around dusk (5-8pm)',
          icon: 'dawn',
          positive: false,
        };
      }
      if (timePrefs.includes('dawn') && hour >= 7) {
        return {
          message: 'Best at dawn (5-7am)',
          icon: 'dawn',
          positive: false,
        };
      }
      if (timePrefs.includes('night') && hour < 20) {
        return {
          message: 'Feeds after dark (8pm+)',
          icon: 'moon',
          positive: false,
        };
      }
    }
  }

  // Priority 3: Good conditions message
  if (tideScore != null && tideScore >= 70 && nextTide) {
    return {
      message: `Good tide - ${nextTide.type} at ${formatTime(nextTide.time)}`,
      icon: 'tide',
      positive: true,
    };
  }

  if (lightScore != null && lightScore >= 70) {
    return {
      message: 'Light conditions ideal now',
      icon: currentPeriod === 'night' ? 'moon' : 'sun',
      positive: true,
    };
  }

  // Priority 4: Show next tide time as fallback
  if (nextTide) {
    const mins = getMinutesUntil(nextTide.time);
    if (mins <= 120) {
      return {
        message: `${nextTide.type === 'high' ? 'High' : 'Low'} tide in ${mins}m`,
        icon: 'tide',
        positive: false,
      };
    }
    return {
      message: `Next ${nextTide.type} at ${formatTime(nextTide.time)}`,
      icon: 'tide',
      positive: false,
    };
  }

  // Final fallback - show current conditions
  return {
    message: currentPeriod === 'day' ? 'Daytime conditions' : `${currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)} conditions`,
    icon: currentPeriod === 'night' ? 'moon' : currentPeriod === 'dawn' || currentPeriod === 'dusk' ? 'dawn' : 'sun',
    positive: false,
  };
}

export const SpeciesVerdictStrip: React.FC<SpeciesVerdictStripProps> = ({
  confidence,
  bestTimes,
  tideTips,
  tideScore,
  lightScore,
  lunarScore: _lunarScore, // Reserved for future lunar-based timing advice
  tideExtremes,
  compact = false,
}) => {
  const verdictData = useMemo(() => {
    const band = getConfidenceBand(confidence ?? 0);

    // Generate timing message with actual tide data
    const timing = generateTimingMessage(bestTimes, tideScore, lightScore, tideExtremes);

    // Override with tideTip if it's very specific
    let finalMessage = timing.message;
    let finalIcon = timing.icon;
    let isPositive = timing.positive;

    // Only use tideTip if it contains actual times or very specific info
    if (tideTips && tideTips.length > 0) {
      const tip = tideTips[0];
      // Check if tip has specific timing info we should show
      const hasSpecificTime = /\d{1,2}[:.]\d{2}|hour|minute|pm|am/i.test(tip);
      if (hasSpecificTime && tip.length <= 50) {
        finalMessage = tip;
        finalIcon = 'clock';
        isPositive = true;
      }
    }

    const verdictConfig = {
      active: {
        bg: 'bg-success/20',
        border: 'border-success/30',
        text: 'text-success',
        verdict: 'Worth trying now',
      },
      good: {
        bg: 'bg-warning/20',
        border: 'border-warning/30',
        text: 'text-warning',
        verdict: 'Could be worth it',
      },
      waiting: {
        bg: 'bg-error/20',
        border: 'border-error/30',
        text: 'text-error',
        verdict: 'Not ideal today',
      },
    };

    return {
      config: verdictConfig[band],
      timingMessage: finalMessage,
      timingIcon: finalIcon,
      isPositive,
    };
  }, [confidence, bestTimes, tideTips, tideScore, lightScore, tideExtremes]);

  if (confidence == null) return null;

  const { config, timingMessage, timingIcon, isPositive } = verdictData;

  if (compact) {
    // Compact version for tight spaces
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${config.bg} ${config.border} border`}>
        <TimeIcon type={timingIcon} size={12} />
        <span className={`text-xs font-medium ${config.text}`}>
          <TranslatedText text={config.verdict} />
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${config.bg} ${config.border} border`}>
      <div className="flex items-center gap-1.5">
        <TimeIcon type={timingIcon} size={16} />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-sm font-semibold ${config.text}`}>
          <TranslatedText text={config.verdict} />
        </span>
        <span className={`text-xs truncate ${isPositive ? 'text-base-content/70' : 'text-base-content/50'}`}>
          {timingMessage}
        </span>
      </div>
    </div>
  );
};

export default SpeciesVerdictStrip;
