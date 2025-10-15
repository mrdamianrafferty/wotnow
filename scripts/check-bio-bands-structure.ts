#!/usr/bin/env tsx
/**
 * Check the actual structure of species_bio_bands table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTableStructure() {
  console.log('🔍 Checking species_bio_bands table structure...\n');
  
  // Get raw data to see actual column names
  const { data, error } = await supabase
    .from('species_bio_bands')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('📋 Sample records (raw):\n');
  console.log(JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    console.log('\n📊 Column names found:');
    console.log(Object.keys(data[0]));
  }

  // Count all records
  const { count } = await supabase
    .from('species_bio_bands')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 Total records: ${count}`);

  // If scientific_name exists, group by it
  const { data: allData } = await supabase
    .from('species_bio_bands')
    .select('scientific_name')
    .order('scientific_name');

  if (allData) {
    const uniqueSpecies = new Set(allData.map((r: any) => r.scientific_name));
    console.log(`\n🐟 Unique species: ${uniqueSpecies.size}`);
    console.log('\nSpecies list:');
    Array.from(uniqueSpecies).sort().forEach((name, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${name}`);
    });
  }
}

checkTableStructure();
