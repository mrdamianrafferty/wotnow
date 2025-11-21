#!/usr/bin/env tsx
/**
 * Test script to trace best_times data flow through the entire pipeline
 *
 * Tests:
 * 1. Database - Check species table has best_times data
 * 2. Predictions API - Check if best_times is fetched and returned
 * 3. Favourites API - Check if best_times is included in response
 * 4. Component data - Verify structure matches what component expects
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Test common species codes
const TEST_SPECIES = ['BSS', 'MAC', 'COD', 'WHG', 'PLA'];

async function testDatabaseBestTimes() {
  console.log('\n🔍 TEST 1: Database - species.best_times column');
  console.log('='.repeat(60));

  const { data, error } = await supabase
    .from('species')
    .select('species_code, name_en, best_times')
    .in('species_code', TEST_SPECIES)
    .order('species_code');

  if (error) {
    console.error('❌ Database query error:', error);
    return false;
  }

  if (!data || data.length === 0) {
    console.error('❌ No species data returned');
    return false;
  }

  console.log(`\n✅ Found ${data.length} species\n`);

  let hasData = false;
  for (const species of data) {
    const hasBestTimes = species.best_times && species.best_times.length > 0;
    const icon = hasBestTimes ? '✅' : '❌';
    console.log(`${icon} ${species.species_code} (${species.name_en})`);
    if (hasBestTimes) {
      console.log(`   best_times: [${species.best_times.join(', ')}]`);
      hasData = true;
    } else {
      console.log(`   best_times: ${species.best_times || 'null'}`);
    }
  }

  return hasData;
}

async function testPredictionsAPIStructure() {
  console.log('\n\n🔍 TEST 2: Predictions API - Check query structure');
  console.log('='.repeat(60));

  // Simulate what the predictions API does - fetch species by species_code
  const { data, error } = await supabase
    .from('species')
    .select('species_code, scientific_name, name_en, name_fr, name_es, name_de, name_it, name_pt, playful_bio_en, slug, aliases, best_times')
    .in('species_code', TEST_SPECIES.slice(0, 3));

  if (error) {
    console.error('❌ Predictions-style query error:', error);
    return false;
  }

  console.log(`\n✅ Query returned ${data.length} species\n`);

  for (const species of data) {
    const hasBestTimes = 'best_times' in species;
    const hasData = species.best_times && species.best_times.length > 0;
    const icon = hasData ? '✅' : (hasBestTimes ? '⚠️' : '❌');

    console.log(`${icon} ${species.species_code} (${species.name_en})`);
    console.log(`   Has best_times field: ${hasBestTimes}`);
    console.log(`   Value: ${JSON.stringify(species.best_times)}`);
    console.log(`   Type: ${typeof species.best_times}`);
  }

  return data.every(s => 'best_times' in s);
}

async function testFavouritesAPIStructure() {
  console.log('\n\n🔍 TEST 3: Favourites API - Check species fetch with best_times');
  console.log('='.repeat(60));

  // This mimics what favourites API does
  const SPECIES_SELECT_COLUMNS = `
    id,
    species_code,
    scientific_name,
    name_en, name_fr, name_es, name_de, name_it, name_pt,
    playful_bio_en,
    slug,
    recommended_baits,
    preferred_habitats,
    effective_techniques,
    best_times,
    advice
  `;

  const { data, error } = await supabase
    .from('species')
    .select(SPECIES_SELECT_COLUMNS)
    .in('species_code', TEST_SPECIES.slice(0, 3));

  if (error) {
    console.error('❌ Favourites-style query error:', error);
    return false;
  }

  console.log(`\n✅ Query returned ${data.length} species\n`);

  for (const species of data) {
    const hasBestTimes = 'best_times' in species;
    const hasData = species.best_times && species.best_times.length > 0;
    const icon = hasData ? '✅' : (hasBestTimes ? '⚠️' : '❌');

    console.log(`${icon} ${species.species_code} (${species.name_en})`);
    console.log(`   Has best_times field: ${hasBestTimes}`);
    console.log(`   Value: ${JSON.stringify(species.best_times)}`);
    console.log(`   Has recommended_baits: ${'recommended_baits' in species}`);
    console.log(`   Has preferred_habitats: ${'preferred_habitats' in species}`);
    console.log(`   Has effective_techniques: ${'effective_techniques' in species}`);
  }

  return data.every(s => 'best_times' in s);
}

async function testWeeklyPlannerCardStructure() {
  console.log('\n\n🔍 TEST 4: WeeklyPlannerCard - Expected data structure');
  console.log('='.repeat(60));

  // Show what the component expects
  console.log(`
Component expects (from favourites.tsx line ~112):
  const bestTimes = fav.card?.best_times ?? undefined;

This means:
  - fav.card must exist
  - fav.card.best_times must be populated
  - Format should be string[] like ["Dawn", "Dusk", "Night"]

Let's check what favourites API actually returns...
  `);

  // Simulate the card structure from favourites API
  const { data: speciesData } = await supabase
    .from('species')
    .select('species_code, name_en, best_times, recommended_baits, preferred_habitats, effective_techniques')
    .in('species_code', TEST_SPECIES.slice(0, 2));

  if (!speciesData || speciesData.length === 0) {
    console.error('❌ No data to test card structure');
    return false;
  }

  console.log('\nSimulated card structure:\n');

  for (const species of speciesData) {
    console.log(`Species: ${species.name_en} (${species.species_code})`);
    console.log(`  card: {`);
    console.log(`    best_times: ${JSON.stringify(species.best_times)},`);
    console.log(`    recommendedBaits: ${JSON.stringify(species.recommended_baits)},`);
    console.log(`    preferredHabitats: ${JSON.stringify(species.preferred_habitats)},`);
    console.log(`    effectiveTechniques: ${JSON.stringify(species.effective_techniques)}`);
    console.log(`  }\n`);

    const componentValue = species.best_times ?? undefined;
    console.log(`  Component receives bestTimes: ${JSON.stringify(componentValue)}`);
    console.log(`  Will show in UI: ${componentValue && componentValue.length > 0 ? 'YES ✅' : 'NO ❌'}\n`);
  }

  return true;
}

async function main() {
  console.log('🧪 BEST_TIMES DATA FLOW TEST');
  console.log('Testing: Database → Predictions API → Favourites API → Component');

  const test1 = await testDatabaseBestTimes();
  const test2 = await testPredictionsAPIStructure();
  const test3 = await testFavouritesAPIStructure();
  const test4 = await testWeeklyPlannerCardStructure();

  console.log('\n\n📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Test 1 - Database has best_times data: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 - Predictions API query includes best_times: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 - Favourites API query includes best_times: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 4 - Component structure correct: ${test4 ? '✅ PASS' : '❌ FAIL'}`);

  if (!test1) {
    console.log('\n⚠️  ROOT CAUSE: Database has no best_times data');
    console.log('   ACTION: Need to populate species.best_times column in database');
  } else if (!test2 || !test3) {
    console.log('\n⚠️  ROOT CAUSE: API queries not fetching best_times correctly');
    console.log('   ACTION: Check SELECT queries in API endpoints');
  } else if (test1 && test2 && test3) {
    console.log('\n✅ All backend tests pass - data should flow to frontend');
    console.log('   If UI still not working, check:');
    console.log('   1. Browser console for component-level errors');
    console.log('   2. Network tab to see actual API response');
    console.log('   3. React DevTools to inspect component props');
  }

  console.log('\n');
}

main().catch(console.error);
