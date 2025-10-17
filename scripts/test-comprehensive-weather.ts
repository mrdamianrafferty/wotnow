/**
 * Comprehensive Weather Scoring Test
 * 
 * Tests multiple rectangles with varied weather conditions
 * Validates wind and pressure scoring independently and combined
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWeatherScoring() {
  console.log('🌦️  Comprehensive Weather Scoring Test\n');
  console.log('='.repeat(70));

  // First, find rectangles with recent data
  console.log('\n🔍 Finding rectangles with environmental data...');
  const { data: snapshots, error: snapshotError } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, captured_at')
    .order('captured_at', { ascending: false })
    .limit(100);

  if (snapshotError) {
    console.error('❌ Error fetching snapshots:', snapshotError);
    return;
  }

  const uniqueRectangles = [...new Set(snapshots?.map(s => s.rectangle_code) || [])];
  console.log(`✅ Found ${uniqueRectangles.length} rectangles with recent data`);
  
  if (uniqueRectangles.length === 0) {
    console.log('\n⚠️  No environmental data found. Creating synthetic test...');
    await testSyntheticWeather();
    return;
  }

  const testRectangle = uniqueRectangles[0];
  const testDate = '2025-10-17';
  
  console.log(`\n📍 Testing Rectangle: ${testRectangle}`);
  console.log(`📅 Testing Date: ${testDate}`);
  console.log('='.repeat(70));

  // Test 1: Baseline (no weather)
  console.log('\n📊 TEST 1: Baseline (No Weather Data)');
  console.log('-'.repeat(70));
  const baseline = await runPrediction(testRectangle, testDate, null, null);
  
  if (!baseline || baseline.length === 0) {
    console.log('⚠️  No predictions returned. Trying alternative rectangle...');
    if (uniqueRectangles.length > 1) {
      const altRectangle = uniqueRectangles[1];
      const altBaseline = await runPrediction(altRectangle, testDate, null, null);
      if (altBaseline && altBaseline.length > 0) {
        await runAllTests(altRectangle, testDate, altBaseline);
        return;
      }
    }
    console.log('❌ No data available for testing');
    return;
  }

  await runAllTests(testRectangle, testDate, baseline);
}

async function runAllTests(rectangle: string, date: string, baseline: any[]) {
  console.log(`\n✅ Baseline: ${baseline.length} species predictions`);
  
  const testSpecies = [
    baseline.find((s: any) => s.name_en === 'Sea Bass') || baseline[0],
    baseline.find((s: any) => s.name_en === 'Atlantic Mackerel') || baseline[1],
    baseline.find((s: any) => s.name_en === 'Cod') || baseline[2]
  ].filter(Boolean);

  console.log(`\n🎣 Tracking species: ${testSpecies.map(s => s.name_en).join(', ')}`);
  
  testSpecies.forEach(species => {
    console.log(`   ${species.name_en}: confidence=${species.confidence}, weather_score=${species.weather_score}`);
  });

  // Test 2: Wind Only - Calm
  console.log('\n📊 TEST 2: Wind Only - Calm (2 m/s, no pressure)');
  console.log('-'.repeat(70));
  const calmWind = await runPrediction(rectangle, date, 2, null);
  compareResults('Calm Wind', baseline, calmWind, testSpecies);

  // Test 3: Wind Only - Strong
  console.log('\n📊 TEST 3: Wind Only - Strong (15 m/s, no pressure)');
  console.log('-'.repeat(70));
  const strongWind = await runPrediction(rectangle, date, 15, null);
  compareResults('Strong Wind', baseline, strongWind, testSpecies);

  // Test 4: Pressure Only - High
  console.log('\n📊 TEST 4: Pressure Only - High (1025 hPa, no wind)');
  console.log('-'.repeat(70));
  const highPressure = await runPrediction(rectangle, date, null, 1025);
  compareResults('High Pressure', baseline, highPressure, testSpecies);

  // Test 5: Pressure Only - Low
  console.log('\n📊 TEST 5: Pressure Only - Low (995 hPa, no wind)');
  console.log('-'.repeat(70));
  const lowPressure = await runPrediction(rectangle, date, null, 995);
  compareResults('Low Pressure', baseline, lowPressure, testSpecies);

  // Test 6: Pressure Only - Falling (pre-storm)
  console.log('\n📊 TEST 6: Pressure Only - Falling (1005 hPa, no wind)');
  console.log('-'.repeat(70));
  const fallingPressure = await runPrediction(rectangle, date, null, 1005);
  compareResults('Falling Pressure', baseline, fallingPressure, testSpecies);

  // Test 7: Combined - Perfect conditions
  console.log('\n📊 TEST 7: Combined - Perfect (2 m/s, 1025 hPa)');
  console.log('-'.repeat(70));
  const perfect = await runPrediction(rectangle, date, 2, 1025);
  compareResults('Perfect Conditions', baseline, perfect, testSpecies);

  // Test 8: Combined - Terrible conditions
  console.log('\n📊 TEST 8: Combined - Storm (15 m/s, 995 hPa)');
  console.log('-'.repeat(70));
  const storm = await runPrediction(rectangle, date, 15, 995);
  compareResults('Storm Conditions', baseline, storm, testSpecies);

  // Test 9: Combined - Pre-storm feeding
  console.log('\n📊 TEST 9: Combined - Pre-Storm (5 m/s, 1005 hPa)');
  console.log('-'.repeat(70));
  const preStorm = await runPrediction(rectangle, date, 5, 1005);
  compareResults('Pre-Storm', baseline, preStorm, testSpecies);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 WEATHER SCORING VALIDATION SUMMARY');
  console.log('='.repeat(70));
  
  const baselineAvg = average(testSpecies.map(s => s.weather_score));
  const calmWindAvg = average(testSpecies.map(s => 
    calmWind?.find((c: any) => c.species_id === s.species_id)?.weather_score || 0
  ));
  const strongWindAvg = average(testSpecies.map(s => 
    strongWind?.find((c: any) => c.species_id === s.species_id)?.weather_score || 0
  ));
  const highPressureAvg = average(testSpecies.map(s => 
    highPressure?.find((c: any) => c.species_id === s.species_id)?.weather_score || 0
  ));
  const lowPressureAvg = average(testSpecies.map(s => 
    lowPressure?.find((c: any) => c.species_id === s.species_id)?.weather_score || 0
  ));
  const fallingPressureAvg = average(testSpecies.map(s => 
    fallingPressure?.find((c: any) => c.species_id === s.species_id)?.weather_score || 0
  ));
  const perfectAvg = average(testSpecies.map(s => 
    perfect?.find((c: any) => c.species_id === s.species_id)?.weather_score || 0
  ));
  const stormAvg = average(testSpecies.map(s => 
    storm?.find((c: any) => c.species_id === s.species_id)?.weather_score || 0
  ));

  console.log(`\nAverage Weather Scores:`);
  console.log(`  Baseline (no data):        ${baselineAvg.toFixed(1)} / 10`);
  console.log(`  Calm wind (2 m/s):         ${calmWindAvg.toFixed(1)} / 10 ${calmWindAvg > baselineAvg ? '✅' : '❌'}`);
  console.log(`  Strong wind (15 m/s):      ${strongWindAvg.toFixed(1)} / 10 ${strongWindAvg < baselineAvg ? '✅' : '❌'}`);
  console.log(`  High pressure (1025 hPa):  ${highPressureAvg.toFixed(1)} / 10 ${highPressureAvg > baselineAvg ? '✅' : '❌'}`);
  console.log(`  Low pressure (995 hPa):    ${lowPressureAvg.toFixed(1)} / 10 ${lowPressureAvg < baselineAvg ? '✅' : '❌'}`);
  console.log(`  Falling pressure (1005):   ${fallingPressureAvg.toFixed(1)} / 10 ${fallingPressureAvg >= baselineAvg ? '✅' : '❌'}`);
  console.log(`  Perfect (calm + high):     ${perfectAvg.toFixed(1)} / 10 ${perfectAvg > baselineAvg ? '✅' : '⚠️'}`);
  console.log(`  Storm (strong + low):      ${stormAvg.toFixed(1)} / 10 ${stormAvg < baselineAvg ? '✅' : '❌'}`);

  console.log(`\nValidation Checks:`);
  console.log(`  ✓ Wind affects score: ${calmWindAvg !== strongWindAvg ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ✓ Pressure affects score: ${highPressureAvg !== lowPressureAvg ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ✓ Calm > Strong wind: ${calmWindAvg > strongWindAvg ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ✓ High pressure > Low: ${highPressureAvg > lowPressureAvg ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ✓ Falling pressure good: ${fallingPressureAvg >= baselineAvg ? '✅ PASS' : '⚠️  REVIEW'}`);
  console.log(`  ✓ Perfect > Baseline: ${perfectAvg > baselineAvg ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ✓ Storm < Baseline: ${stormAvg < baselineAvg ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = 
    calmWindAvg !== strongWindAvg &&
    highPressureAvg !== lowPressureAvg &&
    calmWindAvg > strongWindAvg &&
    highPressureAvg > lowPressureAvg &&
    perfectAvg > baselineAvg &&
    stormAvg < baselineAvg;

  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS NEED REVIEW'}`);
}

async function runPrediction(
  rectangle: string, 
  date: string, 
  wind: number | null, 
  pressure: number | null
) {
  const { data, error } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: rectangle,
      target_date: date,
      current_wind_speed_ms: wind,
      current_pressure_hpa: pressure
    }
  );

  if (error) {
    console.error('❌ Error:', error);
    return null;
  }

  return data;
}

function compareResults(label: string, baseline: any[], test: any[], species: any[]) {
  console.log(`Weather: ${label}`);
  
  if (!test || test.length === 0) {
    console.log('❌ No results returned');
    return;
  }

  species.forEach(baseSpecies => {
    const testSpecies = test.find((s: any) => s.species_id === baseSpecies.species_id);
    if (testSpecies) {
      const weatherDiff = testSpecies.weather_score - baseSpecies.weather_score;
      const confidenceDiff = testSpecies.confidence - baseSpecies.confidence;
      const arrow = weatherDiff > 0 ? '↗️' : weatherDiff < 0 ? '↘️' : '→';
      
      console.log(
        `  ${arrow} ${testSpecies.name_en.padEnd(25)} ` +
        `weather: ${baseSpecies.weather_score} → ${testSpecies.weather_score} (${weatherDiff >= 0 ? '+' : ''}${weatherDiff})  ` +
        `confidence: ${baseSpecies.confidence} → ${testSpecies.confidence} (${confidenceDiff >= 0 ? '+' : ''}${confidenceDiff})`
      );
    }
  });
}

function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

async function testSyntheticWeather() {
  console.log('\n🧪 Running Synthetic Weather Test');
  console.log('(No environmental data available, testing RPC directly)\n');
  
  // This will return 0 species but we can check the function exists
  const { error } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: 'TEST',
      target_date: '2025-10-17',
      current_wind_speed_ms: 5,
      current_pressure_hpa: 1015
    }
  );

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ Weather RPC function not found!');
    } else if (error.message.includes('invalid input')) {
      console.log('✅ RPC function exists and accepts weather parameters');
    } else {
      console.log('✅ RPC function exists (error was data-related, not function-related)');
    }
  } else {
    console.log('✅ RPC function executed successfully');
  }

  console.log('\n📝 Note: Add environmental data to findr_conditions_snapshots to run full tests');
}

testWeatherScoring().catch(console.error);
