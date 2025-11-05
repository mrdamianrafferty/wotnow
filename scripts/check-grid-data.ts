#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Check grid_conditions_latest
  const { data: gridData, error: gridError } = await supabase
    .from('grid_conditions_latest')
    .select('cell_id')
    .limit(5);

  console.log('Grid conditions latest:');
  if (gridError) {
    console.error('Error:', gridError);
  } else {
    console.log(`  Found ${gridData?.length || 0} rows`);
    if (gridData && gridData.length > 0) {
      console.log('  Sample cell_ids:', gridData.map(r => r.cell_id).join(', '));
    }
  }

  // Check findr_conditions_latest
  const { data: findrData, error: findrError } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code')
    .limit(5);

  console.log('\nFindr conditions latest:');
  if (findrError) {
    console.error('Error:', findrError);
  } else {
    console.log(`  Found ${findrData?.length || 0} rows`);
    if (findrData && findrData.length > 0) {
      console.log('  Sample rectangles:', findrData.map(r => r.rectangle_code).join(', '));
    }
  }
}

check().catch(console.error);
