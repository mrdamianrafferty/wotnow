#!/usr/bin/env tsx
/**
 * Analyze species_monthly_abundance table
 * Understanding what the 1,666 records represent
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyze() {
  console.log('🔍 Analyzing species_monthly_abundance table...\n');
  console.log('='.repeat(70));

  // 1. Get total count
  const { count: totalCount } = await client
    .from('species_monthly_abundance')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total Records: ${totalCount}\n`);

  // 2. Get sample rows
  const { data: samples } = await client
    .from('species_monthly_abundance')
    .select('*')
    .limit(3);

  console.log('📋 Sample Records:\n');
  if (samples && samples.length > 0) {
    samples.forEach((row: any, i: number) => {
      console.log(`Sample ${i + 1}:`);
      console.log(`  Rectangle Code: ${row.rectangle_code}`);
      console.log(`  Species ID: ${row.species_id}`);
      console.log(`  Data Source: ${row.data_source}`);
      console.log(`  Created: ${row.created_at}`);
      console.log(`  Jan: ${row.jan}, Feb: ${row.feb}, Mar: ${row.mar}`);
      console.log('');
    });
  }

  // 3. Count unique rectangles
  const { data: rectangles } = await client
    .from('species_monthly_abundance')
    .select('rectangle_code');

  const uniqueRectangles = [...new Set(rectangles?.map((r: any) => r.rectangle_code))];
  console.log(`📍 Unique Rectangles: ${uniqueRectangles.length}`);
  console.log(`   Samples: ${uniqueRectangles.slice(0, 5).join(', ')}\n`);

  // 4. Count unique species
  const { data: species } = await client
    .from('species_monthly_abundance')
    .select('species_id');

  const uniqueSpecies = [...new Set(species?.map((s: any) => s.species_id))];
  console.log(`🐟 Unique Species IDs: ${uniqueSpecies.length}`);
  console.log(`   Samples: ${uniqueSpecies.slice(0, 5).join(', ')}\n`);

  // 5. Check data sources
  const { data: sources } = await client
    .from('species_monthly_abundance')
    .select('data_source');

  const uniqueSources = [...new Set(sources?.map((s: any) => s.data_source))];
  console.log(`📦 Data Sources: ${uniqueSources.length}`);
  uniqueSources.forEach(source => {
    const count = sources?.filter((s: any) => s.data_source === source).length;
    console.log(`   ${source}: ${count} records`);
  });

  // 6. Calculate expected vs actual
  console.log('\n' + '='.repeat(70));
  console.log('🧮 CALCULATION:');
  console.log('='.repeat(70));
  
  const recordsPerCombo = totalCount! / (uniqueRectangles.length * uniqueSpecies.length);
  console.log(`\nRectangles: ${uniqueRectangles.length}`);
  console.log(`Species: ${uniqueSpecies.length}`);
  console.log(`Expected if 1:1 mapping: ${uniqueRectangles.length * uniqueSpecies.length} records`);
  console.log(`Actual: ${totalCount} records`);
  console.log(`Records per rectangle/species combo: ${recordsPerCombo.toFixed(2)}`);

  if (recordsPerCombo < 1) {
    console.log('\n⚠️  SPARSE DATA: Not all rectangle/species combinations have records');
    console.log(`   Only ${(recordsPerCombo * 100).toFixed(1)}% coverage`);
  } else if (recordsPerCombo === 1) {
    console.log('\n✅ COMPLETE DATA: One record per rectangle/species combo');
  } else {
    console.log('\n⚠️  DUPLICATE DATA: Multiple records per rectangle/species combo');
  }

  // 7. Check relationship to species_frequency
  const { count: freqCount } = await client
    .from('species_frequency')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(70));
  console.log('🔗 RELATIONSHIP TO SPECIES_FREQUENCY:');
  console.log('='.repeat(70));
  console.log(`\nspecies_monthly_abundance: ${totalCount} records`);
  console.log(`species_frequency: ${freqCount} records`);
  console.log('\nNote: species_frequency is used by get_fishing_predictions() RPC');
  console.log('      species_monthly_abundance is source data (DATRAS surveys)');

  // 8. Check migration history
  console.log('\n' + '='.repeat(70));
  console.log('📜 LIKELY SOURCE:');
  console.log('='.repeat(70));
  console.log('\nMigration: 202509300001_add_datras_support.sql');
  console.log('Creates view: datras_monthly_abundance_long');
  console.log('Purpose: Normalize DATRAS monthly abundance into long form');
  console.log('\nThis table probably contains DATRAS survey data imported');
  console.log('from external sources (European fish abundance surveys).');
}

analyze().catch(console.error);
