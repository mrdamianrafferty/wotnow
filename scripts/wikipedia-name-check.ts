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
 * Noise it already removes from the printed list (everything is still in the CSV):
 *   - spelling/hyphen/space/accent-only differences ("Atlaszeder" vs "Atlas-Zeder")
 *   - one Wikipedia title shared by 3+ of our species (a crop group: every cabbage-type is
 *     "Gemüsekohl", every lettuce "Gartensalat"); our more specific names are right
 *
 * Usage:
 *   npx tsx scripts/wikipedia-name-check.ts                  # German
 *   npx tsx scripts/wikipedia-name-check.ts --lang es
 *   npx tsx scripts/wikipedia-name-check.ts --lang all       # every language, one CSV
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
const langArg = option('lang') ?? 'de';
const langs: Lang[] = langArg === 'all' ? [...LANGS] : [langArg as Lang];
const csvPath = option('csv') ?? (langArg === 'all' ? 'wikipedia-name-check.csv' : `wikipedia-name-check-${langArg}.csv`);
for (const l of langs) if (!LANGS.includes(l)) throw new Error(`--lang must be "all" or one of ${LANGS.join(', ')}`);

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

/** For comparing names: lower case, no accents, no brackets, first alternative, letters and digits only. */
function key(s: string): string {
  return s.split('/')[0].replace(/\([^)]*\)/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Latin name -> final Wikipedia title (after redirects), or null if there is no article. */
async function wikiTitles(lang: Lang, names: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50);
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WotNowNameCheck/1.0 (damian@flyglobalmusic.com)' } });
    if (!res.ok) throw new Error(`${lang}.wikipedia.org answered ${res.status}`);
    const data = (await res.json()) as {
      query: {
        normalized?: Array<{ from: string; to: string }>;
        redirects?: Array<{ from: string; to: string }>;
        pages: Record<string, { title: string; missing?: string }>;
      };
    };
    const norm = new Map((data.query.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((data.query.redirects ?? []).map((r) => [r.from, r.to]));
    const missing = new Set(Object.values(data.query.pages).filter((p) => p.missing !== undefined).map((p) => p.title));
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
      .from('plant_species')
      .select(`slug, name, scientific_name, ${LANGS.map((l) => `name_${l}`).join(', ')}`)
      .order('slug')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }

  const latin = new Map<string, string>(); // slug -> binomial
  for (const r of rows) {
    const b = r.scientific_name ? binomial(r.scientific_name) : null;
    if (b) latin.set(r.slug, b);
  }
  console.log(`${rows.length} species, ${latin.size} with a usable scientific name.`);

  const csv: string[] = ['lang,status,slug,latin,stored,wikipedia'];
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

  for (const lang of langs) {
    console.log(`\n════════ ${lang.toUpperCase()} — asking ${lang}.wikipedia.org… ════════`);
    const titles = await wikiTitles(lang, [...new Set(latin.values())]);

    // How many of our species share each Wikipedia title (crop groups: Gemüsekohl, Gartensalat…)
    const shared = new Map<string, number>();
    for (const r of rows) {
      const w = titles.get(latin.get(r.slug) ?? '');
      if (w) shared.set(key(w), (shared.get(key(w)) ?? 0) + 1);
    }

    const report: Array<{ status: string; slug: string; latin: string; stored: string; wiki: string }> = [];
    for (const r of rows) {
      const b = latin.get(r.slug);
      const stored = String(r[`name_${lang}`] ?? '');
      if (!b) { report.push({ status: 'NO_LATIN', slug: r.slug, latin: r.scientific_name ?? '', stored, wiki: '' }); continue; }
      const wiki = titles.get(b);
      const ks = key(stored);
      const kw = wiki ? key(wiki) : '';
      let status: string;
      if (!wiki) status = 'NO_ARTICLE';
      else if (kw === key(b)) status = 'LATIN_TITLE'; // article exists but is titled in Latin
      else if (ks && kw && (ks === kw || ks.includes(kw) || kw.includes(ks))) status = 'MATCH';
      else if ((shared.get(kw) ?? 0) >= 3) status = 'GROUP'; // one title for several of our crops
      else status = 'DIFFERENT';
      report.push({ status, slug: r.slug, latin: b, stored, wiki: wiki ?? '' });
    }

    const count = (s: string) => report.filter((x) => x.status === s).length;
    console.log(`MATCH ${count('MATCH')} · DIFFERENT ${count('DIFFERENT')} · GROUP ${count('GROUP')} · LATIN_TITLE ${count('LATIN_TITLE')} · NO_ARTICLE ${count('NO_ARTICLE')} · NO_LATIN ${count('NO_LATIN')}`);
    console.log(`── ${lang}: stored name vs wikipedia title (DIFFERENT only) ──`);
    for (const x of report.filter((r) => r.status === 'DIFFERENT')) {
      console.log(`${x.slug.padEnd(26)} ${x.stored.padEnd(36)} | ${x.wiki}   (${x.latin})`);
    }
    for (const x of report) csv.push([lang, x.status, x.slug, x.latin, x.stored, x.wiki].map(esc).join(','));
  }

  fs.writeFileSync(csvPath, csv.join('\n'));
  console.log(`\nFull report (every row, every status) written to ${csvPath}. Nothing was changed in the database.`);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
