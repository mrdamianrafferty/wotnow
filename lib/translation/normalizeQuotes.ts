/**
 * The same rewrite the database applies to `translation_cache` on every insert or
 * update (trigger `normalize_quotes_on_upsert`, function `normalize_quotes`):
 * curly quotes become straight, em/en dashes become "-", "…" becomes "...", and a
 * non-breaking space becomes a plain space.
 *
 * Because of that trigger, a string with curly quotes is STORED under its
 * normalised text. Anything that looks a translation up by its source text has to
 * normalise the key the same way, or it never finds the row.
 *
 * Keep this identical to the SQL function.
 *
 * @module lib/translation/normalizeQuotes
 */
export function normalizeQuotes(text: string): string {
  return text
    .replace(/[“”]/g, '"') // “ ”
    .replace(/[‘’]/g, "'") // ‘ ’
    .replace(/[—–]/g, '-') // — –
    .replace(/…/g, '...') //      …
    .replace(/ /g, ' '); //       non-breaking space
}
