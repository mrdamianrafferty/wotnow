#!/usr/bin/env tsx
/**
 * Check if Phase 1 fields are populated in findr_conditions_latest
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

async function checkPhase1Fields() {
  console.log('Checking Phase 1 field population in findr_conditions_latest...\n');

  const { data, error } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, captured_at, tide_phase, tide_flow_speed_ms, air_pressure_hpa, cloud_cover_pct')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample data (first 10 rows):');
  console.log(JSON.stringify(data, null, 2));

  // Check how many rows have these fields populated
  const withTideFlow = data?.filter(row => row.tide_flow_speed_ms !== null) || [];
  const withPressure = data?.filter(row => row.air_pressure_hpa !== null) || [];
  const withCloudCover = data?.filter(row => row.cloud_cover_pct !== null) || [];
  const withTidePhase = data?.filter(row => row.tide_phase !== null) || [];

  console.log('\n=== Population Summary ===');
  console.log(`Total rows sampled: ${data?.length || 0}`);
  console.log(`Rows with tide_flow_speed_ms: ${withTideFlow.length} (${Math.round(withTideFlow.length / (data?.length || 1) * 100)}%)`);
  console.log(`Rows with air_pressure_hpa: ${withPressure.length} (${Math.round(withPressure.length / (data?.length || 1) * 100)}%)`);
  console.log(`Rows with cloud_cover_pct: ${withCloudCover.length} (${Math.round(withCloudCover.length / (data?.length || 1) * 100)}%)`);
  console.log(`Rows with tide_phase: ${withTidePhase.length} (${Math.round(withTidePhase.length / (data?.length || 1) * 100)}%)`);
}

checkPhase1Fields();
