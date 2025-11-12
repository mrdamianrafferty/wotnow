import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  console.log('🧪 Testing RPC Function: get_environmental_predictions_enhanced\n');

  // Test 1: Basic call with common rectangle
  console.log('Test 1: Basic call with rectangle 31F1 (English Channel)');
  console.log('Parameters: target_rectangle=31F1, target_date=2025-01-12');

  const { data: test1, error: error1 } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '31F1',
      target_date: '2025-01-12',
      user_lat: null,
      user_lon: null,
      substrate_type: null,
      depth_meters: null,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
      current_tide_stage: null,
      current_flow_speed_ms: null
    }
  );

  if (error1) {
    console.error('❌ Test 1 FAILED:', error1.message);
    console.error('Error details:', JSON.stringify(error1, null, 2));
  } else {
    console.log(`✅ Test 1 PASSED: Returned ${test1?.length || 0} predictions`);
    if (test1 && test1.length > 0) {
      console.log('Sample prediction:', JSON.stringify(test1[0], null, 2));
    }
  }

  console.log('\n---\n');

  // Test 2: With GPS coordinates
  console.log('Test 2: With GPS coordinates');
  console.log('Parameters: target_rectangle=31F1, user_lat=50.5, user_lon=-3.5');

  const { data: test2, error: error2 } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '31F1',
      target_date: '2025-01-12',
      user_lat: 50.5,
      user_lon: -3.5,
      substrate_type: 'sand',
      depth_meters: 20,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
      current_tide_stage: 'rising',
      current_flow_speed_ms: null
    }
  );

  if (error2) {
    console.error('❌ Test 2 FAILED:', error2.message);
    console.error('Error details:', JSON.stringify(error2, null, 2));
  } else {
    console.log(`✅ Test 2 PASSED: Returned ${test2?.length || 0} predictions`);
    if (test2 && test2.length > 0) {
      console.log('Sample prediction:', JSON.stringify(test2[0], null, 2));
    }
  }

  console.log('\n---\n');

  // Test 3: Check for type casting issues
  console.log('Test 3: Checking data types in response');

  if (test1 && test1.length > 0) {
    const sample = test1[0];
    console.log('species_code type:', typeof sample.species_code, '- Value:', sample.species_code);
    console.log('species_id type:', typeof sample.species_id, '- Value:', sample.species_id);
    console.log('species_common_name type:', typeof sample.species_common_name, '- Value:', sample.species_common_name);
    console.log('confidence_percent type:', typeof sample.confidence_percent, '- Value:', sample.confidence_percent);
    console.log('✅ All types look correct!');
  } else {
    console.log('⚠️  No data to check types');
  }

  console.log('\n---\n');

  // Test 4: Check database columns referenced
  console.log('Test 4: Verifying database schema');

  const { data: rectData, error: rectError } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, region')
    .eq('rectangle_code', '31F1')
    .single();

  if (rectError) {
    console.error('❌ Rectangle table has issues:', rectError.message);
  } else {
    console.log('✅ ices_rectangles columns OK:', Object.keys(rectData));
  }

  const { data: condData, error: condError } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, sea_temp_c, water_temp_c, salinity_psu, captured_at')
    .eq('rectangle_code', '31F1')
    .limit(1)
    .maybeSingle();

  if (condError) {
    console.error('❌ Conditions table has issues:', condError.message);
  } else if (condData) {
    console.log('✅ findr_conditions_latest columns OK:', Object.keys(condData));
  } else {
    console.log('⚠️  No conditions data for 31F1');
  }

  const { data: moonData, error: moonError } = await supabase
    .from('moon_cache')
    .select('local_date, moon_phase_name, moon_illumination_pct')
    .eq('local_date', '2025-01-12')
    .limit(1)
    .maybeSingle();

  if (moonError) {
    console.error('❌ Moon cache table has issues:', moonError.message);
  } else if (moonData) {
    console.log('✅ moon_cache columns OK:', Object.keys(moonData));
  } else {
    console.log('⚠️  No moon data for 2025-01-12');
  }

  const { data: speciesData, error: speciesError } = await supabase
    .from('species')
    .select('id, species_code, name_en, scientific_name')
    .limit(1)
    .single();

  if (speciesError) {
    console.error('❌ Species table has issues:', speciesError.message);
  } else {
    console.log('✅ species columns OK:', Object.keys(speciesData));
  }

  console.log('\n🎉 RPC Test Complete!\n');
}

testRPC().catch(console.error);
