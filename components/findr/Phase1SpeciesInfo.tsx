'use client';

import React from 'react';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { COMMON_BAITS, HABITAT_OPTIONS } from './baitHabitatOptions';

interface Phase1SpeciesInfoProps {
  recommendedBaits?: string[] | null;
  preferredHabitats?: string[] | null;
  effectiveTechniques?: string[] | null;
  bestTimes?: string[] | null;
  funFact?: string | null;
  conservationStatus?: string | null;
  compact?: boolean;
}

// Map habitat codes to display labels with emojis
const HABITAT_MAP: Record<string, string> = {};
for (const habitat of HABITAT_OPTIONS) {
  HABITAT_MAP[habitat.value] = habitat.label;
}

// Map bait names (without emojis) to display names (with emojis)
const BAIT_MAP: Record<string, string> = {};
for (const bait of COMMON_BAITS) {
  // Extract bait name without emoji (e.g., "🪱 Worms" -> "Worms")
  const name = bait.replace(/^[^\w\s]+\s*/, '');
  BAIT_MAP[name] = bait;
}

// Map time codes to human-readable labels
const TIME_LABELS: Record<string, string> = {
  'dawn': '🌅 Dawn',
  'dusk': '🌇 Dusk',
  'night': '🌙 Night',
  'day': '☀️ Day',
  'flooding_tide': '🌊 Flooding Tide',
  'ebbing_tide': '🌊 Ebbing Tide',
  'slack_water': '〰️ Slack Water',
  'spring_tides': '🌊 Spring Tides',
  'neap_tides': '🌊 Neap Tides',
};

// Map IUCN conservation status codes to labels
const CONSERVATION_LABELS: Record<string, { label: string; color: string }> = {
  'LC': { label: 'Least Concern', color: 'badge-success' },
  'NT': { label: 'Near Threatened', color: 'badge-info' },
  'VU': { label: 'Vulnerable', color: 'badge-warning' },
  'EN': { label: 'Endangered', color: 'badge-error' },
  'CR': { label: 'Critically Endangered', color: 'badge-error' },
  'EW': { label: 'Extinct in Wild', color: 'badge-error' },
  'EX': { label: 'Extinct', color: 'badge-error' },
  'DD': { label: 'Data Deficient', color: 'badge-ghost' },
  'NE': { label: 'Not Evaluated', color: 'badge-ghost' },
};

/**
 * Phase1SpeciesInfo - Displays Phase 1 structured species information
 *
 * Shows recommended baits, preferred habitats, effective techniques,
 * best fishing times, fun facts, and conservation status.
 */
export const Phase1SpeciesInfo: React.FC<Phase1SpeciesInfoProps> = ({
  recommendedBaits,
  preferredHabitats,
  effectiveTechniques,
  bestTimes,
  funFact,
  conservationStatus,
  compact = false,
}) => {
  const hasAnyData =
    (recommendedBaits && recommendedBaits.length > 0) ||
    (preferredHabitats && preferredHabitats.length > 0) ||
    (effectiveTechniques && effectiveTechniques.length > 0) ||
    (bestTimes && bestTimes.length > 0) ||
    funFact ||
    conservationStatus;

  if (!hasAnyData) {
    return null;
  }

  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {/* Recommended Baits */}
      {recommendedBaits && recommendedBaits.length > 0 && (
        <div>
          <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} mb-1`}>
            <TranslatedText text="Recommended Baits:" />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recommendedBaits.map((bait) => (
              <span
                key={bait}
                className={`badge badge-primary gap-1 ${compact ? 'badge-xs' : 'badge-sm'}`}
              >
                {BAIT_MAP[bait] || bait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Preferred Habitats */}
      {preferredHabitats && preferredHabitats.length > 0 && (
        <div>
          <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} mb-1`}>
            <TranslatedText text="Preferred Habitats:" />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {preferredHabitats.map((habitat) => (
              <span
                key={habitat}
                className={`badge badge-secondary gap-1 ${compact ? 'badge-xs' : 'badge-sm'}`}
              >
                {HABITAT_MAP[habitat] || habitat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Effective Techniques */}
      {effectiveTechniques && effectiveTechniques.length > 0 && (
        <div>
          <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} mb-1`}>
            <TranslatedText text="Effective Techniques:" />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {effectiveTechniques.map((technique) => (
              <span
                key={technique}
                className={`badge badge-accent gap-1 ${compact ? 'badge-xs' : 'badge-sm'}`}
              >
                <TranslatedText text={technique.replace(/_/g, ' ')} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Best Times */}
      {bestTimes && bestTimes.length > 0 && (
        <div>
          <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} mb-1`}>
            <TranslatedText text="Best Times:" />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bestTimes.map((time) => (
              <span
                key={time}
                className={`badge badge-info gap-1 ${compact ? 'badge-xs' : 'badge-sm'}`}
              >
                {TIME_LABELS[time] || time}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fun Fact */}
      {funFact && (
        <div className={`alert ${compact ? 'py-2' : 'py-3'} bg-base-200`}>
          <span className="text-lg">💡</span>
          <p className={`${compact ? 'text-xs' : 'text-sm'} flex-1`}>
            <TranslatedText text={funFact} />
          </p>
        </div>
      )}

      {/* Conservation Status */}
      {conservationStatus && (
        <div>
          <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} mb-1`}>
            <TranslatedText text="Conservation Status:" />
          </p>
          <span
            className={`badge ${CONSERVATION_LABELS[conservationStatus]?.color || 'badge-ghost'} gap-1 ${compact ? 'badge-xs' : 'badge-sm'}`}
          >
            🌿 {CONSERVATION_LABELS[conservationStatus]?.label || conservationStatus}
          </span>
        </div>
      )}
    </div>
  );
};

export default Phase1SpeciesInfo;
