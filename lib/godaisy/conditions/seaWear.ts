/**
 * What to wear in the sea, from its temperature.
 *
 * The ladder is the one the old SeaTempCard used (components/weather-cards/
 * SeaTempCard.tsx, `BANDS` and `DEFAULT_SHORT_BY_BAND`) — same cut-offs, same
 * kit — lifted here so the drawn conditions page can say it. The card is no
 * longer rendered anywhere; this is now the copy that is read.
 *
 * Bands are [min, max) in °C. The WORDS live in each locale
 * (`lib/godaisy/i18n/locales`), because "a 4/3 and boots" is said differently
 * in every language that has surfers.
 *
 * @module lib/godaisy/conditions/seaWear
 */

import { localeOf } from '@/lib/godaisy/i18n';
import type { LangCode } from '@/lib/godaisy/i18n/types';

export type SeaWear = 'freezing' | 'veryCold' | 'chilly' | 'cool' | 'mild' | 'warm' | 'hot';

interface Band {
  id: SeaWear;
  /** Lower bound, °C, inclusive. */
  min: number;
  /** The kit, as the card printed it. */
  short: string;
  /** The same, to finish "At 14°, …". */
  say: string;
}

/** Coldest first. */
const LADDER: ReadonlyArray<{ id: SeaWear; min: number }> = [
  { id: 'freezing', min: -Infinity },
  { id: 'veryCold', min: 8 },
  { id: 'chilly', min: 12 },
  { id: 'cool', min: 15 },
  { id: 'mild', min: 18 },
  { id: 'warm', min: 21 },
  { id: 'hot', min: 25 },
];

export const SEA_WEAR_BANDS = LADDER;

export function seaWear(tempC: number, lang?: LangCode): Band {
  let band = LADDER[0];
  for (const b of LADDER) if (tempC >= b.min) band = b;
  const words = localeOf(lang).seaWear[band.id];
  return { id: band.id, min: band.min, short: words.short, say: words.say };
}
