#!/usr/bin/env tsx
/**
 * Check grid data coverage and freshness
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('📊 Grid Data Coverage Check\n');

  // Total grids with data
  const { count: totalCount } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true });

  // NOAA grids
  const { count: noaaCount } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .contains('sources', ['ncdcOisst21Agg_LonPM180.sst']);

  // Mock grids
  const { count: mockCount } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .contains('sources', ['MOCK_DATA_FOR_TESTING']);

  console.log('Total Data Coverage:');
  console.log(`  Total grids with data: ${totalCount} / 65,884 (${(totalCount!/65884*100).toFixed(2)}%)`);
  console.log(`  Real NOAA grids: ${noaaCount}`);
  console.log(`  Mock data grids: ${mockCount}`);
  if (noaaCount! + mockCount! > 0) {
    console.log(`  Real data percentage: ${((noaaCount!/(noaaCount!+mockCount!))*100).toFixed(1)}%`);
  }

  // Check data freshness for our test locations
  console.log('\n📍 Test Location Data Freshness:');

  const testCells = [
    { name: 'New York', code: 'G025_N41W074' },
    { name: 'Miami', code: 'G025_N26W080' },
    { name: 'Los Angeles', code: 'G025_N34W118' },
    { name: 'San Francisco', code: 'G025_N38W122' },
  ];

  for (const cell of testCells) {
    const { data, error } = await supabase
      .from('grid_conditions_latest')
      .select('cell_id, surface_temperature_c, collected_at, sources')
      .eq('cell_id', cell.code)
      .maybeSingle();

    if (error || !data) {
      console.log(`  ${cell.name} (${cell.code}): ❌ NO DATA`);
    } else {
      const date = new Date(data.collected_at);
      const daysOld = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      const isNoaa = data.sources?.includes('ncdcOisst21Agg_LonPM180.sst');
      const isMock = data.sources?.includes('MOCK_DATA_FOR_TESTING');

      console.log(`  ${cell.name} (${cell.code}):`);
      console.log(`    ✅ ${data.surface_temperature_c?.toFixed(1)}°C | ${date.toLocaleDateString()} (${daysOld} days old)`);
      console.log(`    Source: ${isNoaa ? 'NOAA' : isMock ? 'MOCK' : 'UNKNOWN'}`);
    }
  }
}

main().catch(console.error);
