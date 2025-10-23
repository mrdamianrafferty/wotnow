// Check all function signatures in the database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAllFunctions() {
  console.log('Querying all get_environmental_predictions_enhanced functions...\n');

  try {
    // Use the Supabase REST API to call a custom SQL query
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          p.proname,
          p.oid::regprocedure as signature,
          pg_get_function_result(p.oid) as return_type,
          pg_get_function_arguments(p.oid) as arguments
        FROM pg_proc p
        WHERE p.proname = 'get_environmental_predictions_enhanced'
      `
    });

    if (error) {
      console.log('RPC not available, using alternative approach...\n');

      // Just test the function directly
      const { data: testData, error: testError } = await supabase.rpc('get_environmental_predictions_enhanced', {
        target_rectangle: '31F1',
        target_date: '2025-10-23',
        user_lat: 51.5,
        user_lon: -3.5,
        substrate_type: null,
        depth_meters: null,
        current_wind_speed_ms: null,
        current_pressure_hpa: null,
      });

      if (testError) {
        console.error('❌ Function call error:');
        console.error('Code:', testError.code);
        console.error('Message:', testError.message);
        console.error('Details:', testError.details);
        console.error('Hint:', testError.hint);
      } else {
        console.log('✅ Function call successful!');
        console.log('Results:', testData?.length || 0);
        if (testData && testData.length > 0) {
          console.log('\nFirst result keys:');
          console.log(Object.keys(testData[0]));
        }
      }
    } else {
      console.log('Functions found:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkAllFunctions();
