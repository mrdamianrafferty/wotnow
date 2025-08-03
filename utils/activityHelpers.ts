import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWaveDescription,
  getWaterTemperatureDescription,
} from './weatherLabels'; // Adjust the path if needed

const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'kayaking', 'canoeing',
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding',
  'swimming', 'sea_fishing_shore', 'beach', 'sea_fishing_boat',
];

export function buildReasons(day: any, activityId: string) {
  const reasons = [
    { key: 'wind', value: day.wind_speed, label: getBeaufortDescription(day.wind_speed) },
    { key: 'rain', value: day.rain, label: getRainfallDescription(day.rain) },
    { key: 'temperature', value: day.temperature, label: getTemperatureDescription(day.temperature) },
    { key: 'humidity', value: day.humidity, label: getHumidityDescription(day.humidity) },
  ];

  if (MARINE_ACTIVITY_IDS.includes(activityId)) {
    if (typeof day.waveHeight === 'number') {
      reasons.push({ key: 'wave', value: day.waveHeight, label: getWaveDescription(day.waveHeight) });
    }
    if (typeof day.waterTemperature === 'number') {
      reasons.push({ key: 'water', value: day.waterTemperature, label: getWaterTemperatureDescription(day.waterTemperature) });
    }
  }

  return reasons.filter(r => r.label && r.label !== 'Unknown temperature' && r.label !== 'Unknown humidity');
}