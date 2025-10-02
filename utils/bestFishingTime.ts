// utils/bestFishingTime.ts
// Best Fishing Time Calculator for Findr
// Analyzes tides, species activity, and marine conditions

// Marine data interfaces
interface MarineDataPoint {
  noaa?: number;
  // Add other marine data providers as needed
}

interface MarineHour {
  time: string;
  waterTemperature?: MarineDataPoint;
  waveHeight?: MarineDataPoint;
  windSpeed?: MarineDataPoint;
  tideHeight?: MarineDataPoint;
}

// Species data interfaces
interface SpeciesTemperaturePreference {
  min?: number;
  max?: number;
}

interface SpeciesPreferences {
  temperature?: SpeciesTemperaturePreference;
}

interface FishSpecies {
  name?: string;
  commonName?: string;
  preferences?: SpeciesPreferences;
}

// Weather forecast interface
interface WeatherForecastDay {
  date: string;
  // Add other day properties as needed
}

// Hour score interface for internal calculations
interface HourScore {
  hour: number;
  score: number;
  time: string;
  tidePhase: 'high' | 'rising' | 'falling' | 'low';
  activeSpecies: string[];
  waterTemp: number;
  waveHeight: number;
  windSpeed: number;
  reason?: string;
}

export interface FishingWindow {
  startHour: number;
  endHour: number;
  score: number;
  reason: string;
  tidePhase: 'high' | 'rising' | 'falling' | 'low';
  tideTime: string;
  targetSpecies: string[];
  waterTemp: number;
  conditions: string;
}

export interface BestFishingTimeResult {
  primaryWindow: FishingWindow;
  secondaryWindow?: FishingWindow;
  allDayScore: number;
  recommendation: string;
  emoji: string;
  moonPhase?: string;
}

/**
 * Calculate best fishing windows based on tides, species, and conditions
 * 
 * @param species - Target fish species from ICES database
 * @param day - Weather forecast day
 * @param marineHours - 24 hours of marine data from Stormglass
 */
export function calculateBestFishingTime(
  species: FishSpecies[],
  day: WeatherForecastDay,
  marineHours: MarineHour[]
): BestFishingTimeResult {
  if (!marineHours || marineHours.length === 0) {
    return fallbackResult();
  }

  // Score each hour based on fishing conditions
  const hourScores = marineHours.map((hour, idx) => {
    const hourOfDay = new Date(hour.time).getHours();
    
    let score = 30; // Base score

    // TIDE SCORING (most important for fishing!)
    const tidePhase = determineTidePhase(hour, marineHours, idx);
    if (tidePhase === 'rising') score += 25; // Rising tide = active fish
    if (tidePhase === 'high') score += 20;   // High tide = good
    if (tidePhase === 'falling') score += 10; // Falling = okay
    
    // DAWN AND DUSK MAGIC HOURS
    if (hourOfDay >= 5 && hourOfDay <= 7) score += 20;   // Dawn
    if (hourOfDay >= 17 && hourOfDay <= 19) score += 20; // Dusk
    
    // WATER CONDITIONS
    const waterTemp = hour.waterTemperature?.noaa || 15;
    const waveHeight = hour.waveHeight?.noaa || 0;
    
    // SPECIES TEMPERATURE MATCH
    const speciesMatch = species.filter(s => {
      // TODO: Adjust based on your species data structure
      const tempMin = s.preferences?.temperature?.min || 5;
      const tempMax = s.preferences?.temperature?.max || 25;
      return waterTemp >= tempMin && waterTemp <= tempMax;
    });
    
    if (speciesMatch.length > 0) score += 15;
    
    // WAVE CONDITIONS (calmer is better for most fishing)
    if (waveHeight < 1.0) score += 10;
    else if (waveHeight > 2.0) score -= 10;
    
    // WIND CONDITIONS (light is good)
    const windSpeed = hour.windSpeed?.noaa || 0;
    if (windSpeed < 3) score += 5;       // Light wind
    else if (windSpeed > 8) score -= 10; // Too windy
    
    return {
      hour: hourOfDay,
      score: Math.max(0, Math.min(100, score)),
      time: hour.time,
      tidePhase,
      waterTemp,
      waveHeight,
      windSpeed,
      activeSpecies: speciesMatch.map(s => s.commonName || s.name || 'Fish')
    };
  });

  // Find best 3-4 hour windows
  const windows = findBestFishingWindows(hourScores);
  
  const allDayScore = Math.round(
    hourScores.reduce((sum, h) => sum + h.score, 0) / hourScores.length
  );

  const recommendation = generateFishingRecommendation(
    windows[0],
    windows[1],
    allDayScore
  );

  return {
    primaryWindow: windows[0],
    secondaryWindow: windows[1],
    allDayScore,
    recommendation,
    emoji: getFishingEmoji(windows[0]),
  };
}

function determineTidePhase(
  current: MarineHour,
  allHours: MarineHour[],
  currentIdx: number
): 'high' | 'rising' | 'falling' | 'low' {
  const currentHeight = current.tideHeight?.noaa || 2;
  
  // Look at previous and next hours to determine trend
  const prevHeight = currentIdx > 0 ? allHours[currentIdx - 1].tideHeight?.noaa || 2 : currentHeight;
  const nextHeight = currentIdx < allHours.length - 1 ? allHours[currentIdx + 1].tideHeight?.noaa || 2 : currentHeight;
  
  // Determine if rising or falling
  const isRising = nextHeight > currentHeight && currentHeight >= prevHeight;
  const isFalling = nextHeight < currentHeight && currentHeight <= prevHeight;
  
  // Determine high or low based on absolute height
  if (currentHeight > 3.5) return 'high';
  if (currentHeight < 0.8) return 'low';
  if (isRising) return 'rising';
  if (isFalling) return 'falling';
  
  // Default based on height
  return currentHeight > 2 ? 'high' : 'low';
}

function findBestFishingWindows(
  hourScores: HourScore[]
): FishingWindow[] {
  const windowSize = 3;
  const windows: FishingWindow[] = [];

  for (let i = 0; i <= hourScores.length - windowSize; i++) {
    const windowHours = hourScores.slice(i, i + windowSize);
    const avgScore = windowHours.reduce((sum, h) => sum + h.score, 0) / windowSize;
    
    const midHour = windowHours[1];
    
    windows.push({
      startHour: windowHours[0].hour,
      endHour: windowHours[windowSize - 1].hour,
      score: Math.round(avgScore),
      reason: generateWindowReason(midHour),
      tidePhase: midHour.tidePhase,
      tideTime: midHour.time,
      targetSpecies: midHour.activeSpecies || [],
      waterTemp: midHour.waterTemp,
      conditions: `${midHour.waveHeight.toFixed(1)}m waves, ${midHour.windSpeed.toFixed(1)}m/s wind`
    });
  }

  windows.sort((a, b) => b.score - a.score);
  return windows.slice(0, 2);
}

function generateWindowReason(hour: HourScore): string {
  const reasons: string[] = [];
  
  if (hour.tidePhase === 'rising') reasons.push('rising tide (fish feeding)');
  else if (hour.tidePhase === 'high') reasons.push('high tide');
  
  if (hour.hour >= 5 && hour.hour <= 7) reasons.push('dawn bite');
  if (hour.hour >= 17 && hour.hour <= 19) reasons.push('dusk bite');
  
  if (hour.activeSpecies.length > 0) {
    reasons.push(`${hour.activeSpecies.join(', ')} active`);
  }
  
  if (hour.waveHeight < 1) reasons.push('calm seas');
  
  return reasons.length > 0 ? reasons.join(', ') : 'decent conditions';
}

function generateFishingRecommendation(
  primary: FishingWindow,
  secondary: FishingWindow | undefined,
  allDay: number
): string {
  if (primary.score >= 85) {
    return `🎯 Prime bite: ${formatHour(primary.startHour)}-${formatHour(primary.endHour)}`;
  }
  
  if (primary.score >= 70) {
    return `🐟 Best fishing: ${formatHour(primary.startHour)}-${formatHour(primary.endHour)}`;
  }

  if (allDay >= 65) {
    return '👍 Good all day - flexible timing';
  }

  return `Try: ${formatHour(primary.startHour)}-${formatHour(primary.endHour)}`;
}

function getFishingEmoji(window: FishingWindow): string {
  if (window.score >= 85) return '🎣';
  if (window.score >= 70) return '🐟';
  if (window.score >= 50) return '🌊';
  return '⏰';
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function fallbackResult(): BestFishingTimeResult {
  return {
    primaryWindow: {
      startHour: 6,
      endHour: 9,
      score: 50,
      reason: 'Dawn fishing window',
      tidePhase: 'rising',
      tideTime: '',
      targetSpecies: [],
      waterTemp: 15,
      conditions: 'Limited data'
    },
    allDayScore: 50,
    recommendation: '🌅 Try dawn or dusk',
    emoji: '🎣',
  };
}