#!/usr/bin/env tsx
/**
 * Clear the predictions cache table
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
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function clearCache() {
  console.log('🗑️  Clearing findr_prediction_sessions cache...\n');

  const { error, count } = await client
    .from('findr_prediction_sessions')
    .delete()
    .neq('rectangle_code', ''); // Delete all rows

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Cleared ${count || 0} cached prediction sessions`);
  console.log('\nNext predictions API call will fetch fresh data from RPC.');
}

clearCache().catch(console.error);
