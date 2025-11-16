/**
 * Verify that ICES rectangle center coordinates are over water
 *
 * This script checks each rectangle's center coordinate to see if CMEMS
 * can fetch marine data for it. If CMEMS consistently returns no data,
 * the center point may be on land and needs a coordinate override.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Rectangle {
  rectangle_code: string;
  center_lat: number;
  center_lon: number;
  biogeographic_region: string;
}

async function checkRectangleCenter(rect: Rectangle): Promise<boolean> {
  const { rectangle_code, center_lat, center_lon } = rect;

  console.log(`\n📍 Checking ${rectangle_code}: (${center_lat.toFixed(2)}, ${center_lon.toFixed(2)})`);

  // Query findr_conditions_latest to see if we have ANY data for this rectangle
  // If we have data, the center coordinate worked and is over water
  const { data, error } = await supabase
    .from('findr_conditions_latest')
    .select('captured_at, sea_temp_c, salinity_psu, source')
    .eq('rectangle_code', rectangle_code)
    .limit(1);

  if (error) {
    console.log(`   ❌ Database error: ${error.message}`);
    return false;
  }

  if (data && data.length > 0) {
    console.log(`   ✅ Has data from ${data[0].source}`);
    console.log(`      Latest: ${data[0].captured_at}`);
    console.log(`      Temp: ${data[0].sea_temp_c}°C, Salinity: ${data[0].salinity_psu} PSU`);
    return true;
  } else {
    console.log(`   ⚠️  NO DATA found for this rectangle`);
    console.log(`      This might indicate the center is on land or no CMEMS coverage`);
    return false;
  }
}

async function main() {
  console.log('=== Rectangle Center Verification ===\n');
  console.log('Checking if rectangle centers are over water...\n');

  // Fetch all rectangles
  const { data: rectangles, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, biogeographic_region')
    .order('rectangle_code');

  if (error || !rectangles) {
    console.error('Failed to fetch rectangles:', error);
    process.exit(1);
  }

  console.log(`Found ${rectangles.length} rectangles to check\n`);

  const problematic: Rectangle[] = [];
  const verified: Rectangle[] = [];

  for (const rect of rectangles) {
    const hasData = await checkRectangleCenter(rect);

    if (hasData) {
      verified.push(rect);
    } else {
      problematic.push(rect);
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n\n=== SUMMARY ===\n');
  console.log(`✅ Verified (has data): ${verified.length}/${rectangles.length}`);
  console.log(`⚠️  Problematic (no data): ${problematic.length}/${rectangles.length}\n`);

  if (problematic.length > 0) {
    console.log('=== RECTANGLES THAT MAY NEED COORDINATE OVERRIDES ===\n');
    problematic.forEach(rect => {
      console.log(`${rect.rectangle_code}: (${rect.center_lat.toFixed(4)}, ${rect.center_lon.toFixed(4)}) - ${rect.biogeographic_region}`);
    });

    console.log('\n💡 RECOMMENDATION:');
    console.log('For these rectangles, verify the center coordinates on a map.');
    console.log('If the center is on land, add a coordinate override in:');
    console.log('  scripts/ingest-copernicus-data.ts → COORDINATE_OVERRIDES');
    console.log('\nYou can also check if these rectangles have data at OTHER coordinates:');
    problematic.slice(0, 5).forEach(rect => {
      console.log(`  FINDR_CONDITIONS_RECTANGLES="${rect.rectangle_code}" npx tsx scripts/ingest-copernicus-data.ts`);
    });
  } else {
    console.log('🎉 All rectangle centers have valid data - no overrides needed!');
  }
}

main().catch(console.error);
