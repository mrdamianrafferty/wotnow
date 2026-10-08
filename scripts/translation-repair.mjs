/**
 * Translation repair — quota-aware, resumable, safe to run on a schedule.
 *
 * Background. The DeepL key is on the Free plan (500k characters/month). When
 * the quota ran out mid-month, translateWithDeepL caught the error and returned
 * the ENGLISH SOURCE, and the caller cached that as the translation. A cached
 * failure is permanent, because the next lookup is a hit and the string is never
 * retried. 3,491 rows — 55-64% of every language — were English by 5 Sep 2026.
 * lib/translation/autoTranslate.ts no longer caches failures; those rows were
 * purged (backup in scripts/backups/).
 *
 * This script finishes the repair. It does two jobs, in this order:
 *
 *   1. FRENCH REGISTER. French was formal in 140 of 140 strings (vous), while
 *      German and Spanish were informal (du / tu). Nobody chose that — DeepL
 *      defaults to formal for French. Re-translates with formality=prefer_less.
 *   2. CACHE REFILL — OFF BY DEFAULT. Proactively re-translates the purged
 *      strings, shortest first. This is a pre-fill, and Grow Daisy plant
 *      descriptions are deliberately NOT pre-filled: they are already translated
 *      on demand in pages/grow/[lang]/species/[slug].tsx, and a cache miss now
 *      self-heals rather than poisoning the row. Run it only to warm strings you
 *      know people read: --job=cache, or --job=both.
 *
 * SHARES THE LIVE APP'S BUDGET. The DeepL key is shared with Grewp, Rise Daisy and
 * Findr, and this app ranks last of the five, so the live app stops at 40% of the
 * account and 50,000 characters a month (lib/translation/deepl-budget.ts). This
 * script used to size itself from "everything left in the account minus a 25,000
 * reserve", so one run could spend what the other apps were relying on. It now
 * plans against the smaller of that and the shared budget, reserves each job's
 * characters in the shared ledger before sending them, and settles to what DeepL
 * billed. Run with `npx tsx` or Node >= 22.18 (it loads the TypeScript budget module).
 *
 * It checks the quota BEFORE spending any of it and exits 0 when there is none,
 * so a daily schedule no-ops harmlessly until the plan is upgraded or the
 * billing month rolls over, then completes itself.
 *
 *   node --env-file=.env.local scripts/translation-repair.mjs             # dry run, French only
 *   node --env-file=.env.local scripts/translation-repair.mjs --apply     # French only
 *   node --env-file=.env.local scripts/translation-repair.mjs --apply --job=cache
 *   node --env-file=.env.local scripts/translation-repair.mjs --apply --reserve=50000
 */
import fs from 'node:fs';
import path from 'node:path';
import * as deepl from 'deepl-node';
import { createClient } from '@supabase/supabase-js';
import {
  budgetSnapshot, describeBudget, reserve, settle, translateWaves, stashUnsaved,
} from './lib/budgeted-deepl.mjs';

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes('--apply');

/** Read a numeric flag, refusing anything that is not a real number. NaN would
 *  otherwise flow into the budget, and every `NaN <= 0` / `cost > NaN` guard
 *  below silently evaluates false — so a typo like --reserve=abc would sail
 *  past the quota check and start calling DeepL. */
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
// Default is FRENCH ONLY. The cache refill (job 2) is a pre-fill, and Grow Daisy
// plant descriptions are deliberately translated when called instead — they are
// already on-demand via getServerSideProps in pages/grow/[lang]/species/[slug].tsx,
// and the cache now self-heals on a miss. Opt in with --job=cache or --job=both
// only to warm strings you know people read.
const JOB = (ARGS.find((a) => a.startsWith('--job=')) || '--job=french').split('=')[1];
const VALID_JOBS = ['french', 'cache', 'both'];
if (!VALID_JOBS.includes(JOB)) {
  console.error(`--job must be one of: ${VALID_JOBS.join(', ')} (got "${JOB}")`);
  process.exit(1);
}
// Characters to leave unspent for the live app, so a repair run never starves it.
const RESERVE = numericFlag('reserve', 25000);
const CONCURRENCY = 5;

const FORMAL = /\b(vous|votre|vos)\b/i;
const BACKUP_DIR = 'scripts/backups';

// Fail loudly and early rather than deep inside a DeepL or PostgREST error.
const REQUIRED_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DEEPL_API_KEY'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing environment variables: ${missingEnv.join(', ')}`);
  console.error('Run with: node --env-file=.env.local scripts/translation-repair.mjs');
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dl = new deepl.Translator(process.env.DEEPL_API_KEY);

const log = (...a) => console.log(...a);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// ── budget ────────────────────────────────────────────────────────────────
const usage = await dl.getUsage();
const used = usage.character?.count ?? 0;
const limit = usage.character?.limit ?? 0;
// --assume-budget exists to exercise the selection and costing logic while the
// real quota is exhausted. It is refused with --apply so it can never spend.
const ASSUMED = ARGS.find((a) => a.startsWith('--assume-budget='));
if (ASSUMED && APPLY) {
  console.error('--assume-budget is a dry-run aid and cannot be combined with --apply.');
  process.exit(1);
}
// The shared budget (app cap + account ceiling) binds whenever it is smaller. If it
// cannot be read, that is "spend nothing", never "spend freely".
const shared = await budgetSnapshot(dl);
let budget = ASSUMED
  ? numericFlag('assume-budget', 0)
  : Math.min(Math.max(0, limit - used - RESERVE), shared.room ?? 0);

log(`DeepL quota   ${used.toLocaleString()} / ${limit.toLocaleString()} used`);
log(`reserve       ${RESERVE.toLocaleString()} held back for the live app`);
describeBudget(shared, log);
log(`budget        ${budget.toLocaleString()} characters`);
log('');

if (budget <= 0) {
  log(shared.room === null
    ? 'The shared DeepL budget could not be read, so nothing is spent. Try again shortly.'
    : 'No quota available. Nothing to do — exiting cleanly so a schedule can retry.');
  log('Free resets on the 1st of the billing month; DeepL Pro removes the cliff.');
  process.exit(0);
}

/**
 * Translate with the informal register, in small waves. Returns the text per item,
 * or null on failure (never the source: that is the original bug). `billed` is
 * summed separately so the caller can settle the reservation to what DeepL charged.
 */
async function translate(texts, lang) {
  const results = await translateWaves(dl, texts, lang, { concurrency: CONCURRENCY, log: (...a) => log(' ', ...a) });
  return {
    texts: results.map((r) => (r ? r.text : null)),
    billed: results.reduce((n, r) => n + (r ? r.billed : 0), 0),
  };
}

// ══ JOB 1 · French register ═══════════════════════════════════════════════
async function jobFrench() {
  log('── Job 1 · French register (vous to tu) ──');
  const { data, error } = await sb
    .from('ui_text_strings')
    .select('id, text_key, page, text_en, text_fr')
    .not('text_fr', 'is', null);
  if (error) throw error;

  const rows = data.filter((r) => FORMAL.test(r.text_fr));
  const cost = rows.reduce((n, r) => n + r.text_en.length, 0);
  log(`  ${rows.length} formal rows · ${cost.toLocaleString()} characters`);
  if (!rows.length) return log('  nothing to do\n');
  if (cost > budget) return log(`  SKIPPED — needs ${cost.toLocaleString()}, budget ${budget.toLocaleString()}\n`);
  if (!APPLY) return log('  dry run — not translating\n');

  const reservation = await reserve(dl, 'fr', cost);
  if (!reservation.ok) return log(`  SKIPPED — the shared budget refused ${cost.toLocaleString()} characters (${reservation.reason})\n`);
  const done = await translate(rows.map((r) => r.text_en), 'fr');
  await settle(reservation, 'fr', done.billed);
  const next = done.texts;
  budget -= cost;

  const changed = rows
    .map((r, i) => ({ ...r, new_fr: next[i] }))
    .filter((r) => r.new_fr && r.new_fr.trim() !== r.text_fr.trim());

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const bak = path.join(BACKUP_DIR, `ui_text_strings-fr-${stamp()}.json`);
  fs.writeFileSync(
    bak,
    JSON.stringify(
      changed.map(({ id, text_key, page, text_en, text_fr, new_fr }) => ({
        id, text_key, page, text_en, old_fr: text_fr, new_fr,
      })),
      null,
      2
    )
  );

  let n = 0;
  for (const r of changed) {
    const { error: e } = await sb.from('ui_text_strings').update({ text_fr: r.new_fr }).eq('id', r.id);
    if (e) log(`  FAILED ${r.text_key}: ${e.message}`);
    else n++;
  }
  const stillFormal = changed.filter((r) => FORMAL.test(r.new_fr)).length;
  log(`  updated ${n} · still formal ${stillFormal} · backup ${bak}\n`);
}

// ══ JOB 2 · cache refill ══════════════════════════════════════════════════
async function jobCache() {
  log('── Job 2 · cache refill ──');
  const backups = fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('translation_cache-passthrough-')).sort()
    : [];
  if (!backups.length) return log('  no passthrough backup found — nothing to refill\n');

  const purged = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, backups.at(-1)), 'utf8'));

  // Resumable: skip anything already back in the cache.
  const present = new Set();
  for (let from = 0; ; from += 1000) {
    // .order() is required: PostgREST pagination without an explicit sort has
    // undefined ordering, so pages can repeat or skip rows — which would make
    // this job think strings are missing and re-translate them.
    const { data, error } = await sb
      .from('translation_cache')
      .select('source_text, target_language')
      .order('source_text', { ascending: true })
      .order('target_language', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    data.forEach((r) => present.add(`${r.target_language} ${r.source_text.trim()}`));
    if (data.length < 1000) break;
  }

  // Shortest first — most rows repaired per character of quota.
  // One entry per (language, string): a duplicate in the backup would be billed twice.
  const seen = new Set();
  const todo = purged
    .filter((r) => {
      const key = `${r.target_language} ${r.source_text.trim()}`;
      if (present.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.source_text.length - b.source_text.length);

  const affordable = [];
  let spend = 0;
  for (const r of todo) {
    if (spend + r.source_text.length > budget) break;
    affordable.push(r);
    spend += r.source_text.length;
  }

  log(`  ${todo.length} still missing · ${affordable.length} affordable this run · ${spend.toLocaleString()} characters`);
  if (!APPLY) return log('  dry run — not translating\n');
  if (!affordable.length) return log('  nothing affordable\n');

  const byLang = affordable.reduce((m, r) => ((m[r.target_language] ??= []).push(r), m), {});
  let written = 0;
  for (const [lang, rows] of Object.entries(byLang)) {
    log(`  ${lang} · ${rows.length}`);
    const chars = rows.reduce((n, r) => n + r.source_text.length, 0);
    const reservation = await reserve(dl, lang, chars);
    if (!reservation.ok) {
      log(`    shared budget refused ${chars.toLocaleString()} characters (${reservation.reason}) — skipping ${lang}`);
      continue;
    }
    const done = await translate(rows.map((r) => r.source_text), lang);
    await settle(reservation, lang, done.billed);
    const next = done.texts;
    const good = rows
      .map((r, i) => ({ r, t: next[i] }))
      .filter(({ r, t }) => t && t.trim() !== r.source_text.trim());
    for (let i = 0; i < good.length; i += 200) {
      const { error: e } = await sb.from('translation_cache').upsert(
        good.slice(i, i + 200).map(({ r, t }) => ({
          source_text: r.source_text.trim(),
          target_language: lang,
          translated_text: t,
          translation_source: 'auto',
          access_count: 1,
          created_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        })),
        { onConflict: 'source_text,target_language' }
      );
      if (e) {
        // Paid for and not stored. Keep them: re-running would buy them again.
        const lost = good.slice(i, i + 200).map(({ r, t }) => ({ source_text: r.source_text.trim(), target_language: lang, translated_text: t }));
        const file = stashUnsaved(lost, `repair-${lang}`);
        log(`    upsert failed: ${e.message} — ${lost.length} paid translations saved to ${file}`);
      } else written += Math.min(200, good.length - i);
    }
  }
  log(`  refilled ${written} rows · ${todo.length - affordable.length} left for the next run\n`);
}

if (JOB === 'french' || JOB === 'both') await jobFrench();
if (JOB === 'cache' || JOB === 'both') await jobCache();
log(APPLY ? 'Done.' : 'DRY RUN — nothing written. Re-run with --apply.');
