#!/usr/bin/env tsx
/**
 * Debug script to check species_frequency data and RPC function
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey);

async function debug() {
  console.log('🔍 Debugging prediction data for rectangle 20C5...\n');

  // 1. Check if rectangle exists in ices_rectangles
  console.log('1. Checking ices_rectangles for code 20C5...');
  const { data: rect, error: rectError } = await client
    .from('ices_rectangles')
    .select('id, rectangle_code')
    .eq('rectangle_code', '20C5')
    .maybeSingle();

  if (rectError) {
    console.error('   ❌ Error:', rectError.message);
    return;
  }

  if (!rect) {
    console.error('   ❌ Rectangle 20C5 NOT FOUND in ices_rectangles!');
    console.log('   This is likely the problem - the RPC needs this UUID.');
    return;
  }

  console.log(`   ✅ Found: id=${rect.id}, code=${rect.rectangle_code}`);

  // 2. Check species_frequency for this rectangle
  console.log('\n2. Checking species_frequency for this rectangle...');
  const { data: freq, error: freqError, count } = await client
    .from('species_frequency')
    .select('*', { count: 'exact', head: false })
    .eq('rectangle_id', rect.id)
    .limit(5);

  if (freqError) {
    console.error('   ❌ Error:', freqError.message);
    return;
  }

  console.log(`   ✅ Found ${count} frequency records for this rectangle`);
  if (freq && freq.length > 0) {
    console.log('   Sample record:', JSON.stringify(freq[0], null, 2));
  } else {
    console.error('   ❌ NO frequency data for rectangle 20C5!');
    console.log('   The species_frequency table has data, but not for this rectangle.');
  }

  // 3. Check what rectangles DO have data
  console.log('\n3. Checking which rectangles HAVE frequency data...');
  const { data: rectsWithData } = await client
    .from('species_frequency')
    .select('rectangle_id')
    .limit(100);

  if (rectsWithData && rectsWithData.length > 0) {
    const uniqueRectIds = [...new Set(rectsWithData.map(r => r.rectangle_id))];
    console.log(`   Found data for ${uniqueRectIds.length} unique rectangles`);
    
    // Get the codes for these rectangles
    const { data: rectCodes } = await client
      .from('ices_rectangles')
      .select('rectangle_code, id')
      .in('id', uniqueRectIds.slice(0, 20));
    
    if (rectCodes) {
      console.log(`   Sample rectangle codes with data: ${rectCodes.map(r => r.rectangle_code).join(', ')}`);
    }
  }

  // 4. Try the RPC directly
  console.log('\n4. Testing RPC get_fishing_predictions...');
  const { data: rpcData, error: rpcError } = await client.rpc('get_fishing_predictions', {
    rectangle_code_input: '20C5',
    prediction_date_input: '2025-10-03',
    user_language: 'en',
  });

  if (rpcError) {
    console.error('   ❌ RPC Error:', rpcError.message);
  } else {
    console.log(`   RPC returned ${Array.isArray(rpcData) ? rpcData.length : 0} predictions`);
    if (Array.isArray(rpcData) && rpcData.length > 0) {
      console.log('   Sample:', JSON.stringify(rpcData[0], null, 2));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNOSIS:');
  console.log('='.repeat(70));
  
  if (!rect) {
    console.log('\n🔴 Rectangle 20C5 not in ices_rectangles table');
  } else if (!freq || freq.length === 0) {
    console.log('\n🔴 Rectangle exists but has NO species_frequency data');
    console.log('   The 3000+ rows in species_frequency are for OTHER rectangles');
    console.log('   You need to populate data for rectangle 20C5 specifically');
  } else if (!rpcData || rpcData.length === 0) {
    console.log('\n🟡 Data exists but RPC returns empty - check RPC function logic');
  } else {
    console.log('\n🟢 Everything works! Issue must be elsewhere');
  }
}

debug().catch(console.error);
