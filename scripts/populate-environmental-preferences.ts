#!/usr/bin/env tsx
/**
 * Populate Environmental Preferences - Phase 9 Migration
 * 
 * Reads ENVIRONMENTAL_DATA_COMPLETE.json and populates the
 * species.environmental_preferences JSONB column for all 62 species.
 * 
 * Prerequisites:
 * - migrations/add_environmental_preferences.sql must be run first
 * - ENVIRONMENTAL_DATA_COMPLETE.json must exist
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface EnvironmentalData {
  species_code: string;
  scientific_name: string;
  name_en: string;
  environmental_preferences: any;
}

async function migrateEnvironmentalData() {
  console.log('🚀 Phase 9 Migration: Environmental Preferences\n');
  console.log('═'.repeat(80));

  // Step 1: Load environmental data
  console.log('\n📂 Step 1: Loading ENVIRONMENTAL_DATA_COMPLETE.json...');
  
  const dataPath = path.join(process.cwd(), 'ENVIRONMENTAL_DATA_COMPLETE.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Error: ENVIRONMENTAL_DATA_COMPLETE.json not found!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const environmentalData: EnvironmentalData[] = JSON.parse(rawData);

  console.log(`✅ Loaded ${environmentalData.length} species records`);

  // Step 2: Verify column exists
  console.log('\n🔍 Step 2: Verifying environmental_preferences column exists...');
  
  // Try to query the column
  const { error: testError } = await supabase
    .from('species')
    .select('environmental_preferences')
    .limit(1);

  if (testError && testError.message.includes('environmental_preferences')) {
    console.error('❌ Error: environmental_preferences column does not exist!');
    console.error('   Please run migrations/add_environmental_preferences.sql first\n');
    process.exit(1);
  }

  console.log('✅ Column exists');

  // Step 3: Get current species from database
  console.log('\n🐟 Step 3: Fetching species from database...');
  
  const { data: dbSpecies, error: speciesError } = await supabase
    .from('species')
    .select('id, species_code, scientific_name, name_en');

  if (speciesError) {
    console.error('❌ Error fetching species:', speciesError.message);
    process.exit(1);
  }

  console.log(`✅ Found ${dbSpecies?.length || 0} species in database`);

  // Step 4: Match and update species
  console.log('\n📝 Step 4: Updating species environmental preferences...\n');
  console.log('─'.repeat(80));

  let successCount = 0;
  let errorCount = 0;
  const notFound: string[] = [];

  for (const envData of environmentalData) {
    const dbSpeciesRecord = dbSpecies?.find(
      s => s.species_code === envData.species_code
    );

    if (!dbSpeciesRecord) {
      notFound.push(`${envData.species_code} (${envData.scientific_name})`);
      continue;
    }

    // Update the species with environmental preferences
    const { error: updateError } = await supabase
      .from('species')
      .update({ 
        environmental_preferences: envData.environmental_preferences 
      })
      .eq('id', dbSpeciesRecord.id);

    if (updateError) {
      console.error(`❌ ${envData.species_code.padEnd(5)} ${envData.name_en.padEnd(30)} FAILED: ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`✅ ${envData.species_code.padEnd(5)} ${envData.name_en.padEnd(30)} SUCCESS`);
      successCount++;
    }
  }

  console.log('─'.repeat(80));

  // Step 5: Summary
  console.log('\n📊 Step 5: Migration Summary\n');
  console.log('═'.repeat(80));
  console.log(`Total species in JSON:     ${environmentalData.length}`);
  console.log(`Successfully updated:      ${successCount} ✅`);
  console.log(`Errors:                    ${errorCount} ${errorCount > 0 ? '❌' : ''}`);
  console.log(`Not found in database:     ${notFound.length} ${notFound.length > 0 ? '⚠️' : ''}`);

  if (notFound.length > 0) {
    console.log('\n⚠️  Species not found in database:');
    notFound.forEach(s => console.log(`   - ${s}`));
  }

  // Step 6: Validation
  console.log('\n✅ Step 6: Validating migration...\n');
  console.log('─'.repeat(80));

  const { data: validationData, error: validationError } = await supabase
    .from('species')
    .select('species_code, name_en, environmental_preferences')
    .not('environmental_preferences', 'is', null);

  if (validationError) {
    console.error('❌ Validation query failed:', validationError.message);
  } else {
    console.log(`✅ ${validationData?.length || 0} species have environmental preferences`);
    
    // Show a few examples
    console.log('\n📋 Sample Records:\n');
    
    for (let i = 0; i < Math.min(3, validationData?.length || 0); i++) {
      const record = validationData![i];
      const prefs = record.environmental_preferences;
      
      console.log(`${record.species_code} - ${record.name_en}:`);
      console.log(`  Temperature: ${prefs.temperature?.optimal_min || prefs.temperature?.tolerance_min}°C - ${prefs.temperature?.optimal_max || prefs.temperature?.tolerance_max}°C`);
      console.log(`  Salinity:    ${prefs.salinity?.optimal_min || prefs.salinity?.tolerance_min} - ${prefs.salinity?.optimal_max || prefs.salinity?.tolerance_max} ppt`);
      console.log(`  Depth:       ${prefs.depth?.typical_min}-${prefs.depth?.typical_max}m`);
      console.log(`  Substrate:   ${prefs.substrate?.preferred?.join(', ') || 'N/A'}`);
      console.log('');
    }
  }

  // Step 7: Test queries
  console.log('═'.repeat(80));
  console.log('\n🧪 Step 7: Testing Environmental Queries\n');
  console.log('─'.repeat(80));

  // Test 1: Find species happy in 16°C water
  console.log('\nTest 1: Species optimal at 16°C (summer UK waters)');
  const { data: tempTest } = await supabase
    .from('species')
    .select('species_code, name_en, environmental_preferences')
    .not('environmental_preferences', 'is', null)
    .gte('environmental_preferences->temperature->>optimal_min', '0')
    .lte('environmental_preferences->temperature->>optimal_min', '16')
    .gte('environmental_preferences->temperature->>optimal_max', '16');

  if (tempTest && tempTest.length > 0) {
    console.log(`✅ Found ${tempTest.length} species:`);
    tempTest.slice(0, 5).forEach(s => {
      const temp = s.environmental_preferences.temperature;
      console.log(`   ${s.species_code}: ${s.name_en} (${temp.optimal_min}-${temp.optimal_max}°C)`);
    });
  } else {
    console.log('⚠️  No results (check JSONB query syntax)');
  }

  // Test 2: Find species that prefer rocky substrate
  console.log('\nTest 2: Species that prefer rocky substrate');
  const { data: substrateTest } = await supabase
    .from('species')
    .select('species_code, name_en, environmental_preferences')
    .not('environmental_preferences', 'is', null);

  if (substrateTest) {
    const rockySpecies = substrateTest.filter(s => 
      s.environmental_preferences?.substrate?.preferred?.includes('rock') ||
      s.environmental_preferences?.substrate?.preferred?.includes('rocky')
    );
    
    console.log(`✅ Found ${rockySpecies.length} species:`);
    rockySpecies.slice(0, 5).forEach(s => {
      console.log(`   ${s.species_code}: ${s.name_en}`);
    });
  }

  // Test 3: Find species tolerant of wide salinity range (euryhaline)
  console.log('\nTest 3: Euryhaline species (wide salinity tolerance)');
  const euryhalineTest = validationData?.filter(s => {
    const sal = s.environmental_preferences?.salinity;
    if (!sal) return false;
    const range = (sal.tolerance_max || sal.optimal_max) - (sal.tolerance_min || sal.optimal_min);
    return range > 10; // Tolerance range > 10 ppt
  });

  if (euryhalineTest && euryhalineTest.length > 0) {
    console.log(`✅ Found ${euryhalineTest.length} species:`);
    euryhalineTest.slice(0, 5).forEach(s => {
      const sal = s.environmental_preferences.salinity;
      const range = (sal.tolerance_max || sal.optimal_max) - (sal.tolerance_min || sal.optimal_min);
      console.log(`   ${s.species_code}: ${s.name_en} (${range.toFixed(0)} ppt range)`);
    });
  }

  console.log('\n═'.repeat(80));
  console.log('\n✨ Phase 9 Migration Complete!\n');

  if (successCount === environmentalData.length && errorCount === 0 && notFound.length === 0) {
    console.log('🎉 Perfect! All species migrated successfully.\n');
    console.log('Next steps:');
    console.log('  1. Run migrations/create_bio_bands_thresholds.sql');
    console.log('  2. Build prediction RPC function');
    console.log('  3. Test with real-world scenarios');
    console.log('');
  } else {
    console.log('⚠️  Migration completed with some issues.');
    console.log(`   ${successCount}/${environmentalData.length} successful`);
    console.log('   Review errors above before proceeding.\n');
  }
}

// Run migration
migrateEnvironmentalData().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
