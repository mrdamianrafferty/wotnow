#!/usr/bin/env tsx
/**
 * Test Pressure Trend Calculation
 *
 * Quick test to verify:
 * 1. MET Norway API returns pressure data
 * 2. Trend calculation works correctly
 * 3. Database insertion succeeds
 *
 * Usage: tsx scripts/test-pressure-trend.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  calculatePressureTrend,
  roundCoordinates,
  type MetNoTimeseriesEntry
} from '../lib/utils/pressureTrends';

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
const rounded = roundCoordinates(testLat, testLon);

console.log('🧪 Testing Pressure Trend System');
console.log('================================');
console.log('');
console.log('Test coordinate (Brighton, UK):');
console.log(`  Original: (${testLat}, ${testLon})`);
console.log(`  Rounded:  (${rounded.lat}, ${rounded.lon})`);
console.log('');

async function test() {
  // Step 1: Fetch MET Norway data
  console.log('📡 Step 1: Fetching MET Norway data...');
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${rounded.lat}&lon=${rounded.lon}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'FishFindr/1.0 contact@fishfindr.eu'
    }
  });

  if (!response.ok) {
    console.error(`❌ MET Norway API error: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log(`✓ Received ${data.properties.timeseries.length} timeseries entries`);
  console.log('');

  // Step 2: Calculate trend
  console.log('🧮 Step 2: Calculating pressure trend...');
  const timeseries: MetNoTimeseriesEntry[] = data.properties.timeseries;
  const trend = calculatePressureTrend(timeseries);

  console.log(`✓ Trend calculated:`);
  console.log(`    Category: ${trend.category}`);
  console.log(`    Pressure now: ${trend.pressureNow?.toFixed(1)} hPa`);
  console.log(`    Pressure 3h ago: ${trend.pressure3hAgo?.toFixed(1)} hPa`);
  console.log(`    Pressure 6h ago: ${trend.pressure6hAgo?.toFixed(1)} hPa`);
  console.log(`    Delta 3h: ${trend.delta3h?.toFixed(1)} hPa`);
  console.log(`    Delta 6h: ${trend.delta6h?.toFixed(1)} hPa`);
  console.log(`    Explanation: ${trend.explanation}`);
  console.log('');

  // Step 3: Test database insertion
  console.log('💾 Step 3: Testing database insertion...');
  const capturedAt = new Date();

  const { data: insertData, error } = await supabase
    .from('pressure_snapshots')
    .upsert({
      lat_rounded: rounded.lat,
      lon_rounded: rounded.lon,
      captured_at: capturedAt.toISOString(),
      pressure_hpa: trend.pressureNow,
      pressure_3h_ago_hpa: trend.pressure3hAgo,
      pressure_6h_ago_hpa: trend.pressure6hAgo,
      trend_3h_hpa: trend.delta3h,
      trend_6h_hpa: trend.delta6h,
      trend_category: trend.category,
      source: 'met_norway',
      raw_json: { timeseries: timeseries.slice(0, 5) }
    }, {
      onConflict: 'lat_rounded,lon_rounded,captured_at'
    })
    .select();

  if (error) {
    console.error('❌ Database insertion failed:', error);
    process.exit(1);
  }

  console.log('✓ Successfully inserted/updated pressure snapshot');
  console.log('');

  // Step 4: Test helper function
  console.log('🔍 Step 4: Testing get_pressure_trend() helper function...');

  const { data: helperData, error: helperError } = await supabase
    .rpc('get_pressure_trend', {
      p_lat: testLat,
      p_lon: testLon,
      p_time: capturedAt.toISOString()
    });

  if (helperError) {
    console.error('❌ Helper function error:', helperError);
    process.exit(1);
  }

  if (!helperData || helperData.length === 0) {
    console.error('❌ Helper function returned no data');
    process.exit(1);
  }

  const result = helperData[0];
  console.log('✓ Helper function returned:');
  console.log(`    Pressure: ${result.pressure_hpa} hPa`);
  console.log(`    Trend 3h: ${result.trend_3h_hpa} hPa`);
  console.log(`    Category: ${result.trend_category}`);
  console.log(`    Age: ${result.age_minutes} minutes`);
  console.log('');

  // Success!
  console.log('✅ All tests passed!');
  console.log('');
  console.log('Next step: Run the full poll script:');
  console.log('  tsx scripts/poll-pressure-trends.ts');
  console.log('');
}

test().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
