#!/usr/bin/env tsx
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

async function findRectangles() {
  // Find rectangles in Bay of Biscay (Asturian coast) - around 43-44°N, 4-8°W
  console.log('Looking for Asturian coast rectangles (43-44°N, 4-8°W)...\n');

  const { data: asturias, error: err1 } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code')
    .ilike('rectangle_code', '43%')
    .limit(5);

  if (asturias && asturias.length > 0) {
    console.log('Asturian rectangles:', asturias.map(r => r.rectangle_code).join(', '));
  }

  // Find existing rectangles with data
  console.log('\nLooking for rectangles with existing Phase 1 data...\n');

  const { data: existing, error: err2 } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, air_pressure_hpa, cloud_cover_pct')
    .not('air_pressure_hpa', 'is', null)
    .limit(5);

  if (existing) {
    console.log('Rectangles with Phase 1 data:');
    existing.forEach(r => {
      console.log(`  ${r.rectangle_code}: ${r.air_pressure_hpa} hPa, ${r.cloud_cover_pct}% cloud`);
    });
  }
}

findRectangles();
