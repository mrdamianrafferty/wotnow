#!/usr/bin/env tsx
/**
 * Fix Edibility Ratings - Re-import from Legacy Source
 *
 * Root cause: Database eating_quality values (2-5) don't match legacy 1-10 scale
 * Solution: Re-import correct 1-10 ratings from speciesAdviceData.json
 *
 * This script:
 * 1. Loads legacy advice data with correct 1-10 edibility ratings
 * 2. Matches species by normalized name
 * 3. Updates database eating_quality with correct values
 * 4. Reports changes and coverage
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';
import rawSpeciesAdvice from '../data/speciesAdviceData.json';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.cli') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SpeciesAdviceContextData {
  edibility: number | null;
  [key: string]: unknown;
}

interface RawSpeciesAdviceEntry {
  name: string;
  normalized: string;
  contexts: {
    shore?: SpeciesAdviceContextData;
    boat?: SpeciesAdviceContextData;
  };
}

function normalizeName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fixEdibilityRatings(dryRun = true) {
  console.log('🔧 Fixing Edibility Ratings from Legacy Source\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to database\n');
  } else {
    console.log('⚠️  LIVE MODE - Database will be updated\n');
  }

  // Get all species from database
  const { data: speciesData, error: fetchError } = await supabase
    .from('species')
    .select('id, name_en, scientific_name, eating_quality')
    .order('name_en');

  if (fetchError) {
    console.error('❌ Error fetching species:', fetchError);
    process.exit(1);
  }

  if (!speciesData || speciesData.length === 0) {
    console.error('❌ No species found');
    process.exit(1);
  }

  console.log(`✅ Found ${speciesData.length} species in database\n`);

  // Create lookup map from legacy data
  const legacyEdibilityMap = new Map<string, number>();

  (rawSpeciesAdvice as RawSpeciesAdviceEntry[]).forEach(entry => {
    const normalized = normalizeName(entry.normalized || entry.name);

    // Get edibility from shore or boat context (prefer shore, fall back to boat)
    const edibility = entry.contexts.shore?.edibility ?? entry.contexts.boat?.edibility;

    if (edibility !== null && edibility !== undefined) {
      legacyEdibilityMap.set(normalized, edibility);
    }
  });

  console.log(`📚 Loaded ${legacyEdibilityMap.size} edibility ratings from legacy data\n`);

  // Track changes
  const changes: Array<{
    name: string;
    oldValue: number;
    newValue: number;
    normalized: string;
  }> = [];

  const noMatch: Array<{ name: string; normalized: string }> = [];
  const noChange: Array<{ name: string; value: number }> = [];

  // Process each species
  for (const species of speciesData) {
    const normalized = normalizeName(species.name_en);
    const legacyRating = legacyEdibilityMap.get(normalized);

    if (legacyRating === undefined) {
      noMatch.push({ name: species.name_en, normalized });
      continue;
    }

    const currentRating = species.eating_quality ?? 0;

    if (currentRating === legacyRating) {
      noChange.push({ name: species.name_en, value: currentRating });
      continue;
    }

    changes.push({
      name: species.name_en,
      oldValue: currentRating,
      newValue: legacyRating,
      normalized,
    });

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('species')
        .update({ eating_quality: legacyRating })
        .eq('id', species.id);

      if (updateError) {
        console.error(`❌ Error updating ${species.name_en}:`, updateError);
      }
    }
  }

  // Report results
  console.log('📊 RESULTS:\n');

  console.log(`✅ Species with matching ratings: ${noChange.length}`);
  console.log(`🔄 Species needing updates: ${changes.length}`);
  console.log(`❓ Species with no legacy data: ${noMatch.length}\n`);

  if (changes.length > 0) {
    console.log('🔄 CHANGES TO BE APPLIED:\n');

    // Sort by biggest change
    changes.sort((a, b) => Math.abs(b.newValue - b.oldValue) - Math.abs(a.newValue - a.oldValue));

    changes.slice(0, 20).forEach(change => {
      const diff = change.newValue - change.oldValue;
      const arrow = diff > 0 ? '↑' : '↓';
      console.log(
        `  ${change.name.padEnd(30)} ${change.oldValue}/10 → ${change.newValue}/10 ${arrow} ${Math.abs(diff).toFixed(1)}`
      );
    });

    if (changes.length > 20) {
      console.log(`  ... and ${changes.length - 20} more\n`);
    }
  }

  if (noMatch.length > 0) {
    console.log('\n❓ Species without legacy data (will keep current values):\n');
    noMatch.slice(0, 10).forEach(item => {
      console.log(`  - ${item.name} (${item.normalized})`);
    });
    if (noMatch.length > 10) {
      console.log(`  ... and ${noMatch.length - 10} more\n`);
    }
  }

  // Statistics on new distribution
  if (changes.length > 0) {
    const newDistribution: Record<number, number> = {};

    for (const species of speciesData) {
      const normalized = normalizeName(species.name_en);
      const finalRating = legacyEdibilityMap.get(normalized) ?? species.eating_quality ?? 0;
      const rounded = Math.round(finalRating);
      newDistribution[rounded] = (newDistribution[rounded] || 0) + 1;
    }

    console.log('\n📊 New Distribution After Fix:\n');
    for (let i = 1; i <= 10; i++) {
      const count = newDistribution[i] || 0;
      const bar = '█'.repeat(Math.ceil(count / 5));
      const pct = Math.round((count / speciesData.length) * 100);
      console.log(`  ${i}/10: ${bar} ${count} species (${pct}%)`);
    }
  }

  if (dryRun) {
    console.log('\n💡 Run with --live flag to apply these changes to the database');
  } else {
    console.log('\n✅ Database updated successfully!');
  }
}

// Parse command line args
const isLive = process.argv.includes('--live');

fixEdibilityRatings(!isLive)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });
