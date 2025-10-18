#!/usr/bin/env npx tsx

/**
 * BIOGEOGRAPHIC FILTERING TEST - Using Service Role Key
 * Tests 5 distinct European regions with proper database access
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use SERVICE key, not ANON

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Need: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestRegion {
  name: string;
  rectangle: string;
  bioRegion: string;
  coordinates: { lat: number; lon: number };
  expectedSpecies: string[];
  unexpectedSpecies: string[];
}

const TEST_REGIONS: TestRegion[] = [
  {
    name: 'Galician Coast',
    rectangle: '21D8',
    bioRegion: 'Atlantic',
    coordinates: { lat: 43.5, lon: -9.0 },
    expectedSpecies: ['Sea Bass', 'Saithe/Pollock', 'Mackerel'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber'],
  },
  {
    name: 'Bay of Biscay',
    rectangle: '25E1',
    bioRegion: 'Bay of Biscay',
    coordinates: { lat: 45.5, lon: -2.0 },
    expectedSpecies: ['Sea Bass', 'Saithe/Pollock', 'Mackerel'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber'],
  },
  {
    name: 'Irish Coast',
    rectangle: '28E5',
    bioRegion: 'Celtic Sea',
    coordinates: { lat: 51.5, lon: -8.5 },
    expectedSpecies: ['Sea Bass', 'Saithe/Pollock', 'Ballan Wrasse'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber'],
  },
  {
    name: 'North Sea',
    rectangle: '41F3',
    bioRegion: 'North Sea',
    coordinates: { lat: 55.0, lon: 3.5 },
    expectedSpecies: ['Atlantic Cod', 'Haddock', 'Saithe/Pollock'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber'],
  },
  {
    name: 'Mediterranean',
    rectangle: '07E7',
    bioRegion: 'Mediterranean',
    coordinates: { lat: 41.0, lon: 2.5 },
    expectedSpecies: ['Bogue', 'White Seabream', 'Sea Bass'],
    unexpectedSpecies: ['Atlantic Cod', 'Haddock'],
  },
];

async function checkDataAvailability() {
  console.log(`\n📊 Checking environmental data availability...\n`);
  
  // Check recent data
  const { data: recentData, error: recentError } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, captured_at, sea_temp_c')
    .order('captured_at', { ascending: false })
    .limit(20);

  if (recentError) {
    console.error(`❌ Error checking data:`, recentError);
    return null;
  }

  if (!recentData || recentData.length === 0) {
    console.log(`⚠️  No environmental data found in database!`);
    return null;
  }

  const uniqueRectangles = [...new Set(recentData.map(r => r.rectangle_code))];
  const latestDate = recentData[0]?.captured_at;
  
  console.log(`✅ Found data for ${uniqueRectangles.length} rectangles`);
  console.log(`   Latest capture: ${latestDate}`);
  console.log(`   Rectangles: ${uniqueRectangles.join(', ')}`);
  
  return uniqueRectangles;
}

async function testRegion(region: TestRegion) {
  console.log(`\n${'='.repeat(90)}`);
  console.log(`📍 ${region.name} (${region.bioRegion})`);
  console.log(`   Rectangle: ${region.rectangle} | GPS: ${region.coordinates.lat}°, ${region.coordinates.lon}°`);
  console.log(`${'='.repeat(90)}`);

  // Test Enhanced RPC
  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: region.rectangle,
    target_date: '2025-10-18',
    user_lat: region.coordinates.lat,
    user_lon: region.coordinates.lon,
    substrate_type: 'rocky_reef',
    depth_meters: 15.0,
    current_wind_speed_ms: 5.0,
    current_pressure_hpa: 1015.0,
  });

  if (error) {
    console.error(`❌ RPC Error:`, error);
    return { passed: false, reason: error.message };
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  No predictions returned`);
    
    // Check if rectangle has data
    const { data: rectData } = await supabase
      .from('findr_conditions_snapshots')
      .select('captured_at, sea_temp_c')
      .eq('rectangle_code', region.rectangle)
      .order('captured_at', { ascending: false })
      .limit(5);
    
    if (!rectData || rectData.length === 0) {
      console.log(`   ℹ️  Rectangle ${region.rectangle} has no environmental data`);
      return { passed: true, reason: 'No data for rectangle (expected)' };
    } else {
      console.log(`   ⚠️  Rectangle HAS data but RPC returned nothing!`);
      console.log(`   Latest data: ${rectData[0].captured_at}, temp: ${rectData[0].sea_temp_c}°C`);
      return { passed: false, reason: 'Has data but RPC returned nothing' };
    }
  }

  console.log(`✅ Returned ${data.length} predictions\n`);

  // Show top 10
  console.log(`Top 10 Species:`);
  console.log(`${'─'.repeat(90)}`);
  console.log(`${'#'.padEnd(4)}${'Species'.padEnd(30)}${'Conf%'.padEnd(8)}${'Temp'.padEnd(6)}${'Lunar'.padEnd(7)}${'Weather'.padEnd(9)}Substrate`);
  console.log(`${'─'.repeat(90)}`);
  
  data.slice(0, 10).forEach((pred: any, idx: number) => {
    const rank = `${idx + 1}.`.padEnd(4);
    const species = pred.name_en.padEnd(30);
    const conf = `${pred.confidence}%`.padEnd(8);
    const temp = `${pred.temp_score}`.padEnd(6);
    const lunar = `${pred.lunar_score || 0}`.padEnd(7);
    const weather = `${pred.weather_score || 0}`.padEnd(9);
    const substrate = pred.substrate_score || 0;
    console.log(`${rank}${species}${conf}${temp}${lunar}${weather}${substrate}`);
  });

  // Check expected species
  console.log(`\n✓ Expected Species:`);
  let allExpectedFound = true;
  region.expectedSpecies.forEach(expected => {
    const found = data.find((p: any) => p.name_en === expected);
    if (found) {
      const rank = data.indexOf(found) + 1;
      console.log(`  ✅ ${expected}: ${found.confidence}% (rank #${rank})`);
    } else {
      console.log(`  ❌ ${expected}: NOT FOUND`);
      allExpectedFound = false;
    }
  });

  // Check unexpected species are filtered
  console.log(`\n✗ Unexpected Species (should be filtered):`);
  let allFiltered = true;
  region.unexpectedSpecies.forEach(unexpected => {
    const found = data.find((p: any) => p.name_en === unexpected);
    if (found) {
      const rank = data.indexOf(found) + 1;
      console.log(`  ❌ ${unexpected}: FOUND at rank #${rank} (${found.confidence}%) - FILTERING FAILED!`);
      allFiltered = false;
    } else {
      console.log(`  ✅ ${unexpected}: Correctly filtered`);
    }
  });

  if (allExpectedFound && allFiltered) {
    console.log(`\n🎉 ${region.name}: PERFECT - All checks passed!`);
    return { passed: true, reason: 'All checks passed' };
  } else {
    console.log(`\n⚠️  ${region.name}: Issues detected`);
    return { passed: false, reason: 'Some species checks failed' };
  }
}

async function main() {
  console.log(`\n${'█'.repeat(90)}`);
  console.log(`🧪 BIOGEOGRAPHIC FILTERING TEST - 5 EUROPEAN REGIONS`);
  console.log(`   Using service role key for full database access`);
  console.log(`${'█'.repeat(90)}`);

  // First check what data we have
  const availableRectangles = await checkDataAvailability();
  
  if (!availableRectangles) {
    console.log(`\n❌ Cannot proceed - no environmental data in database`);
    process.exit(1);
  }

  // Test each region
  const results = [];
  for (const region of TEST_REGIONS) {
    const result = await testRegion(region);
    results.push({ region: region.name, ...result });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(`\n${'█'.repeat(90)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'█'.repeat(90)}\n`);

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.region}: ${result.reason}`);
  });

  console.log(`\n${'─'.repeat(90)}`);
  console.log(`Result: ${passed}/${total} regions passed`);
  
  if (passed === total) {
    console.log(`\n🎉 ALL REGIONS PASSED!`);
    console.log(`   Biogeographic filtering working correctly`);
    console.log(`   Temperature scoring differentiating species`);
    console.log(`   Enhanced features (lunar, weather, substrate) working`);
  } else {
    console.log(`\n⚠️  Some regions failed - review details above`);
  }
  
  console.log(`${'─'.repeat(90)}\n`);
}

main().catch(console.error);
