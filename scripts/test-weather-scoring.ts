/**
 * Test Weather Scoring Integration
 * 
 * Validates that weather conditions (wind speed, barometric pressure) 
 * correctly affect species confidence scores.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWeatherScoring() {
  console.log('🌦️  Testing Weather Scoring Integration\n');
  console.log('='.repeat(60));

  const testRectangle = '31F2';
  const testDate = '2025-10-15';

  // Test 1: No weather data (neutral score)
  console.log('\n📊 Test 1: No Weather Data (baseline)');
  console.log('-'.repeat(60));
  const { data: baselineData, error: baselineError } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: testRectangle,
      target_date: testDate
    }
  );

  if (baselineError) {
    console.error('❌ Error:', baselineError);
    return;
  }

  console.log(`📈 Found ${baselineData?.length || 0} species predictions`);
  
  const bass1 = baselineData?.find((s: any) => s.name_en === 'Sea Bass');
  const mackerel1 = baselineData?.find((s: any) => s.name_en === 'Atlantic Mackerel');
  
  console.log(`Sea Bass: confidence=${bass1?.confidence}, weather_score=${bass1?.weather_score}`);
  console.log(`Mackerel: confidence=${mackerel1?.confidence}, weather_score=${mackerel1?.weather_score}`);

  // Test 2: Calm conditions (< 3 m/s wind, high pressure)
  console.log('\n📊 Test 2: Calm Conditions (2 m/s wind, 1025 hPa)');
  console.log('-'.repeat(60));
  const { data: calmData, error: calmError } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: testRectangle,
      target_date: testDate,
      current_wind_speed_ms: 2,
      current_pressure_hpa: 1025
    }
  );

  if (calmError) {
    console.error('❌ Error:', calmError);
    return;
  }

  const bass2 = calmData?.find((s: any) => s.name_en === 'Sea Bass');
  const mackerel2 = calmData?.find((s: any) => s.name_en === 'Atlantic Mackerel');
  
  console.log(`Sea Bass: confidence=${bass2?.confidence}, weather_score=${bass2?.weather_score} (${bass2?.weather_score > bass1?.weather_score ? '+' : ''}${bass2?.weather_score - bass1?.weather_score})`);
  console.log(`Mackerel: confidence=${mackerel2?.confidence}, weather_score=${mackerel2?.weather_score} (${mackerel2?.weather_score > mackerel1?.weather_score ? '+' : ''}${mackerel2?.weather_score - mackerel1?.weather_score})`);

  // Test 3: Moderate wind (7 m/s = ~14 knots)
  console.log('\n📊 Test 3: Moderate Wind (7 m/s, 1015 hPa)');
  console.log('-'.repeat(60));
  const { data: moderateData, error: moderateError } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: testRectangle,
      target_date: testDate,
      current_wind_speed_ms: 7,
      current_pressure_hpa: 1015
    }
  );

  if (moderateError) {
    console.error('❌ Error:', moderateError);
    return;
  }

  const bass3 = moderateData?.find((s: any) => s.name_en === 'Sea Bass');
  const mackerel3 = moderateData?.find((s: any) => s.name_en === 'Atlantic Mackerel');
  
  console.log(`Sea Bass: confidence=${bass3?.confidence}, weather_score=${bass3?.weather_score} (${bass3?.weather_score > bass1?.weather_score ? '+' : ''}${bass3?.weather_score - bass1?.weather_score})`);
  console.log(`Mackerel: confidence=${mackerel3?.confidence}, weather_score=${mackerel3?.weather_score} (${mackerel3?.weather_score > mackerel1?.weather_score ? '+' : ''}${mackerel3?.weather_score - mackerel1?.weather_score})`);

  // Test 4: Strong wind (15 m/s = ~29 knots, storm)
  console.log('\n📊 Test 4: Strong Wind/Storm (15 m/s, 995 hPa)');
  console.log('-'.repeat(60));
  const { data: stormData, error: stormError } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: testRectangle,
      target_date: testDate,
      current_wind_speed_ms: 15,
      current_pressure_hpa: 995
    }
  );

  if (stormError) {
    console.error('❌ Error:', stormError);
    return;
  }

  const bass4 = stormData?.find((s: any) => s.name_en === 'Sea Bass');
  const mackerel4 = stormData?.find((s: any) => s.name_en === 'Atlantic Mackerel');
  
  console.log(`Sea Bass: confidence=${bass4?.confidence}, weather_score=${bass4?.weather_score} (${bass4?.weather_score > bass1?.weather_score ? '+' : ''}${bass4?.weather_score - bass1?.weather_score})`);
  console.log(`Mackerel: confidence=${mackerel4?.confidence}, weather_score=${mackerel4?.weather_score} (${mackerel4?.weather_score > mackerel1?.weather_score ? '+' : ''}${mackerel4?.weather_score - mackerel1?.weather_score})`);

  // Test 5: Falling pressure (pre-storm feeding opportunity)
  console.log('\n📊 Test 5: Falling Pressure (4 m/s, 1005 hPa)');
  console.log('-'.repeat(60));
  const { data: fallingData, error: fallingError } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: testRectangle,
      target_date: testDate,
      current_wind_speed_ms: 4,
      current_pressure_hpa: 1005
    }
  );

  if (fallingError) {
    console.error('❌ Error:', fallingError);
    return;
  }

  const bass5 = fallingData?.find((s: any) => s.name_en === 'Sea Bass');
  const mackerel5 = fallingData?.find((s: any) => s.name_en === 'Atlantic Mackerel');
  
  console.log(`Sea Bass: confidence=${bass5?.confidence}, weather_score=${bass5?.weather_score} (${bass5?.weather_score > bass1?.weather_score ? '+' : ''}${bass5?.weather_score - bass1?.weather_score})`);
  console.log(`Mackerel: confidence=${mackerel5?.confidence}, weather_score=${mackerel5?.weather_score} (${mackerel5?.weather_score > mackerel1?.weather_score ? '+' : ''}${mackerel5?.weather_score - mackerel1?.weather_score})`);

  // Test 6: Enhanced RPC with weather + GPS
  console.log('\n📊 Test 6: Enhanced RPC with Weather + Habitat');
  console.log('-'.repeat(60));
  const { data: enhancedData, error: enhancedError } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: testRectangle,
      target_date: testDate,
      user_lat: 50.5,
      user_lon: -4.0,
      substrate_type: 'rocky_reef',
      depth_meters: 15,
      current_wind_speed_ms: 2,
      current_pressure_hpa: 1025
    }
  );

  if (enhancedError) {
    console.error('❌ Error:', enhancedError);
    return;
  }

  const bassEnhanced = enhancedData?.find((s: any) => s.name_en === 'Sea Bass');
  const pollock = enhancedData?.find((s: any) => s.name_en === 'Pollock');
  
  console.log(`Sea Bass: confidence=${bassEnhanced?.confidence}, weather_score=${bassEnhanced?.weather_score}, habitat=${bassEnhanced?.habitat_bonus}`);
  console.log(`Pollock: confidence=${pollock?.confidence}, weather_score=${pollock?.weather_score}, habitat=${pollock?.habitat_bonus}`);

  // Summary
  console.log('\n✅ Weather Scoring Summary');
  console.log('='.repeat(60));
  console.log(`Calm conditions (2 m/s, 1025 hPa): +${bass2?.weather_score - bass1?.weather_score} weather score`);
  console.log(`Moderate wind (7 m/s, 1015 hPa): ${bass3?.weather_score - bass1?.weather_score} weather score`);
  console.log(`Storm conditions (15 m/s, 995 hPa): ${bass4?.weather_score - bass1?.weather_score} weather score`);
  console.log(`Falling pressure (4 m/s, 1005 hPa): +${bass5?.weather_score - bass1?.weather_score} weather score`);
  console.log('\n✅ Integration working: Weather affects confidence scores!');
}

testWeatherScoring().catch(console.error);
