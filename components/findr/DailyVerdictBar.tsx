/**
 * Daily Verdict Bar for Findr Homepage
 *
 * Shows an overall day rating with:
 * - Clickable thumbnail of top species (cycles through favorites)
 * - Overall verdict ("Worth a session", "Maybe today", etc.)
 * - Next peak window time and reason
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Clock, ChevronRight } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { calculateDailySummary, type DailySummary } from '../../lib/findr/peakWindowCalculator';
import type { CardData } from '../../lib/findr/mapPrediction';
import type { TideExtreme } from '../../lib/findr/conditionHelpers';

interface DailyVerdictBarProps {
  species: CardData[];
  tideExtremes: TideExtreme[] | null;
  onSpeciesClick?: (species: CardData) => void;
  loading?: boolean;
}

const VERDICT_CONFIG = {
  excellent: {
    alert: 'alert-success',
    title: 'Worth a session',
    description: 'Great conditions for your top species',
  },
  good: {
    alert: 'alert-success',
    title: 'Worth a session',
    description: 'Conditions are looking good',
  },
  fair: {
    alert: 'alert-warning',
    title: 'Maybe today',
    description: 'Mixed conditions - could be worth a try',
  },
  poor: {
    alert: 'alert-error',
    title: 'Not ideal',
    description: 'Conditions are against most species',
  },
} as const;

export const DailyVerdictBar: React.FC<DailyVerdictBarProps> = ({
  species,
  tideExtremes,
  onSpeciesClick,
  loading = false,
}) => {
  const [displayIndex, setDisplayIndex] = useState(0);

  // Calculate daily summary
  const summary: DailySummary | null = useMemo(() => {
    if (!species || species.length === 0) return null;
    return calculateDailySummary(species, tideExtremes);
  }, [species, tideExtremes]);

  // Reset display index when species change
  useEffect(() => {
    setDisplayIndex(0);
  }, [species]);

  // Cycle to next species on click
  const handleThumbnailClick = useCallback(() => {
    if (!summary || summary.topSpecies.length <= 1) return;

    const nextIndex = (displayIndex + 1) % summary.topSpecies.length;
    setDisplayIndex(nextIndex);

    // Notify parent of species selection
    if (onSpeciesClick && summary.topSpecies[nextIndex]) {
      onSpeciesClick(summary.topSpecies[nextIndex]);
    }
  }, [summary, displayIndex, onSpeciesClick]);

  // Loading state
  if (loading) {
    return (
      <div className="alert py-2 px-3 sm:px-4 bg-base-200">
        <div className="skeleton w-10 h-10 rounded-lg shrink-0"></div>
        <div className="flex flex-col gap-1 flex-1">
          <div className="skeleton h-4 w-32"></div>
          <div className="skeleton h-3 w-48"></div>
        </div>
      </div>
    );
  }

  // No data state
  if (!summary || summary.topSpecies.length === 0) {
    return null;
  }

  const currentSpecies = summary.topSpecies[displayIndex] || summary.topSpecies[0];
  const config = VERDICT_CONFIG[summary.overallRating];
  const hasMultipleSpecies = summary.topSpecies.length > 1;

  return (
    <div className={`alert ${config.alert} py-2 px-3 sm:px-4`}>
      {/* Species Thumbnail */}
      <button
        type="button"
        onClick={handleThumbnailClick}
        className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-base-200 shrink-0 ${
          hasMultipleSpecies ? 'cursor-pointer hover:ring-2 ring-white/50 transition-all' : ''
        }`}
        disabled={!hasMultipleSpecies}
        aria-label={hasMultipleSpecies ? `View next species (${displayIndex + 1}/${summary.topSpecies.length})` : currentSpecies.commonName}
      >
        {currentSpecies.image?.src ? (
          <Image
            src={currentSpecies.image.src}
            alt={currentSpecies.commonName}
            fill
            sizes="48px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">
            🐟
          </div>
        )}
        {/* Cycle indicator */}
        {hasMultipleSpecies && (
          <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">
            {displayIndex + 1}/{summary.topSpecies.length}
          </div>
        )}
      </button>

      {/* Verdict Content */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm sm:text-base truncate">
            <TranslatedText text={config.title} />
          </span>
          {summary.nextPeakWindow && (
            <span className="flex items-center gap-1 text-xs opacity-80 shrink-0">
              <Clock size={12} />
              <span>{summary.nextPeakWindow.displayTime}</span>
            </span>
          )}
        </div>
        <span className="text-xs sm:text-sm opacity-80 truncate">
          {summary.nextPeakWindow?.reason ? (
            <>
              <TranslatedText text="Peak" />: {summary.nextPeakWindow.reason}
            </>
          ) : (
            <TranslatedText text={config.description} />
          )}
        </span>
      </div>

      {/* Chevron indicator for clickable thumbnail */}
      {hasMultipleSpecies && (
        <ChevronRight size={16} className="opacity-50 shrink-0" />
      )}
    </div>
  );
};

export default DailyVerdictBar;
