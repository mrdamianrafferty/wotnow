/**
 * Shared plumbing for the hand-run DeepL scripts (species-backfill.mjs,
 * translation-repair.mjs), so they spend from the SAME budget as the live app.
 *
 * Why: the DeepL Free key (500k chars/month) is shared with Grewp, Rise Daisy and
 * Findr. Go Daisy and Grow Daisy rank last of the five, and the live app already
 * stops at 40% of the account and 50,000 characters a month
 * (lib/translation/deepl-budget.ts). These scripts used to size themselves from
 * DeepL's raw "characters left" figure, so one run could spend what the other apps
 * were relying on. Now each batch reserves its characters in the shared ledger
 * before it is sent, settles to what DeepL billed, and a refusal stops the run.
 *
 * Run with `npx tsx` or Node >= 22.18, which can load the .ts budget module.
 */
import fs from 'node:fs';
import path from 'node:path';

let budget;
try {
  budget = await import('../../lib/translation/deepl-budget.ts');
} catch (err) {
  console.error('Could not load lib/translation/deepl-budget.ts. Run this script with `npx tsx` (or Node >= 22.18).');
  console.error(String(err).slice(0, 300));
  process.exit(1);
}

export const { computeRoom, prefixThatFits } = budget;

/** DeepL's own account-wide usage, in the shape the budget wants. */
export function usageFetcher(dl) {
  return async () => {
    const usage = await dl.getUsage();
    if (!usage.character) throw new Error('DeepL usage response has no character quota');
    return { count: usage.character.count, limit: usage.character.limit };
  };
}

/**
 * Where the shared budget stands: the app cap and the account ceiling, and how
 * many characters this app may still spend. `room` is null if either number could
 * not be read, which callers must treat as "spend nothing".
 */
export function budgetSnapshot(dl) {
  return budget.budgetSnapshot(usageFetcher(dl));
}

/** Reserve `chars` for `lang` in the shared ledger. `{ ok: false }` means stop. */
export function reserve(dl, lang, chars) {
  return budget.reserveChars(lang, chars, usageFetcher(dl));
}
export const settle = (reservation, lang, billed) => budget.settleReservation(reservation, lang, billed);
export const release = (reservation, lang) => budget.releaseReservation(reservation, lang);

/**
 * Translate in small waves (DeepL rate-limits on concurrency). Returns, per text,
 * `{ text, billed }` or `null` on failure. NEVER the source text on failure: a
 * cached English fallback is a hit that is never retried (that made 3,491 rows
 * permanently English in September).
 */
export async function translateWaves(dl, texts, deeplLang, { concurrency = 5, log = console.log } = {}) {
  const out = [];
  for (let i = 0; i < texts.length; i += concurrency) {
    const wave = texts.slice(i, i + concurrency);
    const done = await Promise.all(
      wave.map(async (t) => {
        try {
          const r = await dl.translateText(t, null, deeplLang, {
            preserveFormatting: true,
            // The app is informal everywhere; French defaults to formal (vous).
            formality: 'prefer_less',
          });
          return { text: r.text, billed: r.billedCharacters ?? t.length };
        } catch (e) {
          log(`    ! ${String(e).slice(0, 100)}`);
          return null;
        }
      }),
    );
    out.push(...done);
    log(`    ${Math.min(i + concurrency, texts.length)}/${texts.length}`);
  }
  return out;
}

/**
 * Translations that were paid for but could not be written. Dump them to a file
 * rather than lose them: they cost real quota, and re-running would buy them
 * again. Returns the path written.
 */
export function stashUnsaved(rows, label) {
  const dir = 'scripts/backups';
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `unsaved-${label}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  return file;
}

/** Print the shared budget in the same shape from both scripts. */
export function describeBudget(snap, log = console.log) {
  const n = (v) => (v === null || v === undefined ? 'unreadable' : v.toLocaleString());
  log(`shared budget ${snap.app}: ${n(snap.appUsed)} / ${n(snap.appCap)} this month (cap)`);
  log(`              account ${n(snap.accountUsed)} / ${n(snap.accountLimit)}; this app stops at ${n(snap.accountCeiling)}`);
  log(`              room now: ${n(snap.room)}${snap.binding ? ` (limited by ${snap.binding})` : ''}`);
}
