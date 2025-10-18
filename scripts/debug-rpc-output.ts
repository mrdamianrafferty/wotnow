import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRPCOutput() {
  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: '21D8',
    target_date: '2025-10-18',
    user_lat: null,
    user_lon: null,
    substrate_type: null,
    depth_meters: null,
    current_wind_speed_ms: 5.0,
    current_pressure_hpa: 1013.0
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total predictions:', data?.length);
  console.log('\nFirst prediction:', JSON.stringify(data?.[0], null, 2));
  console.log('\nAll keys:', Object.keys(data?.[0] || {}));
}

checkRPCOutput();
