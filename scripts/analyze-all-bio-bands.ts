#!/usr/bin/env tsx
/**
 * Count and analyze ALL species_bio_bands records
 * 
 * The user has indicated there are over 300 records (not just the 20 we saw earlier).
 * Let's get the full picture.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeAllBioBands() {
  console.log('🔍 Analyzing ALL species_bio_bands records...\n');
  
  // Get ALL records with species info
  const { data: allRecords, error } = await supabase
    .from('species_bio_bands')
    .select(`
      *,
      species:species_id (
        species_code,
        name_en,
        scientific_name
      )
    `)
    .order('species_id')
    .order('parameter');

  if (error) {
    console.error('Error fetching records:', error);
    return;
  }

  console.log(`📊 Total Records: ${allRecords?.length || 0}\n`);
  console.log('═'.repeat(80));

  // Group by species
  const bySpecies = new Map<string, any[]>();
  
  for (const record of allRecords || []) {
    const scientificName = record.species?.scientific_name || 'Unknown';
    if (!bySpecies.has(scientificName)) {
      bySpecies.set(scientificName, []);
    }
    bySpecies.get(scientificName)!.push(record);
  }

  console.log(`\n🐟 Species Coverage: ${bySpecies.size} species\n`);
  console.log('─'.repeat(80));

  // Show each species with their parameters
  for (const [scientificName, records] of Array.from(bySpecies.entries()).sort()) {
    const speciesCode = records[0].species?.species_code || '???';
    const nameEn = records[0].species?.name_en || 'Unknown';
    
    console.log(`\n${scientificName} (${speciesCode}) - ${nameEn}`);
    console.log(`  Parameters: ${records.length}`);
    
    for (const record of records) {
      const happy = Array.isArray(record.happy_bands) 
        ? record.happy_bands.join(', ') 
        : record.happy_bands;
      const unhappy = Array.isArray(record.unhappy_bands)
        ? record.unhappy_bands.join(', ')
        : record.unhappy_bands;
      
      console.log(`    ${record.parameter.padEnd(20)} happy: [${happy}]  unhappy: [${unhappy}]`);
    }
  }

  console.log('\n' + '═'.repeat(80));

  // Parameter coverage
  const paramCounts = new Map<string, number>();
  for (const record of allRecords || []) {
    paramCounts.set(
      record.parameter,
      (paramCounts.get(record.parameter) || 0) + 1
    );
  }

  console.log('\n📈 Parameter Distribution:\n');
  for (const [param, count] of Array.from(paramCounts.entries()).sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(Math.floor(count / 5));
    console.log(`  ${param.padEnd(20)} ${String(count).padStart(3)} ${bar}`);
  }

  console.log('\n' + '═'.repeat(80));

  // Check for 7 parameter coverage (complete profiles)
  const expectedParams = ['surfaceTemperature', 'salinity', 'oxygen', 'chlorophyll', 'nitrate', 'phosphate', 'phytoplankton'];
  const completeSpecies: string[] = [];
  const incompleteSpecies: string[] = [];

  for (const [scientificName, records] of bySpecies.entries()) {
    const params = new Set(records.map(r => r.parameter));
    const coverage = expectedParams.filter(p => params.has(p)).length;
    
    if (coverage === 7) {
      completeSpecies.push(scientificName);
    } else {
      incompleteSpecies.push(`${scientificName} (${coverage}/7)`);
    }
  }

  console.log(`\n✅ Complete Profiles (7/7 parameters): ${completeSpecies.length} species\n`);
  for (const species of completeSpecies.sort()) {
    console.log(`  ✓ ${species}`);
  }

  if (incompleteSpecies.length > 0) {
    console.log(`\n⚠️  Incomplete Profiles: ${incompleteSpecies.length} species\n`);
    for (const species of incompleteSpecies.sort()) {
      console.log(`  ⚠️  ${species}`);
    }
  }

  console.log('\n' + '═'.repeat(80));

  // Sample a few records to show structure
  console.log('\n📋 Sample Records (first 5):\n');
  for (let i = 0; i < Math.min(5, allRecords?.length || 0); i++) {
    const record = allRecords![i];
    console.log(JSON.stringify({
      scientific_name: record.species?.scientific_name,
      parameter: record.parameter,
      happy_bands: record.happy_bands,
      unhappy_bands: record.unhappy_bands
    }, null, 2));
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✨ Analysis complete!\n');

  // Summary stats
  console.log('📊 Summary:');
  console.log(`  • Total records: ${allRecords?.length || 0}`);
  console.log(`  • Species covered: ${bySpecies.size}`);
  console.log(`  • Complete profiles (7/7): ${completeSpecies.length}`);
  console.log(`  • Parameters tracked: ${paramCounts.size}`);
  console.log(`  • Average parameters per species: ${((allRecords?.length || 0) / bySpecies.size).toFixed(1)}`);
  console.log('');
}

analyzeAllBioBands();
