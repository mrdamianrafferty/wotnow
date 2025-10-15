#!/usr/bin/env tsx
/**
 * Clear prediction cache to force fresh fetch
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearCache() {
  console.log('🗑️  Clearing prediction cache...\n');

  // First, show what's in the cache
  const { data: existing, error: selectError } = await client
    .from('findr_prediction_sessions')
    .select('rectangle_code, prediction_date, language, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(10);

  if (selectError) {
    console.error('❌ Error reading cache:', selectError.message);
    return;
  }

  console.log('📋 Current cache entries:');
  if (existing && existing.length > 0) {
    existing.forEach((entry, i) => {
      console.log(`   ${i + 1}. ${entry.rectangle_code} | ${entry.prediction_date} | ${entry.language} | ${entry.fetched_at}`);
    });
  } else {
    console.log('   (empty)');
  }

  // Delete all cache entries
  const { error: deleteError } = await client
    .from('findr_prediction_sessions')
    .delete()
    .neq('rectangle_code', '__IMPOSSIBLE__'); // Delete all rows

  if (deleteError) {
    console.error('\n❌ Error clearing cache:', deleteError.message);
    return;
  }

  console.log('\n✅ Cache cleared successfully!');
  console.log('\n💡 Next prediction fetch will bypass cache and get fresh data from RPC.');
}

clearCache().catch(console.error);
