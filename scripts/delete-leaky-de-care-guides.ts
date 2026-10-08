#!/usr/bin/env tsx

/**
 * Find (and optionally delete) German care-guide rows in translation_cache that still
 * contain an English plant name outside brackets, so they can be re-translated with
 * `--plant-names`. Only rows written by the Azure script (notes = 'azure-translator',
 * translation_source = 'auto') are considered; reviewed/manual rows are never touched.
 *
 * Dry run by default: prints count and examples. Add --apply to delete.
 *
 *   npx tsx scripts/delete-leaky-de-care-guides.ts
 *   npx tsx scripts/delete-leaky-de-care-guides.ts --apply
 *
 * Then: npx tsx scripts/azure-translate-plant-species.ts --care-guides --langs de --plant-names --apply --max-chars 100000
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const apply = process.argv.includes('--apply');
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const outsideBrackets = (s: string) => s.replace(/\([^)]*\)/g, ' ');

async function main() {
  // English common names that differ from the German name (cognates like "Lavendel" are fine).
  const english: Array<{ en: string; de: string }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('plant_species').select('perenual_common_name, name_de').range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) {
      const en = String(r.perenual_common_name ?? '').trim();
      const de = String(r.name_de ?? '');
      if (en.length >= 4 && !fold(de).includes(fold(en))) english.push({ en, de });
    }
    if (!data || data.length < 1000) break;
  }
  const patterns = [...new Set(english.map((e) => e.en))].map((en) => ({
    en,
    re: new RegExp(`(^|[^\\p{L}])${fold(en).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u'),
  }));

  const leaky: Array<{ id: string; text: string; hit: string }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('translation_cache')
      .select('id, translated_text')
      .eq('target_language', 'de')
      .eq('translation_source', 'auto')
      .eq('notes', 'azure-translator')
      .range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) {
      const text = fold(outsideBrackets(String(r.translated_text ?? '')));
      const hit = patterns.find((p) => p.re.test(text));
      if (hit) leaky.push({ id: String(r.id), text: String(r.translated_text), hit: hit.en });
    }
    if (!data || data.length < 1000) break;
  }

  console.log(`${leaky.length} German Azure rows contain an English plant name outside brackets.`);
  for (const l of leaky.slice(0, 15)) console.log(`  [${l.hit}] ${l.text.slice(0, 110).replace(/\s+/g, ' ')}…`);
  if (!apply) { console.log('\nDry run - nothing deleted. Check the examples, then add --apply.'); return; }

  for (let i = 0; i < leaky.length; i += 100) {
    const ids = leaky.slice(i, i + 100).map((l) => l.id);
    const { error } = await supabase.from('translation_cache').delete().in('id', ids);
    if (error) throw error;
  }
  console.log(`Deleted ${leaky.length} rows.`);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
