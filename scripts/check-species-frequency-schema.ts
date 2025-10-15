#!/usr/bin/env tsx
/**
 * Check species_frequency schema
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('🔍 Checking species_frequency schema...\n');

  // Get a sample row
  const { data: sample } = await client
    .from('species_frequency')
    .select('*')
    .limit(1)
    .single();

  console.log('Sample species_frequency row:');
  console.log(JSON.stringify(sample, null, 2));

  // Check species table
  const { data: speciesSample } = await client
    .from('species')
    .select('id, species_code, name_en')
    .limit(3);

  console.log('\nSample species rows:');
  speciesSample?.forEach((s: any) => {
    console.log(`  ${s.species_code}: ${s.name_en} (ID: ${s.id.substring(0, 8)}...)`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('🔍 DIAGNOSIS:');
  console.log('='.repeat(70));

  if (sample) {
    console.log(`\nspecies_frequency.species_id type: ${typeof sample.species_id}`);
    console.log(`species_frequency.species_id value: ${sample.species_id}`);
    
    if (typeof sample.species_id === 'string' && sample.species_id.length < 36) {
      console.log('\n❌ PROBLEM: species_id is a SHORT STRING (species_code)');
      console.log('   But species table uses UUID primary keys!');
      console.log('\n   The RPC function must be handling this differently...');
    }
  }
}

check().catch(console.error);
