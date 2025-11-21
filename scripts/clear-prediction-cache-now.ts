#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function clearCache() {
  console.log('🗑️  Clearing all prediction cache...');

  const { error, count } = await supabase
    .from('findr_prediction_sessions')
    .delete()
    .gte('fetched_at', '2020-01-01'); // Delete all

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`✅ Cleared ${count || 'all'} cached prediction sessions`);
  console.log('✅ Next API call will fetch fresh data with best_times column');
  console.log('🔄 Please refresh your browser to see the changes');
}

clearCache();
