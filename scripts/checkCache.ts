#!/usr/bin/env tsx
/**
 * Check current cache state
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

async function checkCache() {
  console.log('🔍 Checking cache state...\n');

  const { data, error } = await client
    .from('findr_prediction_sessions')
    .select('*')
    .order('fetched_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('✅ Cache is empty - good!');
    return;
  }

  console.log(`Found ${data.length} cache entries:\n`);
  
  for (const entry of data) {
    const payloadArray = Array.isArray(entry.payload) ? entry.payload : [];
    console.log(`- Rectangle: ${entry.rectangle_code}`);
    console.log(`  Date: ${entry.prediction_date}`);
    console.log(`  Language: ${entry.language}`);
    console.log(`  Predictions: ${payloadArray.length}`);
    console.log(`  Fetched: ${entry.fetched_at}`);
    console.log('');
  }

  const emptyEntries = data.filter(e => {
    const payload = Array.isArray(e.payload) ? e.payload : [];
    return payload.length === 0;
  });

  if (emptyEntries.length > 0) {
    console.log(`⚠️  WARNING: ${emptyEntries.length} cache entries have EMPTY predictions!`);
    console.log('   These should be deleted to force fresh RPC calls.');
  }
}

checkCache().catch(console.error);
