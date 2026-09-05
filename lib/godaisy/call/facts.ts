/**
 * The three facts.
 *
 * "Exactly three. Never four, never two. The three that actually decided the
 * verdict — so the set is per-sport and per-day, not fixed."
 *
 * Two rules do the work. The criterion that decided the score goes first,
 * whatever it is, because that is the number the sentence is about. The rest is
 * filled from a per-family order — a surfer wants swell and sea temperature, a
 * cyclist wants ground and wind — and never invents a value the forecast does
 * not carry.
 *
 * @module lib/godaisy/call/facts
 */

import { familyFor, type ActivityFamily } from '@/utils/activityReasons';
import type { WeatherData, Suggestion } from '@/utils/getSuggestionsByDay';
import { factLabel, DERIVED_FACT_LABELS } from '@/data/activities/factLabels';
import type { SupportedLanguageCode } from '@/lib/i18n/translate';

export interface CallFact {
  /** The condition key, so the label can be translated at render. */
  key: string;
  /** English label, for the script and for the default locale. */
  label: string;
  /** Formatted with its unit. Values are numbers and units; they do not translate. */
  value: string;
}

/**
 * What each family cares about, after the decisive criterion has had first pick.
 * Keys are the condition vocabulary from data/activities.
 */
const FAMILY_ORDER: Record<ActivityFamily, string[]> = {
  wind_powered:   ['windSpeed', 'gust', 'waveHeight', 'temperature', 'precipitation'],
  paddle:         ['windSpeed', 'waveHeight', 'waterTemperature', 'gust', 'precipitation'],
  immersion:      ['waterTemperature', 'waveHeight', 'windSpeed', 'temperature', 'precipitation'],
  land_endurance: ['temperature', 'precipitation', 'windSpeed', 'gust', 'soilMoisture'],
  stay_put:       ['temperature', 'precipitation', 'cloudCover', 'windSpeed', 'visibility'],
  other:          ['temperature', 'precipitation', 'windSpeed', 'cloudCover', 'visibility'],
};

/** How each key reads on a tile. Units are the ones the app already displays. */
function format(key: string, w: WeatherData): string | null {
  const n = (v: number | undefined | null, d = 0): string | null =>
    v === undefined || v === null || !Number.isFinite(v) ? null : v.toFixed(d);

  switch (key) {
    case 'temperature':
    case 'airTemperature':   { const v = n(w.temperature); return v && `${v}°`; }
    case 'temperatureMin':   { const v = n(w.temperatureMin); return v && `${v}°`; }
    case 'waterTemperature': { const v = n(w.waterTemperature); return v && `${v}°`; }
    case 'windSpeed':        { const v = n(w.windspeed); return v && `${v} km/h`; }
    case 'gust':             { const v = n(w.gustspeed); return v && `${v} km/h`; }
    case 'precipitation':    { const v = n(w.precipitation, 1); return v && `${v} mm`; }
    case 'humidity':         { const v = n(w.humidity); return v && `${v}%`; }
    case 'cloudCover':
    case 'clouds':           { const v = n(w.clouds); return v && `${v}%`; }
    case 'visibility':       { const v = n(w.visibility === undefined ? undefined : w.visibility / 1000, 1); return v && `${v} km`; }
    case 'soilMoisture':     { const v = n(w.soilMoisture); return v && `${v}%`; }
    case 'waveHeight': {
      const h = n(w.swellHeight ?? w.waveHeight, 1);
      const p = n(w.swellPeriod);
      if (!h) return null;
      return p ? `${h} m · ${p} s` : `${h} m`;
    }
    case 'swellPeriod':      { const v = n(w.swellPeriod); return v && `${v} s`; }
    default: return null;
  }
}

/**
 * Three facts for one activity on one day.
 *
 * Returns fewer than three only when the forecast genuinely carries fewer — a
 * fabricated value is worse than a short row, and the lockup contract would
 * rather be wrong about the count than about the number.
 */
export function factsFor(
  suggestion: Pick<Suggestion, 'activityId' | 'binding'>,
  weather: WeatherData,
  lang: SupportedLanguageCode = 'en',
): CallFact[] {
  /*
   * The decisive criterion leads ONLY when it is genuinely limiting — the same
   * test the reason sentence uses. Leading with it unconditionally put "Cloud
   * 52%" in the first tile of a day whose sentence read "Dry, 16°": the facts
   * and the reason describing two different things, one tile apart. On a day
   * where nothing is limiting, the family order is the better answer.
   */
  const limiting = (suggestion.binding?.score ?? 1) < 0.5;
  const out: CallFact[] = [];
  const used = new Set<string>();

  const push = (key: string) => {
    if (out.length >= 3 || used.has(key)) return;
    const value = format(key, weather);
    if (!value) return;
    used.add(key);
    out.push({ key, label: factLabel(key, lang), value });
  };

  if (limiting && suggestion.binding?.key) push(suggestion.binding.key);

  for (const key of FAMILY_ORDER[familyFor(suggestion.activityId)]) push(key);

  return out;
}

/**
 * The no-day's third fact names when to come back, so the screen never says
 * "not today" without saying "but".
 */
export function nextYesFact(dayLabel: string, lang: SupportedLanguageCode = 'en'): CallFact {
  const row = DERIVED_FACT_LABELS.nextYes;
  return { key: 'nextYes', label: row[lang] ?? row.en, value: dayLabel };
}
