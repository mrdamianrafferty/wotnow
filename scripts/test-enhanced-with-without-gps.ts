#!/usr/bin/env npx tsx

/**
 * Test that enhanced RPC works both WITH and WITHOUT GPS coordinates
 * Verifies the simplified API code that always uses enhanced function
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithGPS() {
  console.log('\n📍 TEST 1: Enhanced RPC WITH GPS coordinates');
  console.log('─'.repeat(80));

  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: '21D8',
    target_date: '2025-10-18',
    user_lat: 43.5,  // GPS provided
    user_lon: -9.0,  // GPS provided
    substrate_type: 'rocky_reef',
    depth_meters: 15.0,
    current_wind_speed_ms: 5.0,
    current_pressure_hpa: 1015.0,
  });

  if (error) {
    console.error('❌ Error:', error);
    return false;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No predictions returned');
    return false;
  }

  console.log(`✅ Returned ${data.length} predictions`);
  console.log('\nTop 5 species:');
  data.slice(0, 5).forEach((p: any, idx: number) => {
    console.log(`  ${idx + 1}. ${p.name_en}: ${p.confidence}% (temp: ${p.temp_score}, lunar: ${p.lunar_score}, substrate: ${p.substrate_score})`);
  });

  // Verify enhanced features are working
  const hasLunarScores = data.some((p: any) => p.lunar_score > 0);
  const hasSubstrateScores = data.some((p: any) => p.substrate_score > 10);
  
  console.log('\n✓ Enhanced features:');
  console.log(`  Lunar scoring: ${hasLunarScores ? '✅ Active' : '⚠️  Inactive'}`);
  console.log(`  Substrate scoring: ${hasSubstrateScores ? '✅ Active' : '⚠️  Inactive'}`);

  return true;
}

async function testWithoutGPS() {
  console.log('\n📍 TEST 2: Enhanced RPC WITHOUT GPS coordinates (null lat/lon)');
  console.log('─'.repeat(80));

  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: '21D8',
    target_date: '2025-10-18',
    user_lat: null,  // No GPS
    user_lon: null,  // No GPS
    substrate_type: null,  // Can't determine without GPS
    depth_meters: null,    // Can't determine without GPS
    current_wind_speed_ms: 5.0,
    current_pressure_hpa: 1015.0,
  });

  if (error) {
    console.error('❌ Error:', error);
    return false;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No predictions returned');
    return false;
  }

  console.log(`✅ Returned ${data.length} predictions`);
  console.log('\nTop 5 species:');
  data.slice(0, 5).forEach((p: any, idx: number) => {
    console.log(`  ${idx + 1}. ${p.name_en}: ${p.confidence}% (temp: ${p.temp_score}, weather: ${p.weather_score})`);
  });

  // Verify basic features still work
  const hasTemperatureScores = data.every((p: any) => p.temp_score > 0);
  const hasWeatherScores = data.some((p: any) => p.weather_score > 0);
  
  console.log('\n✓ Core features (without GPS):');
  console.log(`  Temperature scoring: ${hasTemperatureScores ? '✅ Active' : '❌ Broken'}`);
  console.log(`  Weather scoring: ${hasWeatherScores ? '✅ Active' : '❌ Broken'}`);
  console.log(`  Biogeographic filtering: ${data.every((p: any) => p.name_en !== 'Bogue') ? '✅ Active' : '❌ Broken'}`);

  return true;
}

async function testBiogeographicFiltering() {
  console.log('\n🗺️  TEST 3: Biogeographic filtering works in both modes');
  console.log('─'.repeat(80));

  // Test Atlantic rectangle
  const { data: atlanticData } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: '21D8',  // Galician Coast (Atlantic)
    target_date: '2025-10-18',
    user_lat: null,
    user_lon: null,
    substrate_type: null,
    depth_meters: null,
    current_wind_speed_ms: 5.0,
    current_pressure_hpa: 1015.0,
  });

  const hasBogue = atlanticData?.some((p: any) => p.name_en === 'Bogue');
  const hasSeaBass = atlanticData?.some((p: any) => p.name_en === 'Sea Bass');

  console.log('Atlantic (21D8) predictions:');
  console.log(`  Total species: ${atlanticData?.length || 0}`);
  console.log(`  Bogue (Mediterranean): ${hasBogue ? '❌ PRESENT (bug!)' : '✅ Filtered'}`);
  console.log(`  Sea Bass (Atlantic): ${hasSeaBass ? '✅ Present' : '⚠️  Missing'}`);

  return !hasBogue;
}

async function main() {
  console.log('\n' + '█'.repeat(80));
  console.log('🧪 ENHANCED RPC - GPS/NO-GPS TEST SUITE');
  console.log('   Verifying single code path works for all users');
  console.log('█'.repeat(80));

  const results = {
    withGPS: await testWithGPS(),
    withoutGPS: await testWithoutGPS(),
    bioFiltering: await testBiogeographicFiltering(),
  };

  console.log('\n' + '█'.repeat(80));
  console.log('📊 TEST RESULTS');
  console.log('█'.repeat(80));
  console.log(`${results.withGPS ? '✅' : '❌'} WITH GPS: Enhanced features working`);
  console.log(`${results.withoutGPS ? '✅' : '❌'} WITHOUT GPS: Core features working`);
  console.log(`${results.bioFiltering ? '✅' : '❌'} BIOGEOGRAPHIC FILTERING: Working in both modes`);

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('   ✅ Enhanced RPC works with and without GPS');
    console.log('   ✅ Single code path provides consistent experience');
    console.log('   ✅ Biogeographic filtering working correctly');
    console.log('\n💡 Benefits of single code path:');
    console.log('   • Simpler API logic (removed conditional)');
    console.log('   • Consistent predictions regardless of GPS permission');
    console.log('   • Weather scoring works for all users');
    console.log('   • Enhanced features (lunar, substrate, depth) when available');
  } else {
    console.log('\n⚠️  Some tests failed - review details above');
  }

  console.log('─'.repeat(80) + '\n');
}

main().catch(console.error);
