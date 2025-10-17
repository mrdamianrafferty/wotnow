/**
 * Test script for time-of-day scoring enhancement
 * 
 * Tests that:
 * 1. get_time_of_day_category function works correctly
 * 2. Both RPC functions return light_score field
 * 3. Dawn/dusk species (strong diurnal_sensitivity) get boosted scores
 * 4. Scores vary appropriately by time of day
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PredictionResult {
  species_id: string;
  species_code: string;
  name_en: string;
  scientific_name: string;
  confidence: number;
  bio_band_score: number;
  temp_score: number;
  substrate_score: number;
  depth_score?: number;
  light_score: number;  // NEW field
  freshness_score: number;
  completeness_score: number;
}

async function testTimeOfDayScoring() {
  console.log('🌅 Testing Time-of-Day Scoring Enhancement\n');
  console.log('='.repeat(70) + '\n');

  // Test 1: Check time category function
  console.log('Test 1: Time Category Function');
  console.log('-'.repeat(70));
  
  const testHours = [0, 6, 12, 18, 21];
  for (const hour of testHours) {
    const { data, error } = await supabase.rpc('get_time_of_day_category', { target_hour: hour });
    if (error) {
      console.error(`❌ Error for hour ${hour}:`, error.message);
    } else {
      console.log(`Hour ${String(hour).padStart(2, '0')}:00 → ${data}`);
    }
  }
  console.log('');

  // Test 2: Query basic predictions
  console.log('Test 2: Basic RPC Function (no GPS)');
  console.log('-'.repeat(70));
  
  const { data: basicData, error: basicError } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: '31F2',
      target_date: '2025-10-17'
    }
  );

  if (basicError) {
    console.error('❌ Basic RPC error:', basicError);
    return;
  }

  if (!basicData || !Array.isArray(basicData) || basicData.length === 0) {
    console.error('❌ No data returned from basic RPC');
    return;
  }

  const basicPredictions = basicData as PredictionResult[];
  console.log(`✅ Received ${basicPredictions.length} predictions\n`);

  // Show first 5 predictions with light scores
  console.log('Top 5 Species (with light_score):');
  basicPredictions.slice(0, 5).forEach((pred, idx) => {
    console.log(`\n${idx + 1}. ${pred.name_en} (${pred.species_code})`);
    console.log(`   Confidence: ${pred.confidence}/100`);
    console.log(`   Light Score: ${pred.light_score}/15 🌅`);
    console.log(`   Bio-bands: ${pred.bio_band_score}/30`);
    console.log(`   Temp: ${pred.temp_score}/25`);
  });
  console.log('\n');

  // Test 3: Enhanced predictions with GPS
  console.log('Test 3: Enhanced RPC Function (with GPS)');
  console.log('-'.repeat(70));
  
  const { data: enhancedData, error: enhancedError } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '31F2',
      target_date: '2025-10-17',
      user_lat: 50.7,
      user_lon: -1.3,
      user_substrate: 'rock',
      user_depth_m: 15
    }
  );

  if (enhancedError) {
    console.error('❌ Enhanced RPC error:', enhancedError);
    return;
  }

  if (!enhancedData || !Array.isArray(enhancedData) || enhancedData.length === 0) {
    console.error('❌ No data returned from enhanced RPC');
    return;
  }

  const enhancedPredictions = enhancedData as PredictionResult[];
  console.log(`✅ Received ${enhancedPredictions.length} predictions\n`);

  // Show first 5 predictions with all scores
  console.log('Top 5 Species (enhanced with depth/substrate):');
  enhancedPredictions.slice(0, 5).forEach((pred, idx) => {
    console.log(`\n${idx + 1}. ${pred.name_en} (${pred.species_code})`);
    console.log(`   Confidence: ${pred.confidence}/100`);
    console.log(`   Light Score: ${pred.light_score}/15 🌅`);
    console.log(`   Depth Score: ${pred.depth_score}/20`);
    console.log(`   Substrate: ${pred.substrate_score}/25`);
    console.log(`   Bio-bands: ${pred.bio_band_score}/30`);
  });
  console.log('\n');

  // Test 4: Find species with strong diurnal sensitivity
  console.log('Test 4: Species with Strong Diurnal Sensitivity');
  console.log('-'.repeat(70));

  const { data: diurnalSpecies, error: diurnalError } = await supabase
    .from('species')
    .select('species_code, name_en, diurnal_sensitivity')
    .eq('diurnal_sensitivity', 'strong')
    .limit(10);

  if (diurnalError) {
    console.error('❌ Error querying diurnal species:', diurnalError);
  } else if (diurnalSpecies && diurnalSpecies.length > 0) {
    console.log('Species that should score +15 at dawn/dusk:\n');
    diurnalSpecies.forEach(species => {
      const pred = basicPredictions.find(p => p.species_code === species.species_code);
      console.log(`  • ${species.name_en} (${species.species_code})`);
      if (pred) {
        console.log(`    Current light_score: ${pred.light_score}/15`);
      }
    });
  }
  console.log('\n');

  // Test 5: Current time context
  console.log('Test 5: Current Time Context');
  console.log('-'.repeat(70));
  const now = new Date();
  const hour = now.getUTCHours();
  const timeCategory = 
    [5, 6, 7].includes(hour) ? 'dawn' :
    [18, 19, 20].includes(hour) ? 'dusk' :
    hour >= 8 && hour <= 17 ? 'day' : 'night';
  
  console.log(`Current UTC hour: ${hour}`);
  console.log(`Time category: ${timeCategory}`);
  console.log(`\nExpected scoring for this time:`);
  console.log(`  • Strong diurnal species: ${timeCategory === 'dawn' || timeCategory === 'dusk' ? '15/15' : timeCategory === 'night' ? '12/15' : '8/15'}`);
  console.log(`  • Moderate diurnal species: ${timeCategory === 'dawn' || timeCategory === 'dusk' ? '10/15' : timeCategory === 'day' ? '12/15' : '8/15'}`);
  console.log(`  • Weak/default species: ${timeCategory === 'day' ? '10/15' : '8/15'}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Time-of-Day Scoring Test Complete!');
  console.log('='.repeat(70) + '\n');
}

testTimeOfDayScoring().catch(console.error);
