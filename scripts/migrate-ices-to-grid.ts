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

  // Use Map to deduplicate - prefer rectangles WITH data over NULL
  // Track which rectangles contributed data to each cell
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
      wind_speed_ms: number | null;
      wind_direction_deg: number | null;
      wave_height_m: number | null;
      wave_direction_deg: number | null;
      wave_period_s: number | null;
      air_pressure_hpa: number | null;
      cloud_cover_pct: number | null;
      next_high_tide_at: string | null;
      next_low_tide_at: string | null;
      tide_phase: string | null;
      tide_flow_speed_ms: number | null;
      kd490: number | null;
      sources: string[];
      quality: string;
      source_rectangles?: string[];
    }
  >();

  let overlappingCells = 0;
  let dataUpgrades = 0;

  for (const mapping of mappings || []) {
    // Find conditions for this rectangle
    const conditions = icesConditions?.find((c) => c.rectangle_code === mapping.rectangle_code);

    if (!conditions) {
      continue; // No conditions data for this rectangle
    }

    const existing = gridDataMap.get(mapping.cell_id);

    // Build candidate data for this rectangle
    const candidateData = {
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
      // Wind/wave data from MET Norway
      wind_speed_ms: conditions.wind_speed_kts ? conditions.wind_speed_kts * 0.51444 : null, // Convert knots to m/s
      wind_direction_deg: conditions.wind_direction_deg || null,
      wave_height_m: conditions.wave_height_m || null,
      wave_direction_deg: conditions.wave_direction_deg || null,
      wave_period_s: conditions.wave_period_s || null,
      // Pressure and cloud from MET Norway
      air_pressure_hpa: conditions.air_pressure_hpa || null,
      cloud_cover_pct: conditions.cloud_cover_pct || null,
      // Tide data from WorldTides/NOAA + calculated phase/flow
      next_high_tide_at: conditions.next_high_tide_iso || null,
      next_low_tide_at: conditions.next_low_tide_iso || null,
      tide_phase: conditions.tide_phase || null,
      tide_flow_speed_ms: conditions.tide_flow_speed_ms || null,
      // Water clarity from CMEMS
      kd490: conditions.kd490 || null,
      sources: ['CMEMS', 'MET Norway', 'WorldTides', 'findr_conditions_latest_migration'],
      quality: 'high' as const,
      source_rectangles: [mapping.rectangle_code],
    };

    if (!existing) {
      // First rectangle for this cell - add it
      gridDataMap.set(mapping.cell_id, candidateData);
      continue;
    }

    // Cell already has data - decide which to keep
    overlappingCells++;

    // CRITICAL: Temperature is THE most important field for species matching
    // Always prefer rectangles with temperature data
    const existingHasTemp = existing.surface_temperature_c !== null;
    const candidateHasTemp = candidateData.surface_temperature_c !== null;

    if (candidateHasTemp && !existingHasTemp) {
      // Candidate has temp but existing doesn't - ALWAYS upgrade
      dataUpgrades++;
      candidateData.source_rectangles = [...(existing.source_rectangles || []), mapping.rectangle_code];
      gridDataMap.set(mapping.cell_id, candidateData);
    } else if (!candidateHasTemp && existingHasTemp) {
      // Existing has temp but candidate doesn't - ALWAYS keep existing
      existing.source_rectangles = [...(existing.source_rectangles || []), mapping.rectangle_code];
    } else {
      // Both have temp OR both lack temp - use secondary criteria

      // Count other critical fields (weighted)
      const existingDataScore =
        (existing.surface_temperature_c !== null ? 10 : 0) + // Temperature: weight 10
        (existing.salinity_psu !== null ? 2 : 0) +           // Salinity: weight 2
        (existing.chlorophyll_mg_m3 !== null ? 1 : 0) +      // Chlorophyll: weight 1
        (existing.oxygen_mg_l !== null ? 1 : 0) +            // Oxygen: weight 1
        (existing.wind_speed_ms !== null ? 3 : 0) +          // Wind: weight 3 (important for real-time)
        (existing.wave_height_m !== null ? 2 : 0) +          // Wave: weight 2
        (existing.kd490 !== null ? 1 : 0);                   // Water clarity: weight 1

      const candidateDataScore =
        (candidateData.surface_temperature_c !== null ? 10 : 0) +
        (candidateData.salinity_psu !== null ? 2 : 0) +
        (candidateData.chlorophyll_mg_m3 !== null ? 1 : 0) +
        (candidateData.oxygen_mg_l !== null ? 1 : 0) +
        (candidateData.wind_speed_ms !== null ? 3 : 0) +
        (candidateData.wave_height_m !== null ? 2 : 0) +
        (candidateData.kd490 !== null ? 1 : 0);

      if (candidateDataScore > existingDataScore) {
        dataUpgrades++;
        candidateData.source_rectangles = [...(existing.source_rectangles || []), mapping.rectangle_code];
        gridDataMap.set(mapping.cell_id, candidateData);
      } else if (candidateDataScore === existingDataScore) {
        // Equal data quality - prefer more recent
        const existingDate = new Date(existing.collected_at);
        const candidateDate = new Date(candidateData.collected_at);

        if (candidateDate > existingDate) {
          dataUpgrades++;
          candidateData.source_rectangles = [...(existing.source_rectangles || []), mapping.rectangle_code];
          gridDataMap.set(mapping.cell_id, candidateData);
        } else {
          // Keep existing, but track that this rectangle also mapped to this cell
          existing.source_rectangles = [...(existing.source_rectangles || []), mapping.rectangle_code];
        }
      } else {
        // Existing has better data - keep it, but track this rectangle
        existing.source_rectangles = [...(existing.source_rectangles || []), mapping.rectangle_code];
      }
    }
  }

  if (overlappingCells > 0) {
    console.log(`⚠️  Found ${overlappingCells} grid cells with multiple rectangle mappings`);
    console.log(`✅ Upgraded ${dataUpgrades} cells to use rectangle with better data`);
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
    // Remove source_rectangles field (not in database schema)
    const batch = gridData.slice(i, i + BATCH_SIZE).map(({ source_rectangles, ...data }) => data);

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
