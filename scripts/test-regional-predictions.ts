/**
 * Test RPC predictions across 5 distinct European regions
 * Verifies biogeographic filtering and temperature scoring work correctly
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PredictionResult {
  name_en: string;
  scientific_name: string;
  confidence: number;
  temp_score: number;
  bio_band_score: number;
  lunar_score?: number;
  weather_score?: number;
  substrate_score?: number;
  depth_score?: number;
}

interface TestRegion {
  name: string;
  rectangle: string;
  bioRegion: string;
  coordinates: { lat: number; lon: number };
  expectedSpecies: string[];
  unexpectedSpecies: string[]; // Mediterranean species that shouldn't appear
}

const TEST_REGIONS: TestRegion[] = [
  {
    name: 'Galician Coast (Atlantic)',
    rectangle: '21D8',
    bioRegion: 'Atlantic',
    coordinates: { lat: 43.5, lon: -9.0 },
    expectedSpecies: ['European Bass', 'Pollock', 'Atlantic Mackerel', 'Red Scorpionfish'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber'],
  },
  {
    name: 'Bay of Biscay',
    rectangle: '25E1',
    bioRegion: 'Bay of Biscay',
    coordinates: { lat: 45.5, lon: -2.0 },
    expectedSpecies: ['European Bass', 'Pollock', 'Atlantic Mackerel', 'Ballan Wrasse'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber'],
  },
  {
    name: 'Mediterranean (Spanish Coast)',
    rectangle: '07E7',
    bioRegion: 'Mediterranean',
    coordinates: { lat: 41.0, lon: 2.5 },
    expectedSpecies: ['Bogue', 'White Seabream', 'Red Scorpionfish', 'European Bass'],
    unexpectedSpecies: ['Atlantic Cod', 'Haddock'], // Cold water species
  },
  {
    name: 'North Sea',
    rectangle: '41F3',
    bioRegion: 'North Sea',
    coordinates: { lat: 55.0, lon: 3.5 },
    expectedSpecies: ['Atlantic Cod', 'Haddock', 'Pollock', 'Plaice'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber'],
  },
  {
    name: 'Celtic Sea',
    rectangle: '31E3',
    bioRegion: 'Celtic Sea',
    coordinates: { lat: 50.5, lon: -6.5 },
    expectedSpecies: ['European Bass', 'Pollock', 'Atlantic Mackerel', 'Ballan Wrasse'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber'],
  },
];

async function testBasicRPC(region: TestRegion): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📍 ${region.name} - BASIC RPC (No GPS)`);
  console.log(`   Rectangle: ${region.rectangle} | Expected Region: ${region.bioRegion}`);
  console.log(`${'='.repeat(80)}`);

  const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: region.rectangle,
    target_date: new Date().toISOString().split('T')[0],
    current_wind_speed_ms: 5.0,
    current_pressure_hpa: 1015.0,
  });

  if (error) {
    console.error(`❌ Error:`, error);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  No predictions returned`);
    return;
  }

  console.log(`✅ Returned ${data.length} predictions\n`);

  // Show top 10
  console.log(`Top 10 Species:`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`${'Rank'.padEnd(6)}${'Species'.padEnd(30)}${'Confidence'.padEnd(12)}${'Temp'.padEnd(8)}Bio`);
  console.log(`${'─'.repeat(80)}`);
  
  data.slice(0, 10).forEach((pred: PredictionResult, idx: number) => {
    const rank = `${idx + 1}.`.padEnd(6);
    const species = pred.name_en.padEnd(30);
    const confidence = `${pred.confidence}%`.padEnd(12);
    const temp = `${pred.temp_score}`.padEnd(8);
    const bio = pred.bio_band_score;
    console.log(`${rank}${species}${confidence}${temp}${bio}`);
  });

  // Check for expected species
  console.log(`\n✓ Expected Species Check:`);
  region.expectedSpecies.forEach(expectedSpecies => {
    const found = data.find((p: PredictionResult) => p.name_en === expectedSpecies);
    if (found) {
      console.log(`  ✅ ${expectedSpecies}: ${found.confidence}% (rank ${data.indexOf(found) + 1})`);
    } else {
      console.log(`  ⚠️  ${expectedSpecies}: NOT FOUND`);
    }
  });

  // Check for unexpected species (should be filtered)
  console.log(`\n✗ Unexpected Species Check (should be filtered):`);
  let filteringWorks = true;
  region.unexpectedSpecies.forEach(unexpectedSpecies => {
    const found = data.find((p: PredictionResult) => p.name_en === unexpectedSpecies);
    if (found) {
      console.log(`  ❌ ${unexpectedSpecies}: ${found.confidence}% (rank ${data.indexOf(found) + 1}) - SHOULD BE FILTERED!`);
      filteringWorks = false;
    } else {
      console.log(`  ✅ ${unexpectedSpecies}: Correctly filtered`);
    }
  });

  if (filteringWorks) {
    console.log(`\n🎉 Biogeographic filtering working correctly!`);
  } else {
    console.log(`\n⚠️  Biogeographic filtering issues detected`);
  }
}

async function testEnhancedRPC(region: TestRegion): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📍 ${region.name} - ENHANCED RPC (With GPS)`);
  console.log(`   Rectangle: ${region.rectangle} | GPS: ${region.coordinates.lat}, ${region.coordinates.lon}`);
  console.log(`${'='.repeat(80)}`);

  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: region.rectangle,
    target_date: new Date().toISOString().split('T')[0],
    user_lat: region.coordinates.lat,
    user_lon: region.coordinates.lon,
    substrate_type: 'rocky_reef',
    depth_meters: 15.0,
    current_wind_speed_ms: 5.0,
    current_pressure_hpa: 1015.0,
  });

  if (error) {
    console.error(`❌ Error:`, error);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  No predictions returned`);
    return;
  }

  console.log(`✅ Returned ${data.length} predictions\n`);

  // Show top 10 with all scores
  console.log(`Top 10 Species (Enhanced Scoring):`);
  console.log(`${'─'.repeat(100)}`);
  console.log(`${'Rank'.padEnd(6)}${'Species'.padEnd(25)}${'Conf%'.padEnd(8)}${'Temp'.padEnd(6)}${'Bio'.padEnd(6)}${'Lunar'.padEnd(7)}${'Weather'.padEnd(9)}${'Substrate'.padEnd(11)}Depth`);
  console.log(`${'─'.repeat(100)}`);
  
  data.slice(0, 10).forEach((pred: PredictionResult, idx: number) => {
    const rank = `${idx + 1}.`.padEnd(6);
    const species = pred.name_en.padEnd(25);
    const confidence = `${pred.confidence}%`.padEnd(8);
    const temp = `${pred.temp_score}`.padEnd(6);
    const bio = `${pred.bio_band_score}`.padEnd(6);
    const lunar = `${pred.lunar_score || 0}`.padEnd(7);
    const weather = `${pred.weather_score || 0}`.padEnd(9);
    const substrate = `${pred.substrate_score || 0}`.padEnd(11);
    const depth = pred.depth_score || 0;
    console.log(`${rank}${species}${confidence}${temp}${bio}${lunar}${weather}${substrate}${depth}`);
  });

  // Check for expected species
  console.log(`\n✓ Expected Species Check:`);
  region.expectedSpecies.forEach(expectedSpecies => {
    const found = data.find((p: PredictionResult) => p.name_en === expectedSpecies);
    if (found) {
      console.log(`  ✅ ${expectedSpecies}: ${found.confidence}% (rank ${data.indexOf(found) + 1})`);
    } else {
      console.log(`  ⚠️  ${expectedSpecies}: NOT FOUND`);
    }
  });

  // Check for unexpected species (should be filtered)
  console.log(`\n✗ Unexpected Species Check (should be filtered):`);
  let filteringWorks = true;
  region.unexpectedSpecies.forEach(unexpectedSpecies => {
    const found = data.find((p: PredictionResult) => p.name_en === unexpectedSpecies);
    if (found) {
      console.log(`  ❌ ${unexpectedSpecies}: ${found.confidence}% (rank ${data.indexOf(found) + 1}) - SHOULD BE FILTERED!`);
      filteringWorks = false;
    } else {
      console.log(`  ✅ ${unexpectedSpecies}: Correctly filtered`);
    }
  });

  if (filteringWorks) {
    console.log(`\n🎉 Biogeographic filtering working correctly!`);
  } else {
    console.log(`\n⚠️  Biogeographic filtering issues detected`);
  }
}

async function main() {
  console.log(`\n${'█'.repeat(80)}`);
  console.log(`🧪 REGIONAL PREDICTION TEST SUITE`);
  console.log(`   Testing biogeographic filtering across 5 European regions`);
  console.log(`   Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`${'█'.repeat(80)}\n`);

  // First, check which rectangles have data
  console.log(`📊 Checking for rectangles with environmental data...\n`);
  const { data: rectanglesWithData, error: dataError } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, captured_at')
    .order('captured_at', { ascending: false })
    .limit(100);

  if (dataError) {
    console.error('Error checking data:', dataError);
  } else if (rectanglesWithData && rectanglesWithData.length > 0) {
    const uniqueRectangles = [...new Set(rectanglesWithData.map(r => r.rectangle_code))];
    const latestDate = rectanglesWithData[0]?.captured_at;
    console.log(`✅ Found ${uniqueRectangles.length} rectangles with data (latest: ${latestDate}):`);
    console.log(`   ${uniqueRectangles.slice(0, 20).join(', ')}${uniqueRectangles.length > 20 ? '...' : ''}\n`);
    
    // Update TEST_REGIONS to use rectangles that have data
    const availableRectangles = new Set(uniqueRectangles);
    TEST_REGIONS.forEach(region => {
      if (!availableRectangles.has(region.rectangle)) {
        console.log(`⚠️  ${region.name} (${region.rectangle}) has no data, will show 0 predictions`);
      }
    });
    console.log();
  }

  for (const region of TEST_REGIONS) {
    // Test basic RPC (no GPS)
    await testBasicRPC(region);
    
    // Wait a bit to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test enhanced RPC (with GPS)
    await testEnhancedRPC(region);
    
    // Wait before next region
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'█'.repeat(80)}`);
  console.log(`✅ REGIONAL TEST SUITE COMPLETE`);
  console.log(`${'█'.repeat(80)}\n`);
}

main().catch(console.error);
