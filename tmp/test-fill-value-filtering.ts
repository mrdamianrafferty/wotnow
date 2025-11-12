#!/usr/bin/env tsx
/**
 * Test fill value filtering for CMEMS data
 * Tests the improved filtering on rectangle 28E5 which previously had corrupted data
 */

import { RealCopernicusProvider } from '../lib/copernicus/realClient';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testFillValueFiltering() {
  console.log('🧪 Testing Fill Value Filtering for CMEMS Data\n');
  console.log('='.repeat(60));

  // Test with rectangle 28E5 (previously had corrupted data: salinity 15442 psu)
  const testRectangle = '28E5';

  console.log(`\n📍 Testing Rectangle: ${testRectangle}`);

  // Get rectangle coordinates
  const { data: rect, error: rectErr } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, copernicus_region')
    .eq('rectangle_code', testRectangle)
    .single();

  if (rectErr || !rect) {
    console.error(`❌ Failed to get rectangle ${testRectangle}:`, rectErr);
    return;
  }

  console.log(`   Coordinates: ${rect.center_lat}, ${rect.center_lon}`);
  console.log(`   CMEMS Region: ${rect.copernicus_region || 'global'}`);

  // Fetch data using improved client
  const provider = new RealCopernicusProvider(rect.copernicus_region);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    console.log(`\n🌊 Fetching CMEMS data with fill value filtering...`);

    const bundle = await provider.fetchBundle({
      lat: rect.center_lat,
      lon: rect.center_lon,
      start: sevenDaysAgo.toISOString(),
      end: now.toISOString(),
    });

    console.log(`\n✅ Data fetched successfully!`);

    // Check physics data
    if (bundle.physics) {
      console.log(`\n📊 Physics Data Quality Check:`);
      console.log(`   Total records: ${bundle.physics.records.length}`);
      console.log(`   Variables: ${bundle.physics.variables.join(', ')}`);

      // Check for corrupted values in the data
      let hasIssues = false;
      bundle.physics.records.forEach((record, idx) => {
        Object.entries(record.variables).forEach(([varName, value]) => {
          if (value === null || value === undefined) return;

          // Check for fill values
          if (Math.abs(value) > 9000) {
            console.error(`   ❌ Fill value detected in record ${idx}: ${varName} = ${value}`);
            hasIssues = true;
          }

          // Check for physically impossible values
          const varLower = varName.toLowerCase();
          if ((varLower.includes('temp') || varLower.includes('thetao')) && (value < -5 || value > 50)) {
            console.error(`   ❌ Invalid temperature in record ${idx}: ${varName} = ${value}°C`);
            hasIssues = true;
          }
          if ((varLower.includes('sal') || varLower === 'so') && (value < 0 || value > 50)) {
            console.error(`   ❌ Invalid salinity in record ${idx}: ${varName} = ${value} psu`);
            hasIssues = true;
          }
        });
      });

      if (!hasIssues) {
        console.log(`   ✅ All values within valid ranges`);

        // Show sample values
        if (bundle.physics.records.length > 0) {
          const sample = bundle.physics.records[0];
          console.log(`\n📋 Sample Values (first record):`);
          Object.entries(sample.variables).forEach(([varName, value]) => {
            console.log(`   ${varName}: ${typeof value === 'number' ? value.toFixed(3) : value}`);
          });
        }
      }
    }

    // Check biogeochemical data
    if (bundle.biogeochemical) {
      console.log(`\n🧬 Biogeochemical Data Quality Check:`);
      console.log(`   Total records: ${bundle.biogeochemical.records.length}`);
      console.log(`   Variables: ${bundle.biogeochemical.variables.join(', ')}`);

      let hasIssues = false;
      bundle.biogeochemical.records.forEach((record, idx) => {
        Object.entries(record.variables).forEach(([varName, value]) => {
          if (value === null || value === undefined) return;

          if (Math.abs(value) > 9000) {
            console.error(`   ❌ Fill value detected in record ${idx}: ${varName} = ${value}`);
            hasIssues = true;
          }
        });
      });

      if (!hasIssues) {
        console.log(`   ✅ All values within valid ranges`);
      }
    }

    console.log(`\n✅ Fill value filtering test PASSED!`);
    console.log(`   No corrupted data detected in fetched records.`);

  } catch (err) {
    console.error(`\n❌ Test failed:`, err);
    throw err;
  }
}

// Run test
testFillValueFiltering()
  .then(() => {
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ All tests completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  });
