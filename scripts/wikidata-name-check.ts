#!/usr/bin/env tsx

/**
 * Cross-check plant_species.name_<lang> against Wikidata. READ-ONLY.
 *
 * Wikipedia titles many es/it/pt species in Latin, so it gives no opinion there. Wikidata
 * stores a label plus aliases per language for each taxon (looked up by scientific name,
 * property P225), which often carries the common name.
 *
 * Statuses: MATCH (our name is the label or an alias), DIFFERENT (Wikidata has a common
 * name that is not ours), LATIN_ONLY (label is just the Latin name), NO_ENTRY.
 * Only DIFFERENT is printed; everything goes to wikidata-name-check.csv.
 *
 * Usage:
 *   npx tsx scripts/wikidata-name-check.ts                 # es, it, pt
 *   npx tsx scripts/wikidata-name-check.ts --lang nl,pl
 *
 * Env (.env.local): SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const ALL = ['de', 'es', 'fr', 'it', 'pt', 'nl', 'pl'];
const argv = process.argv.slice(2);
const li = argv.indexOf('--lang');
const langs = (li >= 0 ? argv[li + 1] : 'es,it,pt').split(',');
for (const l of langs) if (!ALL.includes(l)) throw new Error(`--lang must be a comma list of ${ALL.join(', ')}`);

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const norm = (s: string) =>
  s.split('/')[0].replace(/\([^)]*\)/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function binomial(sci: string): string | null {
  const m = sci.trim().match(/^([A-Z][a-z]+)\s+(×\s*)?([a-z][a-z-]+)/);
  return m ? `${m[1]} ${m[2] ? '× ' : ''}${m[3]}` : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Entry { label: string; aliases: string[] }

/** binomial -> { label, aliases } in `lang` (first matching item wins). */
async function wikidata(lang: string, names: string[]): Promise<Map<string, Entry>> {
  const out = new Map<string, Entry>();
  for (let i = 0; i < names.length; i += 40) {
    const batch = names.slice(i, i + 40);
    const values = batch.map((n) => `"${n.replace(/"/g, '')}"`).join(' ');
    const query = `SELECT ?sci ?label (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases) WHERE {
      VALUES ?sci { ${values} }
      ?item wdt:P225 ?sci .
      OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label) = "${lang}") }
      OPTIONAL { ?item skos:altLabel ?alias FILTER(LANG(?alias) = "${lang}") }
    } GROUP BY ?sci ?label`;
    let res: Response | undefined;
    for (let attempt = 1; attempt <= 5; attempt++) {
      res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'WotNowNameCheck/1.0 (damian@flyglobalmusic.com)', Accept: 'application/sparql-results+json' },
      });
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) break;
      await sleep(attempt * 5000); // Wikidata sheds load now and then; wait and retry
    }
    if (!res || !res.ok) throw new Error(`Wikidata answered ${res?.status}`);
    const data = (await res.json()) as { results: { bindings: Array<Record<string, { value: string }>> } };
    for (const b of data.results.bindings) {
      const sci = b.sci.value;
      const entry: Entry = { label: b.label?.value ?? '', aliases: (b.aliases?.value ?? '').split('|').filter(Boolean) };
      const prev = out.get(sci);
      if (!prev || (!prev.label && entry.label)) out.set(sci, entry);
    }
    await sleep(1000);
  }
  return out;
}

async function main() {
  const rows: Array<Record<string, string | null>> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('plant_species')
      .select(`slug, scientific_name, ${ALL.map((l) => `name_${l}`).join(', ')}`)
      .order('slug')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as Array<Record<string, string | null>>));
    if (!data || data.length < 1000) break;
  }
  const latin = new Map<string, string>();
  for (const r of rows) {
    const b = r.scientific_name ? binomial(r.scientific_name) : null;
    if (b) latin.set(String(r.slug), b);
  }
  const csv = ['lang,status,slug,latin,stored,wikidata_label,wikidata_aliases'];
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

  for (const lang of langs) {
    console.log(`\n════════ ${lang.toUpperCase()} — asking Wikidata… ════════`);
    const found = await wikidata(lang, [...new Set(latin.values())]);
    const tally: Record<string, number> = {};
    const different: string[] = [];
    for (const r of rows) {
      const slug = String(r.slug);
      const b = latin.get(slug);
      if (!b) continue;
      const stored = String(r[`name_${lang}`] ?? '');
      const e = found.get(b);
      let status: string;
      if (!e) status = 'NO_ENTRY';
      else if (!e.label && e.aliases.length === 0) status = 'NO_ENTRY';
      else {
        const names = [e.label, ...e.aliases].filter(Boolean);
        const real = names.filter((n) => norm(n) !== norm(b));
        const ks = norm(stored);
        if (real.length === 0) status = 'LATIN_ONLY';
        else if (ks && real.some((n) => norm(n) === ks || norm(n).includes(ks) || ks.includes(norm(n)))) status = 'MATCH';
        else status = 'DIFFERENT';
      }
      tally[status] = (tally[status] ?? 0) + 1;
      if (status === 'DIFFERENT' && e) {
        different.push(`${slug.padEnd(26)} ${stored.padEnd(34)} | ${[e.label, ...e.aliases].filter(Boolean).join(' / ')}   (${b})`);
      }
      csv.push([lang, status, slug, b, stored, e?.label ?? '', (e?.aliases ?? []).join(' | ')].map(esc).join(','));
    }
    console.log(Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(' · '));
    console.log(`── ${lang}: stored name vs Wikidata (DIFFERENT only) ──`);
    for (const line of different) console.log(line);
  }
  fs.writeFileSync('wikidata-name-check.csv', csv.join('\n'));
  console.log('\nFull report written to wikidata-name-check.csv. Nothing was changed in the database.');
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
