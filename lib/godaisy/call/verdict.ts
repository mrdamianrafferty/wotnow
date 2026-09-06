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

import { compass, familyFor, forceFromMs, forceName, phraseFor } from '@/utils/activityReasons';
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

/**
 * How a sport is named after the word "for".
 *
 * `phraseFor` writes for a clause, and some of its phrases arrive carrying the
 * preposition or frame they expect to sit in: "for a walk", "to the pub",
 * "a day at the beach". Dropped straight into a "for ___" slot they read
 * "past the safe limit for for a walk" — which was live in the unsafe branch,
 * and would have been in the write-off too.
 *
 * Strip the frame and keep the thing itself.
 */
function afterFor(activityId: string, name?: string): string {
  const p = phraseFor(activityId, name);
  if (/^for\s/.test(p)) return p.replace(/^for\s/, '');       // "for a walk" → "a walk"
  if (/^to\s/.test(p)) return p.replace(/^to\s/, '');         // "to the pub" → "the pub"
  if (/^a day\s/.test(p)) return p.replace(/^a day\s+\w+\s/, ''); // "a day at the beach" → "the beach"
  return p;
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
  window?: { parts: readonly string[]; ends?: string };
  /**
   * True when the day was called off by its own totals and promoted by its
   * parts — see `promote` in makeCall.
   *
   * The reason is written differently for one of these: see below.
   */
  promoted?: boolean;
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

/**
 * The window, as a person would say it — phase 1b.
 *
 * Keyed on the run rather than on a single part, because "best in the morning
 * and the afternoon" is not a sentence anybody says. The five runs a three-part
 * day can produce are enumerated: there are only five, and writing them out
 * gets idiomatic English where a join would get a list.
 *
 * No entry for all three parts. A day that holds all day has no window, and
 * `bestWindow` returns undefined for it rather than reaching this table.
 *
 * "Before six" and "from midday" are the six-hour boundaries the parts are cut
 * on, said the way a person says them — NOT a precision claim. The one thing
 * this must never do is name a clock time the forecast cannot support, which is
 * why "before eleven" is not here: eleven is inside the morning part, and the
 * scoring has nothing to say about which side of it the wind turns.
 */
const WINDOW_CLAUSE: Record<string, string> = {
  morning: 'Best in the morning',
  afternoon: 'Best in the afternoon',
  evening: 'Best in the evening',
  'morning,afternoon': 'Best before six',
  'afternoon,evening': 'Best from midday on',
};

/**
 * What closes the window, named by the criterion that closes it.
 *
 * "The wind gets up after that" is the difference between a restriction and an
 * explanation, and the reader can act on the second one.
 *
 * THE TEST IS WHETHER IT IS NEWS. `temperature` and `uvIndex` were in this table
 * and produced "Best in the morning, and it cools off after that." on a dry 19°
 * Sunday — which is true, and is true of every day there has ever been. Evenings
 * are cooler than afternoons and the sun is strongest at midday; naming the
 * diurnal cycle as though it were a forecast makes the app sound like it has
 * noticed something when it has not. What is left changes from day to day:
 * whether the wind gets up, whether the rain arrives, whether it closes in.
 *
 * Anything not here drops the half-sentence rather than reaching for a vague
 * one — the window still says when, it just does not claim to know why.
 */
const WINDOW_ENDS: Record<string, string> = {
  gust: 'the wind gets up after that',
  windSpeed: 'the wind gets up after that',
  windRelative: 'the wind gets up after that',
  precipitation: 'the rain comes in after that',
  rain: 'the rain comes in after that',
  visibility: 'it closes in after that',
  cloudCover: 'it clouds over after that',
  waveHeight: 'the sea gets up after that',
  swellPeriod: 'the swell goes off after that',
};

/** "Best in the morning, and the wind gets up after that." */
function windowSentence(parts: readonly string[], ends?: string): string {
  const clause = WINDOW_CLAUSE[parts.join(',')];
  if (!clause) return '';
  const why = ends ? WINDOW_ENDS[ends] : undefined;
  return why ? `${clause}, and ${why}.` : `${clause}.`;
}

/**
 * Humidity, in the register `getHumidityDescription` (utils/weatherLabels)
 * argued for: the number alone says nothing about what it will feel like,
 * and cold-and-clammy is a different complaint from hot-and-sticky at the
 * same percentage. Kept to plain English rather than that function's
 * exclamation marks and emoji, which the verdict's voice rules forbid.
 */
function humidClause(humidity: number, temperature?: number): string {
  const cold = typeof temperature === 'number' && temperature < 10;
  return cold ? `damp and clammy at ${Math.round(humidity)}%` : `close and sticky at ${Math.round(humidity)}%`;
}

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
      if (w.waterTemperature !== undefined) return `${Math.round(w.waterTemperature)}°C in the water`;
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
    /*
     * Humidity, visibility, wind direction and snow were all handled by the
     * old SEO-page reasoning (`describeConditions` in utils/activityReasons)
     * but were never ported when this binding switch was built for the Call
     * screen — so a muggy write-off or a foggy morning read here with no
     * mention of why. Same clauses that page already uses, kept lowercase
     * (the caller title-cases) and lowercase-clause style consistent with the
     * rest of this switch.
     */
    /*
     * Humid is temperature-aware, in the same spirit as utils/weatherLabels'
     * `getHumidityDescription` — the same 93% reads as sticky heat on a warm
     * day and as a damp chill on a cold one, and saying which is the whole
     * point of naming it at all.
     */
    case 'humidity':
      if (w.humidity !== undefined) return humidClause(w.humidity, w.temperature);
      break;
    case 'visibility': {
      const km = typeof w.visibility === 'number' ? w.visibility / 1000 : undefined;
      if (km !== undefined) {
        if (km < 1) return 'thick fog, under a kilometre of visibility';
        if (km < 4) return `murky, losing detail past ${Math.round(km)} km`;
        return `hazy, thinning out past ${Math.round(km)} km`;
      }
      break;
    }
    case 'windDirection':
      if (w.winddirection !== undefined) return `wind out of the ${compass(w.winddirection)}`;
      break;
    case 'snowDepthCm':
      if (w.snowDepthCm !== undefined && w.snowDepthCm > 0) return `${Math.round(w.snowDepthCm)} cm of snow underfoot`;
      break;
    case 'snowfallRateMmH':
      if (w.snowfallRateMmH !== undefined && w.snowfallRateMmH > 0) return 'snow coming down';
      break;
  }

  // No usable binding: fall back to what the family cares about most.
  const family = familyFor(activityId);
  if ((family === 'wind_powered' || family === 'paddle') && windKmh !== undefined) return force(windKmh);
  if (family === 'immersion' && w.waterTemperature !== undefined) return `${Math.round(w.waterTemperature)}°C in the water`;

  // A strong gust is never "dry and mild", whatever the family thinks.
  if (gust !== undefined && gust >= 45) return `gusting to ${Math.round(gust)} km/h`;
  if (rain >= 1) return `${rain.toFixed(1)} mm of rain`;
  if (w.temperature !== undefined) return `${rain < 0.2 ? 'dry' : 'mostly dry'}, ${Math.round(w.temperature)}°C`;
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
  const t = w.temperature !== undefined ? `${Math.round(w.temperature)}°C` : null;

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
    const sea = w.waterTemperature !== undefined ? `${Math.round(w.waterTemperature)}°C in the water` : null;
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
  const { suggestion, activityName, weather, band, isFirst, window, promoted, nextYes, place = '', dayIndex = 0, weekday = '' } = input;
  const when = (text: string) => fillWhen(text, weekday, dayIndex === 0);
  const windowClause = window ? windowSentence(window.parts, window.ends) : '';

  if (band === 'unsafe') {
    const gust = weather.gustspeed ?? weather.windspeedMax ?? weather.windspeed;
    const gustClause = gust !== undefined ? ` Gusting to ${Math.round(gust)} km/h.` : '';
    return {
      verdict: when('{When} is one to sit out.'),
      reason: `Conditions are past the safe limit for ${afterFor(suggestion.activityId, activityName)}.${gustClause}${
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
    /*
     * Ported from the old SEO-page reasoning: humid air is what makes a
     * marginal or write-off day feel worse than its score alone suggests,
     * and the old copy said so regardless of whether humidity was the
     * criterion that actually decided the score.
     */
    if (suggestion.binding?.key !== 'humidity' && typeof weather.humidity === 'number' && weather.humidity >= 90) {
      bits.push(humidClause(weather.humidity, weather.temperature));
    }
    if (!bits.length && weather.temperature !== undefined) bits.push(`${Math.round(weather.temperature)}°C and little else going for it`);
    const fallback = band === 'marginal'
      ? 'Nothing you have picked is at its best.'
      : 'Nothing you have picked would be any fun.';
    const first = bits.length ? `${bits.join(' with ')}.` : fallback;
    /*
     * The write-off NAMES THE SPORT, and takes the lead-in frame to do it.
     *
     * "Friday is a write-off." is true of the weather and says nothing about
     * the person reading it, who came here about one thing. "a write-off for
     * cycling" is the same sentence doing the job.
     *
     * The lead-in is what makes it fit. As one line, "Wednesday is a write-off
     * for cross-country skiing." is 50 characters against a 41-character budget
     * — 35 of 81 sports would have overflowed the lockup. Split the way every
     * good-day verdict already splits, the big line is 37 at its worst.
     */
    return {
      leadIn: when('{When} is'),
      verdict: band === 'marginal'
        ? 'nothing special.'
        : `a write-off for ${afterFor(suggestion.activityId, activityName)}.`,
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
  /*
   * A PROMOTED DAY DOES NOT GET TO DESCRIBE ITSELF.
   *
   * Its conditions clause is written from the run's weather — the hours the
   * verdict is about — and read as a claim about the whole day it overstates:
   * "Monday is a walking day. Dry through." went out over a day carrying 3.7 mm
   * of rain, because the afternoon was dry and the afternoon is what was being
   * recommended. True of the hours, false of the day, and the reader has no way
   * to tell which was meant.
   *
   * So where a window exists, it carries the reason alone — "Best in the
   * afternoon, and the rain comes in after that" is time-bound by construction
   * and cannot be misread as the day. Where no window exists the day really did
   * hold up part by part, and the clause is honest again.
   */
  const suppressClause = promoted && Boolean(windowClause);
  const reason = [suppressClause || !clause ? '' : `${upperFirst(clause)}.`, windowClause]
    .filter(Boolean).join(' ').trim();

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

/**
 * The verdict as it should leave the app — without the "also".
 *
 * "Today is ALSO a day for a walk" went out in a real iMessage. On screen that
 * word is doing work: you have tapped past the first answer and this is the
 * second, and "also" is what makes the noun frame parse. Sent to someone who
 * never saw the first answer, it is a sentence referring to something that does
 * not exist — and it makes the app sound unsure of its own recommendation.
 *
 * The lead-in is the only place it appears, so this is a frame swap rather than
 * a rewrite: "{When} is also" becomes "{When} is", and the verdict beneath it
 * is already the noun form that follows either.
 */
export function asSharedSentence(v: Verdict): string {
  const leadIn = v.leadIn?.replace(/\s+also\b/i, '');
  return asSentence({ ...v, ...(leadIn ? { leadIn } : {}) });
}
