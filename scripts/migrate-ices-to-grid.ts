#!/usr/bin/env tsx
/**
 * Migrate existing ICES rectangle conditions to global grid system
 *
 * Maps findr_conditions_snapshots (ICES rectangles) → grid_conditions_latest (global grid)
 * Uses grid_025deg_ices_xref for rectangle→grid mapping
 *
 * Quick win: Instant European coverage from existing data
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

async function migrateICESDataToGrid() {
  console.log('🔄 Migrating ICES rectangle data to global grid...\n');

  // 1. Get all ICES → Grid mappings
  console.log('📍 Step 1: Loading grid←→ICES mappings...');
  const { data: mappings, error: mappingError } = await supabase
    .from('grid_025deg_ices_xref')
    .select('cell_id, rectangle_code');

  if (mappingError) {
    console.error('❌ Error loading mappings:', mappingError);
    return;
  }

  console.log(`✅ Found ${mappings?.length || 0} grid←→rectangle mappings\n`);

  // 2. Get latest conditions for each ICES rectangle
  console.log('📊 Step 2: Loading latest ICES conditions...');
  const { data: icesConditions, error: conditionsError } = await supabase
    .from('findr_conditions_latest')
    .select('*');

  if (conditionsError) {
    console.error('❌ Error loading conditions:', conditionsError);
    return;
  }

  console.log(`✅ Found ${icesConditions?.length || 0} ICES rectangles with conditions\n`);

  // 3. Map ICES data to grid cells (deduplicate by cell_id)
  console.log('🗺️  Step 3: Mapping ICES data to grid cells...');

  // Use Map to deduplicate - if multiple rectangles map to same grid, use first one
  const gridDataMap = new Map<
    string,
    {
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
    }
  >();

  for (const mapping of mappings || []) {
    // Skip if we already have data for this grid cell
    if (gridDataMap.has(mapping.cell_id)) {
      continue;
    }

    // Find conditions for this rectangle
    const conditions = icesConditions?.find((c) => c.rectangle_code === mapping.rectangle_code);

    if (!conditions) {
      continue; // No conditions data for this rectangle
    }

    gridDataMap.set(mapping.cell_id, {
      cell_id: mapping.cell_id,
      collected_at: conditions.captured_at || new Date().toISOString(),
      surface_temperature_c: conditions.sea_temp_c || null,
      bottom_temperature_c: null, // ICES system doesn't have bottom temp
      salinity_psu: conditions.salinity_psu || null,
      oxygen_mg_l: conditions.dissolved_oxygen_mg_l || null,
      chlorophyll_mg_m3: conditions.chlorophyll_mg_m3 || null,
      nitrate_umol_l: null, // ICES snapshots don't have nutrients
      phosphate_umol_l: null,
      phytoplankton_index: null,
      sources: ['CMEMS', 'findr_conditions_latest_migration'],
      quality: 'high',
    });
  }

  const gridData = Array.from(gridDataMap.values());
  console.log(`✅ Mapped ${gridData.length} unique grid cells with conditions\n`);

  if (gridData.length === 0) {
    console.log('⚠️  No data to migrate');
    return;
  }

  // 4. Upsert to grid_conditions_latest
  console.log('💾 Step 4: Writing to grid_conditions_latest...');

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < gridData.length; i += BATCH_SIZE) {
    const batch = gridData.slice(i, i + BATCH_SIZE);

    const { error: upsertError } = await supabase
      .from('grid_conditions_latest')
      .upsert(batch, {
        onConflict: 'cell_id',
      });

    if (upsertError) {
      console.error(`❌ Error upserting batch ${i / BATCH_SIZE + 1}:`, upsertError);
      continue;
    }

    inserted += batch.length;
    process.stdout.write(`\r  Progress: ${inserted}/${gridData.length} (${((inserted / gridData.length) * 100).toFixed(1)}%)`);
  }

  console.log('\n\n✅ Migration complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Total ICES rectangles: ${icesConditions?.length || 0}`);
  console.log(`   Grid cells updated: ${inserted}`);
  console.log(`   Coverage: European waters\n`);

  // 5. Verify
  const { count } = await supabase
    .from('grid_conditions_latest')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Verification: ${count} grid cells now have environmental data`);
}

migrateICESDataToGrid().catch(console.error);
