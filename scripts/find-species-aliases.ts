#!/usr/bin/env npx tsx
/**
 * Find species aliases by grouping species with the same scientific name.
 * Scientific names are the canonical identifier - multiple species codes
 * with the same scientific name indicate aliases that need cleanup.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface SpeciesRow {
  species_code: string;
  name_en: string;
  scientific_name: string;
  created_at: string;
}

async function findAliases() {
  console.log('🔍 Finding species aliases...\n');

  // Get all species with their scientific names
  const { data: species, error } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name, created_at')
    .not('scientific_name', 'is', null)
    .order('scientific_name', { ascending: true });

  if (error) {
    console.error('Error fetching species:', error);
    process.exit(1);
  }

  if (!species || species.length === 0) {
    console.log('No species found');
    return;
  }

  // Group by scientific name
  const grouped = new Map<string, SpeciesRow[]>();
  for (const sp of species as SpeciesRow[]) {
    const existing = grouped.get(sp.scientific_name) || [];
    existing.push(sp);
    grouped.set(sp.scientific_name, existing);
  }

  // Find duplicates (aliases)
  const aliases: Array<{ scientificName: string; species: SpeciesRow[] }> = [];
  for (const [scientificName, speciesList] of grouped.entries()) {
    if (speciesList.length > 1) {
      aliases.push({ scientificName, species: speciesList });
    }
  }

  if (aliases.length === 0) {
    console.log('✅ No aliases found - all species have unique scientific names');
    return;
  }

  console.log(`Found ${aliases.length} scientific names with multiple species codes:\n`);

  // Display aliases grouped by scientific name
  for (const { scientificName, species } of aliases) {
    console.log(`\n📚 Scientific Name: ${scientificName}`);
    console.log(`   Aliases (${species.length} codes):`);

    // Sort by created_at to identify the original
    const sorted = species.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sorted.forEach((sp, idx) => {
      const isOriginal = idx === 0 ? ' ⭐ CANONICAL (oldest)' : '';
      const createdDate = new Date(sp.created_at).toISOString().split('T')[0];
      console.log(`   ${idx + 1}. ${sp.species_code} - "${sp.name_en}" (created: ${createdDate})${isOriginal}`);
    });
  }

  console.log('\n\n📊 Summary:');
  console.log(`Total scientific names with aliases: ${aliases.length}`);
  console.log(`Total alias codes to resolve: ${aliases.reduce((sum, a) => sum + (a.species.length - 1), 0)}`);

  console.log('\n\n💡 Recommended approach:');
  console.log('1. Use the oldest species code (marked ⭐) as the canonical version');
  console.log('2. Update all catch entries to use canonical codes');
  console.log('3. Update prediction data to use canonical codes');
  console.log('4. Mark alias codes as deprecated or remove them');
}

findAliases().catch(console.error);
