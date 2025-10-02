// utils/fishingTimeHelpers.ts
// Helper functions to connect Best Fishing Time algorithm with real data

import { calculateBestFishingTime, type BestFishingTimeResult } from './bestFishingTime';

// Types for existing marine data structures
export interface MarineHourlyData {
  timeISO: string;
  waveHeightM?: number | null;
  waterTempC?: number | null;
  windSpeedMS?: number | null;
  // Add other marine properties as needed
}

export interface TideData {
  time: string;
  type: 'high' | 'low';
  height: number | null;
}

export interface WeatherDay {
  date: string;
  marineHourly?: MarineHourlyData[];
  tides?: TideData[];
  // Add other weather properties as needed
}

export interface FishSpeciesData {
  id: string;
  name: string;
  commonName?: string;
  preferences?: {
    temperature?: {
      min?: number;
      max?: number;
    };
  };
}

/**
 * Convert existing marine data to Best Fishing Time format
 */
export function convertMarineDataForFishing(marineHourly?: MarineHourlyData[]) {
  if (!marineHourly) return [];
  
  return marineHourly.map(hour => ({
    time: hour.timeISO,
    waterTemperature: { noaa: hour.waterTempC || 15 },
    waveHeight: { noaa: hour.waveHeightM || 0 },
    windSpeed: { noaa: hour.windSpeedMS || 0 },
    tideHeight: { noaa: 2.0 } // Default, will be enhanced with real tide data
  }));
}

/**
 * Convert existing species data to Best Fishing Time format
 */
export function convertSpeciesDataForFishing(species: FishSpeciesData[]) {
  return species.map(s => ({
    name: s.name,
    commonName: s.commonName || s.name,
    preferences: {
      temperature: {
        min: s.preferences?.temperature?.min || 5,
        max: s.preferences?.temperature?.max || 25
      }
    }
  }));
}

/**
 * Get Best Fishing Time recommendation for a species card
 */
export function getFishingTimeForSpecies(
  species: FishSpeciesData[],
  weatherDay: WeatherDay
): BestFishingTimeResult | null {
  try {
    const marineHours = convertMarineDataForFishing(weatherDay.marineHourly);
    const fishingSpecies = convertSpeciesDataForFishing(species);
    
    if (marineHours.length === 0) {
      return null;
    }

    return calculateBestFishingTime(fishingSpecies, { date: weatherDay.date }, marineHours);
  } catch (error) {
    console.warn('Failed to calculate fishing time:', error);
    return null;
  }
}

/**
 * Format fishing time for display in species cards
 */
export function formatFishingTimeDisplay(result: BestFishingTimeResult | null) {
  if (!result || !result.primaryWindow) {
    return {
      time: 'Check conditions',
      reason: 'Limited data',
      emoji: '🌊'
    };
  }

  const window = result.primaryWindow;
  const startHour = window.startHour;
  const endHour = window.endHour;
  
  // Format time range
  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  };

  const timeDisplay = `${formatHour(startHour)}-${formatHour(endHour)}`;
  
  // Get appropriate emoji and reason
  let emoji = '🎣';
  let shortReason = window.reason;
  
  if (window.score >= 80) {
    emoji = '🔥';
    shortReason = `Prime: ${window.tidePhase} tide`;
  } else if (window.score >= 65) {
    emoji = '⚡';
    shortReason = `Good: ${window.tidePhase} tide`;
  } else {
    emoji = '🌊';
    shortReason = 'Check conditions';
  }

  return {
    time: timeDisplay,
    reason: shortReason,
    emoji: emoji,
    score: window.score,
    confidence: result.confidence
  };
}

/**
 * Get mock fishing time data for testing
 */
export function getMockFishingTime() {
  const now = new Date();
  const hour = now.getHours();
  
  // Simulate different times based on current hour
  if (hour >= 5 && hour <= 8) {
    return {
      time: '6-8am',
      reason: 'Prime: Rising tide + Dawn',
      emoji: '🔥'
    };
  } else if (hour >= 17 && hour <= 20) {
    return {
      time: '6-8pm',
      reason: 'Good: High tide + Dusk',
      emoji: '⚡'
    };
  } else if (hour >= 13 && hour <= 16) {
    return {
      time: '2-4pm',
      reason: 'Good: High tide',
      emoji: '⚡'
    };
  } else {
    return {
      time: 'Tomorrow 7am',
      reason: 'Next best',
      emoji: '🌊'
    };
  }
}