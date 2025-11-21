/**
 * Score and rank fishing approaches (habitat + technique combinations) for species
 *
 * Core principle: "For each species, we look at its best habitats and techniques,
 * compare those to today's conditions, and recommend the combo that should fish best right now."
 *
 * Weighting: 60% habitat (wrong ground won't save you), 40% technique (final optimization)
 */

import {
  scoreHabitatsByConditions,
  type HabitatConditions,
  type ScoredHabitat,
} from './scoreHabitatsByConditions';
import {
  scoreTechniquesByConditions,
  type TechniqueConditions,
  type ScoredTechnique,
} from './scoreTechniquesByConditions';

/**
 * Combined conditions interface (union of habitat + technique conditions)
 */
export interface ApproachConditions extends HabitatConditions, TechniqueConditions {}

/**
 * A scored approach combination (habitat + technique)
 */
export interface ScoredApproach {
  habitat: string;
  habitatEmoji: string;
  habitatScore: number;
  habitatReason: string;

  technique: string;
  techniqueName: string;
  techniqueEmoji: string;
  techniqueScore: number;
  techniqueReason: string;

  combinedScore: number;  // 0-100 (weighted: 60% habitat, 40% technique)
  explanation: string;     // Human-readable explanation of why this combo works
}

/**
 * Result for a species' best approach
 */
export interface SpeciesApproach {
  bestApproach: ScoredApproach;
  alternativeApproaches: ScoredApproach[];  // Other decent options (score >= 60)
  overallScore: number;                      // 0-100 normalized score
  summaryText: string;                       // One-line summary for UI
}

/**
 * Weighting constants
 */
const HABITAT_WEIGHT = 0.6;  // 60% - wrong ground won't save you
const TECHNIQUE_WEIGHT = 0.4; // 40% - final optimization

/**
 * Threshold for "alternative approach" (show if score >= this)
 */
const ALTERNATIVE_THRESHOLD = 60;

/**
 * Threshold for "tough conditions" warning (if best score < this)
 */
const TOUGH_CONDITIONS_THRESHOLD = 40;

/**
 * Generate human-readable explanation for an approach combination
 */
function generateExplanation(approach: ScoredApproach): string {
  const parts: string[] = [];

  // Start with the winning reason (highest absolute value)
  if (approach.habitatScore > approach.techniqueScore) {
    parts.push(approach.habitatReason);
    if (approach.techniqueScore >= 60) {
      parts.push(approach.techniqueReason);
    }
  } else {
    parts.push(approach.techniqueReason);
    if (approach.habitatScore >= 60) {
      parts.push(approach.habitatReason);
    }
  }

  // Join parts with better connectors
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    const text = parts[0];
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // For two parts, use " - " as connector for better flow
  const text = parts.join(' - ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Generate summary text for the overall approach
 */
function generateSummaryText(
  bestApproach: ScoredApproach,
  overallScore: number
): string {
  // Score description
  let scoreDesc: string;
  if (overallScore >= 80) scoreDesc = 'Excellent';
  else if (overallScore >= 70) scoreDesc = 'Very Good';
  else if (overallScore >= 60) scoreDesc = 'Good';
  else if (overallScore >= 50) scoreDesc = 'Fair';
  else if (overallScore >= 40) scoreDesc = 'Challenging';
  else scoreDesc = 'Tough';

  // Format: "Spinning from Rocky Shore (Very Good)"
  return `${bestApproach.techniqueName} from ${formatHabitatName(bestApproach.habitat)} (${scoreDesc})`;
}

/**
 * Format habitat code to display name
 */
function formatHabitatName(habitat: string): string {
  const names: Record<string, string> = {
    'rocky_shore': 'Rocky Shore',
    'sandy_beach': 'Sandy Beach',
    'pier_harbor': 'Pier / Harbour',
    'estuary': 'Estuary',
    'shallow_water': 'Shallow Water',
    'deep_water': 'Deep Water',
    'wreck_reef': 'Wreck & Reef',
    'open_sea': 'Open Sea',
  };
  return names[habitat] || habitat;
}

/**
 * Score a single habitat + technique combination
 */
function scoreApproachCombination(
  scoredHabitat: ScoredHabitat,
  scoredTechnique: ScoredTechnique
): ScoredApproach {
  // Calculate weighted combined score
  const combinedScore =
    scoredHabitat.score * HABITAT_WEIGHT +
    scoredTechnique.score * TECHNIQUE_WEIGHT;

  const approach: ScoredApproach = {
    habitat: scoredHabitat.habitat,
    habitatEmoji: scoredHabitat.emoji,
    habitatScore: scoredHabitat.score,
    habitatReason: scoredHabitat.reason || '',

    technique: scoredTechnique.technique,
    techniqueName: scoredTechnique.name,
    techniqueEmoji: scoredTechnique.emoji,
    techniqueScore: scoredTechnique.score,
    techniqueReason: scoredTechnique.reason || '',

    combinedScore: Math.round(combinedScore),
    explanation: '', // Will be filled below
  };

  approach.explanation = generateExplanation(approach);

  return approach;
}

/**
 * Score all habitat + technique combinations for a species
 *
 * @param habitats - Species' preferred habitats
 * @param techniques - Species' effective techniques
 * @param conditions - Current environmental conditions
 * @returns Scored approaches sorted by combined score (highest first)
 */
export function scoreAllApproaches(
  habitats: string[] | null | undefined,
  techniques: string[] | null | undefined,
  conditions: ApproachConditions
): ScoredApproach[] {
  if (!habitats || habitats.length === 0 || !techniques || techniques.length === 0) {
    return [];
  }

  // Score all habitats
  const scoredHabitats = scoreHabitatsByConditions(habitats, conditions);

  // Score all techniques
  const scoredTechniques = scoreTechniquesByConditions(techniques, conditions);

  // Generate all combinations
  const approaches: ScoredApproach[] = [];
  for (const habitat of scoredHabitats) {
    for (const technique of scoredTechniques) {
      approaches.push(scoreApproachCombination(habitat, technique));
    }
  }

  // Sort by combined score (highest first)
  return approaches.sort((a, b) => b.combinedScore - a.combinedScore);
}

/**
 * Get the best approach for a species with alternatives
 *
 * This is the main function to use for generating approach recommendations.
 *
 * @param habitats - Species' preferred habitats (from species.preferred_habitats)
 * @param techniques - Species' effective techniques (from species.effective_techniques)
 * @param conditions - Current environmental conditions
 * @returns Best approach + alternatives, or null if no valid approaches
 *
 * @example
 * const approach = getSpeciesApproach(
 *   ['rocky_shore', 'pier_harbor'],
 *   ['SPN', 'BOT'],
 *   {
 *     wind_speed_kts: 12,
 *     wave_height_m: 0.8,
 *     current_speed_ms: 0.4,
 *     kd490: 0.18,
 *     tide_stage: 'flooding',
 *     time_of_day: 'day'
 *   }
 * );
 *
 * if (approach) {
 *   console.log(approach.summaryText);
 *   // "Spinning from Rocky Shore (Very Good)"
 *   console.log(approach.bestApproach.explanation);
 *   // "Perfect conditions for lure fishing, moderate wind creates perfect movement"
 * }
 */
export function getSpeciesApproach(
  habitats: string[] | null | undefined,
  techniques: string[] | null | undefined,
  conditions: ApproachConditions
): SpeciesApproach | null {
  const allApproaches = scoreAllApproaches(habitats, techniques, conditions);

  if (allApproaches.length === 0) {
    return null;
  }

  const bestApproach = allApproaches[0];

  // Find alternative approaches (score >= threshold, excluding best)
  const alternativeApproaches = allApproaches
    .slice(1)
    .filter(a => a.combinedScore >= ALTERNATIVE_THRESHOLD);

  // Normalize overall score to 0-100
  const overallScore = bestApproach.combinedScore;

  // Generate summary text
  const summaryText = generateSummaryText(bestApproach, overallScore);

  return {
    bestApproach,
    alternativeApproaches,
    overallScore,
    summaryText,
  };
}

/**
 * Check if conditions are tough for this species
 */
export function areToughConditions(approach: SpeciesApproach): boolean {
  return approach.overallScore < TOUGH_CONDITIONS_THRESHOLD;
}

/**
 * Get a "tough conditions" warning message
 */
export function getToughConditionsMessage(approach: SpeciesApproach): string {
  if (!areToughConditions(approach)) {
    return '';
  }

  return "Conditions aren't ideal for this species right now – you might still catch, but the odds are lower than usual.";
}

/**
 * Format approach for display in UI
 */
export function formatApproachForDisplay(approach: SpeciesApproach): {
  headline: string;
  score: string;
  scoreValue: number;
  explanation: string;
  alternatives: string[];
  toughConditionsWarning?: string;
} {
  const scoreDesc =
    approach.overallScore >= 80 ? 'Excellent' :
    approach.overallScore >= 70 ? 'Very Good' :
    approach.overallScore >= 60 ? 'Good' :
    approach.overallScore >= 50 ? 'Fair' :
    approach.overallScore >= 40 ? 'Challenging' :
    'Tough';

  // Format alternative approaches
  const alternatives = approach.alternativeApproaches.map(alt =>
    `${alt.techniqueName} from ${formatHabitatName(alt.habitat)} (${alt.combinedScore}/100)`
  );

  return {
    headline: `Best approach: ${approach.bestApproach.techniqueName} from ${formatHabitatName(approach.bestApproach.habitat)}`,
    score: `${scoreDesc} (${approach.overallScore}/100)`,
    scoreValue: approach.overallScore,
    explanation: approach.bestApproach.explanation,
    alternatives,
    toughConditionsWarning: areToughConditions(approach)
      ? getToughConditionsMessage(approach)
      : undefined,
  };
}
