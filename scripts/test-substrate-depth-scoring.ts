#!/usr/bin/env node
/**
 * Test enhanced confidence scoring with lat/lon-based substrate and depth scoring
 * Tests different locations showing substrate and depth impact on confidence
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

// Test locations
const TEST_LOCATIONS = [
  {
    name: 'Shallow rocky reef (Cornwall)',
    rectangle: '31F1',
    lat: 50.1,
    lon: -5.5,
    expectedSubstrate: 'rock',
    expectedDepth: 8,
  },
  {
    name: 'Deep sandy area (North Sea)',
    rectangle: '37I0',
    lat: 54.5,
    lon: 0.5,
    expectedSubstrate: 'sand',
    expectedDepth: 45,
  },
  {
    name: 'No location (baseline)',
    rectangle: '37I0',
    lat: null,
    lon: null,
    expectedSubstrate: null,
    expectedDepth: null,
  },
];

// Focus species for comparison
const FOCUS_SPECIES = ['Wrasse', 'Bass', 'Mullet'];

async function testEnhancedPredictions() {
  console.log('\n🧪 Testing Enhanced Confidence Scoring with Substrate & Depth\n');
  console.log('=' .repeat(80));

  for (const location of TEST_LOCATIONS) {
    console.log(`\n📍 Location: ${location.name}`);
    console.log(`   Rectangle: ${location.rectangle}`);
    if (location.lat && location.lon) {
      console.log(`   Coordinates: ${location.lat}, ${location.lon}`);
      console.log(`   Expected: ${location.expectedSubstrate} substrate, ${location.expectedDepth}m depth`);
    } else {
      console.log(`   Coordinates: None (baseline test)`);
    }
    console.log('-'.repeat(80));

    const params = location.lat && location.lon
      ? {
          target_rectangle: location.rectangle,
          target_date: '2025-10-16',
          user_lat: location.lat,
          user_lon: location.lon,
          user_substrate: location.expectedSubstrate,
          user_depth_m: location.expectedDepth,
        }
      : {
          target_rectangle: location.rectangle,
          target_date: '2025-10-16',
        };

    const functionName = location.lat && location.lon
      ? 'get_environmental_predictions_enhanced'
      : 'get_environmental_predictions_basic';

    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No predictions returned');
      continue;
    }

    // Filter to focus species
    const focusResults = data.filter((p: any) => 
      FOCUS_SPECIES.some(species => p.name_en?.includes(species))
    );

    console.log(`\n✅ Found ${data.length} predictions (showing ${focusResults.length} focus species):\n`);

    // Show top 10 by confidence to see actual differentiation
    const sorted = [...data].sort((a: any, b: any) => b.confidence - a.confidence);
    
    console.log('🏆 Top 5 by confidence:');
    sorted.slice(0, 5).forEach((pred: any, idx: number) => {
      const hasSubstrateDepth = 'substrate_score' in pred && 'depth_score' in pred;
      
      console.log(`${idx + 1}. ${pred.name_en}: ${pred.confidence}%`);
      if (hasSubstrateDepth) {
        console.log(`   🪨 Substrate: ${pred.substrate_score}/25, 🌊 Depth: ${pred.depth_score}/20`);
      }
    });
    
    console.log('\n📋 Focus species details:\n');

    focusResults.slice(0, 5).forEach((pred: any) => {
      const hasSubstrateDepth = 'substrate_score' in pred && 'depth_score' in pred;
      
      console.log(`${pred.name_en}:`);
      console.log(`  Confidence: ${pred.confidence}%`);
      console.log(`  Bio-bands: ${pred.bio_band_score}/30`);
      console.log(`  Temp: ${pred.temp_score}/25`);
      
      if (hasSubstrateDepth) {
        console.log(`  🪨 Substrate: ${pred.substrate_score}/25`);
        console.log(`  🌊 Depth: ${pred.depth_score}/20`);
      } else {
        console.log(`  Substrate: ${pred.substrate_score}/20 (legacy)`);
      }
      
      console.log(`  Freshness: ${pred.freshness_score}/${hasSubstrateDepth ? '15' : '20'}`);
      console.log(`  Completeness: ${pred.completeness_score}/15`);
      console.log('');
    });

    // Compare scores if we have multiple test runs
    if (location.lat && location.lon) {
      console.log('📊 Score Analysis:');
      const avgSubstrate = focusResults.reduce((sum: number, p: any) => sum + p.substrate_score, 0) / focusResults.length;
      const avgDepth = focusResults.reduce((sum: number, p: any) => sum + p.depth_score, 0) / focusResults.length;
      console.log(`  Average substrate score: ${avgSubstrate.toFixed(1)}/25`);
      console.log(`  Average depth score: ${avgDepth.toFixed(1)}/20`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete!');
  console.log('\nExpected results:');
  console.log('  - Shallow rocky reef: Wrasse should score high (20/20 depth, 25/25 substrate)');
  console.log('  - Deep sandy area: Flatfish should score high, rocky species lower');
  console.log('  - Baseline (no coords): All species get default 12pts for substrate & depth');
}

testEnhancedPredictions().catch(console.error);
