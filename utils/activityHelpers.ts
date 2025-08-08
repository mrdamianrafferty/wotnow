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
  const perfectCandidate = perfectList.find(
    (a) => !usedHeroActivities.has(a.activityId)
  );
  if (perfectCandidate) {
    usedHeroActivities.add(perfectCandidate.activityId);
    return perfectCandidate;
  }

  // Try unused good activities next
  const goodCandidate = goodList.find(
    (a) => !usedHeroActivities.has(a.activityId)
  );
  if (goodCandidate) {
    usedHeroActivities.add(goodCandidate.activityId);
    return goodCandidate;
  }

  // If repeats are allowed, pick the top of the list
  if (allowRepeats) {
    return perfectList[0] || goodList[0] || null;
  }

  // Nothing found
  return null;
}
