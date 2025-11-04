#!/usr/bin/env tsx
/**
 * Identify European Species for Translation Priority
 *
 * Finds species that are commonly found in European waters and need translations.
 * Prioritizes species by their presence in European ICES rectangles.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';

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
  common_regions: string[] | null;
}

// European countries/regions that indicate European waters
const EUROPEAN_REGIONS = [
  'uk', 'ireland', 'france', 'spain', 'portugal', 'italy',
  'germany', 'netherlands', 'belgium', 'denmark', 'norway',
  'sweden', 'iceland', 'greece', 'mediterranean', 'atlantic',
  'north sea', 'baltic', 'bay of biscay', 'english channel',
  'celtic sea', 'adriatic', 'aegean', 'black sea'
];

function hasEuropeanPresence(regions: string[] | null): boolean {
  if (!regions || regions.length === 0) return false;

  const regionStr = regions.join(' ').toLowerCase();
  return EUROPEAN_REGIONS.some(euro => regionStr.includes(euro));
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

async function identifyEuropeanSpecies() {
  console.log('🇪🇺 Identifying European Species for Translation\n');

  // Get all species with region data
  const { data, error } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name, name_fr, name_es, name_de, name_it, name_pt, common_regions')
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

  // Filter to European species
  const europeanSpecies = data.filter(s => hasEuropeanPresence(s.common_regions));

  console.log(`🌊 European species: ${europeanSpecies.length} (${Math.round(europeanSpecies.length / data.length * 100)}%)\n`);

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

  for (const species of europeanSpecies) {
    const needs = needsTranslation(species);

    if (needs.fr) needingTranslations.fr.push(species);
    if (needs.es) needingTranslations.es.push(species);
    if (needs.de) needingTranslations.de.push(species);
    if (needs.it) needingTranslations.it.push(species);
    if (needs.pt) needingTranslations.pt.push(species);
  }

  // Report by language
  console.log('📊 Translation Needs by Language:\n');

  for (const [lang, species] of Object.entries(needingTranslations)) {
    const langName = {
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
    }[lang];

    console.log(`${langName} (${lang.toUpperCase()}): ${species.length} species need translation`);
  }

  // Find species needing ALL translations (highest priority)
  const needingAll = europeanSpecies.filter(s => {
    const needs = needsTranslation(s);
    return needs.fr && needs.es && needs.de && needs.it && needs.pt;
  });

  console.log(`\n⚠️  HIGH PRIORITY: ${needingAll.length} species need ALL 5 translations\n`);

  // Generate export files for translators
  console.log('📝 Generating CSV files for translators...\n');

  // CSV for high priority species (need all translations)
  let csv = 'English Name,Scientific Name,Regions,French,Spanish,German,Italian,Portuguese\n';

  for (const species of needingAll) {
    const regions = species.common_regions?.join('; ') || '';
    csv += `"${species.name_en}","${species.scientific_name || ''}","${regions}","","","","",""\n`;
  }

  const fs = require('fs');
  const csvPath = path.join(process.cwd(), 'data/translations-needed-high-priority.csv');
  fs.writeFileSync(csvPath, csv);
  console.log(`✅ Created: ${csvPath}`);
  console.log(`   ${needingAll.length} species ready for translation\n`);

  // Generate separate files by language for easier sourcing
  for (const [lang, species] of Object.entries(needingTranslations)) {
    const langName = {
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
    }[lang];

    let langCsv = `English Name,Scientific Name,Regions,${langName} Name\n`;

    for (const s of species) {
      const regions = s.common_regions?.join('; ') || '';
      langCsv += `"${s.name_en}","${s.scientific_name || ''}","${regions}",""\n`;
    }

    const langCsvPath = path.join(process.cwd(), `data/translations-needed-${lang}.csv`);
    fs.writeFileSync(langCsvPath, langCsv);
    console.log(`✅ Created: data/translations-needed-${lang}.csv (${species.length} species)`);
  }

  // Show sample of high priority species
  console.log('\n\n📋 Sample High Priority Species (need all translations):\n');
  needingAll.slice(0, 20).forEach((s, i) => {
    const regions = s.common_regions?.slice(0, 2).join(', ') || 'Unknown';
    console.log(`${(i + 1).toString().padStart(2)}. ${s.name_en.padEnd(35)} (${s.scientific_name || 'N/A'})`);
    console.log(`    Regions: ${regions}`);
  });

  if (needingAll.length > 20) {
    console.log(`    ... and ${needingAll.length - 20} more\n`);
  }

  console.log('\n✅ Analysis complete! CSV files ready for translators.\n');
}

identifyEuropeanSpecies()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });
