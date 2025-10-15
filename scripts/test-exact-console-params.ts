#!/usr/bin/env tsx
/**
 * Test RPC with exact parameters from browser console
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  console.log('🧪 Testing RPC with exact parameters from browser console...\n');

  // Test 1: Today (2025-10-11)
  const { data: data1, error: error1 } = await client.rpc('get_fishing_predictions', {
    rectangle_code_input: '20C5',
    prediction_date_input: '2025-10-11',
    user_language: 'en'
  });

  console.log('Test 1: rectangleCode=20C5, date=2025-10-11 (today)');
  if (error1) {
    console.log('   ❌ ERROR:', error1.message);
  } else {
    const count = Array.isArray(data1) ? data1.length : 0;
    console.log(`   ✅ ${count} predictions returned`);
    if (count > 0) {
      console.log('   Sample:', JSON.stringify(data1[0], null, 2).substring(0, 500));
    }
  }

  // Test 2: Date from console (2025-10-09)
  const { data: data2, error: error2 } = await client.rpc('get_fishing_predictions', {
    rectangle_code_input: '20C5',
    prediction_date_input: '2025-10-09',
    user_language: 'en'
  });

  console.log('\nTest 2: rectangleCode=20C5, date=2025-10-09 (from browser console)');
  if (error2) {
    console.log('   ❌ ERROR:', error2.message);
  } else {
    const count = Array.isArray(data2) ? data2.length : 0;
    console.log(`   ✅ ${count} predictions returned`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 CONCLUSION:');
  console.log('='.repeat(70));
  
  if (data1 && data1.length > 0) {
    console.log('✅ RPC works perfectly with current date!');
    console.log('\n🔍 The issue is likely:');
    console.log('   1. Frontend is requesting with rectangleCode=null initially');
    console.log('   2. Cache might have empty results cached');
    console.log('   3. Rectangle selection not triggering prediction fetch');
  } else {
    console.log('❌ RPC returns empty even with valid date');
    console.log('   Check species_frequency data for rectangle 20C5');
  }
}

test().catch(console.error);
