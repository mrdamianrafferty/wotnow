#!/usr/bin/env tsx
/**
 * Verify Week 1 Data Pipeline - Check existing data
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyWeek1Data() {
  console.log('🔍 Verifying Week 1 Data Pipeline\n');

  // Check if columns exist in findr_conditions_snapshots
  console.log('1️⃣  Checking schema in findr_conditions_snapshots...');
  const { data: schemaCheck, error: schemaError } = await supabase
    .from('findr_conditions_snapshots')
    .select('air_pressure_hpa, cloud_cover_pct, tide_phase, tide_flow_speed_ms')
    .limit(1);

  if (schemaError) {
    console.log('❌ Schema check failed:', schemaError.message);
    return;
  }
  console.log('✅ Schema columns exist\n');

  // Check existing data coverage
  console.log('2️⃣  Checking data coverage in findr_conditions_latest...');

  const { count: totalCount } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true });

  const { count: tideCount } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .not('next_high_tide_iso', 'is', null);

  const { count: pressureCount } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .not('air_pressure_hpa', 'is', null);

  const { count: cloudCount } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .not('cloud_cover_pct', 'is', null);

  const { count: tidePhaseCount } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .not('tide_phase', 'is', null);

  console.log(`   Total rectangles: ${totalCount}`);
  console.log(`   With tide data: ${tideCount} (${((tideCount || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);
  console.log(`   With pressure: ${pressureCount} (${((pressureCount || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);
  console.log(`   With cloud cover: ${cloudCount} (${((cloudCount || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);
  console.log(`   With tide phase: ${tidePhaseCount} (${((tidePhaseCount || 0) / (totalCount || 1) * 100).toFixed(1)}%)\n`);

  // Show sample data
  console.log('3️⃣  Sample data from findr_conditions_latest:\n');

  const { data: samples } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, next_high_tide_iso, next_low_tide_iso, tide_phase, tide_flow_speed_ms, air_pressure_hpa, cloud_cover_pct, wind_speed_kts, wave_height_m')
    .not('next_high_tide_iso', 'is', null)
    .limit(3);

  if (samples && samples.length > 0) {
    for (const sample of samples) {
      console.log(`📍 ${sample.rectangle_code}:`);
      console.log(`   Tide Times: ${sample.next_high_tide_iso ? '✅ HIGH' : '❌'} ${sample.next_low_tide_iso ? '✅ LOW' : '❌'}`);
      console.log(`   Tide Phase: ${sample.tide_phase || 'N/A'}`);
      console.log(`   Tide Flow: ${sample.tide_flow_speed_ms ? `${sample.tide_flow_speed_ms.toFixed(2)} m/s` : 'N/A'}`);
      console.log(`   Pressure: ${sample.air_pressure_hpa ? `${sample.air_pressure_hpa.toFixed(1)} hPa` : 'N/A'}`);
      console.log(`   Cloud: ${sample.cloud_cover_pct !== null ? `${sample.cloud_cover_pct.toFixed(0)}%` : 'N/A'}`);
      console.log(`   Wind: ${sample.wind_speed_kts ? `${sample.wind_speed_kts.toFixed(1)} kts` : 'N/A'}`);
      console.log(`   Wave: ${sample.wave_height_m ? `${sample.wave_height_m.toFixed(1)} m` : 'N/A'}`);
      console.log('');
    }
  } else {
    console.log('   ⚠️  No data with tide information found\n');
  }

  // Check grid_conditions_latest
  console.log('4️⃣  Checking grid_conditions_latest...');

  const { count: gridTotal } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true });

  const { count: gridTideCount } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .not('tide_phase', 'is', null);

  const { count: gridPressureCount } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .not('air_pressure_hpa', 'is', null);

  console.log(`   Total grid cells: ${gridTotal}`);
  console.log(`   With tide phase: ${gridTideCount} (${((gridTideCount || 0) / (gridTotal || 1) * 100).toFixed(1)}%)`);
  console.log(`   With pressure: ${gridPressureCount} (${((gridPressureCount || 0) / (gridTotal || 1) * 100).toFixed(1)}%)\n`);

  // Recommendations
  console.log('📋 Recommendations:\n');

  if ((tideCount || 0) === 0) {
    console.log('⚠️  No tide data found. Run ingestion to test WorldTides integration:');
    console.log('   npx tsx scripts/ingestFindrConditions.ts\n');
  } else {
    console.log('✅ Tide data present - WorldTides integration appears to be working\n');
  }

  if ((pressureCount || 0) === 0) {
    console.log('⚠️  No pressure/cloud data found. Run ingestion to capture from MET Norway:');
    console.log('   npx tsx scripts/ingestFindrConditions.ts\n');
  } else {
    console.log('✅ Pressure/cloud data present - MET Norway integration appears to be working\n');
  }

  if ((gridTideCount || 0) === 0 && (tideCount || 0) > 0) {
    console.log('⚠️  Tide data in snapshots but not in grid. Run migration:');
    console.log('   npx tsx scripts/migrate-ices-to-grid.ts\n');
  } else if ((gridTideCount || 0) > 0) {
    console.log('✅ Grid data populated - migration is working\n');
  }

  console.log('✅ Verification complete!\n');
}

verifyWeek1Data().catch(console.error);
