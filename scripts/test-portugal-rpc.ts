#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test with Portuguese waters (Pis location from screenshot)
const testLat = 39.5;
const testLon = -9.0;

console.log('🧪 Testing get_global_fishing_predictions() for Portuguese waters');
console.log('=================================================================');
console.log('');
console.log(`Test coordinate: (${testLat}, ${testLon})`);
console.log('');

async function test() {
  const { data, error } = await supabase.rpc('get_global_fishing_predictions', {
    user_lat: testLat,
    user_lon: testLon,
    target_date: '2025-11-05',
    p_lang: 'en'
  });

  if (error) {
    console.error('❌ RPC Error:');
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log(`✓ RPC call succeeded`);
  console.log(`  Returned ${data?.length || 0} predictions`);
  console.log('');

  if (!data || data.length === 0) {
    console.error('❌ No predictions returned (should have data for Portuguese waters)');
    process.exit(1);
  }

  // Show first 3 predictions with Phase 2 fields
  console.log('Top 3 predictions:');
  data.slice(0, 3).forEach((pred: any, i: number) => {
    console.log(`${i + 1}. ${pred.name_en}`);
    console.log(`   Bite score: ${pred.bite_score}, Weather score: ${pred.weather_score}`);
    console.log(`   Solunar score: ${pred.solunar_score !== undefined ? pred.solunar_score : 'NOT PRESENT ❌'}`);
    console.log(`   Lunar score: ${pred.lunar_score}, Light score: ${pred.light_score}`);
    console.log(`   Data source: ${pred.data_source || 'unknown'}`);
  });

  // Verify Phase 2 fields are present
  const firstPred = data[0];
  if (firstPred.solunar_score === undefined) {
    console.error('');
    console.error('❌ solunar_score field is MISSING from RPC response!');
    console.error('   Phase 2 migration may not have applied correctly.');
    console.log('');
    console.log('Available fields:', Object.keys(firstPred).join(', '));
    process.exit(1);
  }

  console.log('');
  console.log('✅ Test passed! Phase 2 fields present.');
}

test().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
