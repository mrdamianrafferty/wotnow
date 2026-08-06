/**
 * SEO page data fetcher.
 *
 * Wraps the existing Go Daisy scoring engine so the programmatic SEO pages
 * (at /[activity]/[location-slug]) get the same scores the app produces.
 *
 * Called from `getStaticProps` in `pages/[activity]/[location].tsx`.
 *
 * Pattern:
 *   1. Fetch weather data for a location from the upstream services
 *   2. Map it into the shape getSuggestionsByDay expects
 *   3. Run the scoring engine for the chosen activity
 *   4. Return a clean, page-ready payload
 *
 * Free-first: Open-Meteo (via fetchOpenMeteoAsOneCallShape) is the PRIMARY
 * source, adapted into the same shape OpenWeather One Call 3.0 returns.
 * OpenWeather (getCachedFullWeather) is only used as a fallback when
 * Open-Meteo fails — SEO regeneration is a lot of locations, so keeping it
 * off OpenWeather's quota by default matters more here than for live traffic.
 */

import { getSuggestionsByDay } from '../../utils/getSuggestionsByDay';
import type { Suggestion, WeatherData } from '../../utils/getSuggestionsByDay';
import { activityTypes } from '../../data/activityTypes';
import type { SeoLocation } from '../../data/seoLocations';
import { getCachedFullWeather } from '../services/weatherService';
import { getOpenWeatherKey } from '../utils/openWeatherKey';
import { fetchOpenMeteoAsOneCallShape } from '../weather/openMeteoOneCallAdapter';

// ============================================================================
// Public types
// ============================================================================

export interface DailyScore {
  date: string; // ISO date (YYYY-MM-DD)
  dayLabel: string; // "Today", "Tomorrow", "Friday"...
  score: number; // 0–100
  evaluation: 'perfect' | 'good' | 'fair' | 'poor' | 'indoor' | 'indoorAlternative';
  reasoning: string;
}

export interface ActivityScorePayload {
  // Current-day answer
  todayScore: number;
  todayEvaluation: DailyScore['evaluation'];
  todayReasoning: string;
  // Best window in next 7 days
  bestDay: DailyScore | null;
  // Full 7-day outlook for the chart
  weeklyOutlook: DailyScore[];
  // Headline weather facts shown in the "Why this score?" section
  conditionsToday: {
    temperatureC?: number;
    feelsLikeC?: number;
    windSpeedKmh?: number;
    windDirection?: string;
    precipitationMm?: number;
    cloudCoverPct?: number;
    uvIndex?: number;
    waveHeightM?: number;
    swellPeriodS?: number;
    seaTempC?: number;
    nextHighTide?: string;
    nextLowTide?: string;
  };
  // When the data was last refreshed (used for "Last updated" footer)
  lastUpdated: string;
  // Whether we used cached/fallback data (so the page can show a notice)
  isStale: boolean;
}

// ============================================================================
// Main entry — called from getStaticProps
// ============================================================================

export async function getActivityScoreForLocation(
  activityId: string,
  location: SeoLocation
): Promise<ActivityScorePayload | null> {
  // 1. Find the activity definition
  const activity = activityTypes.find((a) => a.id === activityId);
  if (!activity) return null;

  // 2. Fetch weather for the next 7 days
  const forecast = await fetchWeatherForLocation(location);
  if (!forecast || forecast.length === 0) return null;

  // 3. Run the scoring engine for this single activity
  const now = new Date();
  const dailySuggestions = getSuggestionsByDay({
    forecast,
    activities: [activity],
    interests: [activityId],
    now,
    includeAllActivities: true, // we want a score even on "poor" days
  });

  // 4. Pull out the score for this activity on each day
  const weeklyOutlook: DailyScore[] = dailySuggestions.map(
    (day: { date: number; suggestions: Suggestion[] }, i: number) => {
    const suggestion = day.suggestions?.find?.((s: Suggestion) => s.activityId === activityId);
    const score = suggestion?.score ?? 0;
    return {
      date: new Date(day.date * 1000).toISOString().slice(0, 10),
      dayLabel: labelForOffset(i),
      score,
      evaluation: suggestion?.evaluation ?? 'poor',
      reasoning: suggestion?.reasoning ?? '',
    };
  });

  const todayDay = weeklyOutlook[0];
  const bestDay = [...weeklyOutlook]
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)[0] ?? null;

  // 5. Pull today's headline conditions for the "Why this score?" section
  const todayWeather = forecast[0]?.weather ?? {};
  const conditionsToday: ActivityScorePayload['conditionsToday'] = {
    temperatureC: todayWeather.temperature,
    windSpeedKmh: todayWeather.windspeed,
    precipitationMm: todayWeather.precipitation,
    cloudCoverPct: todayWeather.clouds,
    waveHeightM: todayWeather.waveHeight,
    swellPeriodS: todayWeather.swellPeriod,
    seaTempC: todayWeather.waterTemperature,
  };

  return {
    todayScore: todayDay?.score ?? 0,
    todayEvaluation: todayDay?.evaluation ?? 'poor',
    todayReasoning: todayDay?.reasoning ?? '',
    bestDay,
    weeklyOutlook,
    conditionsToday,
    lastUpdated: now.toISOString(),
    isStale: false,
  };
}

// ============================================================================
// Internal helpers
// ============================================================================

function labelForOffset(offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

/**
 * Fetch weather for a location and return it in the shape getSuggestionsByDay
 * expects: `Array<{ date: number; weather: WeatherData }>`.
 *
 * Free-first: tries Open-Meteo (adapted into OpenWeather One Call 3.0 shape)
 * before falling back to `getCachedFullWeather` (same Supabase-backed cache
 * the live app uses) only if Open-Meteo fails.
 */
async function fetchWeatherForLocation(
  location: SeoLocation
): Promise<Array<{ date: number; weather: WeatherData }>> {
  // Map an OpenWeather-One-Call-shaped payload into the shape getSuggestionsByDay wants.
  type OWMDaily = { dt?: number; temp?: { day?: number; min?: number; max?: number }; rain?: number; wind_speed?: number; clouds?: number; humidity?: number };
  type OWMHourly = { dt?: number; temp?: number; rain?: { '1h'?: number }; wind_speed?: number; clouds?: number; humidity?: number };

  function mapOneCallShape(data: { daily?: unknown; hourly?: unknown } | null | undefined): Array<{ date: number; weather: WeatherData }> {
    if (Array.isArray(data?.daily)) {
      return (data.daily as OWMDaily[]).slice(0, 7).map((d: OWMDaily) => ({
        date: d.dt ?? Math.floor(Date.now() / 1000),
        weather: {
          temperature: d.temp?.day ?? d.temp?.max,
          precipitation: d.rain ?? 0,
          windspeed: (d.wind_speed ?? 0) * 3.6, // m/s → km/h
          clouds: d.clouds,
          humidity: d.humidity,
        },
      }));
    }

    // Fallback: try hourly[0..6] as daily proxies
    if (Array.isArray(data?.hourly)) {
      return (data.hourly as OWMHourly[]).slice(0, 7).map((h: OWMHourly) => ({
        date: h.dt ?? Math.floor(Date.now() / 1000),
        weather: {
          temperature: h.temp,
          precipitation: h.rain?.['1h'] ?? 0,
          windspeed: (h.wind_speed ?? 0) * 3.6,
          clouds: h.clouds,
          humidity: h.humidity,
        },
      }));
    }

    return [];
  }

  // PRIMARY: Open-Meteo (free, unlimited)
  try {
    const data = await fetchOpenMeteoAsOneCallShape(location.lat, location.lon);
    const mapped = mapOneCallShape(data);
    if (mapped.length) return mapped;
  } catch (err) {
    console.warn(`[getActivityScore] Open-Meteo failed for ${location.slug}, falling back to OpenWeather:`, err);
  }

  // BACKSTOP: OpenWeather One Call 3.0 (Supabase-cached)
  const apiKey = getOpenWeatherKey();
  if (!apiKey) {
    console.error(`Weather fetch skipped for ${location.slug}: missing OpenWeather API key`);
    return [];
  }

  try {
    const data = await getCachedFullWeather({
      lat: location.lat,
      lon: location.lon,
      apiKey,
      options: { units: 'metric', exclude: '' },
    });
    return mapOneCallShape(data);
  } catch (err) {
    console.error(`Weather fetch error for ${location.slug}:`, err);
    return [];
  }
}
