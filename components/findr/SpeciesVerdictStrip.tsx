/**
 * Species Verdict Strip - Per-species timing advice inside cards
 *
 * Shows species-specific verdict based on:
 * - Species confidence score
 * - Current time vs species' preferred times (best_times)
 * - Tide and light condition scores
 * - First tideTip for specific advice
 */

'use client';

import React, { useMemo } from 'react';
import { Clock, Sun, Moon, Waves } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { getConfidenceBand } from '../../types/favourites';

interface SpeciesVerdictStripProps {
  confidence: number | null;
  bestTimes?: string[] | null;
  tideTips?: string[];
  tideScore?: number | null;
  lightScore?: number | null;
  lunarScore?: number | null;
  compact?: boolean;
}

// Map best_times values to readable labels and icons
const TIME_LABELS: Record<string, { label: string; icon: 'sun' | 'moon' | 'dawn' | 'tide' }> = {
  dawn: { label: 'dawn feeder', icon: 'dawn' },
  dusk: { label: 'dusk feeder', icon: 'dawn' },
  day: { label: 'daytime active', icon: 'sun' },
  night: { label: 'night feeder', icon: 'moon' },
  mid_flood: { label: 'feeds on rising tide', icon: 'tide' },
  early_ebb: { label: 'feeds on falling tide', icon: 'tide' },
  high_slack: { label: 'active at high water', icon: 'tide' },
  low_slack: { label: 'active at low water', icon: 'tide' },
};

// Get current time period
function getCurrentTimePeriod(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

// Check if current time matches species preferences
function getTimeMatch(bestTimes: string[] | null | undefined): {
  isMatch: boolean;
  currentPeriod: string;
  matchedTime: string | null;
} {
  if (!bestTimes || bestTimes.length === 0) {
    return { isMatch: false, currentPeriod: getCurrentTimePeriod(), matchedTime: null };
  }

  const currentPeriod = getCurrentTimePeriod();

  // Check if current period matches any of species' best times
  if (bestTimes.includes(currentPeriod)) {
    return { isMatch: true, currentPeriod, matchedTime: currentPeriod };
  }

  return { isMatch: false, currentPeriod, matchedTime: null };
}

// Get the icon component for a time type
function TimeIcon({ type, size = 14 }: { type: 'sun' | 'moon' | 'dawn' | 'tide'; size?: number }) {
  switch (type) {
    case 'sun':
      return <Sun size={size} className="text-yellow-500" />;
    case 'moon':
      return <Moon size={size} className="text-blue-300" />;
    case 'dawn':
      return <Sun size={size} className="text-orange-400" />;
    case 'tide':
      return <Waves size={size} className="text-cyan-400" />;
    default:
      return <Clock size={size} />;
  }
}

// Extract timing insight from tideTips
function extractTimingFromTips(tideTips: string[] | undefined): string | null {
  if (!tideTips || tideTips.length === 0) return null;

  // Return first tip that mentions timing
  const timingKeywords = ['dawn', 'dusk', 'morning', 'evening', 'night', 'tide', 'flood', 'ebb', 'slack', 'hour'];

  for (const tip of tideTips) {
    const lowerTip = tip.toLowerCase();
    if (timingKeywords.some(keyword => lowerTip.includes(keyword))) {
      // Truncate if too long
      return tip.length > 60 ? tip.substring(0, 57) + '...' : tip;
    }
  }

  // Return first tip if no timing-specific one found
  const firstTip = tideTips[0];
  return firstTip.length > 60 ? firstTip.substring(0, 57) + '...' : firstTip;
}

// Generate timing message based on best_times and current conditions
function generateTimingMessage(
  bestTimes: string[] | null | undefined,
  timeMatch: { isMatch: boolean; currentPeriod: string; matchedTime: string | null },
  tideScore: number | null | undefined,
  lightScore: number | null | undefined
): { message: string; icon: 'sun' | 'moon' | 'dawn' | 'tide' | 'clock'; positive: boolean } {
  // If current time matches species preference
  if (timeMatch.isMatch && timeMatch.matchedTime) {
    const timeInfo = TIME_LABELS[timeMatch.matchedTime];
    if (timeInfo) {
      return {
        message: `Prime time - ${timeInfo.label}`,
        icon: timeInfo.icon,
        positive: true,
      };
    }
  }

  // Check if tide conditions are good
  if (tideScore != null && tideScore >= 70) {
    return {
      message: 'Tide conditions looking good',
      icon: 'tide',
      positive: true,
    };
  }

  // Check if light conditions are good
  if (lightScore != null && lightScore >= 70) {
    return {
      message: 'Light conditions are ideal',
      icon: 'sun',
      positive: true,
    };
  }

  // Suggest best times if current isn't ideal
  if (bestTimes && bestTimes.length > 0) {
    const preferredTimes = bestTimes
      .filter(t => TIME_LABELS[t])
      .slice(0, 2)
      .map(t => t.replace('_', ' '));

    if (preferredTimes.length > 0) {
      return {
        message: `Best at ${preferredTimes.join(' or ')}`,
        icon: TIME_LABELS[bestTimes[0]]?.icon || 'clock',
        positive: false,
      };
    }
  }

  return {
    message: 'Check tide tables for best times',
    icon: 'clock',
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
  compact = false,
}) => {
  const verdictData = useMemo(() => {
    const band = getConfidenceBand(confidence ?? 0);
    const timeMatch = getTimeMatch(bestTimes);

    // Try to get timing from tideTips first, then generate from best_times
    const tipTiming = extractTimingFromTips(tideTips);
    const generatedTiming = generateTimingMessage(bestTimes, timeMatch, tideScore, lightScore);

    // Use tip if available, otherwise use generated message
    const timingMessage = tipTiming || generatedTiming.message;
    const timingIcon = tipTiming ? 'clock' : generatedTiming.icon;
    const isPositive = tipTiming ? true : generatedTiming.positive;

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
      timingMessage,
      timingIcon,
      isPositive,
      timeMatch,
    };
  }, [confidence, bestTimes, tideTips, tideScore, lightScore]);

  if (confidence == null) return null;

  const { config, timingMessage, timingIcon, isPositive } = verdictData;

  if (compact) {
    // Compact version for tight spaces
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${config.bg} ${config.border} border`}>
        <TimeIcon type={timingIcon as 'sun' | 'moon' | 'dawn' | 'tide'} size={12} />
        <span className={`text-xs font-medium ${config.text}`}>
          <TranslatedText text={config.verdict} />
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${config.bg} ${config.border} border`}>
      <div className="flex items-center gap-1.5">
        <TimeIcon type={timingIcon as 'sun' | 'moon' | 'dawn' | 'tide'} size={16} />
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
