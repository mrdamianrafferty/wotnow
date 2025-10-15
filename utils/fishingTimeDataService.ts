// utils/fishingTimeDataService.ts
// Real data integration for Best Fishing Time predictions
// Connects to Stormglass marine data and species database

import { getTimes } from 'suncalc';
import { calculateBestFishingTime } from './bestFishingTime';
import type { FishSpecies, MarineHour, WeatherForecastDay, BestFishingTimeResult } from './bestFishingTime';

// Type definitions for existing data structures
interface SpeciesContext {
  regions?: string;
  bestTime?: string;
  tideSensitivity?: string;
  favouriteBaits?: string;
  naturalDiet?: string;
  temperature?: string;
  weather?: string;
  distance?: string;
  edibility?: number;
  restrictions?: string;
  authority?: string;
}

interface SpeciesAdvice {
  name?: string;
  normalized?: string;
  contexts?: {
    shore?: SpeciesContext;
    boat?: SpeciesContext;
  };
}

interface MarineHourlyData {
  time: string;
  waterTempC?: number;
  waveHeightM?: number;
  windSpeedMS?: number;
  tideHeightM?: number;
}

interface UnifiedWeatherData {
  marineHourly?: MarineHourlyData[];
  hasMarineData?: boolean;
  seaTemp?: number;
}

/**
 * Extract species data from species advice database into our interface
 */
function extractSpeciesData(speciesAdvice: SpeciesAdvice): FishSpecies {
  // Extract temperature preferences from the species advice data
  const getTemperatureRange = (temperatureText: string): { min?: number; max?: number } => {
    if (!temperatureText) return {};
    
    const text = temperatureText.toLowerCase();
    
    // Map species temperature descriptions to numeric ranges
    if (text.includes('cold-water') || text.includes('cold‑water') || text.includes('prefers cool')) {
      return { min: 5, max: 14 }; // Cold water species like cod, pollack
    }
    if (text.includes('cool–mild') || text.includes('cool-mild')) {
      return { min: 8, max: 16 }; // Species like sea trout  
    }
    if (text.includes('mild–warm') || text.includes('mild-warm') || text.includes('warm water')) {
      return { min: 15, max: 22 }; // Species like sea bass, flathead grey mullet
    }
    if (text.includes('≥12–13') || text.includes('active ≥12')) {
      return { min: 12, max: 25 }; // Sea bass specific range
    }
    if (text.includes('very warm') || text.includes('loves warm')) {
      return { min: 18, max: 28 }; // Warm water species like tuna
    }
    if (text.includes('sluggish in cold')) {
      return { min: 10, max: 25 }; // General temperate species
    }
    
    // Default range for temperate species
    return { min: 10, max: 20 };
  };

  const context = speciesAdvice.contexts?.shore || speciesAdvice.contexts?.boat || {};
  const temperaturePrefs = getTemperatureRange(context.temperature || '');

  return {
    name: speciesAdvice.normalized || speciesAdvice.name || 'unknown',
    commonName: speciesAdvice.name || 'Unknown Fish',
    preferences: {
      temperature: temperaturePrefs
    }
  };
}

/**
 * Convert unified weather marine data to our MarineHour format
 */
function convertMarineData(unifiedWeather: UnifiedWeatherData): MarineHour[] {
  if (!unifiedWeather?.marineHourly) {
    console.warn('No marine hourly data available');
    return [];
  }

  return unifiedWeather.marineHourly.map((hour: MarineHourlyData) => ({
    time: hour.time || new Date().toISOString(),
    waterTemperature: { noaa: hour.waterTempC || 15 },
    waveHeight: { noaa: hour.waveHeightM || 0 },
    windSpeed: { noaa: hour.windSpeedMS || 0 },
    tideHeight: { noaa: hour.tideHeightM || 2 } // Default tide height
  }));
}

/**
 * Enhanced function for WaitingSpeciesCard - conservative predictions
 */
export function calculateWaitingSpeciesTimes(
  species: SpeciesAdvice[],
  marineData: UnifiedWeatherData
): BestFishingTimeResult {
  const fishSpecies = species.map(extractSpeciesData);
  const marineHours = convertMarineData(marineData);
  const day: WeatherForecastDay = { date: new Date().toISOString() };

  // Get base calculation
  const result = calculateBestFishingTime(fishSpecies, day, marineHours);

  // Make predictions more conservative for waiting species
  const adjustedScore = Math.max(30, result.allDayScore * 0.7); // Cap at 70% of normal
  
  // Adjust recommendation to be more modest
  let recommendation = result.recommendation;
  if (result.allDayScore > 70) {
    recommendation = "Worth a try during prime windows";
  } else if (result.allDayScore > 50) {
    recommendation = "Possible in ideal conditions";
  } else {
    recommendation = "Challenging - wait for better conditions";
  }

  return {
    ...result,
    allDayScore: adjustedScore,
    recommendation,
    emoji: result.allDayScore > 60 ? "🎣" : "⏳" // More conservative emoji
  };
}

/**
 * Main function to get real fishing time predictions
 */
export async function getFishingTimePredictions(
  species: SpeciesAdvice[],
  lat: number,
  lon: number
): Promise<BestFishingTimeResult> {
  try {
    // Fetch unified weather data (includes marine data)
    const response = await fetch(`/api/unified-weather?lat=${lat}&lon=${lon}`);
    
    if (!response.ok) {
      console.warn('Failed to fetch marine data, using defaults');
      return getDefaultPrediction();
    }

    const unifiedWeather = await response.json();
    
    // Convert species and marine data to our interfaces
    const fishSpecies = species.map(extractSpeciesData);
    const marineHours = convertMarineData(unifiedWeather);
    const day: WeatherForecastDay = { date: new Date().toISOString() };

    // Calculate predictions
    return calculateBestFishingTime(fishSpecies, day, marineHours);

  } catch (error) {
    console.error('Error fetching fishing time predictions:', error);
    return getDefaultPrediction();
  }
}

/**
 * Get actual dawn and dusk times for a given location and date using SunCalc
 * Falls back to defaults if location not available
 */
function getRealDawnDuskTimes(date: Date, lat?: number, lon?: number): { dawn: Date; dusk: Date } {
  // Default fallback times
  const defaultDawn = new Date(date);
  defaultDawn.setHours(6, 0, 0, 0);
  
  const defaultDusk = new Date(date);
  defaultDusk.setHours(18, 0, 0, 0);
  
  // If no location provided, use defaults
  if (lat === undefined || lon === undefined) {
    return { dawn: defaultDawn, dusk: defaultDusk };
  }
  
  try {
    // Get sun times for the location
    const times = getTimes(date, lat, lon);
    
    // Use nautical dawn/dusk (when sun is 12° below horizon - best for fishing)
    // Falls back to dawn/dusk, then sunrise/sunset if nautical times not available
    const dawn = times.nauticalDawn ?? times.dawn ?? times.sunrise ?? defaultDawn;
    const dusk = times.nauticalDusk ?? times.dusk ?? times.sunset ?? defaultDusk;
    
    return { dawn, dusk };
  } catch (error) {
    console.warn('Failed to calculate sun times, using defaults:', error);
    return { dawn: defaultDawn, dusk: defaultDusk };
  }
}

/**
 * Tide data structure matching what we get from /api/tides
 */
export interface TidePhaseInfo {
  currentPhase: 'rising' | 'falling' | 'high_slack' | 'low_slack';
  timeToNextChange?: number; // minutes
  currentStrength?: 'weak' | 'moderate' | 'strong';
}

/**
 * Get immediate fishing time predictions for species cards
 * Uses simulated data based on time of day and basic patterns
 * Now enhanced with real astronomical times and optional tide data
 */
export function getImmediateFishingTimes(
  species: SpeciesAdvice[],
  context: 'active' | 'good' | 'waiting' = 'good',
  lat?: number,
  lon?: number,
  tideInfo?: TidePhaseInfo
): BestFishingTimeResult {
  const now = new Date();
  const hour = now.getHours();
  
  // Extract dawn/dusk preferences from species data
  const isDawnDuskSpecies = species.some(s => {
    const bestTime = s.contexts?.shore?.bestTime || s.contexts?.boat?.bestTime || '';
    return bestTime.toLowerCase().includes('dawn') || bestTime.toLowerCase().includes('dusk');
  });

  // Extract tide sensitivity and identify tide-critical species
  const isTideSensitive = species.some(s => {
    const tideSensitivity = s.contexts?.shore?.tideSensitivity || s.contexts?.boat?.tideSensitivity || '';
    return tideSensitivity.toLowerCase().includes('strong');
  });

  // Check for tide-critical species (mullet, bass, flounder)
  const tideCriticalSpecies = species.find(s => {
    const name = (s.name || '').toLowerCase();
    return name.includes('mullet') || name.includes('bass') || name.includes('flounder');
  });

  // Calculate base score based on current time and species preferences
  let baseScore = 40;
  
  // Dawn/dusk bonuses (5-7am, 17-19pm)
  if (isDawnDuskSpecies && ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19))) {
    baseScore += 25;
  }
  
  // ===== TIDE SCORING (Real or Simulated) =====
  let tidePhase: string;
  let tideBonus = 0;
  
  if (tideInfo) {
    // Use real tide data from API
    tidePhase = tideInfo.currentPhase;
    
    if (isTideSensitive || tideCriticalSpecies) {
      const speciesName = tideCriticalSpecies?.name?.toLowerCase() || '';
      
      // MULLET: Rising tide is absolutely critical
      if (speciesName.includes('mullet')) {
        if (tidePhase === 'rising') {
          tideBonus = 50; // HUGE bonus - mullet are all about rising tide
        } else if (tidePhase === 'falling') {
          tideBonus = -40; // Major penalty - wrong tide
        } else if (tidePhase === 'high_slack') {
          tideBonus = 10; // Small bonus - transition period
        } else {
          tideBonus = -20; // Low slack is poor
        }
      }
      // BASS/FLOUNDER: Rising and high tides preferred
      else if (speciesName.includes('bass') || speciesName.includes('flounder')) {
        if (tidePhase === 'rising' || tidePhase === 'high_slack') {
          tideBonus = 35; // Large bonus
        } else if (tidePhase === 'falling' && tideInfo.currentStrength !== 'weak') {
          tideBonus = 15; // Moderate bonus - active falling tide
        } else {
          tideBonus = -10; // Small penalty
        }
      }
      // General tide-sensitive species
      else if (isTideSensitive) {
        if (tidePhase === 'rising') {
          tideBonus = 30; // Strong bonus for rising
        } else if (tidePhase === 'falling' && tideInfo.currentStrength !== 'weak') {
          tideBonus = 15; // Moderate bonus for active falling
        } else if (tidePhase.includes('slack')) {
          tideBonus = -15; // Penalty for slack water
        }
      }
      
      // Additional urgency bonus if tide change is imminent
      if (tideInfo.timeToNextChange && tideInfo.timeToNextChange < 60) {
        if (tidePhase === 'rising') {
          tideBonus += 10; // Go now - approaching high tide peak!
        }
      }
    }
  } else {
    // Fallback: Simple rotating pattern (old behavior)
    tidePhase = ['rising', 'high', 'falling', 'low'][Math.floor((hour / 6) % 4)];
    if (isTideSensitive && (tidePhase === 'rising' || tidePhase === 'high')) {
      tideBonus = 20;
    }
  }
  
  baseScore += tideBonus;

  // Temperature considerations (species specific)
  const hasWarmWaterSpecies = species.some(s => {
    const temp = s.contexts?.shore?.temperature || s.contexts?.boat?.temperature || '';
    return temp.toLowerCase().includes('warm') || temp.toLowerCase().includes('mild');
  });

  const hasColdWaterSpecies = species.some(s => {
    const temp = s.contexts?.shore?.temperature || s.contexts?.boat?.temperature || '';
    return temp.toLowerCase().includes('cold');
  });

  // Seasonal adjustment (rough approximation)
  const month = now.getMonth();
  const isSummer = month >= 5 && month <= 8;
  const isWinter = month <= 2 || month >= 10;

  if (hasWarmWaterSpecies && isSummer) baseScore += 15;
  if (hasColdWaterSpecies && isWinter) baseScore += 15;
  if (hasWarmWaterSpecies && isWinter) baseScore -= 10;
  if (hasColdWaterSpecies && isSummer) baseScore -= 10;

  // Context-specific adjustments
  if (context === 'active') {
    // These are 85%+ confidence species - boost significantly!
    baseScore = Math.max(baseScore + 30, 80); // Minimum 80 for active species
  } else if (context === 'waiting') {
    baseScore = Math.min(baseScore * 0.6, 55); // Conservative for waiting species
  }

  // Generate time windows using real dawn/dusk times
  const { dawn: realDawn, dusk: realDusk } = getRealDawnDuskTimes(now, lat, lon);
  
  const nextDawn = new Date(realDawn);
  if (nextDawn <= now) {
    // If dawn already passed today, get tomorrow's dawn
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = getRealDawnDuskTimes(tomorrow, lat, lon);
    nextDawn.setTime(tomorrowTimes.dawn.getTime());
  }

  const nextDusk = new Date(realDusk);
  if (nextDusk <= now) {
    // If dusk already passed today, get tomorrow's dusk
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = getRealDawnDuskTimes(tomorrow, lat, lon);
    nextDusk.setTime(tomorrowTimes.dusk.getTime());
  }

  // Determine best times based on species preferences
  const primaryTime = isDawnDuskSpecies ? 
    (hour < 12 ? nextDawn : nextDusk) : 
    new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

  const secondaryTime = new Date(primaryTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours later

  // Generate recommendation with tide context
  let recommendation: string;
  let emoji: string;

  if (baseScore >= 75) {
    // Add tide-specific messaging for high scores
    if (tideCriticalSpecies && tideInfo) {
      const speciesName = tideCriticalSpecies.name || 'target species';
      if (tidePhase === 'rising') {
        recommendation = context === 'waiting' ? 
          `Perfect tide for ${speciesName}!` : 
          `GO NOW! Rising tide - perfect for ${speciesName}!`;
      } else {
        recommendation = context === 'waiting' ? 
          "Best chance in current conditions" : 
          "Prime bite conditions!";
      }
    } else {
      recommendation = context === 'waiting' ? 
        "Best chance in current conditions" : 
        "Prime bite conditions!";
    }
    emoji = "🎣";
  } else if (baseScore >= 60) {
    recommendation = context === 'waiting' ? 
      "Worth trying in prime windows" : 
      "Good fishing conditions";
    emoji = "🌊";
  } else if (baseScore >= 45) {
    // Add tide-specific warnings for low scores
    if (tideCriticalSpecies && tideInfo && tidePhase === 'low_slack') {
      const speciesName = tideCriticalSpecies.name || 'target species';
      recommendation = `Wait for rising tide - critical for ${speciesName}`;
      emoji = "⏳";
    } else {
      recommendation = context === 'waiting' ? 
        "Challenging - wait for ideal conditions" : 
        "Are you feeling lucky?";
      emoji = "⏳";
    }
  } else {
    recommendation = context === 'waiting' ? 
      "Poor conditions - try later" : 
      "Wait for better conditions";
    emoji = "🌙";
  }

  const formatTime = (date: Date) => 
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const speciesNames = species.map(s => s.name || 'Fish').slice(0, 2);

  return {
    primaryWindow: {
      startHour: primaryTime.getHours(),
      endHour: (primaryTime.getHours() + 2) % 24,
      score: baseScore,
      reason: isDawnDuskSpecies ? "Prime feeding window" : "Optimal conditions",
      tidePhase: tidePhase as 'high' | 'rising' | 'falling' | 'low',
      tideTime: formatTime(primaryTime),
      targetSpecies: speciesNames,
      waterTemp: isSummer ? 18 : 12,
      conditions: isTideSensitive ? `${tidePhase} tide` : "stable conditions"
    },
    secondaryWindow: baseScore > 50 ? {
      startHour: secondaryTime.getHours(),
      endHour: (secondaryTime.getHours() + 2) % 24,
      score: Math.max(baseScore - 20, 30),
      reason: "Secondary window",
      tidePhase: tidePhase as 'high' | 'rising' | 'falling' | 'low',
      tideTime: formatTime(secondaryTime),
      targetSpecies: speciesNames,
      waterTemp: isSummer ? 18 : 12,
      conditions: "backup timing"
    } : undefined,
    allDayScore: baseScore,
    recommendation,
    emoji
  };
}

/**
 * Default prediction when data is unavailable
 */
function getDefaultPrediction(): BestFishingTimeResult {
  const now = new Date();
  const hour = now.getHours();

  return {
    primaryWindow: {
      startHour: hour >= 18 || hour <= 6 ? 6 : 18, // Next dawn or dusk
      endHour: hour >= 18 || hour <= 6 ? 8 : 20,
      score: 50,
      reason: "Dawn/dusk window",
      tidePhase: 'rising',
      tideTime: hour >= 18 || hour <= 6 ? "6:00 AM" : "6:00 PM",
      targetSpecies: ["Fish"],
      waterTemp: 15,
      conditions: "General conditions"
    },
    allDayScore: 50,
    recommendation: "Try dawn or dusk",
    emoji: "🌅"
  };
}

/**
 * Parse best time text to determine if species is dawn/dusk active
 */
export function isDawnDuskSpecies(speciesAdvice: SpeciesAdvice): boolean {
  const bestTime = speciesAdvice.contexts?.shore?.bestTime || 
                   speciesAdvice.contexts?.boat?.bestTime || '';
  return bestTime.toLowerCase().includes('dawn') || 
         bestTime.toLowerCase().includes('dusk') ||
         bestTime.toLowerCase().includes('low light');
}

/**
 * Parse tide sensitivity 
 */
export function getTideSensitivity(speciesAdvice: SpeciesAdvice): 'low' | 'moderate' | 'strong' {
  const tideSensitivity = speciesAdvice.contexts?.shore?.tideSensitivity || 
                         speciesAdvice.contexts?.boat?.tideSensitivity || '';
  
  if (tideSensitivity.toLowerCase().includes('strong')) return 'strong';
  if (tideSensitivity.toLowerCase().includes('moderate')) return 'moderate';
  return 'low';
}