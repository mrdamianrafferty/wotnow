import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function applyMigration() {
  console.log('🔄 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('📖 Reading migration file...');
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20251121000001_add_species_id_to_v3_output.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Applying migration...');
  console.log('   Migration: 20251121000001_add_species_id_to_v3_output.sql');
  console.log('   Size:', sql.length, 'bytes');

  try {
    // Since Supabase doesn't expose exec_sql, we need to use the SQL editor approach
    // For now, let's just show the user the SQL they need to paste
    console.log('');
    console.log('⚠️  The Supabase client cannot execute DDL statements directly.');
    console.log('');
    console.log('📋 Please copy the following file contents and paste into Supabase SQL Editor:');
    console.log('   → https://supabase.com/dashboard/project/swmviqpxetwziqxhzldh/sql');
    console.log('');
    console.log('File: supabase/migrations/20251121000001_add_species_id_to_v3_output.sql');
    console.log('');
    console.log('Or run this command to copy to clipboard:');
    console.log('   pbcopy < supabase/migrations/20251121000001_add_species_id_to_v3_output.sql');
    console.log('');
    console.log('');
    console.log('Now testing the function...');

    // Test the function
    const { data: testData, error: testError } = await supabase.rpc('get_fishing_confidence_v3', {
      target_rectangle: '31E8',
      target_date: '2025-11-21',
      target_month: 11
    });

    if (testError) {
      console.error('⚠️  Function test failed:', testError);
    } else if (Array.isArray(testData) && testData.length > 0) {
      console.log('✅ Function test passed!');
      console.log('Sample result:');
      console.log({
        species_id: testData[0].species_id,
        species_code: testData[0].species_code,
        species_name: testData[0].species_name,
        confidence_percent: testData[0].confidence_percent
      });
    } else {
      console.log('⚠️  Function returned no results');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
