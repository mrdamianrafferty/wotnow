/**
 * Generate fishing advice in different formats:
 * - Tactical: "Go now" real-time recommendations
 * - Strategic: Planning advice for the week/day ahead
 */

import { getSpeciesApproach, scoreAllApproaches, type ApproachConditions, type ScoredApproach } from './scoreSpeciesApproach';
import { getTideStage, type TideExtreme } from './conditionHelpers';

/**
 * Species with prediction data and environmental preferences
 */
export interface SpeciesWithPreferences {
  species_code: string;
  name_en: string;
  preferred_habitats: string[];
  effective_techniques: string[];
  recommended_baits?: string[];
  confidence_score?: number;  // From prediction matching
}

/**
 * Tactical advice for RIGHT NOW
 * Time-sensitive, actionable recommendations
 */
export interface TacticalAdvice {
  timestamp: string;
  summary: string;  // One-line summary
  urgency: 'go_now' | 'good_window' | 'wait' | 'tough_conditions';

  topSpecies: {
    name: string;
    confidence: number;
    approachScore: number;
    recommendation: string;  // e.g., "Spinning from Rocky Shore (Excellent)"
    explanation: string;
  }[];

  currentConditions: {
    tideStage: string;
    timeOfDay: string;
    nextTideChange?: string;  // "High tide in 45 minutes"
    windSpeed?: number;
    waveHeight?: number;
  };

  actionableSteps: string[];  // ["Head to rocky shore now", "Use spinning lures", "Try worms or crab"]
}

/**
 * Strategic advice for planning ahead
 * Species-specific preparation guide
 */
export interface StrategicAdvice {
  targetSpecies: string;
  timeframe: string;  // "Sunday", "This weekend", "Next 3 days"

  summary: string;  // One-line summary

  bestWindows: {
    date: string;
    time: string;  // "6am-8am (Dawn + Flooding Tide)"
    score: number;
    reason: string;
  }[];

  recommendedApproaches: {
    habitat: string;
    technique: string;
    score: number;
    whenBest: string;  // "Best at dawn or dusk"
  }[];

  recommendedBaits: {
    bait: string;
    score: number;
    reason: string;
  }[];

  whatToBring: string[];  // ["Spinning rod", "Worms", "Crab bait", "Waders for rocky shore"]

  tips: string[];  // General advice specific to this species + conditions
}

/**
 * Generate tactical "go now" advice
 *
 * @param species - Array of species with predictions
 * @param conditions - Current environmental conditions
 * @param tideData - Current tide data
 * @param location - Location details (for display)
 * @returns Tactical advice object
 */
export function generateTacticalAdvice(
  species: SpeciesWithPreferences[],
  conditions: ApproachConditions,
  tideData?: TideExtreme[],
  _location?: { name?: string; lat: number; lon: number }
): TacticalAdvice {
  const now = new Date();

  // Score all species approaches
  const scoredSpecies = species.map(sp => {
    const approach = getSpeciesApproach(
      sp.preferred_habitats,
      sp.effective_techniques,
      conditions
    );

    return {
      species: sp,
      approach,
      combinedScore: (approach?.overallScore || 0) * 0.6 + (sp.confidence_score || 50) * 0.4,
    };
  }).sort((a, b) => b.combinedScore - a.combinedScore);

  // Top 3 species
  const topSpecies = scoredSpecies.slice(0, 3).map(s => ({
    name: s.species.name_en,
    confidence: s.species.confidence_score || 50,
    approachScore: s.approach?.overallScore || 0,
    recommendation: s.approach?.summaryText || 'No clear approach',
    explanation: s.approach?.bestApproach.explanation || '',
  }));

  // Determine urgency
  const bestScore = topSpecies[0]?.approachScore || 0;
  let urgency: TacticalAdvice['urgency'];
  if (bestScore >= 85) urgency = 'go_now';
  else if (bestScore >= 70) urgency = 'good_window';
  else if (bestScore >= 50) urgency = 'wait';
  else urgency = 'tough_conditions';

  // Calculate next tide change
  let nextTideChange: string | undefined;
  if (tideData && conditions.tide_stage) {
    const _tideStage = getTideStage(tideData, now);
    const nextTide = tideData
      .map(t => ({ ...t, time: new Date(t.time) }))
      .filter(t => t.time > now)
      .sort((a, b) => a.time.getTime() - b.time.getTime())[0];

    if (nextTide) {
      const minutesToNext = Math.round((nextTide.time.getTime() - now.getTime()) / (1000 * 60));
      const tideType = nextTide.type === 'high' ? 'High' : 'Low';
      if (minutesToNext < 60) {
        nextTideChange = `${tideType} tide in ${minutesToNext} minutes`;
      } else {
        const hours = Math.floor(minutesToNext / 60);
        const mins = minutesToNext % 60;
        nextTideChange = `${tideType} tide in ${hours}h ${mins}m`;
      }
    }
  }

  // Generate summary
  let summary: string;
  if (urgency === 'go_now') {
    summary = `Excellent conditions right now! ${topSpecies[0].name} fishing at peak.`;
  } else if (urgency === 'good_window') {
    summary = `Good fishing window. ${topSpecies[0].name} showing strong activity.`;
  } else if (urgency === 'wait') {
    summary = `Conditions are fair. Consider waiting for ${nextTideChange || 'better conditions'}.`;
  } else {
    summary = `Tough conditions currently. Best to plan for later.`;
  }

  // Generate actionable steps
  const actionableSteps: string[] = [];
  if (topSpecies[0] && scoredSpecies[0].approach) {
    const best = scoredSpecies[0].approach.bestApproach;
    const habitat = formatHabitat(best.habitat);

    if (urgency === 'go_now' || urgency === 'good_window') {
      actionableSteps.push(`Head to ${habitat} now`);
      actionableSteps.push(`Use ${best.techniqueName.toLowerCase()}`);

      // Add bait recommendations
      const sp = scoredSpecies[0].species;
      if (sp.recommended_baits && sp.recommended_baits.length > 0) {
        const baits = sp.recommended_baits.slice(0, 2).map(b => b.replace(/^[^\w\s]+\s*/, ''));
        actionableSteps.push(`Try ${baits.join(' or ')}`);
      }

      if (nextTideChange) {
        actionableSteps.push(`Note: ${nextTideChange}`);
      }
    } else {
      actionableSteps.push(`Wait for better conditions`);
      if (nextTideChange) {
        actionableSteps.push(`${nextTideChange} - reassess then`);
      }
    }
  }

  return {
    timestamp: now.toISOString(),
    summary,
    urgency,
    topSpecies,
    currentConditions: {
      tideStage: conditions.tide_stage || 'unknown',
      timeOfDay: conditions.time_of_day || 'day',
      nextTideChange,
      windSpeed: conditions.wind_speed_kts,
      waveHeight: conditions.wave_height_m,
    },
    actionableSteps,
  };
}

/**
 * Generate strategic planning advice for a target species
 *
 * @param species - Target species
 * @param conditionsOverTime - Array of conditions at different times (e.g., hourly forecast)
 * @param timeframe - Description of timeframe (e.g., "Sunday", "This weekend")
 * @returns Strategic advice object
 */
export function generateStrategicAdvice(
  species: SpeciesWithPreferences,
  conditionsOverTime: Array<{
    time: Date;
    conditions: ApproachConditions;
    tideStage?: string;
  }>,
  timeframe: string
): StrategicAdvice {
  // Score all time windows
  const scoredWindows = conditionsOverTime.map(({ time, conditions }) => {
    const approach = getSpeciesApproach(
      species.preferred_habitats,
      species.effective_techniques,
      conditions
    );

    return {
      time,
      approach,
      score: approach?.overallScore || 0,
    };
  }).sort((a, b) => b.score - a.score);

  // Best windows (top 3, score >= 70)
  const bestWindows = scoredWindows
    .filter(w => w.score >= 70)
    .slice(0, 3)
    .map(w => ({
      date: w.time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: formatTimeWindow(w.time, w.approach?.bestApproach),
      score: w.score,
      reason: w.approach?.bestApproach.explanation || '',
    }));

  // Aggregate approach recommendations across all good windows
  const allApproaches: ScoredApproach[] = [];
  for (const window of scoredWindows.filter(w => w.score >= 60)) {
    const approaches = scoreAllApproaches(
      species.preferred_habitats,
      species.effective_techniques,
      window.approach?.bestApproach ? conditionsOverTime.find(c => c.time === window.time)?.conditions || {} as ApproachConditions : {} as ApproachConditions
    );
    allApproaches.push(...approaches);
  }

  // Group by habitat+technique and average scores
  const approachGroups = new Map<string, { scores: number[]; timeOfDay: string[] }>();
  for (const app of allApproaches) {
    const key = `${app.habitat}|${app.technique}`;
    if (!approachGroups.has(key)) {
      approachGroups.set(key, { scores: [], timeOfDay: [] });
    }
    approachGroups.get(key)!.scores.push(app.combinedScore);
    // Track when this approach works best
    const matchingWindow = scoredWindows.find(w =>
      w.approach?.bestApproach.habitat === app.habitat &&
      w.approach?.bestApproach.technique === app.technique
    );
    if (matchingWindow) {
      const tod = matchingWindow.approach?.bestApproach.explanation.includes('dawn') ? 'dawn' :
                  matchingWindow.approach?.bestApproach.explanation.includes('dusk') ? 'dusk' :
                  matchingWindow.approach?.bestApproach.explanation.includes('night') ? 'night' : 'day';
      if (!approachGroups.get(key)!.timeOfDay.includes(tod)) {
        approachGroups.get(key)!.timeOfDay.push(tod);
      }
    }
  }

  const recommendedApproaches = Array.from(approachGroups.entries())
    .map(([key, data]) => {
      const [habitat, technique] = key.split('|');
      const avgScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
      const whenBest = data.timeOfDay.length > 0
        ? `Best at ${data.timeOfDay.join(' or ')}`
        : 'Good throughout the day';

      return { habitat, technique, score: avgScore, whenBest };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(a => ({
      habitat: formatHabitat(a.habitat),
      technique: a.technique,
      score: a.score,
      whenBest: a.whenBest,
    }));

  // Bait recommendations (use the first good window's conditions)
  const recommendedBaits = species.recommended_baits?.slice(0, 3).map(bait => ({
    bait,
    score: 80,  // Default - could integrate bait scoring here
    reason: 'Proven effective for this species',
  })) || [];

  // What to bring
  const whatToBring: string[] = [];
  const topApproach = recommendedApproaches[0];
  if (topApproach) {
    // Add gear based on technique
    const gearMap: Record<string, string> = {
      'Spinning': 'Spinning rod (7-9ft, medium action)',
      'Bottom Fishing': 'Bottom fishing rig with weights',
      'Surfcasting': 'Surf rod (12-15ft) and shock leader',
      'Jigging': 'Boat rod and jigs (various weights)',
      'Saltwater Fly': 'Saltwater fly rod (7-10wt)',
      'Float Fishing': 'Float rod and sliding float rig',
      'Sabiki / Bait Catching': 'Sabiki rig and bucket',
    };

    if (gearMap[topApproach.technique]) {
      whatToBring.push(gearMap[topApproach.technique]);
    }

    // Add baits
    if (recommendedBaits.length > 0) {
      whatToBring.push(recommendedBaits.map(b => b.bait.replace(/^[^\w\s]+\s*/, '')).join(', '));
    }

    // Add habitat-specific gear
    if (topApproach.habitat.includes('Rocky')) {
      whatToBring.push('Waders or rock boots');
    }
    if (topApproach.habitat.includes('Beach')) {
      whatToBring.push('Sand spike or rod rest');
    }
  }

  // Generate tips
  const tips: string[] = [];
  if (bestWindows.length > 0) {
    tips.push(`Peak activity expected ${bestWindows[0].time}`);
  }
  if (recommendedApproaches[0]?.whenBest.includes('dawn') || recommendedApproaches[0]?.whenBest.includes('dusk')) {
    tips.push('Dawn and dusk are prime feeding times for this species');
  }
  if (species.preferred_habitats.includes('estuary')) {
    tips.push('Fish moving tides in estuaries for best results');
  }

  // Summary
  const summary = bestWindows.length > 0
    ? `Best window: ${bestWindows[0].time} - ${recommendedApproaches[0]?.technique} from ${recommendedApproaches[0]?.habitat}`
    : `Fair conditions overall - ${recommendedApproaches[0]?.technique} from ${recommendedApproaches[0]?.habitat} recommended`;

  return {
    targetSpecies: species.name_en,
    timeframe,
    summary,
    bestWindows,
    recommendedApproaches,
    recommendedBaits,
    whatToBring,
    tips,
  };
}

/**
 * Format habitat name for display
 */
function formatHabitat(habitat: string): string {
  const names: Record<string, string> = {
    'rocky_shore': 'Rocky Shore',
    'sandy_beach': 'Sandy Beach',
    'pier_harbor': 'Pier/Harbour',
    'estuary': 'Estuary',
    'shallow_water': 'Shallow Water',
    'deep_water': 'Deep Water',
    'wreck_reef': 'Wreck/Reef',
    'open_sea': 'Open Sea',
  };
  return names[habitat] || habitat;
}

/**
 * Format time window with context
 */
function formatTimeWindow(time: Date, approach?: ScoredApproach): string {
  const hour = time.getHours();
  let timeOfDay: string;

  if (hour >= 5 && hour < 7) timeOfDay = 'Dawn';
  else if (hour >= 18 && hour < 20) timeOfDay = 'Dusk';
  else if (hour >= 20 || hour < 5) timeOfDay = 'Night';
  else timeOfDay = 'Day';

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const tideInfo = approach?.habitatReason.includes('tide')
    ? approach.habitatReason.match(/(flooding|ebbing|slack)/)?.[0]
    : null;

  if (tideInfo) {
    return `${timeStr} (${timeOfDay} + ${tideInfo} tide)`;
  }

  return `${timeStr} (${timeOfDay})`;
}
