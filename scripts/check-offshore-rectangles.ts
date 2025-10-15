#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Get offshore rectangles (>50km from shore, not coastal)
  const { data: offshore, error: offshoreError } = await supabase
    .from('ices_coastal_samples_staging')
    .select('rectangle_code, center_lat, center_lon, distance_to_shore_km')
    .eq('is_coastal', false)
    .gte('distance_to_shore_km', 50)
    .order('distance_to_shore_km', { ascending: false })
    .limit(20);

  if (offshoreError) {
    console.error('Error fetching offshore:', offshoreError);
    return;
  }

  console.log('\n🌊 Top 20 offshore rectangles (>50km from shore):');
  console.log('=' .repeat(70));
  offshore?.forEach(r => {
    console.log(`  ${r.rectangle_code.padEnd(6)} (${String(r.center_lat).padStart(6)}, ${String(r.center_lon).padStart(7)}) - ${String(r.distance_to_shore_km).padStart(6)}km`);
  });

  // Get coastal/near-shore rectangles
  const { data: coastal, error: coastalError } = await supabase
    .from('ices_coastal_samples_staging')
    .select('rectangle_code, center_lat, center_lon, distance_to_shore_km')
    .or('is_coastal.eq.true,distance_to_shore_km.lt.10')
    .order('distance_to_shore_km', { ascending: true })
    .limit(10);

  if (coastalError) {
    console.error('Error fetching coastal:', coastalError);
    return;
  }

  console.log('\n🏖️  Top 10 coastal rectangles (<10km or marked coastal):');
  console.log('=' .repeat(70));
  coastal?.forEach(r => {
    console.log(`  ${r.rectangle_code.padEnd(6)} (${String(r.center_lat).padStart(6)}, ${String(r.center_lon).padStart(7)}) - ${String(r.distance_to_shore_km).padStart(6)}km`);
  });

  // Statistics
  const { count: totalCount } = await supabase
    .from('ices_coastal_samples_staging')
    .select('*', { count: 'exact', head: true });

  const { count: offshoreCount } = await supabase
    .from('ices_coastal_samples_staging')
    .select('*', { count: 'exact', head: true })
    .eq('is_coastal', false)
    .gte('distance_to_shore_km', 50);

  console.log('\n📊 Statistics:');
  console.log('=' .repeat(70));
  console.log(`  Total rectangles: ${totalCount}`);
  console.log(`  Offshore (>50km): ${offshoreCount} (${((offshoreCount || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);
  console.log(`  Coastal (<50km):  ${(totalCount || 0) - (offshoreCount || 0)} (${(((totalCount || 0) - (offshoreCount || 0)) / (totalCount || 1) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
