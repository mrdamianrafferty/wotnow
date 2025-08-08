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

  const marineData = isMarine && hasMarineData
    ? {
        waveHeight: day.waveHeight,
        windSpeed: day.wind_speed,
        waterTemperature: day.waterTemperature,
        swellHeight: day.swellHeight,
        swellPeriod: day.swellPeriod,
      }
    : undefined;

  const weatherData = !isMarine
    ? {
        description: day.description,
        temperature: day.temperature,
        windSpeed: day.windSpeed,
        windDirection: day.wind_deg,
        humidity: day.humidity,
        precipitation: day.rain ?? day.precipitation ?? 0,
      }
    : undefined;

  const message =
    getActivityMessage(activityId, category, reasons) ??
    'No specific message available for this activity.';

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
