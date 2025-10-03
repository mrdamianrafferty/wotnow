#!/usr/bin/env tsx
/**
 * Quick diagnostic script to check if we have prediction data in Supabase
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkData() {
  console.log('🔍 Checking Findr prediction data...\n');

  // Check species_frequency table
  console.log('1. Checking species_frequency table...');
  const { data: freqData, error: freqError } = await client
    .from('species_frequency')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  if (freqError) {
    console.error('   ❌ Error:', freqError.message);
    if (freqError.code === '42P01') {
      console.error('   ⚠️  Table does not exist! You need to create it.');
    }
  } else {
    console.log(`   ✅ Found ${freqData?.length || 0} rows (showing first 5)`);
    if (freqData && freqData.length > 0) {
      console.log('   Sample:', JSON.stringify(freqData[0], null, 2));
    } else {
      console.warn('   ⚠️  Table exists but is EMPTY - this is why predictions don\'t work!');
    }
  }

  // Check ices_rectangles
  console.log('\n2. Checking ices_rectangles table...');
  const { data: rectData, error: rectError, count: rectCount } = await client
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: false })
    .limit(3);

  if (rectError) {
    console.error('   ❌ Error:', rectError.message);
  } else {
    console.log(`   ✅ Found ${rectCount} rectangles total`);
    if (rectData && rectData.length > 0) {
      console.log(`   Sample codes: ${rectData.map(r => r.rectangle_code).join(', ')}`);
    }
  }

  // Check species table
  console.log('\n3. Checking species table...');
  const { data: speciesData, error: speciesError, count: speciesCount } = await client
    .from('species')
    .select('species_code, common_name', { count: 'exact', head: false })
    .limit(5);

  if (speciesError) {
    console.error('   ❌ Error:', speciesError.message);
  } else {
    console.log(`   ✅ Found ${speciesCount} species total`);
    if (speciesData && speciesData.length > 0) {
      console.log(`   Sample: ${speciesData.map(s => `${s.species_code} (${s.common_name})`).join(', ')}`);
    }
  }

  // Try calling the RPC
  console.log('\n4. Testing get_fishing_predictions RPC...');
  const { data: rpcData, error: rpcError } = await client.rpc('get_fishing_predictions', {
    rectangle_code_input: '20C5',
    prediction_date_input: '2025-10-03',
    user_language: 'en',
  });

  if (rpcError) {
    console.error('   ❌ RPC Error:', rpcError.message);
    if (rpcError.code === '42883') {
      console.error('   ⚠️  Function does not exist! You need to create it.');
    }
  } else {
    console.log(`   ✅ RPC returned ${Array.isArray(rpcData) ? rpcData.length : 0} predictions`);
    if (Array.isArray(rpcData) && rpcData.length > 0) {
      console.log('   Sample:', JSON.stringify(rpcData[0], null, 2));
    } else {
      console.warn('   ⚠️  RPC works but returned NO predictions!');
      console.warn('   This means species_frequency table is empty or has no data for this rectangle.');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNOSIS:');
  console.log('='.repeat(70));
  
  if (!freqData || freqData.length === 0) {
    console.log('\n🔴 PROBLEM FOUND: species_frequency table is empty!');
    console.log('\n   This is why no fish predictions are showing up.');
    console.log('\n   SOLUTION: You need to populate this table with prediction data.');
    console.log('   Options:');
    console.log('   1. Run a data seeding script');
    console.log('   2. Import CSV data');
    console.log('   3. Use the DATRAS upload script');
    console.log('   4. Manually insert some test data');
  } else if (!rpcData || (Array.isArray(rpcData) && rpcData.length === 0)) {
    console.log('\n🟡 PARTIAL ISSUE: species_frequency has data but RPC returns empty');
    console.log('\n   Possible causes:');
    console.log('   - Rectangle code 20C5 has no predictions');
    console.log('   - Date filter excluding results');
    console.log('   - RPC logic issue');
  } else {
    console.log('\n🟢 All systems operational! Data exists and RPC works.');
    console.log('   If frontend still shows no predictions, check:');
    console.log('   - API caching');
    console.log('   - Frontend prediction mapping logic');
    console.log('   - Network/fetch errors');
  }
}

checkData().catch(console.error);
