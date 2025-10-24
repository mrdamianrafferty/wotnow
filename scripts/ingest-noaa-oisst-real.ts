#!/usr/bin/env tsx
/**
 * Ingest REAL NOAA OISST data for global grid cells
 *
 * Based on working Supabase function implementation
 * Uses time windows with fallback offsets to ensure data availability
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

// NOAA ERDDAP Configuration (matches working Supabase function)
const ERDDAP_BASE_URL = 'https://coastwatch.pfeg.noaa.gov/erddap';
const DATASET_ID = 'ncdcOisst21Agg_LonPM180';
const VARIABLE = 'sst';
const TIME_WINDOW_HOURS = 12;
const TIME_OFFSETS_HOURS = [0, 24, 72, 168, 336, 720, 1440, 2160]; // Try multiple time offsets

interface GridCell {
  cell_id: string;
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

function wrapLongitude(lon: number): number {
  let value = lon;
  while (value < -180) value += 360;
  while (value > 180) value -= 360;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Fetch NOAA OISST temperature for a single grid cell
 * Uses time windows with fallback offsets (proven approach from Supabase function)
 */
async function fetchOISSTForCell(cell: GridCell): Promise<{ temp: number; timestamp: string } | null> {
  const now = new Date();
  const windowMs = TIME_WINDOW_HOURS * 60 * 60 * 1000;

  // Calculate center coordinates
  const centerLat = (cell.lat_min + cell.lat_max) / 2;
  const centerLon = (cell.lon_min + cell.lon_max) / 2;

  const latCenter = clamp(centerLat, -90, 90);
  const lonCenter = wrapLongitude(centerLon);

  // Snap to ERDDAP grid (0.001 precision for quarter-degree offsets)
  const latIndex = Number(latCenter.toFixed(3));
  const lonIndex = Number(lonCenter.toFixed(3));

  // Try multiple time offsets (going back in history)
  for (const offsetHours of TIME_OFFSETS_HOURS) {
    const centerTime = new Date(now.getTime() - offsetHours * 60 * 60 * 1000);
    const startTime = new Date(centerTime.getTime() - windowMs);
    const endTime = new Date(Math.min(centerTime.getTime() + windowMs, now.getTime()));

    // Build ERDDAP griddap URL
    const timeSlice = `[(${startTime.toISOString()}):1:(${endTime.toISOString()})]`;
    const latSlice = `[(${latIndex.toFixed(3)}):1:(${latIndex.toFixed(3)})]`;
    const lonSlice = `[(${lonIndex.toFixed(3)}):1:(${lonIndex.toFixed(3)})]`;
    const url = `${ERDDAP_BASE_URL}/griddap/${DATASET_ID}.json?${VARIABLE}${timeSlice}${latSlice}${lonSlice}`;

    try {
      const response = await axios.get(url, { timeout: 10000 });

      const rows = response.data?.table?.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        continue; // Try next offset
      }

      const firstRow = rows[0];
      const timestamp = String(firstRow[0]);
      const temp = Number(firstRow[firstRow.length - 1]);

      if (temp == null || isNaN(temp)) {
        continue; // Try next offset
      }

      // Convert from Kelvin if needed
      let celsius = temp;
      if (celsius > 200) {
        celsius -= 273.15;
      }

      return {
        temp: Number(celsius.toFixed(3)),
        timestamp,
      };
    } catch (error: any) {
      // Ignore 404s (no data for this location/time) and continue
      if (error.response?.status === 404) {
        continue;
      }
      // Ignore timeouts and continue
      if (error.code === 'ECONNABORTED') {
        continue;
      }
      // Log other errors but continue
      if (offsetHours === TIME_OFFSETS_HOURS[0]) {
        // Only log on first attempt to avoid spam
        console.error(`Error for ${cell.cell_id}:`, error.message);
      }
    }
  }

  return null; // All offsets failed
}

async function ingestNOAAReal(options: {
  batchSize?: number;
  maxCells?: number;
  onlyAmericas?: boolean;
  testMode?: boolean;
  concurrency?: number;
}) {
  const { batchSize = 100, maxCells, onlyAmericas = false, testMode = false, concurrency = 4 } = options;

  console.log('🌊 NOAA OISST Real Data Ingestion\n');
  console.log(`Concurrency: ${concurrency} parallel requests`);
  if (maxCells) console.log(`Max cells: ${maxCells}`);
  if (onlyAmericas) console.log('Scope: Americas only');
  if (testMode) console.log('⚠️  TEST MODE - will not write to database\n');

  // 1. Load grid cells
  console.log('📍 Step 1: Loading grid cells...');

  let query = supabase
    .from('grid_025deg')
    .select('cell_id, lat_min, lat_max, lon_min, lon_max');

  if (onlyAmericas) {
    // American coastal waters: 20°N-60°N, 160°W-60°W
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

  // 2. Fetch NOAA OISST data with concurrency control
  console.log('🌡️  Step 2: Fetching NOAA OISST temperatures...');

  const gridData: Array<{
    cell_id: string;
    collected_at: string;
    surface_temperature_c: number;
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
  let processed = 0;

  // Process cells with concurrency control
  const processBatch = async (cells: GridCell[]) => {
    const promises = cells.map(async (cell) => {
      const result = await fetchOISSTForCell(cell);
      processed++;

      if (result) {
        gridData.push({
          cell_id: cell.cell_id,
          collected_at: result.timestamp,
          surface_temperature_c: result.temp,
          bottom_temperature_c: null,
          salinity_psu: null,
          oxygen_mg_l: null,
          chlorophyll_mg_m3: null,
          nitrate_umol_l: null,
          phosphate_umol_l: null,
          phytoplankton_index: null,
          sources: [`${DATASET_ID}.${VARIABLE}`],
          quality: 'high',
        });
        successCount++;
      } else {
        failCount++;
      }

      // Progress indicator
      if (processed % 10 === 0) {
        const percent = ((processed / gridCells.length) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${processed}/${gridCells.length} (${percent}%) | Success: ${successCount} | Failed: ${failCount}`);
      }
    });

    await Promise.all(promises);
  };

  // Process in batches to control concurrency
  for (let i = 0; i < gridCells.length; i += concurrency) {
    const batch = (gridCells as GridCell[]).slice(i, i + concurrency);
    await processBatch(batch);
  }

  console.log(`\n✅ Fetched ${successCount} temperatures, ${failCount} failed/no data\n`);

  if (gridData.length === 0) {
    console.log('⚠️  No data fetched');
    return;
  }

  if (testMode) {
    console.log('⚠️  TEST MODE - Skipping database write');
    console.log(`Would have written ${gridData.length} records`);
    console.log('\nSample data:');
    console.log(gridData.slice(0, 5).map(d => ({
      cell_id: d.cell_id,
      temp: `${d.surface_temperature_c}°C`,
      timestamp: d.collected_at,
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

  console.log('\n\n✅ Ingestion complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Grid cells processed: ${gridCells.length}`);
  console.log(`   Temperatures fetched: ${successCount}`);
  console.log(`   Failed/no data: ${failCount}`);
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
const concurrencyArg = args.find(arg => arg.startsWith('--concurrency='));
const concurrency = concurrencyArg ? parseInt(concurrencyArg.split('=')[1]) : 4;

// Run ingestion
ingestNOAAReal({
  batchSize: 100,
  maxCells,
  onlyAmericas,
  testMode,
  concurrency,
}).catch(console.error);
