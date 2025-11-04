#!/usr/bin/env tsx
/**
 * Export Species for Translation
 *
 * Creates CSV files for all species needing translations in each language.
 * Prioritizes by existing translation coverage.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.cli') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SpeciesRow {
  species_code: string;
  name_en: string;
  scientific_name: string | null;
  name_fr: string | null;
  name_es: string | null;
  name_de: string | null;
  name_it: string | null;
  name_pt: string | null;
  biogeographic_regions: string[] | null;
  data_source_regions: string[] | null;
}

function needsTranslation(species: SpeciesRow): {
  fr: boolean;
  es: boolean;
  de: boolean;
  it: boolean;
  pt: boolean;
} {
  const nameEn = species.name_en?.trim().toLowerCase();

  return {
    fr: !species.name_fr || species.name_fr.trim().toLowerCase() === nameEn,
    es: !species.name_es || species.name_es.trim().toLowerCase() === nameEn,
    de: !species.name_de || species.name_de.trim().toLowerCase() === nameEn,
    it: !species.name_it || species.name_it.trim().toLowerCase() === nameEn,
    pt: !species.name_pt || species.name_pt.trim().toLowerCase() === nameEn,
  };
}

async function exportSpeciesForTranslation() {
  console.log('📝 Exporting Species for Translation\n');

  // Get all species
  const { data, error } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name, name_fr, name_es, name_de, name_it, name_pt, biogeographic_regions, data_source_regions')
    .order('name_en');

  if (error) {
    console.error('❌ Error fetching species:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ No species found');
    process.exit(1);
  }

  console.log(`✅ Found ${data.length} total species\n`);

  // Categorize by translation needs
  const needingTranslations: {
    [lang: string]: SpeciesRow[];
  } = {
    fr: [],
    es: [],
    de: [],
    it: [],
    pt: [],
  };

  for (const species of data) {
    const needs = needsTranslation(species);

    if (needs.fr) needingTranslations.fr.push(species);
    if (needs.es) needingTranslations.es.push(species);
    if (needs.de) needingTranslations.de.push(species);
    if (needs.it) needingTranslations.it.push(species);
    if (needs.pt) needingTranslations.pt.push(species);
  }

  // Find species needing ALL translations (highest priority)
  const needingAll = data.filter(s => {
    const needs = needsTranslation(s);
    return needs.fr && needs.es && needs.de && needs.it && needs.pt;
  });

  console.log('📊 Translation Needs Summary:\n');
  console.log(`  French:     ${needingTranslations.fr.length} species`);
  console.log(`  Spanish:    ${needingTranslations.es.length} species`);
  console.log(`  German:     ${needingTranslations.de.length} species`);
  console.log(`  Italian:    ${needingTranslations.it.length} species`);
  console.log(`  Portuguese: ${needingTranslations.pt.length} species`);
  console.log(`\n  ⚠️  HIGH PRIORITY: ${needingAll.length} species need ALL 5 translations\n`);

  // Generate CSV for high priority species (need all translations)
  console.log('📝 Generating CSV files...\n');

  let csv = 'English Name,Scientific Name,Species Code,Regions,French,Spanish,German,Italian,Portuguese\n';

  for (const species of needingAll) {
    const regions = [...(species.biogeographic_regions || []), ...(species.data_source_regions || [])]
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .join('; ');

    csv += `"${species.name_en}","${species.scientific_name || ''}","${species.species_code}","${regions}","","","","",""\n`;
  }

  const csvPath = path.join(process.cwd(), 'data/translations-needed-high-priority.csv');
  fs.writeFileSync(csvPath, csv);
  console.log(`✅ Created: data/translations-needed-high-priority.csv`);
  console.log(`   ${needingAll.length} species ready for translation\n`);

  // Generate separate files by language
  const langNames = {
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
  };

  for (const [lang, species] of Object.entries(needingTranslations)) {
    const langName = langNames[lang as keyof typeof langNames];

    let langCsv = `English Name,Scientific Name,Species Code,Regions,${langName} Name\n`;

    for (const s of species) {
      const regions = [...(s.biogeographic_regions || []), ...(s.data_source_regions || [])]
        .filter((v, i, a) => a.indexOf(v) === i) // unique
        .join('; ');

      langCsv += `"${s.name_en}","${s.scientific_name || ''}","${s.species_code}","${regions}",""\n`;
    }

    const langCsvPath = path.join(process.cwd(), `data/translations-needed-${lang}.csv`);
    fs.writeFileSync(langCsvPath, langCsv);
    console.log(`✅ Created: data/translations-needed-${lang}.csv (${species.length} species)`);
  }

  // Show sample of high priority species
  console.log('\n\n📋 Sample High Priority Species (need all 5 translations):\n');
  needingAll.slice(0, 25).forEach((s, i) => {
    const regions = [...(s.biogeographic_regions || []), ...(s.data_source_regions || [])]
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .slice(0, 2)
      .join(', ') || 'N/A';

    console.log(`${(i + 1).toString().padStart(2)}. ${s.name_en.padEnd(35)} ${s.scientific_name || ''}`);
  });

  if (needingAll.length > 25) {
    console.log(`    ... and ${needingAll.length - 25} more`);
  }

  console.log('\n✅ Export complete! CSV files ready in data/ folder.\n');
  console.log('💡 Next steps:');
  console.log('   1. Use data/translations-needed-high-priority.csv for species needing all languages');
  console.log('   2. Use language-specific CSVs for targeted translation work');
  console.log('   3. Fill in translations and use import script to update database\n');
}

exportSpeciesForTranslation()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  });
