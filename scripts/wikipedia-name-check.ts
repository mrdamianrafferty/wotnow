#!/usr/bin/env tsx

/**
 * Cross-check plant_species.name_<lang> against Wikipedia. READ-ONLY.
 *
 * Wikipedia names species articles by their common name in most languages
 * ("Ajuga reptans" redirects to de "Kriechender Günsel"), so asking
 * <lang>.wikipedia.org for the scientific name gives an independent opinion on what the
 * plant is called. The script reports where that disagrees with the stored name; it never
 * writes to the database.
 *
 * Wikipedia is a hint, not an authority: some languages title species in Latin, and a few
 * article titles carry qualifiers. Read the "DIFFERENT" list; don't apply it blindly.
 *
 * Usage:
 *   npx tsx scripts/wikipedia-name-check.ts                 # German
 *   npx tsx scripts/wikipedia-name-check.ts --lang es
 *   npx tsx scripts/wikipedia-name-check.ts --lang de --csv de-names.csv
 *
 * Env (.env.local): SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const LANGS = ['de', 'es', 'fr', 'it', 'pt', 'nl', 'pl'] as const;
type Lang = (typeof LANGS)[number];

const argv = process.argv.slice(2);
const option = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const lang = (option('lang') ?? 'de') as Lang;
const csvPath = option('csv') ?? `wikipedia-name-check-${lang}.csv`;
if (!LANGS.includes(lang)) throw new Error(`--lang must be one of ${LANGS.join(', ')}`);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

interface Row { slug: string; name: string; scientific_name: string | null; [col: string]: unknown }

/** "Acer ginnala Maxim." -> "Acer ginnala"; "Magnolia × soulangeana" keeps the ×. */
function binomial(sci: string): string | null {
  const m = sci.trim().match(/^([A-Z][a-z]+)\s+(×\s*)?([a-z][a-z-]+)/);
  return m ? `${m[1]} ${m[2] ? '× ' : ''}${m[3]}` : null;
}

/** For comparing names: lower case, no accents, no brackets, first alternative only. */
function key(s: string): string {
  return s.split('/')[0].replace(/\([^)]*\)/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Latin name -> final Wikipedia title (after redirects), or null if there is no article. */
async function wikiTitles(names: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50);
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WotNowNameCheck/1.0 (damian@flyglobalmusic.com)' } });
    if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
    const data = (await res.json()) as {
      query: {
        normalized?: Array<{ from: string; to: string }>;
        redirects?: Array<{ from: string; to: string }>;
        pages: Record<string, { title: string; missing?: string }>;
      };
    };
    const norm = new Map((data.query.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((data.query.redirects ?? []).map((r) => [r.from, r.to]));
    const pages = Object.values(data.query.pages);
    const missing = new Set(pages.filter((p) => p.missing !== undefined).map((p) => p.title));
    for (const name of batch) {
      const normalised = norm.get(name) ?? name;
      const final = redir.get(normalised) ?? normalised;
      out.set(name, missing.has(final) ? null : final);
    }
    await sleep(400); // be polite
  }
  return out;
}

async function main() {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('plant_species').select(`slug, name, scientific_name, name_${lang}`).order('slug').range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }

  const latin = new Map<string, string>(); // slug -> binomial
  for (const r of rows) {
    const b = r.scientific_name ? binomial(r.scientific_name) : null;
    if (b) latin.set(r.slug, b);
  }
  console.log(`${rows.length} species, ${latin.size} with a usable scientific name. Asking ${lang}.wikipedia.org…`);
  const titles = await wikiTitles([...new Set(latin.values())]);

  const report: Array<{ status: string; slug: string; latin: string; stored: string; wiki: string }> = [];
  for (const r of rows) {
    const b = latin.get(r.slug);
    const stored = String(r[`name_${lang}`] ?? '');
    if (!b) { report.push({ status: 'NO_LATIN', slug: r.slug, latin: r.scientific_name ?? '', stored, wiki: '' }); continue; }
    const wiki = titles.get(b);
    let status: string;
    if (!wiki) status = 'NO_ARTICLE';
    else if (key(wiki) === key(b)) status = 'LATIN_TITLE'; // article exists but is titled in Latin
    else if (key(wiki) === key(stored) || key(stored).includes(key(wiki)) || key(wiki).includes(key(stored))) status = 'MATCH';
    else status = 'DIFFERENT';
    report.push({ status, slug: r.slug, latin: b, stored, wiki: wiki ?? '' });
  }

  const count = (s: string) => report.filter((x) => x.status === s).length;
  console.log(`\nMATCH ${count('MATCH')} · DIFFERENT ${count('DIFFERENT')} · LATIN_TITLE ${count('LATIN_TITLE')} · NO_ARTICLE ${count('NO_ARTICLE')} · NO_LATIN ${count('NO_LATIN')}`);
  console.log(`\n── DIFFERENT (stored name vs ${lang}.wikipedia title) ──`);
  for (const x of report.filter((r) => r.status === 'DIFFERENT')) {
    console.log(`${x.slug.padEnd(28)} ${x.stored.padEnd(40)} | ${x.wiki}   (${x.latin})`);
  }

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  fs.writeFileSync(csvPath, ['status,slug,latin,stored,wikipedia', ...report.map((x) => [x.status, x.slug, x.latin, x.stored, x.wiki].map(esc).join(','))].join('\n'));
  console.log(`\nFull report written to ${csvPath}. Nothing was changed in the database.`);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
