#!/usr/bin/env tsx
/**
 * Check Localized Species Names
 *
 * Examines which species have proper localized names vs English fallbacks
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

async function checkLocalizedNames() {
  console.log('🌍 Checking Localized Species Names\n');

  // Get all species with localized names
  const { data, error } = await supabase
    .from('species')
    .select('name_en, name_fr, name_es, name_de, name_it, name_pt')
    .order('name_en');

  if (error) {
    console.error('❌ Error fetching species:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ No species found');
    process.exit(1);
  }

  console.log(`✅ Found ${data.length} species in database\n`);

  // Analyze each language
  const languages = [
    { code: 'fr', name: 'French', field: 'name_fr' as const },
    { code: 'es', name: 'Spanish', field: 'name_es' as const },
    { code: 'de', name: 'German', field: 'name_de' as const },
    { code: 'it', name: 'Italian', field: 'name_it' as const },
    { code: 'pt', name: 'Portuguese', field: 'name_pt' as const },
  ];

  for (const lang of languages) {
    console.log(`\n📊 ${lang.name} (${lang.code.toUpperCase()}):\n`);

    const withTranslation = data.filter(s => s[lang.field] && s[lang.field] !== s.name_en);
    const withEnglishFallback = data.filter(s => s[lang.field] === s.name_en);
    const withNull = data.filter(s => !s[lang.field] || s[lang.field] === null);

    console.log(`  ✅ Properly translated: ${withTranslation.length} (${Math.round(withTranslation.length / data.length * 100)}%)`);
    console.log(`  ⚠️  Using English fallback: ${withEnglishFallback.length} (${Math.round(withEnglishFallback.length / data.length * 100)}%)`);
    console.log(`  ❌ Null/Missing: ${withNull.length} (${Math.round(withNull.length / data.length * 100)}%)`);

    // Show examples of proper translations
    if (withTranslation.length > 0) {
      console.log(`\n  Examples of proper ${lang.name} translations:`);
      withTranslation.slice(0, 5).forEach(s => {
        console.log(`    • ${s.name_en} → ${s[lang.field]}`);
      });
    }

    // Show examples of English fallbacks
    if (withEnglishFallback.length > 0) {
      console.log(`\n  Examples using English fallback:`);
      withEnglishFallback.slice(0, 5).forEach(s => {
        console.log(`    • ${s.name_en} (same as English)`);
      });
    }
  }

  // Find species that are missing ALL translations
  console.log(`\n\n❌ Species with NO translations (all languages show English):\n`);
  const noTranslations = data.filter(s =>
    (!s.name_fr || s.name_fr === s.name_en) &&
    (!s.name_es || s.name_es === s.name_en) &&
    (!s.name_de || s.name_de === s.name_en) &&
    (!s.name_it || s.name_it === s.name_en) &&
    (!s.name_pt || s.name_pt === s.name_en)
  );

  console.log(`  Total: ${noTranslations.length} species (${Math.round(noTranslations.length / data.length * 100)}%)`);
  if (noTranslations.length > 0) {
    console.log(`\n  Examples:`);
    noTranslations.slice(0, 10).forEach(s => {
      console.log(`    • ${s.name_en}`);
    });
    if (noTranslations.length > 10) {
      console.log(`    ... and ${noTranslations.length - 10} more`);
    }
  }

  console.log('\n✅ Analysis complete\n');
}

checkLocalizedNames()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });
