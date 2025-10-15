import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('🔍 Checking if get_environmental_predictions_basic function exists...\n');

  // Query pg_proc to see if function exists
  const { data, error } = await supabase.rpc('sql', {
    query: `
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname LIKE '%prediction%'
      ORDER BY p.proname;
    `
  });

  if (error) {
    console.log('Cannot query pg_proc (expected - trying alternative method)');
    
    // Try listing all functions via information_schema
    const { data: functions, error: err2 } = await supabase
      .rpc('sql', {
        query: `
          SELECT routine_name, routine_type
          FROM information_schema.routines
          WHERE routine_schema = 'public'
            AND routine_name LIKE '%prediction%';
        `
      });

    if (err2) {
      console.log('\n⚠️  Cannot check functions directly.');
      console.log('\nProbable issue: DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql has not been run on Supabase');
      console.log('\nSolution:');
      console.log('  1. Open Supabase Dashboard → SQL Editor');
      console.log('  2. Copy contents of DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql');
      console.log('  3. Paste and run in SQL Editor');
      console.log('  4. This will create:');
      console.log('     - rectangle_environmental_conditions VIEW');
      console.log('     - get_environmental_predictions_basic() FUNCTION');
    }
  } else {
    console.log('✅ Found prediction functions:');
    console.log(data);
  }
}

main();
