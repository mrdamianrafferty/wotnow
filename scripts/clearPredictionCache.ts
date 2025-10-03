#!/usr/bin/env tsx
/**
 * Clear the prediction cache to force fresh RPC calls
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

async function clearCache() {
  console.log('🧹 Clearing findr_prediction_sessions cache...\n');

  // First, check how many entries exist
  const { count: beforeCount } = await client
    .from('findr_prediction_sessions')
    .select('*', { count: 'exact', head: true });

  console.log(`   Found ${beforeCount || 0} cached entries`);

  // Delete all cache entries
  const { error, count } = await client
    .from('findr_prediction_sessions')
    .delete()
    .neq('rectangle_code', 'IMPOSSIBLE_CODE_THAT_DOESNT_EXIST'); // Delete all

  if (error) {
    console.error('   ❌ Error clearing cache:', error.message);
    process.exit(1);
  }

  console.log(`   ✅ Deleted ${count || beforeCount || 0} cache entries`);
  console.log('\n✨ Cache cleared! Next API call will fetch fresh predictions from RPC.\n');
}

clearCache().catch(console.error);
