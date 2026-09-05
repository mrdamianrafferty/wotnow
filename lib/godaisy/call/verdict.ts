/**
 * The sentence.
 *
 * This is the product. Everything else in the redesign is presentation over data
 * that already existed; the verdict is the thing being sold, and it did not
 * exist. The rules it has to keep, from the handoff's voice section:
 *
 *   - British English. A day is "decent" or "a write-off", never "nice".
 *   - Second person or universal. Never first person.
 *   - No emoji. No exclamation marks. Enthusiasm is a voice problem, not a
 *     punctuation one.
 *   - The verdict is ONE clause, ending in a full stop. Never a question,
 *     never hedged.
 *   - The reason is at most two sentences.
 *
 * **Templates, not free text.** The output has to be inspectable — you cannot
 * read a week of verdicts and tune them if each one is generated differently.
 *
 * **Window-aware from the start.** Scoring is day-level today and moves to
 * dayparts before the call screen is built. Every template therefore takes an
 * OPTIONAL window clause: when it is absent the sentence simply ends earlier.
 * Writing these window-free would mean rewriting the copy in ten locales at the
 * upgrade, which is the expensive half of this project.
 *
 * @module lib/godaisy/call/verdict
 */

import { familyFor, forceFromMs, forceName, phraseFor } from '@/utils/activityReasons';
import type { WeatherData, Suggestion } from '@/utils/getSuggestionsByDay';
import type { CallBand } from './bands';
import { choosePhrase, fillWhen } from './phrasebook';

/**
 * How a sport is named inside "Today is a ___ day."
 *
 * `phraseFor` names an activity for a clause — "surfing", "walking the dog" —
 * which reads badly in this frame: "a surfing day" is clumsy and "a walking the
 * dog day" is broken. Only sports with a natural noun form get the frame; the
 * rest fall back to "a day for ___", which works for everything.
 */
const VERDICT_NOUN: Record<string, string> = {
  surfing: 'surf', sea_swimming: 'sea swimming', wild_swimming: 'swimming',
  road_cycling: 'cycling', gravel_biking: 'gravel', mountain_biking: 'mountain biking',
  cycling: 'cycling', hiking: 'walking', trail_running: 'trail running', running: 'running',
  sailing: 'sailing', windsurfing: 'windsurfing', kitesurfing: 'kitesurfing',
  kayaking: 'kayaking', sea_kayaking: 'sea kayaking', canoeing: 'canoeing',
  stand_up_paddleboarding: 'paddleboarding', rowing: 'rowing',
  climbing: 'climbing', bouldering: 'bouldering', golf: 'golf',
  stargazing: 'stargazing', birdwatching: 'birdwatching', photography: 'photography',
  gardening: 'gardening', picnicking: 'picnic', camping: 'camping',
};

/**
 * "a surf day." / "a day for paddleboarding." — one clause, always a full stop.
 *
 * `phraseFor` names an activity for a clause, and eight of them come back
 * already carrying a preposition or an article: "Go for a Walk" becomes "for a
 * walk", which the frame turned into "a day for for a walk." Those get a frame
 * that fits what they already are rather than one forced on top.
 */
function verdictNoun(activityId: string, name?: string): string {
  const noun = VERDICT_NOUN[activityId];
  if (noun) return `a ${noun} day.`;

  const phrase = phraseFor(activityId, name);
  // "for a walk" → "a day for a walk."
  if (/^for\s/.test(phrase)) return `a day ${phrase}.`;
  // "to the pub" → "a day for the pub." — "a day to the pub" is not English.
  if (/^to\s/.test(phrase)) return `a day for ${phrase.replace(/^to\s/, '')}.`;
  // "a picnic" / "the playground" → "a day for a picnic."
  if (/^(a|an|the)\s/.test(phrase)) return `a day for ${phrase}.`;
  // "a day at the beach" already IS the frame.
  if (/^a day\b/.test(phrase)) return `${phrase}.`;
  return `a day for ${phrase}.`;
}

export interface VerdictInput {
  suggestion: Pick<Suggestion, 'activityId' | 'score' | 'binding' | 'vetoed'>;
  activityName?: string;
  weather: WeatherData;
  band: CallBand;
  /** True when this is the day's top call rather than an alternate. */
  isFirst: boolean;
  /**
   * The daypart the good run falls in, once scoring is finer than the day.
   * Undefined until then, and every sentence below reads correctly without it.
   */
  window?: 'morning' | 'afternoon' | 'evening';
  /** For a no-day: the next day that is a yes, already formatted ("Tuesday"). */
  nextYes?: string;
  /** Seeds the phrasing so the same day at the same place always reads the same. */
  place?: string;
  /** Steps the phrasing, so consecutive days never repeat. 0 = today. */
  dayIndex?: number;
  /** The weekday this call is for, already localised ("Tuesday"). */
  weekday?: string;
}

export interface Verdict {
  /** "Today is" / "Today is also" — no article; the article lives in the verdict. */
  leadIn?: string;
  /** One clause, ending in a full stop. */
  verdict: string;
  /** At most two sentences. */
  reason: string;
}

const WINDOW_CLAUSE: Record<NonNullable<VerdictInput['window']>, string> = {
  morning: 'Best in the morning',
  afternoon: 'Best in the afternoon',
  evening: 'Best in the evening',
};

/**
 * A short, true clause about the input that decided it.
 *
 * Keyed on the BINDING criterion first, not on the family. Reading the first
 * week of output, Pembrokeshire on a Tuesday came out as "a walking day. Dry,
 * 15°." with a 50 km/h gust sitting in the first fact tile — the reason and the
 * facts describing two different days, because the clause was chosen by family
 * and the family said "land, so talk about temperature". Whatever decided the
 * score is what the sentence is about.
 */
function bindingClause(w: WeatherData, activityId: string, bindingKey?: string): string | null {
  const rain = w.precipitation ?? 0;
  const gust = w.gustspeed;
  const windKmh = w.windspeed;

  const force = (kmh: number) => {
    const f = forceFromMs(kmh / 3.6);
    return `${forceName(f)}, Force ${f}`;
  };

  switch (bindingKey) {
    case 'windSpeed':
      if (windKmh !== undefined) return force(windKmh);
      break;
    case 'gust':
      if (gust !== undefined) return `gusting to ${Math.round(gust)} km/h`;
      break;
    case 'precipitation':
      if (rain >= 0.2) return `${rain.toFixed(1)} mm of rain`;
      return 'dry through';
    case 'waterTemperature':
      if (w.waterTemperature !== undefined) return `${Math.round(w.waterTemperature)}° in the water`;
      break;
    case 'waveHeight':
    case 'swellPeriod': {
      const h = w.swellHeight ?? w.waveHeight;
      if (h !== undefined) {
        return w.swellPeriod !== undefined
          ? `${h.toFixed(1)} m at ${Math.round(w.swellPeriod)} seconds`
          : `${h.toFixed(1)} m of swell`;
      }
      break;
    }
    case 'cloudCover':
    case 'clouds':
      if (w.clouds !== undefined) return w.clouds < 25 ? 'clear' : `${Math.round(w.clouds)}% cloud`;
      break;
    case 'soilMoisture':
      if (w.soilMoisture !== undefined) return w.soilMoisture < 30 ? 'dry ground' : 'soft ground';
      break;
  }

  // No usable binding: fall back to what the family cares about most.
  const family = familyFor(activityId);
  if ((family === 'wind_powered' || family === 'paddle') && windKmh !== undefined) return force(windKmh);
  if (family === 'immersion' && w.waterTemperature !== undefined) return `${Math.round(w.waterTemperature)}° in the water`;

  // A strong gust is never "dry and mild", whatever the family thinks.
  if (gust !== undefined && gust >= 45) return `gusting to ${Math.round(gust)} km/h`;
  if (rain >= 1) return `${rain.toFixed(1)} mm of rain`;
  if (w.temperature !== undefined) return `${rain < 0.2 ? 'dry' : 'mostly dry'}, ${Math.round(w.temperature)}°`;
  return null;
}

/**
 * What is GOOD about a day, for this family.
 *
 * On a good day the binding criterion is the least useful thing to say about it.
 * The binding is the WEAKEST criterion, and on a day where nothing is limiting
 * that is whichever one happened to score lowest — which produced "a walking day.
 * 52% cloud." and "a surf day. 1.8 mm of rain.", both true and both beside the
 * point. `describeConditions` already knew this and only quotes a limiting clause
 * when the binding actually scored badly; this is the same rule.
 */
function goodClause(w: WeatherData, activityId: string): string | null {
  const family = familyFor(activityId);
  const rain = w.precipitation ?? 0;
  const dry = rain < 0.2;
  const t = w.temperature !== undefined ? `${Math.round(w.temperature)}°` : null;

  const force = (kmh: number) => {
    const f = forceFromMs(kmh / 3.6);
    return `${forceName(f)}, Force ${f}`;
  };

  if (family === 'wind_powered' && w.windspeed !== undefined) {
    return `${force(w.windspeed)}${t ? ` and ${t}` : ''}`;
  }
  if (family === 'paddle' && w.windspeed !== undefined) {
    return `${force(w.windspeed)}${dry ? ', dry' : ''}`;
  }
  if (family === 'immersion') {
    const sea = w.waterTemperature !== undefined ? `${Math.round(w.waterTemperature)}° in the water` : null;
    if (sea) return `${sea}${w.windspeed !== undefined && w.windspeed < 20 ? ' and little wind' : ''}`;
  }
  const swell = w.swellHeight ?? w.waveHeight;
  if (swell !== undefined && swell >= 0.6 && (activityId === 'surfing' || family === 'paddle')) {
    return w.swellPeriod !== undefined
      ? `${swell.toFixed(1)} m at ${Math.round(w.swellPeriod)} seconds`
      : `${swell.toFixed(1)} m of swell`;
  }
  if (t) return `${dry ? 'dry' : 'mostly dry'}, ${t}`;
  return null;
}

/** Sentences start with a capital. The clauses above are written mid-sentence. */
const upperFirst = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/**
 * A criterion is worth naming as a limitation only when it actually scored
 * badly. Below this it is a real constraint; above it, it is just the softest
 * link in a good chain and saying so contradicts the verdict beside it.
 */
const LIMITING_BELOW = 0.5;

/**
 * Build the verdict and its reason.
 *
 * The no-day is the important case: it MUST name the next yes, or the app has
 * told you to close it and given you no reason to come back.
 */
export function makeVerdict(input: VerdictInput): Verdict {
  const { suggestion, activityName, weather, band, isFirst, window, nextYes, place = '', dayIndex = 0, weekday = '' } = input;
  const when = (text: string) => fillWhen(text, weekday, dayIndex === 0);
  const windowClause = window ? `${WINDOW_CLAUSE[window]}.` : '';

  if (band === 'unsafe') {
    const gust = weather.gustspeed ?? weather.windspeedMax ?? weather.windspeed;
    const gustClause = gust !== undefined ? ` Gusting to ${Math.round(gust)} km/h.` : '';
    return {
      verdict: when('{When} is one to sit out.'),
      reason: `Conditions are past the safe limit for ${phraseFor(suggestion.activityId, activityName)}.${gustClause}${
        nextYes ? ` ${nextYes} is the one.` : ''
      }`.trim(),
    };
  }

  /*
   * MARGINAL AND NOT-TODAY SHARE THE EVIDENCE, NOT THE SENTENCE.
   *
   * They were one branch, and it read "Friday is a write-off. 1.0 mm of rain."
   * over a score of 46. A write-off is a day you cancel; 1 mm of rain at 18° is
   * a day you go out in anyway and think nothing of. Saying the strong word for
   * the weak case spends it: after a week of write-offs over drizzle, the one
   * that means it reads like the others.
   *
   * So the reason — which is only ever the numbers — is built once, and the
   * verdict picks its own words.
   */
  if (band === 'marginal' || band === 'notToday') {
    const rain = weather.precipitation ?? 0;
    const gust = weather.gustspeed ?? weather.windspeed;
    const bits: string[] = [];
    if (gust !== undefined && gust >= 35) bits.push(`gusting to ${Math.round(gust)} km/h`);
    if (rain >= 1) bits.push(`${rain.toFixed(1)} mm of rain`);
    if (!bits.length && weather.temperature !== undefined) bits.push(`${Math.round(weather.temperature)}° and little else going for it`);
    const fallback = band === 'marginal'
      ? 'Nothing you have picked is at its best.'
      : 'Nothing you have picked would be any fun.';
    const first = bits.length ? `${bits.join(' with ')}.` : fallback;
    return {
      verdict: when(band === 'marginal' ? '{When} is nothing special.' : '{When} is a write-off.'),
      // A no ALWAYS names the next yes. Without it the app has told you to close
      // it and given you no reason to come back.
      reason: `${first[0].toUpperCase()}${first.slice(1)}${nextYes ? ` ${nextYes} is the one.` : ''}`,
    };
  }

  // Say what is good about it. Only reach for the binding criterion when it is
  // genuinely limiting — otherwise a fine day gets explained by its dullest number.
  const limiting = suggestion.binding && suggestion.binding.score < LIMITING_BELOW;
  const clause = limiting
    ? bindingClause(weather, suggestion.activityId, suggestion.binding?.key)
    : goodClause(weather, suggestion.activityId);
  const reason = [clause ? `${upperFirst(clause)}.` : '', windowClause].filter(Boolean).join(' ').trim();

  const phrase = choosePhrase(
    suggestion.activityId,
    place,
    dayIndex,
    isFirst,
    verdictNoun(suggestion.activityId, activityName),
  );

  /*
   * The key is OMITTED when there is no lead-in, not set to `undefined`.
   * A sentence-shaped phrase carries its own subject and needs none, and this
   * object crosses getServerSideProps — where an explicit `undefined` is a build
   * error ("cannot be serialized as JSON"), not a missing value.
   */
  return {
    ...(phrase.leadIn ? { leadIn: when(phrase.leadIn) } : {}),
    verdict: when(phrase.verdict),
    reason: reason || 'Conditions hold all day.',
  };
}

/** The whole thing as one line, for the push notification and the plain-text share. */
export function asSentence(v: Verdict): string {
  const head = v.leadIn ? `${v.leadIn} ${v.verdict}` : v.verdict;
  return `${head} ${v.reason}`.trim();
}
