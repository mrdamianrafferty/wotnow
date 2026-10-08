#!/usr/bin/env tsx

/**
 * Apply the approved plant-name corrections found by wikipedia-name-check.ts.
 *
 * Dry run by default: prints slug, language, old -> new and writes nothing.
 * Add --apply to write. Each update is guarded on the old value being read in this
 * run, so a name changed by someone else in the meantime is skipped, not overwritten.
 * Case follows the existing value (capitalised if the stored name is capitalised).
 *
 * Usage:
 *   npx tsx scripts/apply-wikipedia-name-corrections.ts                 # dry run, all languages
 *   npx tsx scripts/apply-wikipedia-name-corrections.ts --lang de --apply
 *
 * Env (.env.local): SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

type Lang = 'de' | 'es' | 'fr' | 'it' | 'pt' | 'nl' | 'pl';

const CORRECTIONS: Record<Lang, Record<string, string>> = {
  de: {
    'wild-garlic': 'Bärlauch', 'kidney-vetch': 'Echter Wundklee', 'service-tree': 'Speierling',
    'american-alder': 'Gelb-Birke', 'black-eyed-susan': 'Sonnenhut (Staude)', 'lambs-lettuce': 'Feldsalat',
    'salad-burnet': 'Kleiner Wiesenknopf', 'bluebell': 'Atlantisches Hasenglöckchen',
    'akebia': 'Fingerblättrige Akebie', 'alchemilla-mollis': 'Weicher Frauenmantel', 'mangetout': 'Zuckererbse',
    'runner-bean': 'Feuerbohne', 'salsify': 'Haferwurzel', 'yellow-dock': 'Krauser Ampfer',
    'tulip-poplar': 'Tulpenbaum', 'paperbark-maple': 'Zimt-Ahorn', 'mimosa': 'Silber-Akazie',
    'midland-hawthorn': 'Zweigriffeliger Weißdorn', 'golden-rain': 'Blasenesche', 'anise-hyssop': 'Anis-Duftnessel',
    'autumn-olive': 'Korallen-Ölweide', 'bergenia': 'Bergenie', 'cider-gum': 'Mostgummi-Eukalyptus',
    'dogwood-red-stem': 'Tatarischer Hartriegel', 'indigo-bush': 'Bastardindigo', 'burr-oak': 'Großfrüchtige Eiche',
  },
  fr: {
    'american-alder': 'Bouleau jaune', 'raspberry': 'Framboisier', 'gooseberry': 'Groseillier à maquereau',
    'blackberry': 'Ronce commune', 'runner-bean': "Haricot d'Espagne", 'hardy-kiwi': 'Kiwaï',
    'silverberry': 'Chalef argenté', 'siberian-pea-tree': 'Caraganier de Sibérie',
    'snow-in-summer': 'Céraiste cotonneux', 'willow-coppice': 'Saule des vanniers',
    'alchemilla-mollis': 'Alchémille molle', 'black-acacia': 'Acacia à bois noir', 'burr-oak': 'Chêne à gros fruits',
  },
  es: {
    // Wikipedia/Wikidata checked
    'american-alder': 'Abedul amarillo', 'burr-oak': 'Roble bur', 'hackberry': 'Almez americano',
    'swede': 'Rutabaga / nabo sueco', 'wild-garlic': 'Ajo de oso', 'willow-coppice': 'Mimbrera (sauce mimbre)',
    'cider-gum': 'Eucalipto de Gunn', 'chinese-silver-grass': 'Miscanthus chino', 'blackberry': 'Zarzamora',
    'italian-ryegrass': 'Ballico italiano (raigrás italiano)', 'lupin-yellow': 'Altramuz amarillo',
    'ash-manna': 'Fresno de flor', 'midland-hawthorn': 'Espino navarro', 'sweet-clover': 'Meliloto',
  },
  it: {
    'lambs-lettuce': 'Valerianella (songino)', 'black-walnut': 'Noce nero', 'wild-garlic': 'Aglio orsino',
    'snapdragon': 'Bocca di leone', 'blackberry': 'Rovo comune', 'runner-bean': 'Fagiolo di Spagna',
    'indigo-bush': 'Amorfa (falso indaco)', 'ash-manna': 'Frassino da manna', 'willow-coppice': 'Salice da vimini',
  },
  pt: {
    'lupin-yellow': 'Tremoço-amarelo', 'snapdragon': 'Boca-de-leão', 'mandarin': 'Tangerineira',
    'sweet-woodruff': 'Aspérula-odorífera',
    // Wikidata checked
    'black-walnut': 'Nogueira-preta', 'runner-bean': 'Feijão-da-Espanha', 'sycamore': 'Falso-plátano',
    'wild-strawberry': 'Morangueiro-silvestre', 'gooseberry': 'Groselheira-espinhosa',
    'tulip-poplar': 'Tulipeiro-da-Virgínia', 'tulip-tree': 'Tulipeiro-da-Virgínia',
    'privet-common': 'Alfeneiro-comum', 'rowan': 'Tramazeira / sorveira-dos-passarinhos', 'dwarf-rowan': 'Tramazeira-anã',
  },
  nl: {
    'bluebell': 'Wilde hyacint', 'alchemilla-mollis': 'Fraaie vrouwenmantel', 'blueberry': 'Blauwe bosbes',
    'catmint': 'Kattenkruid (Nepeta)', 'creeping-jenny': 'Penningkruid', 'dawn-redwood': 'Watercipres',
    'lambs-lettuce': 'Veldsla', 'lodgepole-pine': 'Draaiden', 'midland-hawthorn': 'Tweestijlige meidoorn',
    'raspberry': 'Framboos', 'runner-bean': 'Pronkboon', 'scarlet-runner-bean': 'Pronkboon',
    'southernwood': 'Citroenkruid', 'sweet-chestnut': 'Tamme kastanje', 'wild-garlic': 'Daslook',
    'californian-poppy': 'Slaapmutsje', 'cider-gum': 'Cidergomboom',
  },
  pl: {
    'alchemilla-mollis': 'Przywrotnik miękki', 'american-alder': 'Brzoza żółta', 'bleeding-heart': 'Serduszka okazałe',
    'burr-oak': 'Dąb wielkoowocowy', 'californian-poppy': 'Pozłotka kalifornijska', 'chayote': 'Kolczoch jadalny',
    'feverfew': 'Wrotycz maruna', 'fig': 'Figowiec pospolity', 'giant-redwood': 'Mamutowiec olbrzymi',
    'golden-rain': 'Roztrzeplin wiechowaty', 'gooseberry': 'Agrest', 'gotu-kola': 'Wąkrotka azjatycka',
    'hackberry': 'Wiązowiec zachodni', 'lambs-lettuce': 'Roszpunka warzywna', 'loquat': 'Nieśplik japoński',
    'medlar': 'Nieszpułka zwyczajna', 'pawpaw': 'Asymina trójklapowa', 'runner-bean': 'Fasola wielokwiatowa',
    'sorrel': 'Szczaw zwyczajny', 'southernwood': 'Bylica boże drzewko', 'walnut': 'Orzech włoski',
    'wild-garlic': 'Czosnek niedźwiedzi', 'willow-coppice': 'Wierzba wiciowa', 'zinnia': 'Cynia wytworna',
  },
};

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const langIdx = argv.indexOf('--lang');
const only = langIdx >= 0 ? argv[langIdx + 1] : undefined;
const langs = (Object.keys(CORRECTIONS) as Lang[]).filter((l) => !only || l === only);
if (only && langs.length === 0) throw new Error(`--lang must be one of ${Object.keys(CORRECTIONS).join(', ')}`);

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

/** Match the case convention of the value being replaced. */
function matchCase(oldValue: string, next: string): string {
  const first = oldValue.trim().charAt(0);
  const capitalised = first !== first.toLowerCase();
  const head = next.charAt(0);
  return (capitalised ? head.toUpperCase() : head.toLowerCase()) + next.slice(1);
}

async function main() {
  console.log(apply ? 'APPLYING changes.\n' : 'DRY RUN - nothing is written. Add --apply to write.\n');
  for (const lang of langs) {
    const col = `name_${lang}`;
    const slugs = Object.keys(CORRECTIONS[lang]);
    const { data, error } = await supabase.from('plant_species').select(`slug, ${col}`).in('slug', slugs);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Array<Record<string, string | null>>;
    const bySlug = new Map(rows.map((r) => [String(r.slug), r[col] ?? '']));
    let changed = 0;
    console.log(`── ${lang} ──`);
    for (const slug of slugs) {
      if (!bySlug.has(slug)) { console.log(`  !! ${slug}: no such slug`); continue; }
      const old = bySlug.get(slug) ?? '';
      const next = lang === 'de' ? CORRECTIONS[lang][slug] : matchCase(old, CORRECTIONS[lang][slug]);
      if (old === next) { console.log(`  = ${slug}: already "${next}"`); continue; }
      console.log(`  ${slug.padEnd(22)} ${old}  ->  ${next}`);
      if (!apply) continue;
      const { data: done, error: upErr } = await supabase
        .from('plant_species')
        .update({ [col]: next })
        .eq('slug', slug)
        .eq(col, old)
        .select('slug');
      if (upErr) throw upErr;
      if (done && done.length === 1) changed++;
      else console.log(`  !! ${slug}: value changed since it was read - skipped`);
    }
    if (apply) console.log(`  ${changed} row(s) updated`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
