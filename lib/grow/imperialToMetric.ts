/**
 * Rewrite inch measurements in English care-guide text as centimetres, so that the
 * translations for Spain, Portugal, France and Germany read in metric.
 *
 * Only inches are handled (the care guides are almost all "1 inch of water" and
 * "the top 2-3 inches of soil"). Feet, gallons and Fahrenheit are left alone.
 * The stored English is never changed: this runs on the text sent for translation.
 *
 * @module lib/grow/imperialToMetric
 */

const CM_PER_INCH = 2.54;

/** Round for reading, not precision: 0.5 cm under 10, whole cm under 30, then 5 cm. */
function roundCm(inches: number): string {
  const cm = inches * CM_PER_INCH;
  const r = cm < 10 ? Math.round(cm * 2) / 2 : cm < 30 ? Math.round(cm) : Math.round(cm / 5) * 5;
  return String(r);
}

/** "2", "1.5", "1/2", "1 1/2", "½", "1½" -> number of inches. */
function parseInches(raw: string): number {
  const s = raw.trim();
  const glyph: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
  const mixedGlyph = s.match(/^(\d+)\s*([½¼¾])$/);
  if (mixedGlyph) return Number(mixedGlyph[1]) + glyph[mixedGlyph[2]];
  if (glyph[s] !== undefined) return glyph[s];
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(s.replace(',', '.'));
}

// A number as written in the text: 2, 1.5, 1/2, 1 1/2, ½, 1½
const NUM = String.raw`(\d+\s+\d+\/\d+|\d+\/\d+|\d+\s*[½¼¾]|[½¼¾]|\d+(?:[.,]\d+)?)`;
// The unit word, with a bare inch mark (") allowed
const UNIT = String.raw`(?:inches|inch|in\.|")`;
// Between the two ends of a range
const TO = String.raw`\s*(?:-|–|to|and)\s*`;

export function inchesToCentimetres(text: string): string {
  let t = text;

  // "an inch or 2", "the top inch or two" -> 2.5 to 5 cm
  t = t.replace(/\b(?:(?:an|1|one)\s+)?inch\s+or\s+(?:2|two)\b/gi, '2.5 to 5 cm');
  // "half an inch to an inch" -> 1.5 to 2.5 cm
  t = t.replace(/\bhalf an inch to an inch\b/gi, '1.5 to 2.5 cm');

  // "5- to 7-inch lengths" -> "13 to 18 cm lengths"
  t = t.replace(new RegExp(`${NUM}-?\\s*(?:to|-)\\s*${NUM}-inch`, 'gi'),
    (_, a, b) => `${roundCm(parseInches(a))} to ${roundCm(parseInches(b))} cm`);

  // Ranges: "1-2 inches", "1 to 2 inches", "2 - 3 inches", '1" - 2"', '1"-2"'
  // (keep "between 2 and 3" reading as "between 5 and 7.5", not "between 5 to 7.5")
  t = t.replace(new RegExp(`${NUM}\\s*(?:${UNIT})?(${TO})${NUM}\\s*${UNIT}`, 'gi'),
    (_, a, sep, b) => `${roundCm(parseInches(a))} ${/and/i.test(sep) ? 'and' : 'to'} ${roundCm(parseInches(b))} cm`);

  // Single values: "6 inches", "1/2 inch", '1/4"', "2-inch"
  t = t.replace(new RegExp(`${NUM}\\s*-?\\s*(?:inches|inch|")`, 'gi'),
    (_, a) => `${roundCm(parseInches(a))} cm`);

  // Words instead of numbers
  t = t.replace(/\bhalf an inch\b/gi, '1.5 cm');
  t = t.replace(/\ba couple (?:of )?inches\b/gi, 'about 5 cm');
  t = t.replace(/\b(?:(?:a )?few|several) inches\b/gi, 'several centimetres');
  t = t.replace(/\b(?:an|a|one) inch\b/gi, '2.5 cm');
  // "the top inch of soil", "upper inch"
  t = t.replace(/\b(top|upper) inch\b/gi, '$1 2.5 cm');

  return t;
}
