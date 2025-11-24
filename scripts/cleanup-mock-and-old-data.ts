#!/usr/bin/env tsx
/**
 * Cleanup script to replace mock data and old dataset grids with fresh NOAA data
 *
 * Targets:
 * 1. Grids with MOCK_DATA_FOR_TESTING source
 * 2. Grids with only old dataset (ncdcOisst21Agg_LonPM180.sst)
 */

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

interface GridCell {
  cell_id: string;
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

async function findMockDataGrids(): Promise<string[]> {
  console.log('\n🔍 Finding grids with mock data...');

  const { data, error } = await supabase
    .from('grid_conditions_latest')
    .select('cell_id')
    .contains('sources', ['MOCK_DATA_FOR_TESTING']);

  if (error) {
    console.error('❌ Error fetching mock grids:', error);
    return [];
  }

  const cellIds = data?.map(row => row.cell_id) || [];
  console.log(`   Found ${cellIds.length} grids with mock data`);
  return cellIds;
}

async function findOldDatasetGrids(): Promise<string[]> {
  console.log('\n🔍 Finding grids with only old dataset...');

  // Get grids with old dataset
  const { data: oldData, error: oldError } = await supabase
    .from('grid_conditions_latest')
    .select('cell_id, sources')
    .contains('sources', ['ncdcOisst21Agg_LonPM180.sst']);

  if (oldError) {
    console.error('❌ Error fetching old dataset grids:', oldError);
    return [];
  }

  // Filter to only those without new dataset
  const oldOnly = oldData?.filter(row => {
    const sources = row.sources as string[] || [];
    return sources.includes('ncdcOisst21Agg_LonPM180.sst') &&
           !sources.includes('noaacwBLENDEDsstDaily.analysed_sst');
  }).map(row => row.cell_id) || [];

  console.log(`   Found ${oldOnly.length} grids with only old dataset`);
  return oldOnly;
}

async function getGridBounds(cellIds: string[]): Promise<GridCell[]> {
  console.log(`\n📍 Fetching grid bounds for ${cellIds.length} cells...`);

  const { data, error } = await supabase
    .from('grid_025deg')
    .select('cell_id, lat_min, lat_max, lon_min, lon_max')
    .in('cell_id', cellIds);

  if (error) {
    console.error('❌ Error fetching grid bounds:', error);
    return [];
  }

  return data as GridCell[];
}

async function reingestGrid(grid: GridCell): Promise<boolean> {
  // Calculate center point for bbox (add small margin)
  const margin = 0.5;
  const bbox: [number, number, number, number] = [
    grid.lon_min - margin,
    grid.lat_min - margin,
    grid.lon_max + margin,
    grid.lat_max + margin,
  ];

  try {
    const { data, error } = await supabase.functions.invoke('ingest-conditions', {
      body: {
        bbox,
        providers: ['NOAA'],
        vars: ['surface_temperature_c'],
        limit: 5, // Small limit since we're targeting specific grids
      },
    });

    if (error) {
      console.error(`   ❌ ${grid.cell_id}: Error`, error.message);
      return false;
    }

    const result = data as any;
    const diagnostics = result.diagnostics ?? {};
    const noaa = diagnostics.noaa ?? {};
    const successes = typeof noaa.successes === 'number' ? noaa.successes : 0;

    if (successes > 0) {
      console.log(`   ✅ ${grid.cell_id}: Successfully re-ingested`);
      return true;
    } else {
      console.log(`   ⚠️  ${grid.cell_id}: No data available`);
      return false;
    }
  } catch (err) {
    console.error(`   ❌ ${grid.cell_id}: Exception`, err);
    return false;
  }
}

async function reingestBatch(grids: GridCell[], batchSize: number = 10): Promise<void> {
  console.log(`\n🔄 Re-ingesting ${grids.length} grids in batches of ${batchSize}...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < grids.length; i += batchSize) {
    const batch = grids.slice(i, i + batchSize);
    console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(grids.length / batchSize)}`);

    // Process batch sequentially to avoid overwhelming the Edge Function
    for (const grid of batch) {
      const success = await reingestGrid(grid);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n✅ Re-ingestion complete!`);
  console.log(`   Successes: ${successCount}`);
  console.log(`   Failures: ${failCount}`);
}

async function main() {
  console.log('🧹 NOAA Data Cleanup Script');
  console.log('===========================');

  // Find grids needing cleanup
  const mockGrids = await findMockDataGrids();
  const oldGrids = await findOldDatasetGrids();

  // Combine and dedupe
  const allCellIds = Array.from(new Set([...mockGrids, ...oldGrids]));

  if (allCellIds.length === 0) {
    console.log('\n✅ No grids need cleanup!');
    return;
  }

  console.log(`\n📊 Total grids to clean up: ${allCellIds.length}`);
  console.log(`   Mock data: ${mockGrids.length}`);
  console.log(`   Old dataset only: ${oldGrids.length}`);

  // Get grid bounds
  const grids = await getGridBounds(allCellIds);

  if (grids.length === 0) {
    console.log('\n❌ Could not fetch grid bounds');
    return;
  }

  // Confirm before proceeding
  const args = process.argv.slice(2);
  if (!args.includes('--yes')) {
    console.log('\n⚠️  Add --yes flag to proceed with re-ingestion');
    console.log('   Example: npx tsx scripts/cleanup-mock-and-old-data.ts --yes');
    return;
  }

  // Re-ingest all grids
  await reingestBatch(grids);

  // Show final coverage
  console.log('\n📊 Checking final coverage...');
  const { count: mockCount } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true })
    .contains('sources', ['MOCK_DATA_FOR_TESTING']);

  const { count: oldOnlyCount } = await supabase
    .from('grid_conditions_latest')
    .select('cell_id, sources')
    .contains('sources', ['ncdcOisst21Agg_LonPM180.sst'])
    .then(async ({ data }) => {
      const oldOnly = data?.filter(row => {
        const sources = row.sources as string[] || [];
        return !sources.includes('noaacwBLENDEDsstDaily.analysed_sst');
      });
      return { count: oldOnly?.length || 0 };
    });

  console.log('\n📊 Final Coverage:');
  console.log(`   Remaining mock grids: ${mockCount || 0}`);
  console.log(`   Remaining old-only grids: ${oldOnlyCount || 0}`);
}

main().catch(err => {
  console.error('\n❌ Unhandled error:', err);
  process.exit(1);
});
