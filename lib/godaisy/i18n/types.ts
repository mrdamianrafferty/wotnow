/**
 * The shape every locale fills in — one file per language under ./locales.
 *
 * ONE LOCALE, ONE OBJECT, ONE SOURCE OF TRUTH. The Call's sentences and the
 * drawn conditions page used to carry their English inline, in a dozen files,
 * so translating them meant finding every string. They now read from here, and
 * `__tests__/godaisyLocales.test.ts` checks that every locale answers every
 * question English does — same keys, same placeholders, same array lengths.
 *
 * These are TEMPLATES, translated once and reviewed by a person. Nothing in
 * here is sent to DeepL at request time: every place and hour has different
 * numbers, and the plan is the retired legacy free one with a 500k/month quota.
 *
 * @module lib/godaisy/i18n/types
 */

import type { SupportedLanguageCode } from '@/lib/i18n/translate';
import type { en } from './locales/en';

export type LangCode = SupportedLanguageCode;
export const LANGS: readonly LangCode[] = ['en', 'es', 'fr', 'pt', 'de', 'it', 'nl', 'pl', 'sv', 'tr'];

/** Every template key English defines (plural variants included). */
export type TKey = keyof (typeof en)['t'];

/** Seven entries, Sunday first — the order of `Date#getDay`. */
export type Week = readonly [string, string, string, string, string, string, string];

export interface SportPhrases {
  /**
   * A COMPLETE verdict for the "{When} is ___" frame, ending in a full stop:
   * English "a surf day." Omit where the sport has no natural noun form.
   */
  noun?: string;
  /** Complete predicates after the "{When} is" lead-in: "a good day to paddle out." */
  predicates?: string[];
  /** Complete verdicts that carry their own subject. `{when}` is allowed. */
  sentences?: string[];
}

export interface Locale {
  code: LangCode;
  /** BCP 47 tag handed to `Intl` (dates, numbers, plurals, lists). */
  intl: string;
  /** `12h` only for English; everyone else reads a 24-hour clock. */
  clock: '12h' | '24h';
  /** Bare weekday names, for a label: "Saturday". */
  weekday: Week;
  /** The weekday opening a sentence: "Saturday is…" (Spanish "El sábado"). */
  weekdayStart: Week;
  /** The weekday inside a sentence: "on Saturday" (Spanish "el sábado"). */
  weekdayOn: Week;
  /** The weekday after "until": "until Saturday". */
  weekdayUntil: Week;
  /** Short weekday for a drawing label: "Sat". */
  weekdayShort: Week;
  /** "Today" opening a sentence, and "today" inside one. */
  todayStart: string;
  todayMid: string;
  /** "Tomorrow" opening a sentence is not needed; this is "tomorrow" inside one. */
  tomorrowMid: string;
  tomorrowUntil: string;
  tomorrowLabel: string;
  todayLabel: string;
  /** Zero to twenty, as words, in the form that fits "four football pitches". */
  numerals: readonly string[];
  /** The eight points, as the wind-from clause says them: "north-east". */
  compassWords: readonly string[];
  /** The eight points, abbreviated, as a fact value: "NE". */
  compassShort: readonly string[];
  /** Beaufort force 0–12 names: "gentle breeze". */
  forceNames: readonly string[];
  /** Beaufort land descriptions, force 0–12. Lower-case, no full stop. */
  beaufortLand: readonly string[];
  /** One sport at a time, keyed by activity id. */
  sports: Record<string, SportPhrases>;
  /**
   * How each of the 118 activities is named after the locale's "for": the
   * object of "a day for ___" and "a write-off for ___". Arrive with their own
   * article where the language needs one.
   */
  sportNames: Record<string, string>;
  /** Wetsuit ladder: the kit as a short label, and as the end of "At 14°, …". */
  seaWear: Record<'freezing' | 'veryCold' | 'chilly' | 'cool' | 'mild' | 'warm' | 'hot', { short: string; say: string }>;
  /** Ground underfoot: the label (a fact value), the sentence, and the shoe label in two lines. */
  underfoot: Record<
    'Hard and dry' | 'Firm' | 'Soft' | 'A bit soggy' | 'Muddy' | 'Very muddy' | 'Frozen hard',
    { label: string; say: string }
  >;
  /** The six shoes under the drawing, two short lines each (second may be ''). */
  shoes: readonly (readonly [string, string])[];
  /** Every other sentence, label and piece of chrome, with `{placeholders}`. */
  t: Record<string, string>;
}
