// src/utils/getSuggestionsByDay.ts

// Lightweight types used here
type SuitabilityLevel = 'perfect' | 'good' | 'fair' | 'poor' | 'indoor' | 'indoorAlternative';

export interface ActivityType {
  id: string;
  name?: string;
  activity?: string;
  tags?: string[];
  weatherSensitive?: boolean;         // true => outdoor
  indoorAlternative?: boolean;
  seasonalMonths?: number[];
}

export interface WeatherData {
  temperature?: number;
  precipitation?: number;             // mm
  windspeed?: number;                 // km/h
  clouds?: number;                    // %
  humidity?: number;                  // %
  visibility?: number;                // m
  waterTemperature?: number;          // °
  waveHeight?: number;                // m
  swellHeight?: number;               // m
  swellPeriod?: number;               // s
  sunsetTs?: number | null;
}

export interface EveningBonusResult {
  multiplier: number;
  reasons?: Record<string, string>;
}

export interface Suggestion {
  activityId: string;
  score: number;
  evaluation: SuitabilityLevel;
  eveningReasons?: EveningBonusResult['reasons'];
}

import { selectHeroActivity } from './heroSelector';
import { calculateConditionMatchScore,
         calculatePoorConditionPenalty } from './activitySuitability';
import { applyEveningBonus } from './eveningScoring';
import { activityTypes } from '../data/activityTypes';
import { getActivityMessage } from '../data/activityMessages';

// Simple context tags helper used by scoring/bonuses
function buildContextTagsForDay(dayName: string, hour: number, isToday: boolean): string[] {
  const dn = dayName.toLowerCase();
  const tags = new Set<string>([dn]);
  if (dn === 'saturday' || dn === 'sunday') tags.add('weekend');
  else tags.add('weekday');

  if (hour >= 17) tags.add('evening');
  else if (hour >= 12) tags.add('afternoon');
  else tags.add('morning');

  if (isToday) tags.add('today');
  return Array.from(tags);
}

// Map numeric score to suitability label (for outdoor)
function toLevel(score: number): SuitabilityLevel | 'poor' {
  if (score >= 90) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

// Unified scoring function
function calculateActivityScore(
  activity: ActivityType,
  weather: WeatherData,
  isWeatherGood: boolean,
  isEveningToday: boolean,
  contextTags: string[],
  opts: { nowTs: number; sunsetTs?: number | null; month?: number }
): number {
  // Indoor activities: low daytime, boosted in evening
  if (!activity.weatherSensitive) {
    let score = 45;
    const hour = new Date(opts.nowTs).getHours();
    const eveningResult = applyEveningBonus(activity, hour, contextTags, opts);
    score *= eveningResult.multiplier;
    return Math.min(95, Math.round(score));
  }

  // Normalize weather
  const w = {
    temperature: weather.temperature,
    precipitation: weather.precipitation,
    windSpeed: weather.windspeed,
    clouds: weather.clouds,
    humidity: weather.humidity,
    visibility: (weather.visibility ?? 10000) / 1000,
    waterTemperature: weather.waterTemperature,
    waveHeight: weather.waveHeight,
    swellHeight: weather.swellHeight,
    swellPeriod: weather.swellPeriod,
  };

  let score = 20;
  let cl = 'poor';

  // Dangerous conditions
  if (activity.poorConditions?.length) {
    const penalty = calculatePoorConditionPenalty(activity.poorConditions, w);
    if (penalty > 0.7) {
      score = 8 + Math.random() * 12;
      cl = 'poor';
    }
  }

  // Perfect
  if (activity.perfectConditions?.length && calculateConditionMatchScore(activity.perfectConditions, w) > 0.85) {
    score = 90 + Math.random() * 8;
    cl = 'perfect';
  }
  // Good
  else if (activity.goodConditions?.length && calculateConditionMatchScore(activity.goodConditions, w) > 0.6) {
    score = 68 + Math.random() * 15;
    cl = 'good';
  }
  // Fair
  else if (activity.fairConditions?.length && calculateConditionMatchScore(activity.fairConditions, w) > 0.5) {
    score = 45 + Math.random() * 15;
    cl = 'fair';
  }

  // Evening adjustments for outdoor
  if (isEveningToday) {
    const hour = new Date(opts.nowTs).getHours();
    const eveningRes = applyEveningBonus(activity, hour, contextTags, opts);
    score *= eveningRes.multiplier;
  }

  score = Math.max(5, Math.min(95, score));
  return Math.round(score);
}

// Main function
export function getSuggestionsByDay(payload: {
  forecast: Array<{ date: any; weather: WeatherData }>;
  interests: string[];
  activities: ActivityType[];
  now: Date;
}) {
  const { forecast, interests, activities, now } = payload;
  const nowTs = now.getTime();

  return forecast.map(dayData => {
    const day = dayData;
    const safeActs = Array.isArray(activities) ? activities : [];
    const today = now;
    const dayDate = new Date(day.date * 1000);
    const dayName = dayDate.toLocaleDateString('en-GB', { weekday: 'long' });
    const isToday = dayDate.toDateString() === today.toDateString();
    const hour = now.getHours();
    const isEvening = isToday && hour >= 17;
    const month = dayDate.getMonth() + 1;
    const contextTags = buildContextTagsForDay(dayName, hour, isToday);
    const dw = day.weather ?? {};

    // Filter by interests
    const filtered = safeActs.filter(a => interests.includes(a.id));
    // Seasonal
    const inSeason = filtered.filter(a => !a.seasonalMonths?.length || a.seasonalMonths.includes(month));
    // Weather good probe
    const probe = inSeason.filter(a => a.weatherSensitive).map(a =>
      calculateActivityScore(a, dw, false, false, contextTags, { nowTs, sunsetTs: dw.sunsetTs, month })
    );
    const isWeatherGood = probe.some(s => s >= 60);

    // Build raw suggestions
    const raw = inSeason.map(activity => {
      let score = calculateActivityScore(activity, dw, isWeatherGood, isEvening, contextTags, {
        nowTs,
        sunsetTs: dw.sunsetTs,
        month,
      });

      // Tag-based day nudge
      if (activity.tags?.includes(dayName)) score = Math.round(score * 1.1);

      // Classification
      const evalLevel: SuitabilityLevel = activity.weatherSensitive
        ? toLevel(score)
        : (activity.indoorAlternative ? 'indoorAlternative' : 'indoor');

      // Evening reasons
      const eveningRes = isEvening
        ? applyEveningBonus(activity, hour, contextTags, { nowTs, sunsetTs: dw.sunsetTs, month })
        : { multiplier: 1, reasons: {} };

      return {
        activityId: activity.id,
        score,
        evaluation: evalLevel,
        eveningReasons: eveningRes.reasons,
        __weatherSensitive: activity.weatherSensitive,
      } as Suggestion & { __weatherSensitive: boolean };
    });

    // Top lists
    const top10 = raw.sort((a, b) => b.score - a.score).slice(0, 10);
    const topIndoors = raw
      .filter(r => !r.__weatherSensitive)
      .sort((a, b) => b.score - a.score)
      .filter((r, i, arr) => arr.findIndex(x => x.activityId === r.activityId) === i)
      .slice(0, 5);

    const suggestionsList: Suggestion[] = top10.map(({ __weatherSensitive, ...rest }) => rest);
    const stayInside: Suggestion[] = topIndoors.map(({ __weatherSensitive, ...rest }) => rest);

    // Hero
    let hero = selectHeroActivity
      ? selectHeroActivity(suggestionsList, isEvening)
      : suggestionsList[0] || null;

    return {
      date: day.date,
      suggestions: suggestionsList,
      heroActivity: hero,
      stayInside,
    };
  });
}
