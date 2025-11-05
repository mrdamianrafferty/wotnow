#!/usr/bin/env tsx
/**
 * Get the actual columns in findr_conditions_snapshots table
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getSnapshotColumns() {
  console.log('Querying findr_conditions_snapshots for one row...\n');

  const { data, error } = await supabase
    .from('findr_conditions_snapshots')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in findr_conditions_snapshots:');
    console.log(Object.keys(data[0]).sort().join(', '));
    console.log('\n\nColumn list for SQL:');
    console.log(Object.keys(data[0]).sort().join(',\n  '));
  }
}

getSnapshotColumns();
