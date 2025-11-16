import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigrations() {
  console.log('Applying Confidence V2 migrations...\n');

  // Read migration files
  const migration1Path = resolve(__dirname, '../supabase/migrations/202511160002_add_confidence_formula_columns.sql');
  const migration2Path = resolve(__dirname, '../supabase/migrations/202511160003_create_confidence_v2_function.sql');

  const migration1 = readFileSync(migration1Path, 'utf-8');
  const migration2 = readFileSync(migration2Path, 'utf-8');

  console.log('Step 1: Adding new columns to species table...');
  const { error: error1 } = await supabase.rpc('exec_sql', { sql: migration1 });

  if (error1) {
    console.error('❌ Error applying migration 1:', error1);
    // Try direct execution
    console.log('Trying direct SQL execution...');
    const lines = migration1.split(';').filter(line => line.trim());
    for (const line of lines) {
      if (line.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: line + ';' });
        if (error) console.error('Error:', error.message);
        else console.log('✅ Executed');
      }
    }
  } else {
    console.log('✅ Migration 1 applied successfully');
  }

  console.log('\nStep 2: Creating get_fishing_confidence_v2 function...');
  const { error: error2 } = await supabase.rpc('exec_sql', { sql: migration2 });

  if (error2) {
    console.error('❌ Error applying migration 2:', error2);
  } else {
    console.log('✅ Migration 2 applied successfully');
  }

  console.log('\nVerifying columns exist...');
  const { data: columns } = await supabase
    .from('species')
    .select('catches_2024, peak_months, chlorophyll_preference')
    .limit(1);

  if (columns) {
    console.log('✅ New columns verified');
  } else {
    console.log('⚠️ Could not verify columns');
  }

  console.log('\nTesting new function...');
  const { data: testResult, error: testError } = await supabase.rpc('get_fishing_confidence_v2', {
    target_rectangle: '28E5',
    target_date: '2025-07-15',
    target_month: 7
  });

  if (testError) {
    console.error('❌ Function test failed:', testError);
  } else {
    console.log('✅ Function working!');
    console.log('Sample result:', JSON.stringify(testResult?.[0], null, 2));
  }
}

applyMigrations().catch(console.error);
