// utils/fishingTimeDataService.ts
// Real data integration for Best Fishing Time predictions
// Connects to Stormglass marine data and species database

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
 * Get immediate fishing time predictions for species cards
 * Uses simulated data based on time of day and basic patterns
 */
export function getImmediateFishingTimes(
  species: SpeciesAdvice[],
  context: 'active' | 'good' | 'waiting' = 'good'
): BestFishingTimeResult {
  const now = new Date();
  const hour = now.getHours();
  
  // Extract dawn/dusk preferences from species data
  const isDawnDuskSpecies = species.some(s => {
    const bestTime = s.contexts?.shore?.bestTime || s.contexts?.boat?.bestTime || '';
    return bestTime.toLowerCase().includes('dawn') || bestTime.toLowerCase().includes('dusk');
  });

  // Extract tide sensitivity
  const isTideSensitive = species.some(s => {
    const tideSensitivity = s.contexts?.shore?.tideSensitivity || s.contexts?.boat?.tideSensitivity || '';
    return tideSensitivity.toLowerCase().includes('strong');
  });

  // Calculate base score based on current time and species preferences
  let baseScore = 40;
  
  // Dawn/dusk bonuses (5-7am, 17-19pm)
  if (isDawnDuskSpecies && ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19))) {
    baseScore += 25;
  }
  
  // Current tide simulation (simple rotating pattern)
  const tidePhase = ['rising', 'high', 'falling', 'low'][Math.floor((hour / 6) % 4)];
  if (isTideSensitive && (tidePhase === 'rising' || tidePhase === 'high')) {
    baseScore += 20;
  }

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
    baseScore += 10; // These are already active species
  } else if (context === 'waiting') {
    baseScore = Math.min(baseScore * 0.6, 55); // Conservative for waiting species
  }

  // Generate time windows
  const nextDawn = new Date(now);
  nextDawn.setHours(6, 0, 0, 0);
  if (nextDawn <= now) nextDawn.setDate(nextDawn.getDate() + 1);

  const nextDusk = new Date(now);
  nextDusk.setHours(18, 0, 0, 0);
  if (nextDusk <= now) nextDusk.setDate(nextDusk.getDate() + 1);

  // Determine best times based on species preferences
  const primaryTime = isDawnDuskSpecies ? 
    (hour < 12 ? nextDawn : nextDusk) : 
    new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

  const secondaryTime = new Date(primaryTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours later

  // Generate recommendation
  let recommendation: string;
  let emoji: string;

  if (baseScore >= 75) {
    recommendation = context === 'waiting' ? 
      "Best chance in current conditions" : 
      "🎣 Prime bite conditions!";
    emoji = "🎣";
  } else if (baseScore >= 60) {
    recommendation = context === 'waiting' ? 
      "Worth trying in prime windows" : 
      "Good fishing conditions";
    emoji = "🌊";
  } else if (baseScore >= 45) {
    recommendation = context === 'waiting' ? 
      "Challenging - wait for ideal conditions" : 
      "Possible with right technique";
    emoji = "⏳";
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