import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWaveDescription,
  getWaterTemperatureDescription,
  getWindMessage,
  getVisibilityDescription,
} from './weatherLabels';
import { activityTypes } from '../data/activityTypes';
import { getActivityMessage } from '../data/activityMessages';

export const MARINE_ACTIVITY_IDS = [
  'surfing',
  'sailing',
  'kayaking',
  'scuba_diving',
  'snorkeling',
  'sea_fishing_boat',
  'sea_fishing_shore',
  'stand_up_paddleboarding',
  'windsurfing',
  'beach_volleyball',
  'jet_skiing',
  'sea_swimming',
  'kitesurfing',
  'canoeing',
];

// Simple outdoor/indoor check: weatherSensitive => outdoor; otherwise indoor
export function isOutdoor(activityId: string): boolean {
  const a = activityTypes.find((x) => x.id === activityId);
  if (!a) return true; // default to outdoor if unknown
  return !!a.weatherSensitive;
}

function scoreLabel(score: number): 'perfect' | 'good' | 'fair' | 'okay' | 'indoor' {
  if (score >= 80) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 30) return 'okay';
  return 'indoor';
}

// Map UI labels to activityMessages categories
function toMessageCategory(label: string): 'perfect' | 'good' | 'fair' | 'poor' {
  switch (label) {
    case 'perfect': return 'perfect';
    case 'good': return 'good';
    case 'fair': return 'fair';
    case 'okay': return 'fair';   // treat “okay” as “fair”
    case 'indoor': return 'poor'; // treat indoor as “poor”
    default: return 'fair';
  }
}

type BuildPopupArgs = {
  activityId: string;
  day: any;
  score: number;
  reasons?: { key: string; value: any; label: string }[]; // array
};

export function buildPopupActivityPayload({ activityId, day, score, reasons }: BuildPopupArgs) {
  const category = isOutdoor(activityId) ? 'outdoor' : 'indoor';

  // Weather summary used by Popup
  const weatherData = {
    date: day?.date,
    temperature: day?.temperature ?? day?.temp ?? null,
    tempMax: day?.tempMax ?? null,
    tempMin: day?.tempMin ?? null,
    description: day?.description ?? '',
    rain: day?.rain ?? null,
    windSpeed: day?.windSpeed ?? day?.wind_speed ?? null,
    clouds: day?.clouds ?? null,
    humidity: day?.humidity ?? null,
    visibility: day?.visibility ?? null,
    icon: day?.icon ?? null,
  };

  // Marine summary used by Popup (safe optional fields)
  const marineData = {
    waveHeight: day?.waveHeight ?? null,
    waterTemperature: day?.waterTemperature ?? null,
    swellHeight: day?.swellHeight ?? null,
    swellPeriod: day?.swellPeriod ?? null,
    windSpeed: day?.windSpeed ?? null,
    gustSpeed: day?.gustSpeed ?? null,
    windDirection: day?.windDirection ?? null,
  };

  const uiLabel = scoreLabel(score);
  const msgCategory = toMessageCategory(uiLabel);
  
  // Create reason objects from string reasons
  let reasonObjects: { key: string; value: any; label: string }[] = [];
  
  // Get reasons from buildReasons if not provided
  const reasonsArray = reasons || buildReasons(day, activityId);
  
  // Convert strings to objects - Add defensive coding
  if (Array.isArray(reasonsArray)) {
    reasonObjects = reasonsArray
      .filter(reason => reason !== null && reason !== undefined)
      .map(reason => ({
        key: typeof reason === 'string' ? reason.toLowerCase().replace(/\s+/g, '_') : 'unknown',
        value: true,
        label: String(reason) // Ensure it's a string
      }));
  }

  const message = getActivityMessage
    ? getActivityMessage(activityId, msgCategory, reasonObjects)
    : '';

  return {
    activityId,
    category,
    message,
    marineData,
    weatherData,
    score,
  };
}

// Add this function to get wind directions for the day
function getWindDirectionsForDay(day: any): number[] {
  // If day already has hourly data with wind directions
  if (day.hourly && Array.isArray(day.hourly)) {
    return day.hourly
      .filter((hour: any) => hour.wind_direction !== undefined)
      .map((hour: any) => hour.wind_direction);
  }
  
  // If no hourly data, just return the single direction if available
  return day.wind_direction ? [day.wind_direction] : [];
}

// Then fix your buildReasons function
// 1. First, modify buildReasons to return an array of strings instead of a combined string
export function buildReasons(day: any, activityId: string) {
  // Debug to see what's actually in the day object
  console.log('Day data in buildReasons:', day);
  
  const reasons: string[] = [];
  const isMarineActivity = MARINE_ACTIVITY_IDS.includes(activityId); // Define this
  
  // Add standard weather reasons with better null handling
  if (day.wind_speed !== undefined) {
    console.log(`Trying to get wind message for speed: ${day.wind_speed}`);
    const windMessage = getWindMessage({
      windSpeed: day.wind_speed,
      gustSpeed: day.wind_gust,
      windDirection: day.wind_direction,
      windDirectionsToday: getWindDirectionsForDay(day),
      context: isMarineActivity ? 'marine' : 'land'
    });
    console.log(`Wind message result: ${windMessage}`);
    
    if (windMessage) { // Changed from windMsg to windMessage
      reasons.push(windMessage);
    } else {
      // Fallback to beaufort description if available
      const beaufortDescription = getBeaufortDescription(day.wind_speed);
      if (beaufortDescription) {
        reasons.push(beaufortDescription);
      } else {
        // Ultimate fallback with raw wind speed
        reasons.push(`Wind speed: ${day.wind_speed} m/s`);
      }
    }
  }
  
  if (day.rain !== undefined) {
    const rainMsg = getRainfallDescription(day.rain);
    if (rainMsg) reasons.push(rainMsg);
  }
  
  if (day.temperature !== undefined) {
    const tempMsg = getTemperatureDescription(day.temperature);
    if (tempMsg) reasons.push(tempMsg);
  }
  
  if (day.humidity !== undefined) {
    const humidityMsg = getHumidityDescription(day.humidity);
    if (humidityMsg) reasons.push(humidityMsg);
  }
  
  if (day.visibility !== undefined) {
    reasons.push(`${day.visibility >= 8000 ? 'Excellent' : 'Reduced'} visibility${day.visibility >= 8000 ? '' : ''}`);
  }
  
  // Add marine-specific reasons for marine activities
  if (MARINE_ACTIVITY_IDS.includes(activityId)) {
    console.log('Processing marine activity:', activityId);
    console.log('Marine data available:', {
      waterTemp: day.waterTemperature,
      waveHeight: day.waveHeight,
      swellPeriod: day.swellPeriod
    });
    
    // Water temperature
    if (day.waterTemperature !== undefined && day.waterTemperature !== null) {
      let waterTempMsg;
      
      if (day.waterTemperature < 10) {
        waterTempMsg = "Water is bloody cold - wetsuit required";
      } else if (day.waterTemperature < 16) {
        waterTempMsg = "Cold water - full wetsuit recommended";
      } else if (day.waterTemperature < 21) {
        waterTempMsg = "Cool water - light wetsuit may be comfortable";
      } else if (day.waterTemperature < 26) {
        waterTempMsg = "Pleasant water temperature";
      } else {
        waterTempMsg = "Warm water - perfect for swimming";
      }
      
      console.log('Adding water temp reason:', waterTempMsg);
      reasons.push(waterTempMsg);
    }
    
    // Wave height
    if (day.waveHeight !== undefined && day.waveHeight !== null) {
      let waveMsg;
      
      if (day.waveHeight < 0.3) {
        waveMsg = "Minimal waves";
      } else if (day.waveHeight < 0.8) {
        waveMsg = `Small waves around ${day.waveHeight.toFixed(1)}m`;
      } else if (day.waveHeight < 1.5) {
        waveMsg = `Decent waves at ${day.waveHeight.toFixed(1)}m`;
      } else if (day.waveHeight < 2.5) {
        waveMsg = `Good sized waves at ${day.waveHeight.toFixed(1)}m`;
      } else {
        waveMsg = `Large waves at ${day.waveHeight.toFixed(1)}m - for experienced only`;
      }
      
      reasons.push(waveMsg);
    }
    
    // Swell period
    if (day.swellPeriod !== undefined && day.swellPeriod !== null) {
      let swellMsg;
      
      if (day.swellPeriod < 6) {
        swellMsg = "Short chop, less power";
      } else if (day.swellPeriod < 10) {
        swellMsg = `Medium period swell at ${day.swellPeriod.toFixed(0)}s`;
      } else {
        swellMsg = `Long period swell at ${day.swellPeriod.toFixed(0)}s - good power`;
      }
      
      reasons.push(swellMsg);
    }
  }
  
  // Filter out empty strings, null, undefined
  const validReasons = reasons.filter(r => r && r.trim() !== '');
  console.log('Valid reasons after filtering:', validReasons);
  
  return validReasons.length > 0 ? validReasons : ['Weather conditions look OK for this.'];
}

export function findHeroActivity(
  perfectList: any[],
  goodList: any[],
  usedHeroActivities: Set<string>,
  allowRepeats: boolean = false
) {
  // Try unused perfect activities first
  const perfectCandidate = Array.isArray(perfectList) && perfectList.find(
    (a) => !usedHeroActivities.has(a.activityId)
  );
  if (perfectCandidate) {
    usedHeroActivities.add(perfectCandidate.activityId);
    return perfectCandidate;
  }

  // Try unused good activities next
  const goodCandidate = Array.isArray(goodList) && goodList.find(
    (a) => !usedHeroActivities.has(a.activityId)
  );
  if (goodCandidate) {
    usedHeroActivities.add(goodCandidate.activityId);
    return goodCandidate;
  }

  // If repeats are allowed, pick the top of the list
  if (allowRepeats) {
    return (Array.isArray(perfectList) && perfectList[0]) || (Array.isArray(goodList) && goodList[0]) || null;
  }

  // Nothing found
    return null;
  }
