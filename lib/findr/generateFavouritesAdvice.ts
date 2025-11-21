/**
 * Generate fishing advice for user's favorite species
 *
 * Tactical: "Which of my favorites should I target today and how?"
 * Strategic: "Week-ahead forecast for all my favorites to plan trips and buy bait"
 */

import { getSpeciesApproach, type ApproachConditions } from './scoreSpeciesApproach';
import type { TideExtreme } from './conditionHelpers';

/**
 * Species with prediction data and environmental preferences
 */
export interface FavoriteSpecies {
  species_code: string;
  name_en: string;
  preferred_habitats: string[];
  effective_techniques: string[];
  recommended_baits?: string[];
  confidence_score?: number;
}

/**
 * Tactical advice for a single favorite species
 */
export interface FavoriteTacticalAdvice {
  species: {
    code: string;
    name: string;
  };
  isActive: boolean;  // Whether conditions are good right now
  approach?: {
    habitat: string;
    technique: string;
    score: number;
    summary: string;
    explanation: string;
  };
  alternativeTechniques?: string[];  // Other good techniques (from alternativeApproaches)
  alternativeHabitats?: string[];    // Other good habitats (from alternativeApproaches)
  baits: string[];
  timing?: string;  // "Best in next 2 hours" or "Wait for high tide"
}

/**
 * Tactical advice for all favorites today
 */
export interface FavoritesTacticalAdvice {
  timestamp: string;
  location: {
    name?: string;
    rectangleCode?: string;
  };
  summary: string;  // "3 of your 7 favorites are active right now"

  currentConditions: {
    tideStage: string;
    timeOfDay: string;
    nextTideChange?: string;
    windSpeed?: number;
    waveHeight?: number;
  };

  activeNow: FavoriteTacticalAdvice[];      // Species with good conditions now (score >= 70)
  upcomingSoon: FavoriteTacticalAdvice[];   // Species that will be good soon (within 2-3 hours)
  notRecommended: FavoriteTacticalAdvice[]; // Species with poor conditions (score < 50)

  priorityAdvice: {
    topChoice: string;      // "Target Sea Bass first - perfect dawn conditions"
    secondChoice?: string;  // "Then try Mackerel if you have time"
    whatToBring: string[];  // Combined gear/bait list for active species
  };
}

/**
 * Single time window for a species
 */
export interface SpeciesTimeWindow {
  date: string;
  dayOfWeek: string;
  time: string;
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
  tideStage: string;
  score: number;
  habitat: string;
  technique: string;
  reason: string;
}

/**
 * Weekly forecast for a single favorite species
 */
export interface FavoriteWeeklyForecast {
  species: {
    code: string;
    name: string;
  };
  bestWindows: SpeciesTimeWindow[];  // Top 3-5 windows this week
  recommendedBaits: string[];
  averageScore: number;  // Overall outlook for the week
  outlook: string;  // "Excellent week ahead" or "Limited opportunities"
}

/**
 * Strategic weekly advice for all favorites
 */
export interface FavoritesStrategicAdvice {
  timeframe: string;  // "Week of Nov 20-27"
  location: {
    name?: string;
    rectangleCode?: string;
  };
  summary: string;  // "5 of your 7 favorites have good windows this week"

  weeklyForecasts: FavoriteWeeklyForecast[];  // One per favorite species

  weekOverview: {
    bestDays: Array<{
      date: string;
      dayOfWeek: string;
      species: string[];  // Which favorites are good this day
      score: number;
    }>;
    shoppingList: {
      baits: string[];      // All baits needed this week
      techniques: string[];  // Techniques you'll use
      habitats: string[];    // Where you'll need to fish
    };
  };

  planningTips: string[];  // "Buy crab and worms Monday for Tuesday session"
}

/**
 * Generate tactical advice for user's favorite species
 *
 * @param favorites - User's favorite species
 * @param conditions - Current environmental conditions
 * @param tideData - Current tide data
 * @param location - Location details
 * @returns Tactical advice prioritizing favorites
 */
export function generateFavoritesTacticalAdvice(
  favorites: FavoriteSpecies[],
  conditions: ApproachConditions,
  tideData?: TideExtreme[],
  location?: { name?: string; rectangleCode?: string; lat: number; lon: number }
): FavoritesTacticalAdvice {
  const now = new Date();

  // Score all favorites
  const scoredFavorites = favorites.map(fav => {
    const approach = getSpeciesApproach(
      fav.preferred_habitats,
      fav.effective_techniques,
      conditions
    );

    return {
      species: fav,
      approach,
      score: approach?.overallScore || 0,
    };
  }).sort((a, b) => b.score - a.score);

  // Categorize by activity level
  const activeNow: FavoriteTacticalAdvice[] = [];
  const upcomingSoon: FavoriteTacticalAdvice[] = [];
  const notRecommended: FavoriteTacticalAdvice[] = [];

  for (const { species, approach, score } of scoredFavorites) {
    // Extract alternative techniques and habitats from alternativeApproaches
    let alternativeTechniques: string[] | undefined;
    let alternativeHabitats: string[] | undefined;

    if (approach && approach.alternativeApproaches.length > 0) {
      // Get unique techniques (excluding the best one)
      const techniques = new Set(
        approach.alternativeApproaches.map(a => a.techniqueName)
      );
      techniques.delete(approach.bestApproach.techniqueName);
      alternativeTechniques = Array.from(techniques);

      // Get unique habitats (excluding the best one)
      const habitats = new Set(
        approach.alternativeApproaches.map(a => formatHabitat(a.habitat))
      );
      habitats.delete(formatHabitat(approach.bestApproach.habitat));
      alternativeHabitats = Array.from(habitats);
    }

    const advice: FavoriteTacticalAdvice = {
      species: {
        code: species.species_code,
        name: species.name_en,
      },
      isActive: score >= 70,
      approach: approach ? {
        habitat: formatHabitat(approach.bestApproach.habitat),
        technique: approach.bestApproach.techniqueName,
        score: approach.overallScore,
        summary: approach.summaryText,
        explanation: approach.bestApproach.explanation,
      } : undefined,
      alternativeTechniques,
      alternativeHabitats,
      baits: species.recommended_baits || [],
    };

    // Debug logging for Plaice to see what habitat is being recommended
    if (species.name_en.toLowerCase().includes('plaice')) {
      console.log('[TacticalAdvice] Plaice habitat data:', {
        preferred_habitats: species.preferred_habitats,
        recommended_habitat: approach?.bestApproach.habitat,
        all_approaches: approach?.alternativeApproaches.map(a => ({ habitat: a.habitat, score: a.combinedScore }))
      });
    }

    if (score >= 70) {
      activeNow.push(advice);
    } else if (score >= 50) {
      // Check if upcoming tide/time might improve
      const needsFloodingTide = species.preferred_habitats.some(h =>
        h === 'estuary' || h === 'sandy_beach'
      );
      const needsDawnDusk = species.name_en.toLowerCase().includes('bass') ||
                            species.name_en.toLowerCase().includes('squid');

      if ((needsFloodingTide && conditions.tide_stage !== 'flooding') ||
          (needsDawnDusk && conditions.time_of_day === 'day')) {
        advice.timing = 'Wait for better tide/time conditions';
        upcomingSoon.push(advice);
      } else {
        upcomingSoon.push(advice);
      }
    } else {
      advice.timing = 'Poor conditions today';
      notRecommended.push(advice);
    }
  }

  // Calculate next tide change
  let nextTideChange: string | undefined;
  if (tideData && conditions.tide_stage) {
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

  // Generate priority advice
  let topChoice = '';
  let secondChoice: string | undefined;
  const whatToBring: string[] = [];

  if (activeNow.length > 0) {
    const top = activeNow[0];
    topChoice = `Target ${top.species.name} first - ${top.approach?.explanation || 'good conditions'}`;

    if (activeNow.length > 1) {
      const second = activeNow[1];
      secondChoice = `Then try ${second.species.name} at ${second.approach?.habitat}`;
    }

    // Collect unique gear/bait
    const techniques = new Set<string>();
    const baits = new Set<string>();

    activeNow.slice(0, 2).forEach(adv => {
      if (adv.approach) {
        techniques.add(adv.approach.technique);
      }
      adv.baits.forEach(b => baits.add(b));
    });

    techniques.forEach(t => whatToBring.push(getTechniqueGear(t)));
    baits.forEach(b => whatToBring.push(b));
  } else if (upcomingSoon.length > 0) {
    const upcoming = upcomingSoon[0];
    topChoice = `Wait for better conditions for ${upcoming.species.name}`;
  } else {
    topChoice = 'Tough conditions for your favorites today';
  }

  // Generate summary
  const summary = activeNow.length > 0
    ? `${activeNow.length} of your ${favorites.length} favorites are active right now`
    : upcomingSoon.length > 0
    ? `${upcomingSoon.length} of your favorites might improve soon`
    : `Tough conditions for your favorites today`;

  return {
    timestamp: now.toISOString(),
    location: {
      name: location?.name,
      rectangleCode: location?.rectangleCode,
    },
    summary,
    currentConditions: {
      tideStage: conditions.tide_stage || 'unknown',
      timeOfDay: conditions.time_of_day || 'day',
      nextTideChange,
      windSpeed: conditions.wind_speed_kts !== null && conditions.wind_speed_kts !== undefined ? conditions.wind_speed_kts : undefined,
      waveHeight: conditions.wave_height_m !== null && conditions.wave_height_m !== undefined ? conditions.wave_height_m : undefined,
    },
    activeNow,
    upcomingSoon,
    notRecommended,
    priorityAdvice: {
      topChoice,
      secondChoice,
      whatToBring,
    },
  };
}

/**
 * Generate strategic weekly advice for user's favorite species
 *
 * @param favorites - User's favorite species
 * @param weeklyConditions - Conditions forecast for the week (hourly or 3-hourly)
 * @param location - Location details
 * @returns Strategic weekly advice for all favorites
 */
export function generateFavoritesStrategicAdvice(
  favorites: FavoriteSpecies[],
  weeklyConditions: Array<{
    time: Date;
    conditions: ApproachConditions;
  }>,
  location?: { name?: string; rectangleCode?: string }
): FavoritesStrategicAdvice {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Generate forecast for each favorite
  const weeklyForecasts: FavoriteWeeklyForecast[] = [];

  for (const favorite of favorites) {
    // Score all time windows for this species
    const scoredWindows = weeklyConditions.map(({ time, conditions }) => {
      const approach = getSpeciesApproach(
        favorite.preferred_habitats,
        favorite.effective_techniques,
        conditions
      );

      return {
        time,
        conditions,
        approach,
        score: approach?.overallScore || 0,
      };
    });

    // Get best windows (score >= 70, top 5)
    const bestWindows: SpeciesTimeWindow[] = scoredWindows
      .filter(w => w.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(w => ({
        date: w.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayOfWeek: w.time.toLocaleDateString('en-US', { weekday: 'short' }),
        time: w.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        timeOfDay: w.conditions.time_of_day || 'day',
        tideStage: w.conditions.tide_stage || 'unknown',
        score: w.score,
        habitat: formatHabitat(w.approach?.bestApproach.habitat || ''),
        technique: w.approach?.bestApproach.techniqueName || '',
        reason: w.approach?.bestApproach.explanation || '',
      }));

    // Calculate average score
    const avgScore = scoredWindows.length > 0
      ? Math.round(scoredWindows.reduce((sum, w) => sum + w.score, 0) / scoredWindows.length)
      : 0;

    // Determine outlook
    let outlook: string;
    if (bestWindows.length >= 5) outlook = 'Excellent week ahead';
    else if (bestWindows.length >= 3) outlook = 'Good opportunities this week';
    else if (bestWindows.length >= 1) outlook = 'Limited windows available';
    else outlook = 'Poor conditions this week';

    weeklyForecasts.push({
      species: {
        code: favorite.species_code,
        name: favorite.name_en,
      },
      bestWindows,
      recommendedBaits: favorite.recommended_baits || [],
      averageScore: avgScore,
      outlook,
    });
  }

  // Generate week overview - find best days
  const dayMap = new Map<string, { species: string[]; scores: number[] }>();

  for (const forecast of weeklyForecasts) {
    for (const window of forecast.bestWindows) {
      const key = window.date;
      if (!dayMap.has(key)) {
        dayMap.set(key, { species: [], scores: [] });
      }
      const day = dayMap.get(key)!;
      if (!day.species.includes(forecast.species.name)) {
        day.species.push(forecast.species.name);
        day.scores.push(window.score);
      }
    }
  }

  const bestDays = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      species: data.species,
      score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);

  // Generate shopping list
  const baitsSet = new Set<string>();
  const techniquesSet = new Set<string>();
  const habitatsSet = new Set<string>();

  for (const forecast of weeklyForecasts) {
    if (forecast.bestWindows.length > 0) {
      forecast.recommendedBaits.forEach(b => baitsSet.add(b));
      forecast.bestWindows.forEach(w => {
        techniquesSet.add(w.technique);
        habitatsSet.add(w.habitat);
      });
    }
  }

  // Generate planning tips
  const planningTips: string[] = [];
  if (bestDays.length > 0) {
    const firstBest = bestDays[0];
    planningTips.push(`Best day this week: ${firstBest.dayOfWeek} ${firstBest.date} (${firstBest.species.length} species active)`);
  }
  if (baitsSet.size > 0) {
    planningTips.push(`Stock up on: ${Array.from(baitsSet).slice(0, 3).join(', ')}`);
  }
  if (habitatsSet.size > 1) {
    planningTips.push(`Plan transport: You'll need access to ${Array.from(habitatsSet).join(', ')}`);
  }

  // Generate summary
  const activeSpecies = weeklyForecasts.filter(f => f.bestWindows.length > 0).length;
  const summary = activeSpecies > 0
    ? `${activeSpecies} of your ${favorites.length} favorites have good windows this week`
    : `Limited opportunities for your favorites this week`;

  const startDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endDate = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    timeframe: `Week of ${startDate} - ${endDate}`,
    location: {
      name: location?.name,
      rectangleCode: location?.rectangleCode,
    },
    summary,
    weeklyForecasts: weeklyForecasts.sort((a, b) => b.averageScore - a.averageScore),
    weekOverview: {
      bestDays,
      shoppingList: {
        baits: Array.from(baitsSet),
        techniques: Array.from(techniquesSet),
        habitats: Array.from(habitatsSet),
      },
    },
    planningTips,
  };
}

/**
 * Format habitat name for display
 */
function formatHabitat(habitat: string): string {
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
 * Get gear recommendation for technique
 */
function getTechniqueGear(technique: string): string {
  const gearMap: Record<string, string> = {
    'Spinning': 'Spinning rod',
    'Bottom Fishing': 'Bottom rig',
    'Surfcasting': 'Surf rod',
    'Jigging': 'Jigging setup',
    'Saltwater Fly': 'Fly rod',
    'Float Fishing': 'Float rig',
    'Sabiki / Bait Catching': 'Sabiki rig',
    'Squid / Cuttlefish Jigs': 'Squid jigs',
  };
  return gearMap[technique] || technique;
}
