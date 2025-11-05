#!/usr/bin/env tsx
/**
 * Test RPC Function with Real-Time Pressure Data
 *
 * Verifies that get_global_fishing_predictions() correctly:
 * 1. Queries pressure_snapshots table
 * 2. Calculates weather_score with real-time pressure trends
 * 3. Returns complete predictions with all bite score components
 *
 * Usage: tsx scripts/test-rpc-with-pressure.ts
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test coordinate: Brighton, UK (51.5°N, 0°W)
const testLat = 51.5;
const testLon = -0.1;

console.log('🧪 Testing get_global_fishing_predictions() with Real-Time Pressure Data');
console.log('==========================================================================');
console.log('');
console.log('Test coordinate (Brighton, UK):');
console.log(`  Latitude: ${testLat}`);
console.log(`  Longitude: ${testLon}`);
console.log('');

async function test() {
  // Step 1: Check if we have pressure data for this location
  console.log('📊 Step 1: Checking for pressure data...');
  const { data: pressureData, error: pressureError } = await supabase
    .rpc('get_pressure_trend', {
      p_lat: testLat,
      p_lon: testLon,
      p_time: new Date().toISOString()
    });

  if (pressureError) {
    console.error('❌ Error fetching pressure data:', pressureError);
  } else if (!pressureData || pressureData.length === 0) {
    console.log('⚠️  No pressure data found for this location');
    console.log('   This is expected if poll-pressure-trends.ts hasn\'t run yet');
    console.log('');
  } else {
    const pressure = pressureData[0];
    console.log('✓ Found pressure data:');
    console.log(`    Pressure: ${pressure.pressure_hpa} hPa`);
    console.log(`    Trend (3h): ${pressure.trend_3h_hpa} hPa`);
    console.log(`    Category: ${pressure.trend_category}`);
    console.log(`    Age: ${pressure.age_minutes} minutes`);
    console.log('');
  }

  // Step 2: Call get_global_fishing_predictions()
  console.log('🎣 Step 2: Calling get_global_fishing_predictions()...');
  const { data: predictions, error: rpcError } = await supabase
    .rpc('get_global_fishing_predictions', {
      user_lat: testLat,
      user_lon: testLon,
      target_date: new Date().toISOString().split('T')[0],  // Today's date
      p_lang: 'en'
    });

  if (rpcError) {
    console.error('❌ RPC error:', rpcError);
    process.exit(1);
  }

  if (!predictions || predictions.length === 0) {
    console.error('❌ No predictions returned');
    process.exit(1);
  }

  console.log(`✓ Received ${predictions.length} predictions`);
  console.log('');

  // Step 3: Analyze top 3 predictions
  console.log('🔍 Step 3: Analyzing top 3 predictions...');
  console.log('');

  const top3 = predictions.slice(0, 3);

  for (let i = 0; i < top3.length; i++) {
    const pred = top3[i];
    console.log(`${i + 1}. ${pred.name_en} (${pred.scientific_name})`);
    console.log(`   ========================================`);
    console.log(`   Bite Score: ${pred.bite_score}/100`);
    console.log(`   Confidence: ${pred.confidence}%`);
    console.log(`   Data Source: ${pred.data_source}`);
    console.log('');
    console.log('   Score Breakdown:');
    console.log(`   • Temperature: ${pred.temp_score} pts`);
    console.log(`   • Light: ${pred.light_score} pts`);
    console.log(`   • Lunar (base): ${pred.lunar_score} pts`);
    console.log(`   • Solunar (bonus): ${pred.solunar_score} pts`);
    console.log(`   • Weather (pressure): ${pred.weather_score} pts  ← REAL-TIME`);
    console.log(`   • Tidal: ${pred.tidal_score} pts`);
    console.log(`   • Substrate: ${pred.substrate_score} pts`);
    console.log(`   • Depth: ${pred.depth_score} pts`);
    console.log(`   • Habitat: ${pred.habitat_bonus} pts`);
    console.log('');
    console.log(`   Moon Phase: ${pred.moon_phase} (${(pred.moon_illumination * 100).toFixed(1)}% illuminated)`);
    console.log('');
  }

  // Step 4: Verify data source indicates real-time pressure
  console.log('✅ Step 4: Verification Summary');
  console.log('================================');
  console.log('');

  const dataSource = predictions[0].data_source;
  if (dataSource.includes('Pressure')) {
    console.log('✓ Data source indicates real-time pressure data');
    console.log(`  Data source: "${dataSource}"`);
  } else {
    console.log('⚠️  Data source does not indicate pressure data');
    console.log(`  Data source: "${dataSource}"`);
  }
  console.log('');

  // Check if weather_score varies between species (indicates species-specific weighting)
  const weatherScores = top3.map(p => p.weather_score);
  const uniqueWeatherScores = new Set(weatherScores);

  if (uniqueWeatherScores.size > 1) {
    console.log('✓ Weather scores vary by species (species-specific pressure sensitivity)');
    console.log(`  Scores: ${Array.from(uniqueWeatherScores).join(', ')}`);
  } else {
    console.log('⚠️  All weather scores are identical (may not be using species sensitivity)');
    console.log(`  Score: ${weatherScores[0]}`);
  }
  console.log('');

  console.log('✅ RPC function test complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run poll-pressure-trends.ts to populate pressure_snapshots');
  console.log('  2. Monitor bite score changes as pressure updates hourly');
  console.log('  3. Set up GitHub Actions cron for automated polling');
  console.log('');
}

test().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
