#!/usr/bin/env tsx

/**
 * Fill the gaps in plant_species translations using Azure AI Translator.
 *
 *   names         plant_species.name_{fr,es,de,it,pt,nl,pl} where empty, translated
 *                 from the English `name` and written straight into the column.
 *   care-guides   each distinct `description` string inside plant_species.care_guides,
 *                 plus the section titles and CareGuideCard's labels,
 *                 stored in translation_cache (source_text = the English string,
 *                 translation_source = 'azure') — the same table autoTranslate reads.
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
const MAX_REQUEST_CHARS = 20_000;
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
if (apply && (!AZURE_KEY || !AZURE_REGION)) {
  console.error('--apply needs AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION in .env.local');
  process.exit(1);
}

// ─── Azure ───────────────────────────────────────────────────────────────

let billed = 0;

async function azureTranslate(texts: string[], lang: Lang): Promise<string[]> {
  const url = `${AZURE_ENDPOINT}/translate?api-version=3.0&from=en&to=${AZURE_CODE[lang]}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY!,
        'Ocp-Apim-Subscription-Region': AZURE_REGION!,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(texts.map((Text) => ({ Text }))),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Azure ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as Array<{ translations: Array<{ text: string }> }>;
    if (body.length !== texts.length) throw new Error('Azure returned a different number of results');
    billed += texts.reduce((n, t) => n + t.length, 0);
    return body.map((b) => b.translations[0].text);
  }
}

/** Translate in requests sized to Azure's limits, preserving order. */
async function translateAll(texts: string[], lang: Lang): Promise<string[]> {
  const out: string[] = [];
  let batch: string[] = [];
  let size = 0;
  const flush = async () => {
    if (batch.length) out.push(...(await azureTranslate(batch, lang)));
    batch = [];
    size = 0;
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

const CARD_UI_STRINGS = ['Care Guide', 'tip', 'tips', 'more care tips available'];

/** Same as formatSectionTitle in CareGuideCard.tsx: "pest_control" -> "Pest Control". */
const formatSectionTitle = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface SpeciesRow {
  slug: string;
  name: string;
  care_guides: Array<{ type?: string; description?: string }> | null;
  [col: string]: unknown;
}

async function loadSpecies(): Promise<SpeciesRow[]> {
  const cols = ['slug', 'name', 'care_guides', ...LANGS.map((l) => `name_${l}`)].join(',');
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

  for (const lang of langs) {
    // Skip anything already cached (DeepL or manual) — those are already paid for.
    const have = new Set<string>();
    for (let i = 0; i < sources.length; i += 20) {
      const chunk = sources.slice(i, i + 20);
      const { data, error } = await supabase
        .from('translation_cache')
        .select('source_text')
        .eq('target_language', lang)
        .in('source_text', chunk);
      if (error) throw error;
      data?.forEach((r) => have.add(r.source_text));
    }
    const todo = sources.filter((t) => !have.has(t));
    const chars = todo.reduce((n, t) => n + t.length, 0);
    console.log(`${lang}: ${have.size} already cached, ${todo.length} to translate, ${chars} chars`);
    plannedChars += chars;
    if (!apply || todo.length === 0) continue;
    guardBudget();

    const translated = await translateAll(todo, lang);
    const now = new Date().toISOString();
    for (let i = 0; i < todo.length; i += 50) {
      const rows = todo.slice(i, i + 50).map((src, j) => ({
        source_text: src,
        target_language: lang,
        translated_text: translated[i + j],
        translation_source: 'azure',
        source_content_hash: hash(src),
        needs_review: false,
        access_count: 0,
        created_at: now,
        last_accessed_at: now,
      })).filter((r) => r.translated_text?.trim());
      const { error } = await supabase
        .from('translation_cache')
        .upsert(rows, { onConflict: 'source_text,target_language', ignoreDuplicates: true });
      if (error) throw error;
    }
    console.log(`   stored ${todo.length}`);
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

  if (doNames) await runNames(species);
  if (doCare) await runCareGuides(species);

  console.log(`\nPlanned this run: ${plannedChars.toLocaleString()} chars${apply ? `; billed by Azure: ${billed.toLocaleString()}` : ''}`);
  if (!apply && plannedChars > maxChars) console.warn(`Over --max-chars (${maxChars.toLocaleString()}) — an --apply run would stop part-way. Use --langs to split it.`);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
