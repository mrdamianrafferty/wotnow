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
let budget = ASSUMED
  ? numericFlag('assume-budget', 0)
  : Math.max(0, limit - used - RESERVE);

log(`DeepL quota   ${used.toLocaleString()} / ${limit.toLocaleString()} used`);
log(`reserve       ${RESERVE.toLocaleString()} held back for the live app`);
log(`budget        ${budget.toLocaleString()} characters`);
log('');

if (budget <= 0) {
  log('No quota available. Nothing to do — exiting cleanly so a schedule can retry.');
  log('Free resets on the 1st of the billing month; DeepL Pro removes the cliff.');
  process.exit(0);
}

/** Translate with the informal register, in small waves. Returns null per item on failure. */
async function translate(texts, lang) {
  const out = [];
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const wave = texts.slice(i, i + CONCURRENCY);
    const done = await Promise.all(
      wave.map(async (t) => {
        try {
          const r = await dl.translateText(t, null, lang, {
            preserveFormatting: true,
            formality: 'prefer_less',
          });
          return r.text;
        } catch (e) {
          log(`  ! ${String(e).slice(0, 90)}`);
          return null; // never fall back to the source — that is the original bug
        }
      })
    );
    out.push(...done);
    log(`  ${Math.min(i + CONCURRENCY, texts.length)}/${texts.length}`);
  }
  return out;
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

  const next = await translate(rows.map((r) => r.text_en), 'fr');
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
  const todo = purged
    .filter((r) => !present.has(`${r.target_language} ${r.source_text.trim()}`))
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
    const next = await translate(rows.map((r) => r.source_text), lang);
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
      if (e) log(`    upsert failed: ${e.message}`);
      else written += Math.min(200, good.length - i);
    }
  }
  log(`  refilled ${written} rows · ${todo.length - affordable.length} left for the next run\n`);
}

if (JOB === 'french' || JOB === 'both') await jobFrench();
if (JOB === 'cache' || JOB === 'both') await jobCache();
log(APPLY ? 'Done.' : 'DRY RUN — nothing written. Re-run with --apply.');
