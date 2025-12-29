/**
 * Session Verdict Bar - Go/No-Go decision strip for fishing sessions
 *
 * Shows an overall recommendation based on:
 * - Top prediction's confidence score (as proxy for conditions)
 * - Best fishing times from predictions
 * - High-level weather concerns (if available)
 *
 * Displays above the card deck to give users quick go/no-go guidance.
 */

'use client';

import React, { useMemo } from 'react';
import { Target, ThumbsUp, Clock, AlertTriangle } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';

interface SessionVerdictBarProps {
  /** Top prediction's confidence score */
  topConfidence: number | null;
  /** Best times from predictions */
  bestTimes?: string[] | null;
  /** Number of species with good confidence (60%+) */
  goodSpeciesCount?: number;
  /** Total predictions available */
  totalPredictions?: number;
  /** Whether data is stale */
  isStale?: boolean;
  /** Optional className for container */
  className?: string;
}

type SessionVerdict = 'worth_it' | 'maybe' | 'not_today';

interface VerdictConfig {
  verdict: SessionVerdict;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  alertClass: string;
  textClass: string;
}

// Get time-based hint
function getTimeHint(bestTimes?: string[] | null): string | null {
  if (!bestTimes || bestTimes.length === 0) return null;

  const hour = new Date().getHours();
  const timePrefs = bestTimes.filter(t => ['dawn', 'dusk', 'day', 'night'].includes(t));

  if (timePrefs.length === 0) return null;

  // Check if current time matches any preference
  if (timePrefs.includes('dawn') && hour >= 5 && hour < 7) {
    return 'prime dawn window now';
  }
  if (timePrefs.includes('dusk') && hour >= 17 && hour < 20) {
    return 'prime dusk window now';
  }
  if (timePrefs.includes('day') && hour >= 7 && hour < 17) {
    return 'good daytime conditions';
  }
  if (timePrefs.includes('night') && (hour >= 20 || hour < 5)) {
    return 'night fishing on';
  }

  // Suggest when to go
  if (timePrefs.includes('dusk') && hour < 17) {
    return 'best around dusk';
  }
  if (timePrefs.includes('dawn') && hour >= 7) {
    return 'try again at dawn';
  }

  return null;
}

function getVerdictConfig(
  topConfidence: number | null,
  bestTimes?: string[] | null,
  goodSpeciesCount?: number,
  isStale?: boolean
): VerdictConfig {
  const confidence = topConfidence ?? 0;
  const timeHint = getTimeHint(bestTimes);

  // Stale data warning
  if (isStale) {
    return {
      verdict: 'maybe',
      label: 'Data may be outdated',
      sublabel: 'Refresh for latest conditions',
      icon: AlertTriangle,
      alertClass: 'alert-warning',
      textClass: 'text-warning',
    };
  }

  // Worth a session: 70%+ confidence or multiple good species
  if (confidence >= 70 || (goodSpeciesCount && goodSpeciesCount >= 3)) {
    return {
      verdict: 'worth_it',
      label: 'Worth a session',
      sublabel: timeHint || 'conditions look promising',
      icon: Target,
      alertClass: 'alert-success',
      textClass: 'text-success',
    };
  }

  // Maybe: 50-69% confidence
  if (confidence >= 50) {
    return {
      verdict: 'maybe',
      label: 'Could be worth it',
      sublabel: timeHint || 'decent conditions today',
      icon: ThumbsUp,
      alertClass: 'alert-warning',
      textClass: 'text-warning',
    };
  }

  // Not today: below 50%
  return {
    verdict: 'not_today',
    label: 'Tricky conditions',
    sublabel: timeHint || 'might want to wait',
    icon: Clock,
    alertClass: 'alert-error',
    textClass: 'text-error/80',
  };
}

export const SessionVerdictBar: React.FC<SessionVerdictBarProps> = ({
  topConfidence,
  bestTimes,
  goodSpeciesCount,
  totalPredictions,
  isStale,
  className = '',
}) => {
  const config = useMemo(
    () => getVerdictConfig(topConfidence, bestTimes, goodSpeciesCount, isStale),
    [topConfidence, bestTimes, goodSpeciesCount, isStale]
  );

  // Don't show if no predictions
  if (!totalPredictions || totalPredictions === 0) return null;

  const Icon = config.icon;

  return (
    <div className={`${config.alertClass} alert py-2.5 px-4 mb-3 shadow-sm ${className}`}>
      <div className="flex items-center gap-3 w-full">
        <Icon className={`h-5 w-5 shrink-0 ${config.textClass}`} />
        <div className="flex flex-col min-w-0 flex-1">
          <span className={`font-semibold text-sm ${config.textClass}`}>
            <TranslatedText text={config.label} />
          </span>
          <span className="text-xs opacity-80 capitalize">
            <TranslatedText text={config.sublabel} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default SessionVerdictBar;
