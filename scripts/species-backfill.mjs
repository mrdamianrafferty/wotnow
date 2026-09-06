/**
 * Species translation backfill — one language at a time, in priority order.
 *
 * WHY THIS EXISTS. `grow.godaisy.io/sitemap.xml` lists 3,150 translated species
 * pages — 450 species across seven languages — and each translated its
 * description and advice on demand on first visit. That is about 1.03M
 * characters against a 500,000 a month DeepL allowance, so a crawler working
 * through the sitemap exhausted September in two days: 553,000 characters
 * between the 1st and the 5th, 88% of it on two days, evenly spread across all
 * seven languages.
 *
 * `pages/grow/[lang]/species/[slug].tsx` now answers a crawler from cache only
 * and returns 503 on a miss, which stops the bleeding. But it leaves a bind: a
 * page needs a human visit to get translated, humans arrive through search,
 * search needs the page indexed, and indexing needs a 200. Left alone, the
 * pages that most need translating are the ones that never get it, and Grow's
 * multilingual SEO freezes at whatever the crawl already paid for.
 *
 * So the cache gets filled deliberately, and this is the thing that fills it.
 *
 * ONE LANGUAGE AT A TIME, AND FINISHED BEFORE THE NEXT ONE STARTS.
 *
 * The obvious design — take the cheapest strings across all languages — spends
 * the whole allowance and leaves seven languages each 60% done, which is seven
 * languages of half-translated pages and no complete one. A finished language
 * is a set of pages that can be indexed, linked and measured. Five sixths of
 * five languages is nothing.
 *
 * Order: Spanish, French, German, Italian, Portuguese, then Dutch and Polish.
 * Each is 124k-129k characters, so the free 500k covers roughly three and a
 * half a month, and the five priority languages take about six weeks.
 *
 * SAFE ON A SCHEDULE. It checks the quota before spending any of it, holds a
 * reserve back for the live app, and exits 0 when there is nothing left — so a
 * daily run no-ops until the month rolls over, then carries on where it
 * stopped. It is resumable by construction: what to do next is derived from
 * what is missing, never from a cursor.
 *
 *   node --env-file=.env.local scripts/species-backfill.mjs                # dry run
 *   node --env-file=.env.local scripts/species-backfill.mjs --apply
 *   node --env-file=.env.local scripts/species-backfill.mjs --apply --reserve=50000
 *   node --env-file=.env.local scripts/species-backfill.mjs --lang=de      # one language
 *   node --env-file=.env.local scripts/species-backfill.mjs --assume-budget=500000
 */
import * as deepl from 'deepl-node';
import { createClient } from '@supabase/supabase-js';

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes('--apply');

/**
 * The order languages are completed in, and it is a product decision rather
 * than a technical one — the five that matter first, then the long tail.
 * DeepL wants a regional variant for Portuguese and will reject a bare "pt".
 */
const ORDER = [
  { code: 'es', deepl: 'es',    name: 'Spanish' },
  { code: 'fr', deepl: 'fr',    name: 'French' },
  { code: 'de', deepl: 'de',    name: 'German' },
  { code: 'it', deepl: 'it',    name: 'Italian' },
  { code: 'pt', deepl: 'pt-PT', name: 'Portuguese' },
  // The long tail. Reached only once the five above are finished.
  { code: 'nl', deepl: 'nl',    name: 'Dutch' },
  { code: 'pl', deepl: 'pl',    name: 'Polish' },
];

/** Read a numeric flag, refusing anything that is not a real number. NaN would
 *  otherwise flow into the budget, and every `NaN <= 0` / `cost > NaN` guard
 *  silently evaluates false — so a typo like --reserve=abc would sail past the
 *  quota check and start calling DeepL. */
function numericFlag(name, fallback) {
  const raw = ARGS.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const value = Number(raw.split('=')[1]);
  if (!Number.isFinite(value) || value < 0) {
    console.error(`--${name} must be a non-negative number (got "${raw.split('=')[1]}")`);
    process.exit(1);
  }
  return value;
}

const ONLY = (ARGS.find((a) => a.startsWith('--lang=')) || '').split('=')[1] || null;
if (ONLY && !ORDER.some((l) => l.code === ONLY)) {
  console.error(`--lang must be one of: ${ORDER.map((l) => l.code).join(', ')} (got "${ONLY}")`);
  process.exit(1);
}

/** Characters left unspent for the live app, so a backfill never starves it. */
const RESERVE = numericFlag('reserve', 25000);

/**
 * NO MORE THAN TWO LANGUAGES A MONTH.
 *
 * The budget alone would take three and a half languages in the first month and
 * leave nothing behind it. Two is deliberate headroom: the live app still
 * translates on demand for anyone who visits an uncached page, a species can be
 * edited and need retranslating, and a month with no slack means the first
 * unexpected thing is a page serving English.
 *
 * Two caps, because one is not enough. `--max-languages` stops a single run;
 * `--monthly-cap` stops the month, and it is measured against DeepL's own usage
 * counter — which resets with the billing month and already includes whatever
 * the live app has spent. No state to keep, nothing to get out of step.
 */
const MAX_LANGUAGES = numericFlag('max-languages', 2);
const MONTHLY_CAP = numericFlag('monthly-cap', 300000);
/** DeepL rate-limits on concurrency; five is what the repair script settled on. */
const CONCURRENCY = 5;

const REQUIRED_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DEEPL_API_KEY'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing environment variables: ${missingEnv.join(', ')}`);
  console.error('Run with: node --env-file=.env.local scripts/species-backfill.mjs');
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dl = new deepl.Translator(process.env.DEEPL_API_KEY);
const log = (...a) => console.log(...a);

// ── budget ────────────────────────────────────────────────────────────────
const usage = await dl.getUsage();
const used = usage.character?.count ?? 0;
const limit = usage.character?.limit ?? 0;

// Exists to exercise the selection and costing logic while the real quota is
// exhausted. Refused with --apply so it can never spend.
const ASSUMED = ARGS.find((a) => a.startsWith('--assume-budget='));
if (ASSUMED && APPLY) {
  console.error('--assume-budget is a dry-run aid and cannot be combined with --apply.');
  process.exit(1);
}

/*
 * The budget is whichever runs out first: the plan's remaining quota less the
 * reserve, or what is left of this month's self-imposed cap. `used` is DeepL's
 * own month-to-date figure and already counts the live app, so a busy month
 * shrinks the backfill rather than the app.
 */
const quotaLeft = Math.max(0, limit - used - RESERVE);
const capLeft = Math.max(0, MONTHLY_CAP - used);
let budget = ASSUMED ? numericFlag('assume-budget', 0) : Math.min(quotaLeft, capLeft);

log(`DeepL quota   ${used.toLocaleString()} / ${limit.toLocaleString()} used this month`);
log(`reserve       ${RESERVE.toLocaleString()} held back for the live app`);
log(`monthly cap   ${MONTHLY_CAP.toLocaleString()} — ${capLeft.toLocaleString()} of it left`);
log(`budget        ${budget.toLocaleString()} characters`);
log(`languages     at most ${MAX_LANGUAGES} completed in this run`);
log(APPLY ? 'mode          APPLY' : 'mode          dry run');
log('');

if (budget <= 0) {
  const why = capLeft <= 0 && quotaLeft > 0
    ? `This month's cap of ${MONTHLY_CAP.toLocaleString()} is reached. Quota remains, and is deliberately left for the live app.`
    : 'No quota available. The free plan resets on the 1st of the billing month.';
  log(why);
  log('Nothing to do — exiting cleanly so a schedule can retry.');
  process.exit(0);
}

// ── what still needs translating ──────────────────────────────────────────

/** Every species string that is worth translating, in a stable order. */
async function loadSpecies() {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('plant_species')
      .select('slug, description, advice')
      .order('slug', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`plant_species: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/**
 * Which of these strings this language already has.
 *
 * Asked in chunks, because a `.in()` of nine hundred long strings is a URL no
 * PostgREST will accept. The answer is a set of source texts, so the caller can
 * ask about a string rather than about a row.
 */
async function cachedFor(lang, texts) {
  const have = new Set();
  /*
   * BATCHED BY LENGTH, NOT BY COUNT.
   *
   * This was forty strings a batch, and forty species descriptions at about 690
   * characters each makes a 27,000 character query URL. PostgREST answers a
   * truncated filter without complaining, so the batch silently reports fewer
   * cache hits than exist — and the consequence here is worse than a short
   * sitemap: this function decides what to translate, so an under-report means
   * paying DeepL again for text already bought. The same bug cost the sitemap
   * 155 hreflang alternates before anyone counted.
   *
   * 6,000 characters sits comfortably inside the usual 8k request-line limit.
   */
  const BUDGET = 6000;
  const batches = [];
  let batch = [];
  let size = 0;
  for (const t of texts) {
    if (batch.length && size + t.length > BUDGET) {
      batches.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(t);
    size += t.length;
  }
  if (batch.length) batches.push(batch);

  for (const slice of batches) {
    const { data, error } = await sb
      .from('translation_cache')
      .select('source_text')
      .eq('target_language', lang)
      .in('source_text', slice);
    if (error) throw new Error(`translation_cache: ${error.message}`);
    for (const row of data ?? []) have.add(row.source_text);
  }
  return have;
}

/** Translate a wave at a time. Never falls back to the source — see below. */
async function translate(texts, deeplLang) {
  const out = [];
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const wave = texts.slice(i, i + CONCURRENCY);
    const done = await Promise.all(
      wave.map(async (t) => {
        try {
          const r = await dl.translateText(t, null, deeplLang, {
            preserveFormatting: true,
            // French defaults to formal (vous) and the others did not; the app
            // is informal everywhere else, so it is set for all of them.
            formality: 'prefer_less',
          });
          return r.text;
        } catch (e) {
          log(`    ! ${String(e).slice(0, 100)}`);
          /*
           * NEVER THE SOURCE. Returning the English text here is the original
           * bug: the caller caches it, a cached row is a hit, and the string is
           * never retried. That made 3,491 rows permanently English.
           */
          return null;
        }
      }),
    );
    out.push(...done);
    log(`    ${Math.min(i + CONCURRENCY, texts.length)}/${texts.length}`);
  }
  return out;
}

/*
 * UPSERT, NOT INSERT.
 *
 * The live app writes the same table while this runs, and somebody visiting an
 * uncached page mid-backfill would collide on
 * `(source_text, target_language)`. An insert fails the whole chunk on one
 * conflict; an upsert writes what it can and moves on.
 */
async function store(rows) {
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await sb
      .from('translation_cache')
      .upsert(rows.slice(i, i + CHUNK), { onConflict: 'source_text,target_language' });
    if (error) throw new Error(`upsert: ${error.message}`);
  }
}

// ── the run ───────────────────────────────────────────────────────────────
const species = await loadSpecies();

/*
 * TRIMMED, BECAUSE THE LOOKUP IS.
 *
 * `checkDatabaseCache` queries `source_text = text.trim()`. A row written with
 * a trailing newline is a row the app can never find — it would be paid for,
 * stored, and silently unreachable, and the page would translate it again on
 * the next visit. No species has untrimmed text today; one edit is all it would
 * take, and the failure is invisible.
 *
 * One entry per distinct string, because two species can share advice.
 */
const strings = [...new Set(
  species
    .flatMap((s) => [s.description, s.advice])
    .filter((t) => t && t.trim())
    .map((t) => t.trim()),
)];

log(`${species.length} species, ${strings.length} distinct strings to translate per language`);
log('');

const plan = ONLY ? ORDER.filter((l) => l.code === ONLY) : ORDER;
let spent = 0;
let wrote = 0;
let completed = 0;

for (const lang of plan) {
  if (completed >= MAX_LANGUAGES) {
    log(`Stopping at ${MAX_LANGUAGES} languages for this run — the rest wait for next month.`);
    break;
  }

  const have = await cachedFor(lang.code, strings);
  const missing = strings.filter((t) => !have.has(t));
  const remaining = missing.reduce((n, t) => n + t.length, 0);

  if (!missing.length) {
    // Already done — by an earlier run or by live traffic. It does not count
    // against this run's allowance, because it cost this run nothing.
    log(`${lang.name.padEnd(11)} complete`);
    continue;
  }

  log(`${lang.name.padEnd(11)} ${missing.length} strings, ${remaining.toLocaleString()} characters remaining`);

  /*
   * SHORTEST FIRST, WITHIN A LANGUAGE.
   *
   * Not to be clever about the budget — it is the same total either way — but
   * because a run that stops mid-language leaves the most PAGES finished. A
   * page needs its description and its advice, and short ones are pages too.
   */
  const queue = [...missing].sort((a, b) => a.length - b.length);

  const take = [];
  let cost = 0;
  for (const t of queue) {
    if (cost + t.length > budget) break;
    take.push(t);
    cost += t.length;
  }

  if (!take.length) {
    log(`            budget exhausted — ${remaining.toLocaleString()} characters still to do here\n`);
    break;
  }

  const finishes = take.length === missing.length;
  log(`            taking ${take.length} strings, ${cost.toLocaleString()} characters${finishes ? ' — completes this language' : ''}`);

  if (!APPLY) {
    budget -= cost;
    spent += cost;
    if (finishes) completed += 1;
    log(`            dry run — nothing translated\n`);
    // A dry run must not claim the next language starts with a full budget.
    if (!finishes) break;
    continue;
  }

  const translated = await translate(take, lang.deepl);
  const rows = [];
  for (let i = 0; i < take.length; i++) {
    if (translated[i] === null) continue; // failed — leave it for the next run
    rows.push({
      source_text: take[i],
      target_language: lang.code,
      translated_text: translated[i],
      // The same value the app writes. Nothing filters on it, but a cache with
      // two names for the same thing is a cache somebody will mis-query later.
      translation_source: 'auto',
      access_count: 1,
      last_accessed_at: new Date().toISOString(),
    });
  }

  await store(rows);
  wrote += rows.length;
  spent += cost;
  budget -= cost;
  if (finishes) completed += 1;
  log(`            wrote ${rows.length}/${take.length}${rows.length < take.length ? ' (the rest failed and will be retried next run)' : ''}\n`);

  /*
   * A language that did not finish means the budget ran out inside it, so
   * there is nothing left for the next one. Stopping here rather than falling
   * through keeps the promise the ordering makes: no language is started until
   * the one before it is done.
   */
  if (!finishes) break;
}

log('');
log(`${APPLY ? 'Spent' : 'Would spend'} ${spent.toLocaleString()} characters`);
if (APPLY) log(`Wrote ${wrote.toLocaleString()} rows`);
log(APPLY ? 'Done.' : 'DRY RUN — nothing written. Re-run with --apply.');
