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
  const reasonsArr = Array.isArray(reasons) ? reasons : [];

  const message = getActivityMessage
    ? getActivityMessage(activityId, msgCategory, reasonsArr)
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

export function buildReasons(day: any, activityId: string) {
  const isMarine = MARINE_ACTIVITY_IDS.includes(activityId);
  const windValue = isMarine ? day.windSpeed : day.wind_speed;

  const reasons = [
    { key: 'wind', value: windValue, label: getWindMessage({
      windSpeed: windValue,
      gustSpeed: isMarine ? day.gustSpeed : day.gust_speed,
      windDirection: isMarine ? day.windDirection : day.wind_direction,
      windDirectionsToday: day.wind_directions_today,
      context: isMarine ? 'marine' : 'land'
    }) },
    { key: 'rain', value: day.rain, label: getRainfallDescription(day.rain) },
    { key: 'temperature', value: day.temperature, label: getTemperatureDescription(day.temperature) },
    { key: 'humidity', value: day.humidity, label: getHumidityDescription(day.humidity) },
  ];

  if (typeof day.visibility === 'number') {
    const visibilityLabel = getVisibilityDescription(day.visibility);
    if (visibilityLabel) {
      reasons.push({ key: 'visibility', value: day.visibility, label: visibilityLabel });
    }
  }

  if (isMarine) {
    if (typeof day.waveHeight === 'number') {
      reasons.push({ key: 'wave', value: day.waveHeight, label: getWaveDescription(day.waveHeight) });
    }
    if (typeof day.waterTemperature === 'number') {
      reasons.push({ key: 'water', value: day.waterTemperature, label: getWaterTemperatureDescription(day.waterTemperature) });
    }
  }

  return reasons.filter(
    (r) => r.label && r.label !== 'Unknown temperature' && r.label !== 'Unknown humidity'
  );
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
