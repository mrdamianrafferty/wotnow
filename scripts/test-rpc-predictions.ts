import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  console.log('Testing RPC function: get_environmental_predictions_basic');
  console.log('Parameters:', {
    target_rectangle: '28E5',
    target_date: '2025-10-18',
    current_wind_speed_ms: null,
    current_pressure_hpa: null,
  });
  console.log('');

  const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '28E5',
    target_date: '2025-10-18',
    current_wind_speed_ms: null,
    current_pressure_hpa: null,
  });

  console.log('RPC Response:');
  console.log('- Error:', error);
  console.log('- Data type:', Array.isArray(data) ? 'array' : typeof data);
  console.log('- Data length:', Array.isArray(data) ? data.length : 'N/A');
  console.log('');

  if (error) {
    console.error('RPC Error Details:');
    console.error('- Code:', error.code);
    console.error('- Message:', error.message);
    console.error('- Details:', error.details);
    console.error('- Hint:', error.hint);
    return;
  }

  if (Array.isArray(data) && data.length > 0) {
    console.log('First 3 predictions:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  } else {
    console.log('No predictions returned!');
    console.log('');
    
    // Let's check if the function exists
    console.log('Checking if RPC function exists...');
    const { data: functionData, error: functionError } = await supabase
      .from('pg_proc')
      .select('proname')
      .ilike('proname', '%environmental_predictions%');
    
    console.log('Function check:', { functionData, functionError });
  }
}

testRPC().catch(console.error);
