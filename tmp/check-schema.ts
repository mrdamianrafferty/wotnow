// Check actual database schema
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('📋 Checking actual database schema...\n');

  // 1. Get any row from ices_rectangles to see actual columns
  console.log('1. ICES Rectangles table structure:');
  const { data: rectSample, error: rectErr } = await supabase
    .from('ices_rectangles')
    .select('*')
    .limit(1)
    .single();

  if (rectErr) {
    console.error('   ❌ Error:', rectErr.message);
  } else if (rectSample) {
    console.log('   Columns:', Object.keys(rectSample).join(', '));
    console.log('   Sample:', rectSample);
  }

  // 2. Check findr_conditions_latest
  console.log('\n2. findr_conditions_latest view structure:');
  const { data: condSample, error: condErr } = await supabase
    .from('findr_conditions_latest')
    .select('*')
    .limit(1)
    .single();

  if (condErr) {
    console.error('   ❌ Error:', condErr.message);
  } else if (condSample) {
    console.log('   Columns:', Object.keys(condSample).join(', '));
  }

  // 3. Check species table
  console.log('\n3. Species table structure:');
  const { data: speciesSample, error: speciesErr } = await supabase
    .from('species')
    .select('*')
    .limit(1)
    .single();

  if (speciesErr) {
    console.error('   ❌ Error:', speciesErr.message);
  } else if (speciesSample) {
    console.log('   Columns:', Object.keys(speciesSample).join(', '));
  }

  // 4. List available RPC functions
  console.log('\n4. Available RPC functions with "prediction" in name:');
  const { data: functions, error: funcErr } = await supabase
    .from('pg_proc')
    .select('proname')
    .like('proname', '%predict%');

  if (funcErr) {
    console.log('   Cannot query pg_proc directly');

    // Try known function names
    console.log('\n   Testing known function names:');

    const testFunctions = [
      'get_environmental_predictions_enhanced',
      'get_environmental_predictions_for_rectangle',
      'get_predictions',
      'get_findr_predictions'
    ];

    for (const funcName of testFunctions) {
      try {
        // Try with minimal params
        const { error } = await supabase.rpc(funcName as any, {});
        if (error && error.code !== 'PGRST202') {
          console.log(`   ✅ Found: ${funcName} (signature issue: ${error.message})`);
        } else if (!error) {
          console.log(`   ✅ Found: ${funcName} (works with empty params)`);
        } else {
          console.log(`   ❌ Not found: ${funcName}`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${funcName}: ${e.message}`);
      }
    }
  } else {
    console.log('   Functions:', functions?.map(f => f.proname).join(', '));
  }

  console.log('\n✅ Schema check complete\n');
}

main().catch(console.error);
