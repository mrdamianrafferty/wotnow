#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function main() {
  // Get some NWS and IBI rectangles (better data coverage than Baltic)
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, cmems_region, center_lat, center_lon, region')
    .in('cmems_region', ['NWS', 'IBI'])
    .order('rectangle_code')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nSample rectangles from NWS and IBI regions:\n');
  data?.forEach(r => {
    console.log(`${r.rectangle_code} (${r.cmems_region}): ${r.center_lat}°N, ${r.center_lon}°E - ${r.region}`);
  });
  
  console.log('\nTry testing with one of these rectangles - they have better Copernicus coverage!');
}

main();
