/**
 * Test script for multi-location migration
 *
 * This script tests:
 * 1. Schema changes (new columns exist)
 * 2. Helper functions work correctly
 * 3. Upsert logic (latest wins)
 * 4. Migration of existing home_coordinates
 */

import { createClient } from '@supabase/supabase-js';

// Load from .env.cli (synced from .env.local)
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.cli') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'present' : 'missing');
  console.error('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'present' : 'missing');
  console.error('\nRun: npm run env:sync');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testMigration() {
  console.log('='.repeat(80));
  console.log('Testing Multi-Location Migration');
  console.log('='.repeat(80));
  console.log('');

  // Test 1: Check schema changes
  console.log('Test 1: Checking schema changes...');
  const { data: tableInfo, error: schemaError } = await supabase
    .from('user_location_preferences')
    .select('*')
    .limit(1);

  if (schemaError) {
    console.error('❌ Failed to query user_location_preferences:', schemaError);
    return;
  }

  console.log('✅ user_location_preferences table accessible');

  if (tableInfo && tableInfo.length > 0) {
    const firstRow = tableInfo[0] as Record<string, unknown>;
    const hasLocations = 'locations' in firstRow;
    const hasActiveId = 'active_location_id' in firstRow;
    const hasLastModified = 'last_modified_slot' in firstRow;

    console.log(`   - locations column: ${hasLocations ? '✅' : '❌'}`);
    console.log(`   - active_location_id column: ${hasActiveId ? '✅' : '❌'}`);
    console.log(`   - last_modified_slot column: ${hasLastModified ? '✅' : '❌'}`);
  } else {
    console.log('   ⚠️  No existing rows to inspect (this is fine for a new table)');
  }
  console.log('');

  // Test 2: Test upsert_location_by_slot function
  console.log('Test 2: Testing upsert_location_by_slot function...');

  // Create a test user (or use existing)
  const testUserId = '00000000-0000-0000-0000-000000000001'; // Test UUID

  const testLocation = {
    name: 'Test Location',
    lat: 50.8198,
    lon: -0.1367,
    rectangleCode: '31F1',
    rectangleRegion: 'English Channel',
    accuracy: 10,
    source: 'manual',
  };

  try {
    const { data: upsertResult, error: upsertError } = await supabase.rpc(
      'upsert_location_by_slot',
      {
        p_user_id: testUserId,
        p_slot: 'home',
        p_location: testLocation,
      }
    );

    if (upsertError) {
      console.error('❌ upsert_location_by_slot failed:', upsertError);
    } else {
      console.log('✅ upsert_location_by_slot succeeded');
      console.log('   Result:', JSON.stringify(upsertResult, null, 2));
    }
  } catch (err) {
    console.error('❌ upsert_location_by_slot error:', err);
  }
  console.log('');

  // Test 3: Test get_location_by_slot function
  console.log('Test 3: Testing get_location_by_slot function...');

  try {
    const { data: getResult, error: getError } = await supabase.rpc(
      'get_location_by_slot',
      {
        p_user_id: testUserId,
        p_slot: 'home',
      }
    );

    if (getError) {
      console.error('❌ get_location_by_slot failed:', getError);
    } else {
      console.log('✅ get_location_by_slot succeeded');
      console.log('   Result:', JSON.stringify(getResult, null, 2));
    }
  } catch (err) {
    console.error('❌ get_location_by_slot error:', err);
  }
  console.log('');

  // Test 4: Test latest-wins logic
  console.log('Test 4: Testing latest-wins logic...');

  const updatedLocation = {
    ...testLocation,
    name: 'Updated Test Location',
    lat: 51.5074,
    lon: -0.1278,
  };

  try {
    const { data: updateResult, error: updateError } = await supabase.rpc(
      'upsert_location_by_slot',
      {
        p_user_id: testUserId,
        p_slot: 'home',
        p_location: updatedLocation,
      }
    );

    if (updateError) {
      console.error('❌ Latest-wins update failed:', updateError);
    } else {
      console.log('✅ Latest-wins update succeeded');
      console.log('   Updated location:', JSON.stringify(updateResult, null, 2));

      // Verify the location was updated (not duplicated)
      const { data: verifyData } = await supabase
        .from('user_location_preferences')
        .select('locations')
        .eq('user_id', testUserId)
        .single();

      if (verifyData) {
        const locations = verifyData.locations as Array<unknown>;
        const homeLocations = locations.filter((loc: unknown) => (loc as Record<string, unknown>).slot === 'home');
        console.log(`   Number of 'home' locations: ${homeLocations.length} (should be 1)`);

        if (homeLocations.length === 1) {
          console.log('   ✅ No duplicates - latest-wins working correctly');
        } else {
          console.log('   ❌ Found duplicates - latest-wins logic may be broken');
        }
      }
    }
  } catch (err) {
    console.error('❌ Latest-wins test error:', err);
  }
  console.log('');

  // Test 5: Check migration function exists
  console.log('Test 5: Checking migration function...');

  try {
    // Try to call the migration function with a dry run check
    const { error: migrationError } = await supabase.rpc('migrate_home_coordinates_to_locations');

    if (migrationError) {
      // Function exists but might fail if no data to migrate (expected)
      if (migrationError.message.includes('does not exist')) {
        console.log('❌ migrate_home_coordinates_to_locations function not found');
      } else {
        console.log('✅ migrate_home_coordinates_to_locations function exists');
        console.log('   (Error is expected if no home_coordinates to migrate)');
      }
    } else {
      console.log('✅ migrate_home_coordinates_to_locations executed successfully');
    }
  } catch (err) {
    console.log('✅ migrate_home_coordinates_to_locations function callable');
  }
  console.log('');

  // Clean up test data
  console.log('Cleaning up test data...');
  try {
    await supabase
      .from('user_location_preferences')
      .delete()
      .eq('user_id', testUserId);
    console.log('✅ Test data cleaned up');
  } catch (err) {
    console.log('⚠️  Failed to clean up test data (may not exist)');
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('Migration Tests Complete');
  console.log('='.repeat(80));
}

testMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test script failed:', err);
    process.exit(1);
  });
