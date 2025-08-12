import { activityTypes } from '../data/activityTypes';
import { getAssessmentEmoji } from '../data/emojiMap';
import { buildReasons } from './activityHelpers'; // Adjust the path if needed

import SwellArrow from '../components/SwellArrow';
import bgMap from '../data/bgMap';
import { getActivityMessage } from '../data/activityMessages';
import { MARINE_ACTIVITY_IDS } from '../utils/activityHelpers';
import '../styles/Popup.css';

type Category = 'perfect' | 'good' | 'fair' | 'poor';

interface ActivityDayPayload {
  activityId: string;
  day: any; // Should be typed if possible
  score: number;
  reasons?: any[];
}

export function buildPopupActivityPayload({
  activityId,
  day,
  score,
  reasons: passedReasons,
}: ActivityDayPayload) {
  const activity = activityTypes.find((a) => a.id === activityId);
  const title = activity?.name ?? activityId.replace(/_/g, ' ');
  const description = activity?.description ?? '';
  const background = bgMap[activityId] || '/zumba.png';
  const category: Category =
    score >= 80 ? 'perfect'
    : score >= 60 ? 'good'
    : score >= 40 ? 'fair'
    : 'poor';
  const categoryEmoji = getAssessmentEmoji ? getAssessmentEmoji(category) : '';
  const isMarine = MARINE_ACTIVITY_IDS.includes(activityId);

  const hasMarineData = day.waveHeight || day.windSpeed || day.waterTemperature || day.swellHeight || day.swellPeriod;

  const hasRealMarineData =
    (typeof day.waveHeight === 'number' && !isNaN(day.waveHeight)) ||
    (typeof day.swellHeight === 'number' && !isNaN(day.swellHeight));


  // Create weather data object from day properties
const marineData = hasMarineData ? {
  waveHeight: day?.waveHeight ?? day?.wave_height ?? null,
  waterTemperature: day?.waterTemperature ?? day?.water_temp ?? null,
  swellHeight: day?.swellHeight ?? day?.swell_height ?? null,
  swellPeriod: day?.swellPeriod ?? day?.swell_period ?? null,
  windSpeed: day?.windSpeed ?? null, // Stormglass only
  windDir: day?.windDir ?? day?.windDirection ?? null, // Stormglass only
  gust: day?.gust ?? null, // Stormglass if available
  vis: day?.vis ?? null, // Stormglass if available
  swellDir: day?.swellDir ?? day?.swell_direction ?? null,
    temperature: day?.temperature ?? day?.temp ?? null,
  tempMin: day?.tempMin ?? day?.temp_min ?? null,
  tempMax: day?.tempMax ?? day?.temp_max ?? null,
  humidity: day?.humidity ?? null,
  precipitation: day?.precipitation ?? day?.rain ?? null,
  visibility: day?.visibility ?? null,
  condition: day?.condition ?? null,
  icon: day?.icon ?? null,
  description: day?.description ?? null,
} : {};

const weatherData = {
  temperature: day?.temperature ?? day?.temp ?? null,
  tempMin: day?.tempMin ?? day?.temp_min ?? null,
  tempMax: day?.tempMax ?? day?.temp_max ?? null,
  humidity: day?.humidity ?? null,
  windSpeed: day?.wind_speed ?? null, // OpenWeather only
  windDir: day?.wind_direction ?? null, // OpenWeather only
  gust: day?.wind_gust ?? null,
  precipitation: day?.precipitation ?? day?.rain ?? null,
  visibility: day?.visibility ?? null,
  condition: day?.condition ?? null,
  icon: day?.icon ?? null,
  description: day?.description ?? null,
};

  // Merge the marine data into the day object for buildReasons
  const dayWithMarine = {
    ...day,
    waterTemperature: marineData.waterTemperature,
    waveHeight: marineData.waveHeight,
    swellHeight: marineData.swellHeight,
    swellPeriod: marineData.swellPeriod,
    windSpeed: marineData.windSpeed,
    windDir: marineData.windDir,
  };

  // Get reasons from buildReasons if not provided, using enhanced day object
  const reasons = passedReasons || buildReasons(isMarine ? dayWithMarine : day, activityId);
  
  // Create reason objects from strings
  const reasonsObjects = Array.isArray(reasons) 
    ? reasons.map(reason => ({
        key: reason.toLowerCase().replace(/\s+/g, '_'),
        value: true,
        label: reason
      }))
    : [];

  const message = getActivityMessage
    ? getActivityMessage(activityId, category, reasonsObjects)
    : '';

  if (isMarine) {
    console.log('Marine activity:', activityId, {
      waveHeight: day.waveHeight,
      swellHeight: day.swellHeight,
      swellPeriod: day.swellPeriod,
      waterTemperature: day.waterTemperature,
      wind_speed: day.wind_speed,
    });
  }

  console.log('marineData:', marineData);
  console.log('Parsed day object:', day);

  // Optionally, add render helpers if you use them
  // const renderMarineData = () => ...;
  // const renderFooter = () => ...;

  return {
    activityId,
    title,
    description,
    background,
    category,
    categoryEmoji,
    reasons,
    marineData,
    weatherData, // <-- now defined!
    score,
    message,
    // renderMarineData,
    // renderFooter,
  };
}
