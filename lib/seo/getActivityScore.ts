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
 * Open-Meteo (via fetchOpenMeteoAsOneCallShape) is the ONLY source here,
 * adapted into the shape OpenWeather One Call 3.0 returns because that is what
 * the scoring engine reads.
 *
 * The OpenWeather backstop was removed on 5 September 2026. It fired on
 * Open-Meteo's 429s — and a 429 is what this page produces for itself, since
 * one render fans out to eighteen more locations for its related lists. So the
 * backstop was not covering an outage; it was covering our own burst, and doing
 * it with a payload that publishes fewer fields. That is how the whole
 * /{activity}/{location} surface came to 500 on `cloudCoverPct`: the fallback
 * ran, `clouds` was absent, and an absent field was fatal. One source, one
 * shape, and a rate-limited fetch now fails visibly instead of degrading into
 * something subtly different.
 */

import { getSuggestionsByDay } from '../../utils/getSuggestionsByDay';
import type { Suggestion, WeatherData } from '../../utils/getSuggestionsByDay';
import { activityTypes } from '../../data/activityTypes';
import type { SeoLocation } from '../../data/seoLocations';
import { fetchOpenMeteoAsOneCallShape } from '../weather/openMeteoOneCallAdapter';
import type { DaypartAggregate, DaypartName } from '../weather/openMeteoOneCallAdapter';

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
    /** Peak gust. Absent when the source publishes none — never inferred. */
    windGustKmh?: number;
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
  location: SeoLocation,
  /**
   * Measurements the forecast cannot supply, merged onto every day.
   *
   * Water temperature is the case this exists for. Several models — wild
   * swimming above all — are decided by it, no inland forecast carries it, and
   * a caller who HAS one (a fishery engine, a venue's own sensor) currently has
   * no way to hand it over. Without it those models are scored on air
   * temperature, which lags a reservoir by weeks and is warmest exactly when the
   * water is still dangerous.
   *
   * Merged rather than defaulted: a value passed here is a measurement the
   * caller stands behind, and anything absent stays absent rather than being
   * invented.
   */
  overrides?: Partial<WeatherData>,
  /**
   * A forecast the caller already holds, so N activities cost ONE fetch.
   *
   * Supplied by anything scoring several activities at one place. Omitted, this
   * fetches its own and behaves exactly as before — the SEO pages that ask for
   * a single activity are unchanged.
   */
  prefetched?: LocationForecast,
): Promise<ActivityScorePayload | null> {
  // 1. Find the activity definition
  const activity = activityTypes.find((a) => a.id === activityId);
  if (!activity) return null;

  // 2. Weather for the next 7 days — the caller's, or our own
  const raw = prefetched ?? await fetchForecastForLocation(location);
  if (!raw || raw.length === 0) return null;
  const forecast = overrides
    ? raw.map((d) => ({ ...d, weather: { ...d.weather, ...overrides } }))
    : raw;

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
  /*
   * ABSENT KEYS ARE OMITTED, NOT SET TO `undefined`.
   *
   * Every one of these is optional, and this object is returned straight out of
   * `getStaticProps` on /{activity}/{location} — where Next rejects an explicit
   * `undefined` with "cannot be serialized as JSON" and the page 500s. It was
   * surviving only because Open-Meteo happens to publish all eight; the day
   * Open-Meteo rate-limited and the OpenWeather fallback ran, `clouds` was
   * missing and the whole SEO surface went down. A field the source did not
   * publish should make the page render without that number, not fail.
   */
  const maybe = <T,>(key: string, v: T | undefined) =>
    (v === undefined ? {} : { [key]: v });
  const conditionsToday: ActivityScorePayload['conditionsToday'] = {
    ...maybe('temperatureC', todayWeather.temperature),
    ...maybe('windSpeedKmh', todayWeather.windspeed),
    ...maybe('windGustKmh', todayWeather.gustspeed),
    ...maybe('precipitationMm', todayWeather.precipitation),
    ...maybe('cloudCoverPct', todayWeather.clouds),
    ...maybe('waveHeightM', todayWeather.waveHeight),
    ...maybe('swellPeriodS', todayWeather.swellPeriod),
    ...maybe('seaTempC', todayWeather.waterTemperature),
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
/**
 * One part of a day, ready to score — phase 1b.
 *
 * A part starts as a COPY OF THE DAY and overrides only what the hourly series
 * actually measures. Building one from scratch would drop every criterion the
 * hourly feed does not carry — sea temperature, swell, cloud, moon phase — and
 * the scoring models read an absent criterion as NEUTRAL, not as bad. A morning
 * built from scratch would therefore out-score the day it belongs to, purely by
 * knowing less about it.
 */
export type ForecastParts = Partial<Record<DaypartName, WeatherData>>;

export type LocationForecast = Array<{
  date: number;
  weather: WeatherData;
  /** Absent where the source published no usable hourly series for that day. */
  parts?: ForecastParts;
}>;

/**
 * A daypart aggregate as a `WeatherData`.
 *
 * Wind arrives in km/h — `aggregateDayparts` normalises it at the edge, because
 * Open-Meteo answers in whichever unit the request asked for and this file's
 * request asks for m/s. Soil moisture does still need converting: it is
 * published as m³/m³ and the band criteria are in percent, exactly as
 * `daytimeSoilMoisture` handles it for the daily path.
 */
function partWeather(day: WeatherData, p: DaypartAggregate): WeatherData {
  const set = <T,>(key: string, v: T | undefined) => (v === undefined ? {} : { [key]: v });
  return {
    ...day,
    // `rainWindow` describes WHICH PART of a day the rain fell in, so it is
    // meaningless once you are inside one. Carried down it would tell a morning
    // that its rain falls in the afternoon.
    rainWindow: undefined,
    ...set('temperature', p.temperature),
    ...set('temperatureMin', p.temperatureMin),
    ...set('temperatureMax', p.temperatureMax),
    ...set('precipitation', p.precipitation),
    ...set('precipitationHours', p.precipitationHours),
    ...set('windspeed', p.windspeed),
    ...set('windspeedMax', p.windspeedMax),
    ...set('gustspeed', p.gustspeed),
    ...set('winddirection', p.windDirection),
    ...set('visibility', p.visibility),
    ...set('humidity', p.humidity),
    ...set('clouds', p.cloudCover),
    ...set('soilMoisture', typeof p.soilMoisture === 'number' ? p.soilMoisture * 100 : undefined),
  };
}

/**
 * The forecast for one place, fetched once so it can be scored many times.
 *
 * Exported because the cost of an activity score is almost entirely THIS, and
 * every caller that scores more than one activity at a place was paying it per
 * activity: the conditions endpoint fetched once per requested activity, and
 * the SEO page does the same in a loop. Beyond the bill, N fetches are N
 * chances to straddle a forecast run — which is how one board came to show
 * sailing at Force 3 beside dog walking at Force 4, same water, same hour.
 */
/**
 * Wave, swell and sea temperature, for places on the coast.
 *
 * Without these a surf score is not a surf score. Surfing's model tests
 * waterTemperature, waveHeight and swellPeriod across all four bands, and the
 * general forecast carries none of them — so every one was skipped and surfing
 * was ranked as a generic outdoor activity on air temperature and wind. It is
 * why "a walking day" kept winning at surf breaks.
 *
 * Only fetched where a beach orientation says the place is coastal, and a
 * failure returns the forecast untouched: a fabricated swell is worse than no
 * swell, because the models trust what they are given.
 */
async function withMarine(
  location: SeoLocation,
  forecast: LocationForecast,
): Promise<LocationForecast> {
  if (location.beachFacingDeg === null || location.beachFacingDeg === undefined) return forecast;
  try {
    const url =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${location.lat}&longitude=${location.lon}` +
      '&daily=wave_height_max,swell_wave_height_max,swell_wave_period_max' +
      '&hourly=sea_surface_temperature&timezone=UTC&forecast_days=7';
    const res = await fetch(url);
    if (!res.ok) return forecast;
    const j = (await res.json()) as {
      daily?: Record<string, Array<number | null> | string[] | undefined>;
      hourly?: { time?: string[]; sea_surface_temperature?: Array<number | null> };
    };
    const times = j.daily?.time as string[] | undefined;
    if (!times?.length) return forecast;

    const num = (key: string, i: number): number | undefined => {
      const v = (j.daily?.[key] as Array<number | null> | undefined)?.[i];
      return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    };

    // Sea temperature is published hourly only; midday is the honest daily stand-in.
    const seaByDay = new Map<string, number>();
    const ht = j.hourly?.time ?? [];
    for (let i = 0; i < ht.length; i++) {
      if (!ht[i].endsWith('T12:00')) continue;
      const v = j.hourly?.sea_surface_temperature?.[i];
      if (typeof v === 'number' && Number.isFinite(v)) seaByDay.set(ht[i].slice(0, 10), v);
    }

    const byDate = new Map(times.map((t, i) => [t, i]));
    return forecast.map((day) => {
      const iso = new Date(day.date * 1000).toISOString().slice(0, 10);
      const i = byDate.get(iso);
      if (i === undefined) return day;
      // Same rule as `conditionsToday`: a reading the marine API did not publish
      // leaves the key alone rather than writing `undefined` over it.
      const set = <T,>(key: string, v: T | undefined) => (v === undefined ? {} : { [key]: v });
      const marine = {
        ...set('waveHeight', num('wave_height_max', i)),
        ...set('swellHeight', num('swell_wave_height_max', i)),
        ...set('swellPeriod', num('swell_wave_period_max', i)),
        ...set('waterTemperature', seaByDay.get(iso)),
      };
      /*
       * THE PARTS GET THE MARINE DATA TOO.
       *
       * They are built in `mapOneCallShape`, which runs before this, so without
       * this loop a surf morning would carry no swell, no wave height and no sea
       * temperature — the three criteria surfing's model is mostly made of. The
       * scorer reads an absent criterion as neutral, so every part would have
       * out-scored the day it belongs to and the window would always have been
       * "all day" at a surf break.
       *
       * The marine feed is daily, so each part gets the day's figure. That is a
       * real limitation, not a rounding: a swell that builds through the
       * afternoon looks flat to this. It is honest at the resolution available.
       */
      const parts = day.parts
        ? Object.fromEntries(
            Object.entries(day.parts).map(([name, w]) => [name, { ...w, ...marine }]),
          )
        : undefined;
      return {
        ...day,
        weather: { ...day.weather, ...marine },
        ...(parts ? { parts } : {}),
      };
    });
  } catch {
    return forecast;
  }
}

export async function fetchForecastForLocation(
  location: SeoLocation
): Promise<LocationForecast> {
  // Map an OpenWeather-One-Call-shaped payload into the shape getSuggestionsByDay wants.
  type OWMDaily = {
    dt?: number; temp?: { day?: number; min?: number; max?: number }; rain?: number;
    wind_speed?: number; wind_gust?: number; wind_speed_mean?: number; wind_deg?: number;
    precipitation_hours?: number; visibility?: number; soil_moisture?: number;
    rain_window?: 'overnight' | 'morning' | 'afternoon' | 'evening' | 'spread';
    clouds?: number; humidity?: number;
  };
  type OWMHourly = { dt?: number; temp?: number; rain?: { '1h'?: number }; wind_speed?: number; clouds?: number; humidity?: number };

  /**
   * `wind_speed` here is the day's MAXIMUM and is deliberately not the only wind
   * figure carried any more.
   *
   * A single number was being asked to answer two different questions — "is it
   * safe" (a peak) and "what is it like" (a mean) — and the peak was winning
   * both. That is why a Force 4 day at Rutland scored as a Force 5. The mean is
   * now passed as `windspeed`, the peak as `windspeedMax` and the gust as
   * `gustSpeed`, and the scorer decides which one a given criterion wants.
   *
   * The mean can legitimately be absent (the OpenWeather backstop publishes no
   * daily mean), in which case the max stands in — which is the old behaviour,
   * so the fallback is never worse than what it replaced.
   */
  function mapOneCallShape(data: { daily?: unknown; hourly?: unknown; dayparts?: unknown } | null | undefined): LocationForecast {
    // Keyed by YYYY-MM-DD, as the adapter emits it. Absent on the OpenWeather
    // shape and on anything else that does not publish an hourly series.
    const allParts = (data?.dayparts ?? {}) as Record<string, Record<string, DaypartAggregate>>;

    if (Array.isArray(data?.daily)) {
      return (data.daily as OWMDaily[]).slice(0, 7).map((d: OWMDaily) => {
        const maxKmh = typeof d.wind_speed === 'number' ? d.wind_speed * 3.6 : undefined;
        const meanKmh = typeof d.wind_speed_mean === 'number' ? d.wind_speed_mean * 3.6 : undefined;
        return {
          date: d.dt ?? Math.floor(Date.now() / 1000),
          weather: {
            temperature: d.temp?.day ?? d.temp?.max,
            temperatureMin: d.temp?.min,
            temperatureMax: d.temp?.max,
            precipitation: d.rain ?? 0,
            precipitationHours: d.precipitation_hours,
            rainWindow: d.rain_window,
            windspeed: meanKmh ?? maxKmh ?? 0,
            windspeedMax: maxKmh,
            gustspeed: typeof d.wind_gust === 'number' ? d.wind_gust * 3.6 : undefined,
            winddirection: typeof d.wind_deg === 'number' ? d.wind_deg : undefined,
            /* Metres. Absent when the source has no hourly series to average,
               in which case it stays absent rather than being defaulted — a
               fabricated 10 km was counted as a measurement and failed every
               `visibility>10` in the library. */
            visibility: d.visibility,
            /* Already a percentage when it arrives — the adapter converts from
               m³/m³ so the band criteria and the scorer agree on units. */
            soilMoisture: d.soil_moisture,
            clouds: d.clouds,
            humidity: d.humidity,
          },
        };
      }).map((day) => {
        /*
         * A part is only offered when it has ENOUGH HOURS to be worth scoring.
         *
         * The first and last days of a forecast are partial — a request made at
         * 4pm has one hour of that afternoon — and three hours is the floor at
         * which a mean, a max and a rain total say anything. Below it the part
         * is dropped, which costs a window and never invents one.
         */
        const iso = new Date(day.date * 1000).toISOString().slice(0, 10);
        const raw = allParts[iso];
        if (!raw) return day;
        const parts: ForecastParts = {};
        for (const name of ['morning', 'afternoon', 'evening'] as DaypartName[]) {
          const p = raw[name];
          if (p && p.hours >= 3) parts[name] = partWeather(day.weather, p);
        }
        return Object.keys(parts).length ? { ...day, parts } : day;
      });
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

  /*
   * One attempt, then one retry. Open-Meteo's limit is per minute, and the
   * bursts that trip it are our own related-list fan-out, so a short wait
   * clears most of them. Two is the whole budget: a page that cannot get a
   * forecast should say so quickly, not hold a request open retrying.
   */
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await fetchOpenMeteoAsOneCallShape(location.lat, location.lon);
      const mapped = mapOneCallShape(data);
      if (mapped.length) return withMarine(location, mapped);
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      console.error(`[getActivityScore] Open-Meteo failed for ${location.slug}:`, err);
    }
  }
  return [];
}
