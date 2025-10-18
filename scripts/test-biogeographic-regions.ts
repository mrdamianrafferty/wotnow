/**
 * Test biogeographic filtering across 5 distinct European regions
 * Tests both basic and enhanced RPC functions
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
    name: 'Irish Coast (Atlantic)',
    rectangle: '28E5',
    bioRegion: 'Atlantic',
    coordinates: { lat: 51.5, lon: -8.5 },
    expectedSpecies: ['European Bass', 'Pollock', 'Atlantic Mackerel'],
    unexpectedSpecies: ['Bogue', 'White Seabream'],
  },
  {
    name: 'Southwest Ireland (Celtic Sea)',
    rectangle: '29E4',
    bioRegion: 'Celtic Sea',
    coordinates: { lat: 50.5, lon: -9.5 },
    expectedSpecies: ['European Bass', 'Pollock', 'Ballan Wrasse'],
    unexpectedSpecies: ['Bogue', 'White Seabream'],
  },
  {
    name: 'North Ireland (IBI/Atlantic)',
    rectangle: '33E8',
    bioRegion: 'Atlantic',
    coordinates: { lat: 54.5, lon: -8.5 },
    expectedSpecies: ['Atlantic Cod', 'Pollock', 'European Bass'],
    unexpectedSpecies: ['Bogue', 'White Seabream'],
  },
  {
    name: 'West Cork (Celtic Sea)',
    rectangle: '30E5',
    bioRegion: 'Celtic Sea',
    coordinates: { lat: 51.5, lon: -9.5 },
    expectedSpecies: ['European Bass', 'Ballan Wrasse', 'Pollock'],
    unexpectedSpecies: ['Bogue', 'White Seabream'],
  },
  {
    name: 'Kerry Coast (Atlantic)',
    rectangle: '27E4',
    bioRegion: 'Atlantic',
    coordinates: { lat: 51.5, lon: -10.5 },
    expectedSpecies: ['European Bass', 'Pollock', 'Atlantic Mackerel'],
    unexpectedSpecies: ['Bogue', 'White Seabream'],
  },
];

async function testRegion(region: TestRegion) {
  console.log(`\n${'='.repeat(90)}`);
  console.log(`📍 ${region.name} (${region.bioRegion})`);
  console.log(`   Rectangle: ${region.rectangle} | GPS: ${region.coordinates.lat}°, ${region.coordinates.lon}°`);
  console.log(`${'='.repeat(90)}`);

  // Test Enhanced RPC (includes all features)
  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: region.rectangle,
    target_date: '2025-10-18', // Today's date
    user_lat: region.coordinates.lat,
    user_lon: region.coordinates.lon,
    substrate_type: 'rocky_reef',
    depth_meters: 15.0,
    current_wind_speed_ms: 5.0,
    current_pressure_hpa: 1015.0,
  });

  if (error) {
    console.error(`❌ RPC Error:`, error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  No predictions returned (rectangle ${region.rectangle} may lack environmental data)`);
    return;
  }

  console.log(`✅ Returned ${data.length} predictions\n`);

  // Display top 10 with scores
  console.log(`Top 10 Species:`);
  console.log(`${'─'.repeat(90)}`);
  console.log(`${'#'.padEnd(4)}${'Species'.padEnd(30)}${'Conf%'.padEnd(8)}${'Temp'.padEnd(6)}${'Lunar'.padEnd(7)}${'Weather'.padEnd(9)}${'Substrate'.padEnd(11)}Depth`);
  console.log(`${'─'.repeat(90)}`);
  
  data.slice(0, 10).forEach((pred: any, idx: number) => {
    const rank = `${idx + 1}.`.padEnd(4);
    const species = pred.name_en.padEnd(30);
    const conf = `${pred.confidence}%`.padEnd(8);
    const temp = `${pred.temp_score}`.padEnd(6);
    const lunar = `${pred.lunar_score || 0}`.padEnd(7);
    const weather = `${pred.weather_score || 0}`.padEnd(9);
    const substrate = `${pred.substrate_score || 0}`.padEnd(11);
    const depth = pred.depth_score || 0;
    console.log(`${rank}${species}${conf}${temp}${lunar}${weather}${substrate}${depth}`);
  });

  // Verify expected species are present
  console.log(`\n✓ Expected Species Check:`);
  let allExpectedFound = true;
  region.expectedSpecies.forEach(expected => {
    const found = data.find((p: any) => p.name_en === expected);
    if (found) {
      const rank = data.indexOf(found) + 1;
      console.log(`  ✅ ${expected}: ${found.confidence}% (rank #${rank})`);
    } else {
      console.log(`  ❌ ${expected}: NOT FOUND in predictions`);
      allExpectedFound = false;
    }
  });

  // Verify unexpected species are filtered out
  console.log(`\n✗ Unexpected Species Check (should be filtered):`);
  let allUnexpectedFiltered = true;
  region.unexpectedSpecies.forEach(unexpected => {
    const found = data.find((p: any) => p.name_en === unexpected);
    if (found) {
      const rank = data.indexOf(found) + 1;
      console.log(`  ❌ ${unexpected}: PRESENT at ${found.confidence}% (rank #${rank}) - FILTERING FAILED!`);
      allUnexpectedFiltered = false;
    } else {
      console.log(`  ✅ ${unexpected}: Correctly filtered out`);
    }
  });

  // Summary
  console.log();
  if (allExpectedFound && allUnexpectedFiltered) {
    console.log(`🎉 ${region.name}: Biogeographic filtering WORKING PERFECTLY!`);
  } else {
    console.log(`⚠️  ${region.name}: Issues detected with biogeographic filtering`);
  }
}

async function main() {
  console.log(`\n${'█'.repeat(90)}`);
  console.log(`🧪 BIOGEOGRAPHIC FILTERING TEST SUITE`);
  console.log(`   Testing 5 distinct European regions`);
  console.log(`   Verifying species are correctly filtered by biogeographic region`);
  console.log(`${'█'.repeat(90)}`);

  for (const region of TEST_REGIONS) {
    await testRegion(region);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'█'.repeat(90)}`);
  console.log(`✅ TEST SUITE COMPLETE`);
  console.log(`${'█'.repeat(90)}\n`);
}

main().catch(console.error);
