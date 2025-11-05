#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔍 Verifying Phase 2 Infrastructure');
console.log('====================================\n');

async function verify() {
  // 1. Check pressure_snapshots table
  console.log('1. Checking pressure_snapshots table...');
  const { data: pressureData, error: pressureError } = await supabase
    .from('pressure_snapshots')
    .select('*')
    .limit(1);

  if (pressureError) {
    console.error('  ❌ Error:', pressureError.message);
  } else {
    console.log(`  ✅ Table exists`);
    console.log(`     Sample record:`, pressureData?.[0] || 'No data yet');
  }

  // 2. Check get_pressure_trend() function
  console.log('\n2. Checking get_pressure_trend() helper function...');
  const { data: pressureTrend, error: pressureTrendError } = await supabase
    .rpc('get_pressure_trend', {
      p_lat: 39.5,
      p_lon: -9.0,
      p_time: new Date().toISOString()
    });

  if (pressureTrendError) {
    console.error('  ❌ Error:', pressureTrendError.message);
  } else {
    console.log(`  ✅ Function exists and returns:`, pressureTrend);
  }

  // 3. Check moon_cache for transit data
  console.log('\n3. Checking moon_cache for transit data...');
  const { data: moonData, error: moonError } = await supabase
    .from('moon_cache')
    .select('moon_transit_iso, moonrise_iso, moonset_iso')
    .limit(1);

  if (moonError) {
    console.error('  ❌ Error:', moonError.message);
  } else if (!moonData || moonData.length === 0) {
    console.error('  ❌ No moon cache data found');
  } else {
    const sample = moonData[0];
    if (sample.moon_transit_iso) {
      console.log(`  ✅ Transit data exists`);
      console.log(`     Sample: transit=${sample.moon_transit_iso}, rise=${sample.moonrise_iso}, set=${sample.moonset_iso}`);
    } else {
      console.error('  ❌ Moon cache exists but no transit data');
    }
  }

  // 4. Check is_in_solunar_period() function
  console.log('\n4. Checking is_in_solunar_period() helper function...');
  const now = new Date();
  const testTransit = new Date(now.getTime() + 30 * 60000).toISOString(); // 30 min from now
  const testRise = new Date(now.getTime() - 6 * 3600000).toISOString(); // 6h ago
  const testSet = new Date(now.getTime() + 6 * 3600000).toISOString(); // 6h from now

  const { data: solunarData, error: solunarError } = await supabase
    .rpc('is_in_solunar_period', {
      current_time_utc: now.toISOString(),
      moonrise: testRise,
      moonset: testSet,
      moon_transit: testTransit
    });

  if (solunarError) {
    console.error('  ❌ Error:', solunarError.message);
  } else {
    console.log(`  ✅ Function exists and returns:`, solunarData);
  }

  // 5. Check findr_conditions_latest for cloud data
  console.log('\n5. Checking findr_conditions_latest for cloud data...');
  const { data: findrData, error: findrError } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, cloud_cover_pct')
    .limit(3);

  if (findrError) {
    console.error('  ❌ Error:', findrError.message);
  } else {
    console.log(`  ✅ Table has cloud data`);
    console.log(`     Sample:`, findrData);
  }

  console.log('\n====================================');
  console.log('✅ Phase 2 Infrastructure Verification Complete!');
}

verify().catch(error => {
  console.error('💥 Verification failed:', error);
  process.exit(1);
});
