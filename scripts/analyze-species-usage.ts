#!/usr/bin/env npx tsx
/**
 * Analyze species usage patterns to find aliases based on actual catch data.
 * This checks:
 * 1. Species with aliases in their JSON column
 * 2. Different species_codes that might refer to the same fish based on similar names
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

async function analyzeUsage() {
  console.log('🔍 Analyzing species usage patterns...\n');

  // Check 1: Species with aliases in their JSON column
  console.log('1️⃣  Checking aliases JSON column:\n');

  const { data: speciesWithAliases, error: aliasError } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name, aliases')
    .not('aliases', 'is', null);

  if (aliasError) {
    console.error('Error fetching species with aliases:', aliasError);
  } else if (speciesWithAliases && speciesWithAliases.length > 0) {
    console.log(`Found ${speciesWithAliases.length} species with aliases stored:\n`);
    for (const sp of speciesWithAliases) {
      console.log(`  ${sp.species_code} (${sp.name_en})`);
      console.log(`    Scientific: ${sp.scientific_name}`);
      console.log(`    Aliases: ${JSON.stringify(sp.aliases)}\n`);
    }
  } else {
    console.log('  ✅ No species have aliases in JSON column\n');
  }

  // Check 2: Find species with similar names that might be duplicates
  console.log('\n2️⃣  Checking for similar species names:\n');

  const { data: allSpecies, error: speciesError } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name')
    .order('name_en', { ascending: true });

  if (speciesError) {
    console.error('Error fetching all species:', speciesError);
  } else if (allSpecies && allSpecies.length > 0) {
    // Group by normalized name (lowercase, trimmed)
    const nameGroups = new Map<string, typeof allSpecies>();

    for (const sp of allSpecies) {
      const normalizedName = sp.name_en.toLowerCase().trim();
      const existing = nameGroups.get(normalizedName) || [];
      existing.push(sp);
      nameGroups.set(normalizedName, existing);
    }

    // Find groups with multiple species codes
    const duplicates = Array.from(nameGroups.entries())
      .filter(([_, species]) => species.length > 1);

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} groups with multiple species codes:\n`);
      for (const [name, species] of duplicates) {
        console.log(`  "${name}"`);
        for (const sp of species) {
          console.log(`    - ${sp.species_code} (${sp.scientific_name})`);
        }
        console.log('');
      }
    } else {
      console.log('  ✅ No duplicate common names found\n');
    }
  }

  // Check 3: Most used species codes in catch logs
  console.log('\n3️⃣  Analyzing catch log usage:\n');

  const { data: catchUsage, error: catchError } = await supabase
    .from('findr_catch_entries')
    .select('species_id')
    .not('species_id', 'is', null);

  if (catchError) {
    console.error('Error fetching catch entries:', catchError);
  } else if (catchUsage && catchUsage.length > 0) {
    // Count usage by species_id
    const usageCount = new Map<string, number>();
    for (const entry of catchUsage) {
      const count = usageCount.get(entry.species_id) || 0;
      usageCount.set(entry.species_id, count + 1);
    }

    // Get species details for used codes
    const usedCodes = Array.from(usageCount.keys());
    const { data: usedSpecies } = await supabase
      .from('species')
      .select('species_code, name_en, scientific_name')
      .in('species_code', usedCodes);

    const speciesMap = new Map(
      (usedSpecies || []).map(sp => [sp.species_code, sp])
    );

    // Sort by usage
    const sorted = Array.from(usageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20

    console.log('Top 20 species by catch frequency:\n');
    for (const [code, count] of sorted) {
      const species = speciesMap.get(code);
      if (species) {
        console.log(`  ${code} - ${species.name_en} (${count} catches)`);
      } else {
        console.log(`  ${code} - ⚠️  NOT FOUND IN SPECIES TABLE (${count} catches)`);
      }
    }
  } else {
    console.log('  No catch entries found\n');
  }
}

analyzeUsage().catch(console.error);
