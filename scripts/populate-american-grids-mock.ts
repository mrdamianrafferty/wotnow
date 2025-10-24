#!/usr/bin/env tsx
/**
 * Populate American grid cells with MOCK environmental data for testing
 *
 * This script generates realistic but MOCK temperature and salinity data
 * for American coastal waters to test the prediction system.
 *
 * TODO: Replace with real NOAA data ingestion once ERDDAP API integration is complete
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

/**
 * Generate realistic temperature based on latitude (°C)
 * Warmer near equator, cooler near poles
 */
function generateTemperature(latitude: number): number {
  // Tropical (0-23°N): 24-30°C
  // Subtropical (23-35°N): 18-26°C
  // Temperate (35-50°N): 10-20°C
  // Sub-Arctic (50-60°N): 4-12°C

  const absLat = Math.abs(latitude);

  if (absLat < 23) {
    return 24 + Math.random() * 6; // 24-30°C
  } else if (absLat < 35) {
    return 18 + Math.random() * 8; // 18-26°C
  } else if (absLat < 50) {
    return 10 + Math.random() * 10; // 10-20°C
  } else {
    return 4 + Math.random() * 8; // 4-12°C
  }
}

/**
 * Generate realistic salinity based on location (PSU)
 * Higher in open ocean, lower near river mouths
 */
function generateSalinity(latitude: number): number {
  // Typical ocean salinity: 33-37 PSU
  // Add some variance
  return 33 + Math.random() * 4;
}

async function populateAmericanGridsMock(options: {
  batchSize?: number;
  maxCells?: number;
  testMode?: boolean;
}) {
  const { batchSize = 100, maxCells, testMode = false } = options;

  console.log('🌊 Populating American Grids with MOCK Data\n');
  console.log('⚠️  WARNING: This uses MOCK data for testing, not real NOAA data\n');

  if (testMode) console.log('⚠️  TEST MODE - will not write to database\n');

  // 1. Load American coastal grid cells
  console.log('📍 Step 1: Loading American coastal grid cells...');

  let query = supabase
    .from('grid_025deg')
    .select('cell_id, lat_min, lat_max, lon_min, lon_max')
    // American coastal waters: 20°N-60°N, 160°W-60°W
    .gte('lat_min', 20)
    .lte('lat_max', 60)
    .gte('lon_min', -160)
    .lte('lon_max', -60);

  if (maxCells) {
    query = query.limit(maxCells);
  }

  const { data: gridCells, error: gridError } = await query;

  if (gridError) {
    console.error('❌ Error loading grid cells:', gridError);
    return;
  }

  console.log(`✅ Loaded ${gridCells?.length || 0} American coastal grid cells\n`);

  if (!gridCells || gridCells.length === 0) {
    console.log('No grid cells to process');
    return;
  }

  // 2. Generate mock environmental data
  console.log('🧪 Step 2: Generating mock environmental data...');

  const gridData: Array<{
    cell_id: string;
    collected_at: string;
    surface_temperature_c: number | null;
    bottom_temperature_c: number | null;
    salinity_psu: number | null;
    oxygen_mg_l: number | null;
    chlorophyll_mg_m3: number | null;
    nitrate_umol_l: number | null;
    phosphate_umol_l: number | null;
    phytoplankton_index: number | null;
    sources: string[];
    quality: string;
  }> = [];

  for (const cell of gridCells as GridCell[]) {
    const centerLat = (cell.lat_min + cell.lat_max) / 2;

    gridData.push({
      cell_id: cell.cell_id,
      collected_at: new Date().toISOString(),
      surface_temperature_c: generateTemperature(centerLat),
      bottom_temperature_c: null, // Not available in OISST
      salinity_psu: generateSalinity(centerLat),
      oxygen_mg_l: 6 + Math.random() * 2, // Typical 6-8 mg/L
      chlorophyll_mg_m3: 0.5 + Math.random() * 2, // Typical 0.5-2.5 mg/m³
      nitrate_umol_l: null,
      phosphate_umol_l: null,
      phytoplankton_index: null,
      sources: ['MOCK_DATA_FOR_TESTING', 'REPLACE_WITH_NOAA'],
      quality: 'low', // Mark as low quality since it's mock data
    });
  }

  console.log(`✅ Generated ${gridData.length} mock data records\n`);

  if (testMode) {
    console.log('⚠️  TEST MODE - Skipping database write');
    console.log(`Would have written ${gridData.length} records`);
    console.log('\nSample data:');
    console.log(gridData.slice(0, 3).map(d => ({
      cell_id: d.cell_id,
      temp: `${d.surface_temperature_c?.toFixed(1)}°C`,
      salinity: `${d.salinity_psu?.toFixed(1)} PSU`,
    })));
    return;
  }

  // 3. Upsert to grid_conditions_latest
  console.log('💾 Step 3: Writing to grid_conditions_latest...');

  let inserted = 0;

  for (let i = 0; i < gridData.length; i += batchSize) {
    const batch = gridData.slice(i, i + batchSize);

    const { error: upsertError } = await supabase
      .from('grid_conditions_latest')
      .upsert(batch, {
        onConflict: 'cell_id',
      });

    if (upsertError) {
      console.error(`\n❌ Error upserting batch ${i / batchSize + 1}:`, upsertError);
      continue;
    }

    inserted += batch.length;
    process.stdout.write(`\r  Progress: ${inserted}/${gridData.length} (${((inserted / gridData.length) * 100).toFixed(1)}%)`);
  }

  console.log('\n\n✅ Mock data population complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Grid cells processed: ${gridCells.length}`);
  console.log(`   Records written: ${inserted}`);
  console.log(`   Coverage: American coastal waters (20°N-60°N, 160°W-60°W)`);
  console.log(`\n⚠️  Note: This is MOCK data for testing. Replace with real NOAA ingestion.`);

  // 4. Verify
  const { count } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ Verification: ${count} grid cells now have environmental data`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const testMode = args.includes('--test');
const maxCellsArg = args.find(arg => arg.startsWith('--max='));
const maxCells = maxCellsArg ? parseInt(maxCellsArg.split('=')[1]) : undefined;

// Run population
populateAmericanGridsMock({
  batchSize: 100,
  maxCells,
  testMode,
}).catch(console.error);
