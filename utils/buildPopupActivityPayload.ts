import { activityTypes } from '../data/activityTypes';
import { getAssessmentEmoji } from '../data/emojiMap';

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

  const hasMarineData = day.waveHeight || day.wind_speed || day.waterTemperature || day.swellHeight || day.swellPeriod;

  const hasRealMarineData =
    (typeof day.waveHeight === 'number' && !isNaN(day.waveHeight)) ||
    (typeof day.swellHeight === 'number' && !isNaN(day.swellHeight));

  // Find marine data
  const marineData = {
    waveHeight: day?.waveHeight ?? null,
    waterTemperature: day?.waterTemperature ?? null,
    swellHeight: day?.swellHeight ?? null,
    swellPeriod: day?.swellPeriod ?? null,
    windSpeed: day?.windSpeed ?? day?.wind_speed ?? null,
    gustSpeed: day?.gustSpeed ?? null,
    windDirection: day?.windDirection ?? null,
  };

  // Create weather data object from day properties
  const weatherData = {
    temperature: day?.temperature ?? null,
    tempMin: day?.tempMin ?? null, 
    tempMax: day?.tempMax ?? null,
    humidity: day?.humidity ?? null,
    windSpeed: day?.wind_speed ?? day?.windSpeed ?? null,
    precipitation: day?.rain ?? day?.precipitation ?? null,
    visibility: day?.visibility ?? null,
    condition: day?.condition ?? null,
    icon: day?.icon ?? null,
  };

  // Merge the marine data into the day object for buildReasons
  const dayWithMarine = {
    ...day,
    waterTemperature: marineData.waterTemperature,
    waveHeight: marineData.waveHeight,
    swellHeight: marineData.swellHeight,
    swellPeriod: marineData.swellPeriod
  };

  // Get reasons from buildReasons if not provided, using enhanced day object
  const reasons = passedReasons || buildReasons(dayWithMarine, activityId);
  
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
    weatherData,
    score,
    message,
    // renderMarineData,
    // renderFooter,
  };
}
