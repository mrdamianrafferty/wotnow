/**
 * What to wear in the sea, from its temperature.
 *
 * The ladder is the one the old SeaTempCard used (components/weather-cards/
 * SeaTempCard.tsx, `BANDS` and `DEFAULT_SHORT_BY_BAND`) — same cut-offs, same
 * kit — lifted here so the drawn conditions page can say it. The card is no
 * longer rendered anywhere; this is now the copy that is read.
 *
 * Bands are [min, max) in °C.
 *
 * @module lib/godaisy/conditions/seaWear
 */

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
export const SEA_WEAR: readonly Band[] = [
  { id: 'freezing', min: -Infinity, short: 'Are you mad?', say: 'are you mad?' },
  { id: 'veryCold', min: 8, short: '6/5 or 5/4 + hood', say: "it's a 5/4 or 6/5 and a hood" },
  { id: 'chilly', min: 12, short: '4/3 + boots', say: "it's a 4/3 and boots" },
  { id: 'cool', min: 15, short: '3/2 full suit', say: "it's a 3/2 full suit" },
  { id: 'mild', min: 18, short: 'Shorty / swimwear', say: "it's a shorty or just swimwear" },
  { id: 'warm', min: 21, short: 'Swimsuit', say: "it's swimsuit weather" },
  { id: 'hot', min: 25, short: 'Swimsuit optional', say: "it's swimsuit optional" },
];

export function seaWear(tempC: number): Band {
  let band = SEA_WEAR[0];
  for (const b of SEA_WEAR) if (tempC >= b.min) band = b;
  return band;
}
