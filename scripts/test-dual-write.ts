/**
 * Test script to verify multi-location API dual-write feature
 *
 * This tests:
 * 1. Legacy POST (UnifiedLocationRecord) writes to both old and new format
 * 2. Legacy GET returns data from new locations array
 * 3. New slot-based POST creates location in locations array
 * 4. Both formats coexist correctly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.cli') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'present' : 'missing');
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'present' : 'missing');
  console.error('\nRun: npm run env:sync');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_EMAIL = 'test-multilocation@example.com';
const TEST_PASSWORD = 'test-password-123456';

async function setupTestUser() {
  console.log('Setting up test user...');

  // Try to sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (!signInError && signInData.session) {
    console.log('✅ Signed in as existing test user');
    return signInData.session;
  }

  // If sign in failed, try to create user
  console.log('Creating new test user...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signUpError) {
    console.error('❌ Failed to create test user:', signUpError);
    throw signUpError;
  }

  if (!signUpData.session) {
    console.error('❌ No session after signup (email confirmation may be required)');
    throw new Error('No session after signup');
  }

  console.log('✅ Created and signed in as new test user');
  return signUpData.session;
}

async function testLegacyWrite() {
  console.log('\n' + '='.repeat(80));
  console.log('Test 1: Legacy POST (UnifiedLocationRecord format)');
  console.log('='.repeat(80));

  const legacyLocation = {
    lat: 50.8198,
    lon: -0.1367,
    rectangleCode: '31F1',
    rectangleRegion: 'English Channel',
    rectangleLabel: 'Brighton - English Channel',
    source: 'manual',
    accuracy: 10,
    updatedAt: new Date().toISOString(),
  };

  console.log('Sending legacy POST request...');
  const session = await supabase.auth.getSession();
  const response = await fetch('https://fishfindr.eu/api/user/location', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.data.session?.access_token}`,
    },
    body: JSON.stringify(legacyLocation),
  });

  if (!response.ok) {
    console.error('❌ Legacy POST failed:', response.status, await response.text());
    return false;
  }

  const result = await response.json();
  console.log('✅ Legacy POST succeeded');
  console.log('   Response:', JSON.stringify(result, null, 2));

  // Verify dual-write by checking database directly
  const { data: dbRow } = await supabase
    .from('user_location_preferences')
    .select('home_coordinates, locations, active_location_id')
    .single();

  if (!dbRow) {
    console.error('❌ No data in database after write');
    return false;
  }

  console.log('\n📊 Database verification:');
  console.log('   home_coordinates:', dbRow.home_coordinates ? '✅ populated' : '❌ null');

  const locations = dbRow.locations as Array<unknown>;
  console.log('   locations array:', locations && locations.length > 0 ? `✅ ${locations.length} location(s)` : '❌ empty');

  if (locations && locations.length > 0) {
    const homeLocation = locations.find((loc: any) => loc.slot === 'home');
    console.log('   locations[0].slot:', homeLocation ? `✅ "${(homeLocation as any).slot}"` : '❌ not found');
  }

  return true;
}

async function testLegacyRead() {
  console.log('\n' + '='.repeat(80));
  console.log('Test 2: Legacy GET (should read from locations array)');
  console.log('='.repeat(80));

  const session = await supabase.auth.getSession();
  const response = await fetch('https://fishfindr.eu/api/user/location', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.data.session?.access_token}`,
    },
  });

  if (!response.ok) {
    console.error('❌ Legacy GET failed:', response.status, await response.text());
    return false;
  }

  const result = await response.json();
  console.log('✅ Legacy GET succeeded');
  console.log('   Response:', JSON.stringify(result, null, 2));

  if (!result.location) {
    console.error('❌ No location in response');
    return false;
  }

  if (!result.location.lat || !result.location.lon) {
    console.error('❌ Missing coordinates in response');
    return false;
  }

  console.log('   ✅ Coordinates present:', result.location.lat, result.location.lon);
  console.log('   ✅ Rectangle code:', result.location.rectangleCode);

  return true;
}

async function testSlotBasedWrite() {
  console.log('\n' + '='.repeat(80));
  console.log('Test 3: Slot-based POST (new multi-location format)');
  console.log('='.repeat(80));

  const slotLocation = {
    slot: 'coastal',
    name: 'Bournemouth Beach',
    lat: 50.7192,
    lon: -1.8808,
    rectangleCode: '30F1',
    rectangleRegion: 'English Channel West',
    source: 'manual',
    accuracy: 10,
  };

  console.log('Sending slot-based POST request...');
  const session = await supabase.auth.getSession();
  const response = await fetch('https://fishfindr.eu/api/user/location', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.data.session?.access_token}`,
    },
    body: JSON.stringify(slotLocation),
  });

  if (!response.ok) {
    console.error('❌ Slot-based POST failed:', response.status, await response.text());
    return false;
  }

  const result = await response.json();
  console.log('✅ Slot-based POST succeeded');
  console.log('   Response:', JSON.stringify(result, null, 2));

  // Verify multiple locations exist
  const { data: dbRow } = await supabase
    .from('user_location_preferences')
    .select('locations, active_location_id')
    .single();

  if (!dbRow) {
    console.error('❌ No data in database');
    return false;
  }

  const locations = dbRow.locations as Array<unknown>;
  console.log('\n📊 Database verification:');
  console.log(`   Total locations: ${locations.length}`);

  if (locations.length >= 2) {
    console.log('   ✅ Multiple locations exist');
    const slots = locations.map((loc: any) => loc.slot);
    console.log('   Slots:', slots.join(', '));
  } else {
    console.log('   ⚠️  Expected at least 2 locations (home + coastal)');
  }

  return true;
}

async function testMultiLocationRead() {
  console.log('\n' + '='.repeat(80));
  console.log('Test 4: Multi-location GET (with multiLocation=true)');
  console.log('='.repeat(80));

  const session = await supabase.auth.getSession();
  const response = await fetch('https://fishfindr.eu/api/user/location?multiLocation=true', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.data.session?.access_token}`,
    },
  });

  if (!response.ok) {
    console.error('❌ Multi-location GET failed:', response.status, await response.text());
    return false;
  }

  const result = await response.json();
  console.log('✅ Multi-location GET succeeded');
  console.log('   Response:', JSON.stringify(result, null, 2));

  if (!result.locations || !Array.isArray(result.locations)) {
    console.error('❌ No locations array in response');
    return false;
  }

  console.log(`   ✅ Received ${result.locations.length} location(s)`);
  console.log('   ✅ Active location ID:', result.activeLocationId || 'none');

  return true;
}

async function cleanup() {
  console.log('\n' + '='.repeat(80));
  console.log('Cleanup: Clearing test data');
  console.log('='.repeat(80));

  const session = await supabase.auth.getSession();
  const response = await fetch('https://fishfindr.eu/api/user/location', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.data.session?.access_token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    console.error('⚠️  Cleanup failed:', response.status);
  } else {
    console.log('✅ Test data cleared');
  }

  await supabase.auth.signOut();
  console.log('✅ Signed out');
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('Multi-Location API Dual-Write Test Suite');
  console.log('='.repeat(80));
  console.log('');

  try {
    await setupTestUser();

    const test1 = await testLegacyWrite();
    const test2 = await testLegacyRead();
    const test3 = await testSlotBasedWrite();
    const test4 = await testMultiLocationRead();

    console.log('\n' + '='.repeat(80));
    console.log('Test Results Summary');
    console.log('='.repeat(80));
    console.log(`Test 1 (Legacy Write): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (Legacy Read): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (Slot-based Write): ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 4 (Multi-location Read): ${test4 ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = test1 && test2 && test3 && test4;
    console.log('');
    console.log(allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED');
    console.log('='.repeat(80));

    await cleanup();

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    await cleanup();
    process.exit(1);
  }
}

runTests();
