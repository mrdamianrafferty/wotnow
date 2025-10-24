#!/usr/bin/env tsx
/**
 * Ingest NOAA OISST (Optimum Interpolation Sea Surface Temperature) for all global grid cells
 *
 * Dataset: NOAA OISST 0.25° Global
 * Resolution: 0.25° x 0.25° (perfect match for grid_025deg)
 * Coverage: Worldwide oceans
 * Variables: Sea surface temperature
 * Update frequency: Daily
 *
 * ERDDAP endpoint: https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// NOAA OISST ERDDAP endpoint
const ERDDAP_BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180';

interface GridCell {
  cell_id: string;
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

async function fetchOISSTTemperature(lat: number, lon: number, date: string): Promise<number | null> {
  try {
    // ERDDAP query format:
    // .../griddap/dataset.json?variable[(time)][{latitude}][{longitude}]
    // Note: OISST uses -180 to 180 longitude
    const url = `${ERDDAP_BASE_URL}.json?sst[(${date})][{${lat}}][{${lon}}]`;

    const response = await axios.get(url, { timeout: 10000 });

    if (response.data?.table?.rows && response.data.table.rows.length > 0) {
      const sstValue = response.data.table.rows[0][3]; // SST is 4th column (index 3)

      // Check for fill values (typically -999 or NaN)
      if (sstValue !== null && !isNaN(sstValue) && sstValue > -100) {
        return sstValue;
      }
    }

    return null;
  } catch (error: any) {
    // Ignore 404s (land cells) and timeout errors
    if (error.response?.status === 404 || error.code === 'ECONNABORTED') {
      return null;
    }
    console.error(`Error fetching OISST for ${lat},${lon}:`, error.message);
    return null;
  }
}

async function ingestOISSTGlobal(options: {
  batchSize?: number;
  maxCells?: number;
  onlyAmericas?: boolean;
  testMode?: boolean;
}) {
  const { batchSize = 100, maxCells, onlyAmericas = false, testMode = false } = options;

  console.log('🌊 NOAA OISST Global Temperature Ingestion\n');
  console.log(`Batch size: ${batchSize}`);
  if (maxCells) console.log(`Max cells: ${maxCells}`);
  if (onlyAmericas) console.log('Scope: Americas only');
  if (testMode) console.log('⚠️  TEST MODE - will not write to database\n');

  // 1. Load grid cells
  console.log('📍 Step 1: Loading grid cells...');

  let query = supabase
    .from('grid_025deg')
    .select('cell_id, lat_min, lat_max, lon_min, lon_max');

  if (onlyAmericas) {
    // American grids: North/Central/South America
    // Latitude: 20°N to 60°N (continental US + southern Canada)
    // Longitude: 160°W to 60°W (Pacific coast to Atlantic coast)
    query = query
      .gte('lat_min', 20)
      .lte('lat_max', 60)
      .gte('lon_min', -160)
      .lte('lon_max', -60);
  }

  if (maxCells) {
    query = query.limit(maxCells);
  }

  const { data: gridCells, error: gridError } = await query;

  if (gridError) {
    console.error('❌ Error loading grid cells:', gridError);
    return;
  }

  console.log(`✅ Loaded ${gridCells?.length || 0} grid cells\n`);

  if (!gridCells || gridCells.length === 0) {
    console.log('No grid cells to process');
    return;
  }

  // 2. Fetch OISST data for each grid cell
  console.log('🌡️  Step 2: Fetching OISST temperatures...');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < gridCells.length; i++) {
    const cell = gridCells[i] as GridCell;

    // Calculate center coordinates from grid bounds
    const centerLat = (cell.lat_min + cell.lat_max) / 2;
    const centerLon = (cell.lon_min + cell.lon_max) / 2;

    // Fetch temperature
    const temp = await fetchOISSTTemperature(centerLat, centerLon, today);

    if (temp !== null) {
      gridData.push({
        cell_id: cell.cell_id,
        collected_at: new Date().toISOString(),
        surface_temperature_c: temp,
        bottom_temperature_c: null,
        salinity_psu: null,
        oxygen_mg_l: null,
        chlorophyll_mg_m3: null,
        nitrate_umol_l: null,
        phosphate_umol_l: null,
        phytoplankton_index: null,
        sources: ['ncdcOisst21Agg_LonPM180.sst'],
        quality: 'high',
      });
      successCount++;
    } else {
      failCount++;
    }

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      const percent = ((i + 1) / gridCells.length * 100).toFixed(1);
      process.stdout.write(`\r  Progress: ${i + 1}/${gridCells.length} (${percent}%) | Success: ${successCount} | Failed: ${failCount}`);
    }

    // Rate limiting: 10 requests per second
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Fetched ${successCount} temperatures, ${failCount} failed/land cells\n`);

  if (gridData.length === 0) {
    console.log('⚠️  No data fetched');
    return;
  }

  if (testMode) {
    console.log('⚠️  TEST MODE - Skipping database write');
    console.log(`Would have written ${gridData.length} records`);
    console.log('\nSample data:');
    console.log(gridData.slice(0, 3));
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

  console.log('\n\n✅ Ingestion complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Grid cells processed: ${gridCells.length}`);
  console.log(`   Temperatures fetched: ${successCount}`);
  console.log(`   Failed/land cells: ${failCount}`);
  console.log(`   Records written: ${inserted}`);

  // 4. Verify
  const { count } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ Verification: ${count} grid cells now have environmental data`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const testMode = args.includes('--test');
const onlyAmericas = args.includes('--americas');
const maxCellsArg = args.find(arg => arg.startsWith('--max='));
const maxCells = maxCellsArg ? parseInt(maxCellsArg.split('=')[1]) : undefined;

// Run ingestion
ingestOISSTGlobal({
  batchSize: 100,
  maxCells,
  onlyAmericas,
  testMode,
}).catch(console.error);
