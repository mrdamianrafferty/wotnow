#!/usr/bin/env npx tsx

/**
 * Check RLS policies and table accessibility
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTableAccess() {
  console.log('\n🔐 Checking table access with service role key...\n');
  
  // Check species with service role
  const { data: species, error: speciesError, count: speciesCount } = await supabase
    .from('species')
    .select('*', { count: 'exact' })
    .limit(5);
    
  console.log('Species table (service role):');
  console.log(`  Count: ${speciesCount}`);
  console.log(`  Error: ${speciesError?.message || 'none'}`);
  console.log(`  Sample data: ${species?.length || 0} records`);
  if (species && species.length > 0) {
    species.forEach((s: any) => {
      console.log(`  - ${s.name_en || s.species_code}`);
    });
  }
  
  // Check catch_log
  const { count: catchCount, error: catchError } = await supabase
    .from('catch_log')
    .select('*', { count: 'exact', head: true });
    
  console.log('\nCatch log table (service role):');
  console.log(`  Count: ${catchCount}`);
  console.log(`  Error: ${catchError?.message || 'none'}`);
  
  // Check environmental_preferences
  const { count: envCount, error: envError } = await supabase
    .from('environmental_preferences')
    .select('*', { count: 'exact', head: true });
    
  console.log('\nEnvironmental preferences table (service role):');
  console.log(`  Count: ${envCount}`);
  console.log(`  Error: ${envError?.message || 'none'}`);
}

checkTableAccess().catch(console.error);
