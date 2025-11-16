import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRpcConfidence() {
  console.log('Testing RPC confidence output...\n');

  const { data, error } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '28E5',
      target_date: '2025-11-16',
      user_lat: null,
      user_lon: null,
      substrate_type: null,
      depth_meters: null,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
      current_tide_stage: null,
      current_flow_speed_ms: null,
    }
  );

  if (error) {
    console.error('RPC Error:', error);
    return;
  }

  console.log(`Total predictions: ${data?.length || 0}\n`);
  console.log('First 3 predictions:');
  console.log(JSON.stringify(data?.slice(0, 3), null, 2));

  // Check what fields are present
  if (data && data.length > 0) {
    console.log('\n\nFields in first prediction:');
    console.log(Object.keys(data[0]));

    console.log('\n\nConfidence values for first 10 predictions:');
    data.slice(0, 10).forEach((pred: any, i: number) => {
      console.log(`${i + 1}. ${pred.species_code || pred.speciesCode || 'UNKNOWN'}: confidence = ${pred.confidence}`);
    });
  }
}

testRpcConfidence().catch(console.error);
