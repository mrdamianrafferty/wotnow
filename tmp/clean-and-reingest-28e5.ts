#!/usr/bin/env tsx
/**
 * Clean corrupted data and re-ingest rectangle 28E5
 */

import { createClient } from '@supabase/supabase-js';
import { RealCopernicusProvider } from '../lib/copernicus/realClient';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function cleanAndReingest() {
  console.log('🧹 Cleaning and Re-ingesting Rectangle 28E5\n');
  console.log('='.repeat(60));

  const rectangleCode = '28E5';

  // Step 1: Delete corrupted data
  console.log(`\n1️⃣ Deleting corrupted data for ${rectangleCode}...`);

  const { count: deletedSnapshots, error: deleteSnapshotsErr } = await supabase
    .from('findr_conditions_snapshots')
    .delete({ count: 'exact' })
    .eq('rectangle_code', rectangleCode);

  if (deleteSnapshotsErr) {
    console.error('❌ Failed to delete snapshots:', deleteSnapshotsErr);
  } else {
    console.log(`   ✅ Deleted ${deletedSnapshots} corrupted snapshot records`);
  }

  // Step 2: Get rectangle details
  console.log(`\n2️⃣ Fetching rectangle details...`);

  const { data: rect, error: rectErr } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, copernicus_region')
    .eq('rectangle_code', rectangleCode)
    .single();

  if (rectErr || !rect) {
    console.error(`❌ Failed to get rectangle ${rectangleCode}:`, rectErr);
    return;
  }

  console.log(`   ✅ Rectangle: ${rect.rectangle_code}`);
  console.log(`   Coordinates: ${rect.center_lat}, ${rect.center_lon}`);
  console.log(`   CMEMS Region: ${rect.copernicus_region || 'global'}`);

  // Step 3: Fetch fresh data with fill value filtering
  console.log(`\n3️⃣ Fetching fresh CMEMS data with fill value filtering...`);

  const provider = new RealCopernicusProvider(rect.copernicus_region);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let bundle;
  try {
    bundle = await provider.fetchBundle({
      lat: rect.center_lat,
      lon: rect.center_lon,
      start: sevenDaysAgo.toISOString(),
      end: now.toISOString(),
    });
    console.log(`   ✅ Data fetched successfully`);
  } catch (err) {
    console.error(`   ❌ Failed to fetch data:`, err);
    return;
  }

  // Step 4: Insert clean data
  console.log(`\n4️⃣ Inserting clean data to database...`);

  let insertedCount = 0;

  if (bundle.physics && bundle.physics.records.length > 0) {
    for (const record of bundle.physics.records) {
      const snapshot = {
        rectangle_code: rectangleCode,
        captured_at: record.time,
        depth_m: record.depth,
        sea_temp_c: record.variables.thetao || record.variables.to || null,
        salinity_psu: record.variables.so || record.variables.sal || null,
        current_speed_ms: record.variables.uo || null,
        current_direction_deg: record.variables.vo || null,
        source: 'copernicus_targeted_reingest_fill_value_fix',
      };

      // Add biogeochemical variables if available
      if (bundle.biogeochemical && bundle.biogeochemical.records[insertedCount]) {
        const bioRecord = bundle.biogeochemical.records[insertedCount];
        Object.assign(snapshot, {
          chlorophyll_mg_m3: bioRecord.variables.chl || null,
          oxygen_mmol_m3: bioRecord.variables.o2 || null,
          nitrate_mmol_m3: bioRecord.variables.no3 || null,
          phosphate_mmol_m3: bioRecord.variables.po4 || null,
          water_clarity_kd490: bioRecord.variables.kd490 || null,
        });
      }

      const { error: insertErr } = await supabase
        .from('findr_conditions_snapshots')
        .insert(snapshot);

      if (insertErr) {
        console.error(`   ❌ Failed to insert record ${insertedCount + 1}:`, insertErr);
      } else {
        insertedCount++;
      }
    }

    console.log(`   ✅ Inserted ${insertedCount} clean records`);
  }

  // Step 5: Verify data quality
  console.log(`\n5️⃣ Verifying data quality...`);

  const { data: verifyData, error: verifyErr } = await supabase
    .from('findr_conditions_snapshots')
    .select('sea_temp_c, salinity_psu, captured_at')
    .eq('rectangle_code', rectangleCode)
    .order('captured_at', { ascending: false })
    .limit(5);

  if (verifyErr) {
    console.error(`   ❌ Failed to verify data:`, verifyErr);
  } else if (verifyData && verifyData.length > 0) {
    console.log(`   ✅ Latest data samples:`);
    verifyData.forEach((row, idx) => {
      const temp = row.sea_temp_c !== null ? `${row.sea_temp_c.toFixed(2)}°C` : 'null';
      const sal = row.salinity_psu !== null ? `${row.salinity_psu.toFixed(2)} psu` : 'null';
      console.log(`   ${idx + 1}. ${row.captured_at}: Temp=${temp}, Salinity=${sal}`);
    });

    // Check for any remaining corrupted values
    const corrupted = verifyData.filter(
      row =>
        (row.sea_temp_c !== null && (row.sea_temp_c < -5 || row.sea_temp_c > 50)) ||
        (row.salinity_psu !== null && (row.salinity_psu < 0 || row.salinity_psu > 50))
    );

    if (corrupted.length > 0) {
      console.error(`   ❌ Found ${corrupted.length} records with invalid values!`);
    } else {
      console.log(`   ✅ All values are within valid ranges`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Clean and re-ingest complete for ${rectangleCode}`);
  console.log(`   Deleted: ${deletedSnapshots} corrupted records`);
  console.log(`   Inserted: ${insertedCount} clean records`);
}

// Run
cleanAndReingest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Failed:', err);
    process.exit(1);
  });
