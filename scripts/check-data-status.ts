#!/usr/bin/env tsx
/**
 * Check data status across all tables
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDataStatus() {
  console.log('🔍 Checking Data Status Across All Tables');
  console.log('==========================================\n');

  // Check grid_conditions_latest
  console.log('1️⃣ grid_conditions_latest:');
  const { count: gridCount, error: gridError } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true });

  if (gridError) {
    console.log(`   ❌ Error: ${gridError.message}`);
  } else {
    console.log(`   📊 Total records: ${gridCount || 0}`);

    if (gridCount && gridCount > 0) {
      const { data: sample } = await supabase
        .from('grid_conditions_latest')
        .select('cell_id, collected_at, surface_temperature_c')
        .order('collected_at', { ascending: false })
        .limit(3);

      console.log('   📝 Recent samples:');
      sample?.forEach(s => {
        console.log(`      ${s.cell_id} - ${s.collected_at} - ${s.surface_temperature_c}°C`);
      });
    }
  }

  // Check pressure_snapshots
  console.log('\n2️⃣ pressure_snapshots:');
  const { count: pressureCount, error: pressureError } = await supabase
    .from('pressure_snapshots')
    .select('*', { count: 'exact', head: true });

  if (pressureError) {
    console.log(`   ❌ Error: ${pressureError.message}`);
  } else {
    console.log(`   📊 Total records: ${pressureCount || 0}`);

    if (pressureCount && pressureCount > 0) {
      const { data: sample } = await supabase
        .from('pressure_snapshots')
        .select('lat_rounded, lon_rounded, captured_at, pressure_hpa')
        .order('captured_at', { ascending: false })
        .limit(3);

      console.log('   📝 Recent samples:');
      sample?.forEach(s => {
        console.log(`      (${s.lat_rounded}, ${s.lon_rounded}) - ${s.captured_at} - ${s.pressure_hpa} hPa`);
      });
    }
  }

  // Check findr_conditions_latest
  console.log('\n3️⃣ findr_conditions_latest:');
  const { count: findrCount, error: findrError } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true });

  if (findrError) {
    console.log(`   ❌ Error: ${findrError.message}`);
  } else {
    console.log(`   📊 Total records: ${findrCount || 0}`);

    if (findrCount && findrCount > 0) {
      const { data: sample } = await supabase
        .from('findr_conditions_latest')
        .select('rectangle_code, captured_at, air_pressure_hpa, cloud_cover_pct')
        .order('captured_at', { ascending: false })
        .limit(3);

      console.log('   📝 Recent samples:');
      sample?.forEach(s => {
        console.log(`      ${s.rectangle_code} - ${s.captured_at} - ${s.air_pressure_hpa} hPa, ${s.cloud_cover_pct}% clouds`);
      });
    }
  }

  // Check copernicus_data (old table)
  console.log('\n4️⃣ copernicus_data:');
  const { count: copernicusCount, error: copernicusError } = await supabase
    .from('copernicus_data')
    .select('*', { count: 'exact', head: true });

  if (copernicusError) {
    console.log(`   ⚠️  Table might not exist: ${copernicusError.message}`);
  } else {
    console.log(`   📊 Total records: ${copernicusCount || 0}`);
  }

  // Check ices_rectangles
  console.log('\n5️⃣ ices_rectangles:');
  const { count: icesCount, error: icesError } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true });

  if (icesError) {
    console.log(`   ❌ Error: ${icesError.message}`);
  } else {
    console.log(`   📊 Total rectangles: ${icesCount || 0}`);
  }

  console.log('\n==========================================');
  console.log('✅ Data Check Complete\n');
}

checkDataStatus().catch(error => {
  console.error('💥 Check failed:', error);
  process.exit(1);
});
