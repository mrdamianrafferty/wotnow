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
  reasons,
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

  const marineData = MARINE_ACTIVITY_IDS.includes(activityId) ? {
    waveHeight: day.waveHeight, // FIXED
    swellHeight: day.swellHeight, // FIXED
    swellPeriod: day.swellPeriod, // FIXED
    waterTemperature: day.waterTemperature, // FIXED
    windSpeed: day.windSpeed || day.wind_speed,
    swellDir: day.swellDir,
    gust: day.gust,
    vis: day.vis,
    current: day.current
  } : undefined;

  const weatherData = !isMarine || !hasRealMarineData
    ? {
        description: day.description,
        temperature: day.temperature,
        windSpeed: day.windSpeed,
        windDirection: day.wind_deg,
        humidity: day.humidity,
        precipitation: day.rain ?? day.precipitation ?? 0,
        icon: day.icon,
      }
    : undefined;

  const message =
    getActivityMessage(activityId, category, reasons) ??
    'No specific message available for this activity.';

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
