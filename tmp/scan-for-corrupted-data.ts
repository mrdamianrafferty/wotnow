#!/usr/bin/env tsx
/**
 * Scan all rectangles for corrupted fill values in environmental data
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function scanForCorruptedData() {
  console.log('🔍 Scanning for Corrupted Fill Values in CMEMS Data\n');
  console.log('='.repeat(70));

  // Check findr_conditions_snapshots for corrupted values
  console.log(`\n1️⃣ Checking findr_conditions_snapshots...`);

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, captured_at, sea_temp_c, salinity_psu, chlorophyll_mg_m3, water_clarity_kd490')
    .or('sea_temp_c.gt.50,sea_temp_c.lt.-5,salinity_psu.gt.50,salinity_psu.lt.0,chlorophyll_mg_m3.gt.100,water_clarity_kd490.gt.10')
    .order('captured_at', { ascending: false });

  if (snapshotsErr) {
    console.error('   ❌ Failed to query snapshots:', snapshotsErr);
  } else if (!snapshots || snapshots.length === 0) {
    console.log('   ✅ No corrupted values found in snapshots table');
  } else {
    console.log(`   ⚠️ Found ${snapshots.length} records with corrupted values:\n`);

    // Group by rectangle
    const byRectangle = snapshots.reduce((acc, row) => {
      if (!acc[row.rectangle_code]) acc[row.rectangle_code] = [];
      acc[row.rectangle_code].push(row);
      return acc;
    }, {} as Record<string, typeof snapshots>);

    Object.entries(byRectangle).forEach(([rect, rows]) => {
      console.log(`   📍 ${rect} (${rows.length} corrupted records):`);
      rows.slice(0, 3).forEach(row => {
        const issues = [];
        if (row.sea_temp_c !== null && (row.sea_temp_c > 50 || row.sea_temp_c < -5)) {
          issues.push(`Temp: ${row.sea_temp_c.toFixed(2)}°C`);
        }
        if (row.salinity_psu !== null && (row.salinity_psu > 50 || row.salinity_psu < 0)) {
          issues.push(`Salinity: ${row.salinity_psu.toFixed(2)} psu`);
        }
        if (row.chlorophyll_mg_m3 !== null && row.chlorophyll_mg_m3 > 100) {
          issues.push(`Chlorophyll: ${row.chlorophyll_mg_m3.toFixed(2)} mg/m³`);
        }
        if (row.water_clarity_kd490 !== null && row.water_clarity_kd490 > 10) {
          issues.push(`Kd490: ${row.water_clarity_kd490.toFixed(2)} m⁻¹`);
        }
        console.log(`      ${row.captured_at}: ${issues.join(', ')}`);
      });
      if (rows.length > 3) {
        console.log(`      ... and ${rows.length - 3} more`);
      }
      console.log('');
    });
  }

  // Check findr_conditions_latest view
  console.log(`\n2️⃣ Checking findr_conditions_latest view...`);

  const { data: latest, error: latestErr } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, temperature_c, salinity_ppt')
    .or('temperature_c.gt.50,temperature_c.lt.-5,salinity_ppt.gt.50,salinity_ppt.lt.0');

  if (latestErr) {
    console.error('   ❌ Failed to query latest view:', latestErr);
  } else if (!latest || latest.length === 0) {
    console.log('   ✅ No corrupted values found in latest view');
  } else {
    console.log(`   ⚠️ Found ${latest.length} rectangles with corrupted latest values:\n`);
    latest.forEach(row => {
      const issues = [];
      if (row.temperature_c !== null && (row.temperature_c > 50 || row.temperature_c < -5)) {
        issues.push(`Temp: ${row.temperature_c.toFixed(2)}°C`);
      }
      if (row.salinity_ppt !== null && (row.salinity_ppt > 50 || row.salinity_ppt < 0)) {
        issues.push(`Salinity: ${row.salinity_ppt.toFixed(2)} ppt`);
      }
      console.log(`   📍 ${row.rectangle_code}: ${issues.join(', ')}`);
    });
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ Scan complete');

  const totalCorrupted = (snapshots?.length || 0) + (latest?.length || 0);
  if (totalCorrupted === 0) {
    console.log('   ✅ No corrupted data found - all values are within valid ranges');
  } else {
    console.log(`   ⚠️ Found corrupted data in ${totalCorrupted} locations`);
    console.log('   💡 Use clean-corrupted-data.ts to remove these records');
  }
}

// Run scan
scanForCorruptedData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Scan failed:', err);
    process.exit(1);
  });
