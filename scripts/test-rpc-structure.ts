// Test script to diagnose RPC structure mismatch
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRPC() {
  console.log('Testing get_environmental_predictions_enhanced RPC...\n');

  try {
    const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
      target_rectangle: '31F1',
      target_date: '2025-10-23',
      user_lat: 51.5,
      user_lon: -3.5,
      substrate_type: null,
      depth_meters: null,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      console.error('\nError details:');
      console.error('- Code:', error.code);
      console.error('- Message:', error.message);
      console.error('- Details:', error.details);
      console.error('- Hint:', error.hint);
      return;
    }

    console.log('✅ RPC call successful!');
    console.log('\nNumber of results:', Array.isArray(data) ? data.length : 0);

    if (Array.isArray(data) && data.length > 0) {
      console.log('\nFirst result columns:');
      console.log(JSON.stringify(Object.keys(data[0]), null, 2));

      console.log('\nFirst result sample:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testRPC();
