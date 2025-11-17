import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyV3() {
  console.log('Applying Confidence V3 migration...\n');

  // First, let's check if v3 already exists
  console.log('Checking if v3 function already exists...');
  const { data: existingFunc, error: existsError } = await supabase.rpc('get_fishing_confidence_v3', {
    target_rectangle: '31F2',
    target_date: '2025-11-17',
    target_month: 11
  });

  if (!existsError) {
    console.log(`✅ V3 function already exists! Found ${existingFunc?.length || 0} species`);
    if (existingFunc && existingFunc.length > 0) {
      const top = existingFunc[0];
      console.log(`\nTop result: ${top.species_code} - ${top.species_name}: ${top.confidence_percent}%`);
      console.log(`  Seasonal phase: ${top.seasonal_phase}`);
      console.log(`  Seasonal weight: ${top.seasonal_weight}`);
      console.log(`  Availability multiplier: ${top.availability_multiplier}`);
    }
    return;
  }

  console.log('V3 does not exist, applying migration...\n');

  // Read the migration file
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '202511170002_create_confidence_v3_with_seasonality.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  // Split on semicolons to execute statements separately
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;

    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    const { error } = await supabase.rpc('exec_sql', {
      sql: statement + ';'
    });

    if (error) {
      console.error(`Error on statement ${i + 1}:`, error.message);
      console.error('Statement:', statement.substring(0, 200) + '...');

      // Try direct query if RPC fails
      console.log('Attempting direct query...');
      try {
        // This won't work with Supabase client, need to use raw SQL execution
        console.error('Cannot execute directly. Migration failed.');
        process.exit(1);
      } catch (e) {
        console.error('Direct query also failed:', e);
        process.exit(1);
      }
    } else {
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }
  }

  // Test the function
  console.log('\n\nTesting get_fishing_confidence_v3...\n');
  const { data, error } = await supabase.rpc('get_fishing_confidence_v3', {
    target_rectangle: '31F2',
    target_date: new Date().toISOString().split('T')[0],
    target_month: new Date().getMonth() + 1
  });

  if (error) {
    console.error('Test failed:', error);
  } else {
    console.log(`✅ Function works! Found ${data?.length || 0} species`);
    if (data && data.length > 0) {
      console.log('\nTop 5 results:');
      data.slice(0, 5).forEach((r: any) => {
        console.log(`  ${r.species_code} - ${r.species_name}: ${r.confidence_percent}%`);
        console.log(`    Phase: ${r.seasonal_phase}, Weight: ${r.seasonal_weight}, Multiplier: ${r.availability_multiplier}`);
        console.log(`    Source: ${r.seasonality_source || 'none'}`);
      });
    }
  }
}

applyV3().catch(console.error);
