#!/usr/bin/env tsx

/**
 * Fill the gaps in plant_species translations using Azure AI Translator.
 *
 *   names         plant_species.name_{fr,es,de,it,pt,nl,pl} where empty, translated
 *                 from the English `name` and written straight into the column.
 *   care-guides   each distinct `description` string inside plant_species.care_guides,
 *                 plus the section titles and CareGuideCard's labels,
 *                 stored in translation_cache (source_text = the English string,
 *                 translation_source = 'auto', notes = 'azure-translator') — the same
 *                 table autoTranslate reads.
 *
 * DRY RUN BY DEFAULT: counts the characters Azure would bill and writes nothing.
 * Pass --apply to translate and write. Existing translations are never overwritten.
 *
 * Usage:
 *   npx tsx scripts/azure-translate-plant-species.ts                    # dry run, both
 *   npx tsx scripts/azure-translate-plant-species.ts --names --apply
 *   npx tsx scripts/azure-translate-plant-species.ts --care-guides --langs it,nl --apply
 *
 * Env (.env.local): SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *   and for --apply: AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_REGION
 *   (optional AZURE_TRANSLATOR_ENDPOINT, default https://api.cognitive.microsofttranslator.com)
 */

import crypto from 'crypto';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const LANGS = ['fr', 'es', 'de', 'it', 'pt', 'nl', 'pl'] as const;
type Lang = (typeof LANGS)[number];

/** Azure's code for each of ours. Portuguese matches the app's DeepL choice (pt-PT). */
const AZURE_CODE: Record<Lang, string> = {
  fr: 'fr', es: 'es', de: 'de', it: 'it', pt: 'pt-pt', nl: 'nl', pl: 'pl',
};

// Azure limits: 1,000 elements and 50,000 characters per request (per target language).
const MAX_ELEMENTS = 100;
const MAX_REQUEST_CHARS = 10_000; // small batches: progress shows and saves often
const DEFAULT_MAX_CHARS = 1_600_000; // names + care guides for all 7 languages is ~1.52M

// ─── Args ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const option = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const apply = flag('apply');
const doNames = flag('names') || !flag('care-guides');
const doCare = flag('care-guides') || !flag('names');
const langs = (option('langs')?.split(',') ?? [...LANGS]).map((l) => l.trim()) as Lang[];
const limit = option('limit') ? Number(option('limit')) : Infinity;
const maxChars = Number(option('max-chars') ?? DEFAULT_MAX_CHARS);
const usePlantNames = flag('plant-names');
const previewCount = Number(option('preview') ?? 0); // translate N descriptions both ways, save nothing
// Azure throttles characters per minute (about 33,300 on paid tiers, from memory — lower it if you see 429s).
const charsPerMinute = Number(option('chars-per-minute') ?? 30_000);

for (const l of langs) {
  if (!LANGS.includes(l)) throw new Error(`Unsupported --langs entry "${l}". Use: ${LANGS.join(',')}`);
}

// ─── Clients ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY;
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION;
const AZURE_ENDPOINT = (process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com').replace(/\/$/, '');
if ((apply || previewCount) && (!AZURE_KEY || !AZURE_REGION)) {
  console.error('--apply and --preview need AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION in .env.local');
  process.exit(1);
}

// ─── Azure ───────────────────────────────────────────────────────────────

let billed = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Stay under Azure's characters-per-minute throttle. A request that would push
 * the last 60 seconds over the limit waits until the oldest sends age out.
 */
const recentSends: Array<{ at: number; chars: number }> = [];
async function pace(chars: number) {
  for (;;) {
    const now = Date.now();
    while (recentSends.length && now - recentSends[0].at > 60_000) recentSends.shift();
    const used = recentSends.reduce((n, s) => n + s.chars, 0);
    if (!recentSends.length || used + chars <= charsPerMinute) break;
    const waitMs = recentSends[0].at + 60_000 - now + 250;
    console.log(`   pacing: waiting ${Math.ceil(waitMs / 1000)}s (Azure limit ~${charsPerMinute} chars/min)`);
    await sleep(waitMs);
  }
  recentSends.push({ at: Date.now(), chars });
}

async function azureTranslate(texts: string[], lang: Lang): Promise<string[]> {
  const url = `${AZURE_ENDPOINT}/translate?api-version=3.0&from=en&to=${AZURE_CODE[lang]}`;
  const chars = texts.reduce((n, t) => n + t.length, 0);
  for (let attempt = 0; ; attempt++) {
    await pace(chars);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    let res: Response | null = null;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_KEY!,
          'Ocp-Apim-Subscription-Region': AZURE_REGION!,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(texts.map((Text) => ({ Text }))),
        signal: controller.signal,
      });
    } catch (err) {
      // Timeout or network error: retry, but not forever.
      if (attempt >= 4) throw new Error(`Azure request failed after ${attempt + 1} tries: ${err instanceof Error ? err.message : err}`);
      console.log(`   request failed (${err instanceof Error ? err.name : 'error'}), retrying in ${2 ** attempt * 5}s`);
      await sleep(2 ** attempt * 5000);
      continue;
    } finally {
      clearTimeout(timer);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitS = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt * 5;
      console.log(`   Azure ${res.status}: ${(await res.text()).slice(0, 120)} — retrying in ${waitS}s`);
      await sleep(waitS * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`Azure ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as Array<{ translations: Array<{ text: string }> }>;
    if (body.length !== texts.length) throw new Error('Azure returned a different number of results');
    billed += chars;
    return body.map((b) => b.translations[0].text);
  }
}

/**
 * Translate in requests sized to Azure's limits, preserving order. `onBatch`
 * receives each batch as soon as it comes back, so callers can save it straight
 * away: a stall or crash then loses one batch, not the whole language.
 */
async function translateAll(
  texts: string[],
  lang: Lang,
  onBatch?: (src: string[], out: string[]) => Promise<void>,
): Promise<string[]> {
  const out: string[] = [];
  let batch: string[] = [];
  let size = 0;
  let sent = 0;
  const flush = async () => {
    if (!batch.length) return;
    const translated = await azureTranslate(batch, lang);
    out.push(...translated);
    sent += batch.length;
    if (onBatch) await onBatch(batch, translated);
    console.log(`   ${lang}: ${sent}/${texts.length} strings done (${billed.toLocaleString()} chars billed so far)`);
    batch = [];
    size = 0;
    guardBudget(); // stop part-way if --max-chars is passed; what was saved stays saved
  };
  for (const t of texts) {
    if (batch.length && (batch.length >= MAX_ELEMENTS || size + t.length > MAX_REQUEST_CHARS)) await flush();
    batch.push(t);
    size += t.length;
  }
  await flush();
  return out;
}

// ─── Data ────────────────────────────────────────────────────────────────

const CARD_UI_STRINGS = ['Care Guide', 'care tip', 'care tips', 'more care tips available'];

/** Same as formatSectionTitle in CareGuideCard.tsx: "pest_control" -> "Pest Control". */
const formatSectionTitle = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface SpeciesRow {
  slug: string;
  name: string;
  care_guides: Array<{ type?: string; description?: string }> | null;
  [col: string]: unknown;
}

async function loadSpecies(): Promise<SpeciesRow[]> {
  const cols = [
    'slug', 'name', 'care_guides', 'perenual_common_name', 'perenual_other_names', 'name_en_aliases',
    ...LANGS.map((l) => `name_${l}`),
  ].join(',');
  const rows: SpeciesRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('plant_species').select(cols).order('slug').range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as SpeciesRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

const isBlank = (v: unknown) => typeof v !== 'string' || v.trim() === '';
const hash = (t: string) => crypto.createHash('sha256').update(t.trim()).digest('hex').substring(0, 16);

// ─── Plant-name pass ─────────────────────────────────────────────────────
//
// Care-guide prose names the plant in English ("willow bell", "Bay Laurel"), and
// Azure sometimes translates the words instead of the plant ("willow bell" came
// back as "salgueiro", "bay laurel" as "loureiro-do-louro"). With --plant-names we
// wrap those phrases in Azure's dynamic-dictionary markup, which tells it exactly
// what to write: the species' reviewed name_<lang> from plant_species.

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const stripParen = (s: string) => s.replace(/\s*\([^)]*\)/g, '').trim();
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** English phrases the care-guide text may use for this plant, longest first. */
function englishNamesFor(row: SpeciesRow): string[] {
  const raw: unknown[] = [
    row.perenual_common_name, row.name,
    ...asArray(row.perenual_other_names), ...asArray(row.name_en_aliases),
  ];
  const out = new Set<string>();
  for (const r of raw) {
    if (typeof r !== 'string') continue;
    for (const part of r.split('/')) {
      const p = stripParen(part);
      if (p.length >= 4) out.add(p);
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}

/** The species' name in `lang`, first alternative only: "Anona / cherimoia" -> "Anona". */
function localNameFor(row: SpeciesRow, lang: Lang): string | null {
  const v = row[`name_${lang}`];
  if (typeof v !== 'string') return null;
  return stripParen(v.split('/')[0]) || null;
}

/**
 * Insert the name in lower case (German nouns and Latin binomials excepted). We can't
 * know whether Azure will put an article before it ("La búgula…"), so capitals at the
 * start of sentences are restored afterwards by restoreSentenceCase.
 */
function adjustCase(local: string, lang: Lang): string {
  if (lang === 'de') return local;
  if (/^[A-Z][a-z]+ [a-z]+$/.test(local)) return local; // Latin binomial
  return local[0].toLowerCase() + local.slice(1);
}

/** Capitalise the first letter of the text, of each paragraph and after . ! ? */
function restoreSentenceCase(t: string): string {
  return t.replace(/(^|[.!?]\s+|\n\s*)(\p{Ll})/gu, (_, lead: string, c: string) => lead + c.toUpperCase());
}

function protectNames(text: string, row: SpeciesRow | undefined, lang: Lang): string {
  if (!row) return text;
  const local = localNameFor(row, lang);
  if (!local) return text;
  const names = englishNamesFor(row).filter((n) => n.toLowerCase() !== local.toLowerCase());
  if (!names.length) return text;
  const re = new RegExp(`\\b(${names.map(escRe).join('|')})\\b`, 'gi');
  return text.replace(
    re,
    (m) => `<mstrans:dictionary translation="${escAttr(adjustCase(local, lang))}">${m}</mstrans:dictionary>`,
  );
}

/** Which species a care-guide description belongs to (first one wins if shared). */
function ownersByDescription(species: SpeciesRow[]): Map<string, SpeciesRow> {
  const m = new Map<string, SpeciesRow>();
  for (const s of species) {
    for (const g of Array.isArray(s.care_guides) ? s.care_guides : []) {
      const d = g.description?.trim();
      if (d && !m.has(d)) m.set(d, s);
    }
  }
  return m;
}

/** Translate a few descriptions both ways and print them side by side. Writes nothing. */
async function runPreview(species: SpeciesRow[]) {
  const lang = langs[0];
  const owners = ownersByDescription(species);
  const picks = [...owners.entries()]
    .filter(([d, row]) => protectNames(d, row, lang) !== d)
    .slice(0, previewCount);
  console.log(`\n── Preview (${lang}): ${picks.length} descriptions, plain vs plant-name pass ──`);
  const plain = await azureTranslate(picks.map(([d]) => d), lang);
  const named = (await azureTranslate(picks.map(([d, row]) => protectNames(d, row, lang)), lang)).map(restoreSentenceCase);
  picks.forEach(([d], i) => {
    console.log(`\n[${picks[i][1].slug}]`);
    console.log(`  EN:    ${d.slice(0, 220)}${d.length > 220 ? '…' : ''}`);
    console.log(`  PLAIN: ${plain[i].slice(0, 220)}${plain[i].length > 220 ? '…' : ''}`);
    console.log(`  NAMED: ${named[i].slice(0, 220)}${named[i].length > 220 ? '…' : ''}`);
    if (/mstrans|<\/?\w+:/.test(named[i])) console.log('  !! markup left in output');
  });
  console.log(`\nBilled for this preview: ${billed.toLocaleString()} chars. Nothing was saved.`);
}

// ─── Names ───────────────────────────────────────────────────────────────

async function runNames(species: SpeciesRow[]) {
  console.log('\n── Names ──');
  for (const lang of langs) {
    const todo = species.filter((s) => isBlank(s[`name_${lang}`]) && !isBlank(s.name)).slice(0, limit);
    const chars = todo.reduce((n, s) => n + s.name.trim().length, 0);
    console.log(`${lang}: ${todo.length} missing, ${chars} chars`);
    plannedChars += chars;
    if (!apply || todo.length === 0) continue;
    guardBudget();

    const translated = await translateAll(todo.map((s) => s.name.trim()), lang);
    let written = 0;
    let passthrough = 0;
    for (let i = 0; i < todo.length; i++) {
      const value = translated[i].trim();
      if (!value) continue;
      if (value.toLowerCase() === todo[i].name.trim().toLowerCase()) passthrough++;
      // Only fill a column that is still empty — never clobber a human edit.
      const { data, error } = await supabase
        .from('plant_species')
        .update({ [`name_${lang}`]: value })
        .eq('slug', todo[i].slug)
        .or(`name_${lang}.is.null,name_${lang}.eq.`)
        .select('slug');
      if (error) throw error;
      written += data?.length ?? 0;
    }
    console.log(`   wrote ${written}; ${passthrough} came back identical to English (review these)`);
  }
}

// ─── Care guides ─────────────────────────────────────────────────────────

async function runCareGuides(species: SpeciesRow[]) {
  console.log('\n── Care guides ──');
  const guides = species.flatMap((s) => (Array.isArray(s.care_guides) ? s.care_guides : []));
  const sources = [...new Set([
    // What components/grow/CareGuideCard.tsx looks up: its labels, the section
    // titles (formatSectionTitle) and the descriptions. Keep in step with it.
    ...CARD_UI_STRINGS,
    ...guides.map((g) => (g.type ? formatSectionTitle(g.type) : '')),
    ...guides.map((g) => g.description?.trim() ?? ''),
  ].filter(Boolean))].slice(0, limit);
  console.log(`${sources.length} distinct strings, ${sources.reduce((n, t) => n + t.length, 0)} chars per language`);
  const owners = ownersByDescription(species);

  for (const lang of langs) {
    // Skip anything already cached (DeepL or manual) — those are already paid for.
    const have = new Set<string>();
    // Page through this language's cache rows instead of an .in() filter: forty
    // care-guide paragraphs make a request URL too long and fetch fails outright.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('translation_cache')
        .select('source_text')
        .eq('target_language', lang)
        .order('id')
        .range(from, from + 999);
      if (error) throw error;
      data?.forEach((r) => have.add(r.source_text.trim()));
      if (!data || data.length < 1000) break;
    }
    const todo = sources.filter((t) => !have.has(t));
    // With --plant-names, what Azure receives differs from what we store under:
    // `todo` stays the English key, `prepared` is the text sent (with name markup).
    const prepared = usePlantNames ? todo.map((t) => protectNames(t, owners.get(t), lang)) : todo;
    const chars = prepared.reduce((n, t) => n + t.length, 0);
    const tagged = prepared.filter((p, i) => p !== todo[i]).length;
    console.log(
      `${lang}: ${sources.length - todo.length} already cached, ${todo.length} to translate, ${chars} chars` +
      (usePlantNames ? ` (${tagged} with plant-name markup, +${chars - todo.reduce((n, t) => n + t.length, 0)} chars)` : ''),
    );
    plannedChars += chars;
    if (!apply || todo.length === 0) continue;
    guardBudget();

    let stored = 0;
    let offset = 0;
    await translateAll(prepared, lang, async (sentBatch, out) => {
      const src = todo.slice(offset, offset + sentBatch.length);
      offset += sentBatch.length;
      const now = new Date().toISOString();
      const rows = src.map((s, j) => ({
        source_text: s,
        target_language: lang,
        translated_text: usePlantNames ? restoreSentenceCase(out[j]) : out[j],
        // The table's CHECK only allows auto/reviewed/manual, so Azure rows are
        // 'auto' like DeepL's, and `notes` records where they came from.
        translation_source: 'auto',
        notes: 'azure-translator',
        source_content_hash: hash(s),
        needs_review: false,
        access_count: 0,
        created_at: now,
        last_accessed_at: now,
      })).filter((r) => r.translated_text?.trim());
      const { error } = await supabase
        .from('translation_cache')
        .upsert(rows, { onConflict: 'source_text,target_language', ignoreDuplicates: true });
      if (error) throw error;
      stored += rows.length;
    });
    console.log(`   stored ${stored} ${lang} rows`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────

let plannedChars = 0;

function guardBudget() {
  if (billed > maxChars) throw new Error(`Billed ${billed} chars, over --max-chars ${maxChars}. Stopping.`);
}

async function main() {
  console.log(apply ? 'APPLY mode — Azure will be called and the database written.' : 'DRY RUN — nothing is translated or written. Add --apply to run for real.');
  const species = await loadSpecies();
  console.log(`Loaded ${species.length} species; languages: ${langs.join(', ')}`);

  if (previewCount) {
    await runPreview(species);
    return;
  }
  if (doNames) await runNames(species);
  if (doCare) await runCareGuides(species);

  console.log(`\nPlanned this run: ${plannedChars.toLocaleString()} chars${apply ? `; billed by Azure: ${billed.toLocaleString()}` : ''}`);
  if (!apply && plannedChars > maxChars) console.warn(`Over --max-chars (${maxChars.toLocaleString()}) — an --apply run would stop part-way. Use --langs to split it.`);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
