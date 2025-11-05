#!/usr/bin/env tsx
/**
 * Test script for Phase 2 RPC function
 * Tests get_global_fishing_predictions with Phase 2 features
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testPhase2RPC() {
  console.log('🧪 Testing Phase 2 RPC Function');
  console.log('================================\n');

  // Test coordinates: Lisbon area (31F1 rectangle)
  const testLat = 38.7;
  const testLon = -9.1;
  const testDate = '2025-11-05';

  console.log(`📍 Test Location: ${testLat}, ${testLon}`);
  console.log(`📅 Test Date: ${testDate}\n`);

  // 1. Check if Phase 2 functions exist
  console.log('1️⃣ Checking Phase 2 functions...');
  const { data: functions, error: funcError } = await supabase
    .rpc('get_global_fishing_predictions', {
      user_lat: testLat,
      user_lon: testLon,
      target_date: testDate,
      p_lang: 'en'
    });

  if (funcError) {
    console.error('❌ RPC Error:', funcError);
    console.error('\nFull error details:', JSON.stringify(funcError, null, 2));

    // Check if it's a missing function error
    if (funcError.message?.includes('function') || funcError.code === '42883') {
      console.error('\n⚠️  Function might not exist or has wrong signature');
      console.error('   Run: supabase db push');
    }

    process.exit(1);
  }

  if (!functions || functions.length === 0) {
    console.warn('⚠️  RPC returned no results');
    console.log('\nThis might mean:');
    console.log('  - No grid_conditions_latest data for this location');
    console.log('  - No species match the biogeographic region');
    console.log('  - Phase 2 migration not applied');
    process.exit(1);
  }

  console.log(`✅ RPC returned ${functions.length} predictions\n`);

  // 2. Check for Phase 2 fields
  console.log('2️⃣ Checking Phase 2 fields...');
  const firstResult = functions[0];

  const phase2Fields = {
    'solunar_score': firstResult.solunar_score,
    'weather_score': firstResult.weather_score,
    'lunar_score': firstResult.lunar_score,
    'bite_score': firstResult.bite_score,
  };

  let allFieldsPresent = true;
  for (const [field, value] of Object.entries(phase2Fields)) {
    if (value === undefined) {
      console.error(`   ❌ Missing field: ${field}`);
      allFieldsPresent = false;
    } else {
      console.log(`   ✅ ${field}: ${value}`);
    }
  }

  if (!allFieldsPresent) {
    console.error('\n❌ Phase 2 fields missing! Migration might not be applied.');
    process.exit(1);
  }

  console.log('\n✅ All Phase 2 fields present!\n');

  // 3. Test a few predictions
  console.log('3️⃣ Sample Predictions:\n');
  functions.slice(0, 3).forEach((pred, idx) => {
    console.log(`   ${idx + 1}. ${pred.name_en} (${pred.species_code})`);
    console.log(`      Bite Score: ${pred.bite_score}/100`);
    console.log(`      Confidence: ${pred.confidence}%`);
    console.log(`      Solunar: ${pred.solunar_score}`);
    console.log(`      Weather: ${pred.weather_score}`);
    console.log(`      Lunar: ${pred.lunar_score}`);
    console.log(`      Data Source: ${pred.data_source}`);
    console.log('');
  });

  // 4. Check data source
  console.log('4️⃣ Checking data source...');
  const dataSource = firstResult.data_source;
  if (dataSource?.includes('Pressure') || dataSource?.includes('Solunar')) {
    console.log(`   ✅ Data source includes Phase 2: "${dataSource}"`);
  } else {
    console.warn(`   ⚠️  Data source might be outdated: "${dataSource}"`);
  }

  console.log('\n================================');
  console.log('✅ Phase 2 RPC Test Complete!');
  console.log('================================\n');
}

// Run the test
testPhase2RPC().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
