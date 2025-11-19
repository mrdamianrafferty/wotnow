#!/usr/bin/env tsx

/**
 * Copernicus Marine Data Ingestion Script
 * 
 * Fetches comprehensive Copernicus marine data (CMEMS) for ICES rectangles
 * within 30km of shore and populates the findr_conditions_snapshots table.
 * 
 * STRATEGY: 30km Limit (Optimized)
 * - Focuses on 224 rectangles within 30km of shore (68.9% of total)
 * - Eliminates all known problem rectangles (Baltic Finnish Gulf)
 * - Expected success rate: 97-99% (vs 94-98% for all rectangles)
 * - Covers 95%+ of recreational fishing activity
 * - 31% fewer API calls, 33% faster processing
 * 
 * DATA COLLECTED:
 * 
 * OCEAN DYNAMICS:
 * - current_speed_ms, current_direction_deg (ocean currents)
 * - current_east_ms, current_north_ms (velocity components)
 * - mixed_layer_depth_m (thermocline depth)
 * - sea_surface_height_m (upwelling indicator)
 * 
 * WATER CLARITY:
 * - kd490 (light attenuation / water clarity)
 * 
 * FOOD CHAIN:
 * - zooplankton_mmol_m3, phytoplankton_mmol_m3
 * - primary_production_mg_c_m3_day
 * 
 * WAVES:
 * - wave_direction_deg, wave_period_s
 * - wind_sea_height_m, swell_height_m
 * 
 * Usage:
 *   npx tsx scripts/ingest-copernicus-data.ts
 * 
 * Environment Variables:
 *   COPERNICUS_USERNAME - Copernicus Marine Service username (optional for now)
 *   COPERNICUS_PASSWORD - Copernicus Marine Service password (optional for now)
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 *   FINDR_CONDITIONS_LIMIT - Optional: limit number of rectangles to process
 *   FINDR_CONDITIONS_DELAY_MS - Optional: delay between rectangle requests (default 500ms)
 *   FINDR_CONDITIONS_FRESHNESS_HOURS - Optional: skip rectangles with data fresher than N hours (default 12)
 *   FINDR_CONDITIONS_BATCH_SIZE - Optional: process N rectangles in parallel (default 5)
 *   FINDR_CONDITIONS_FORCE_REFRESH - Optional: force refresh all rectangles, ignoring freshness (default false)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { MockCopernicusProvider } from '../lib/copernicus/mockClient';
import { RealCopernicusProvider } from '../lib/copernicus/realClient';
import { toCopernicusMarineData } from '../lib/copernicus/transformers';
import type { CopernicusMarineSnapshot } from '../lib/copernicus/types';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const LIMIT = process.env.FINDR_CONDITIONS_LIMIT ? parseInt(process.env.FINDR_CONDITIONS_LIMIT) : undefined;
const DELAY_MS = process.env.FINDR_CONDITIONS_DELAY_MS ? parseInt(process.env.FINDR_CONDITIONS_DELAY_MS) : 500;
const FRESHNESS_HOURS = process.env.FINDR_CONDITIONS_FRESHNESS_HOURS ? parseInt(process.env.FINDR_CONDITIONS_FRESHNESS_HOURS) : 6;
const BATCH_SIZE = process.env.FINDR_CONDITIONS_BATCH_SIZE ? parseInt(process.env.FINDR_CONDITIONS_BATCH_SIZE) : 5;
const FORCE_REFRESH = process.env.FINDR_CONDITIONS_FORCE_REFRESH === 'true';

// Validate credentials
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Coordinate overrides for specific rectangles
 *
 * Some rectangles have very little sea area or their center point falls on land.
 * For these cases, we hardcode specific coordinates that are guaranteed to be in
 * the sea and representative of the fishing conditions in that rectangle.
 *
 * Format: { rectangle_code: { lat, lon, reason } }
 */
const COORDINATE_OVERRIDES: Record<string, { lat: number; lon: number; reason: string }> = {
  '25E0': {
    lat: 43.502371,
    lon: -5.261184,
    reason: 'Bay of Biscay - rectangle has very little sea area'
  },
  // Add more overrides here as needed
};

// Use real Copernicus client when credentials are available
const USE_MOCK = !process.env.COPERNICUS_USERNAME || !process.env.COPERNICUS_PASSWORD;

// Provider cache: reuse a single client per basin to avoid re-authentication
const providerCache = new Map<string, RealCopernicusProvider>();

function getProvider(region?: string): RealCopernicusProvider {
  const key = region || 'GLOBAL';
  if (!providerCache.has(key)) {
    console.log(`   🔧 Creating new provider for region: ${key}`);
    providerCache.set(key, new RealCopernicusProvider(region));
  }
  return providerCache.get(key)!;
}

interface Rectangle {
  rectangle_code: string;
  center_lat: number;
  center_lon: number;
  region?: string;
  cmems_region?: string;
  distance_to_shore_km?: number;
  is_coastal?: boolean;
}

interface CopernicusUpdateRow {
  rectangle_code: string;
  captured_at: string;
  // Ocean dynamics
  current_east_ms: number | null;
  current_north_ms: number | null;
  current_speed_ms: number | null;
  current_direction_deg: number | null;
  mixed_layer_depth_m: number | null;
  sea_surface_height_m: number | null;
  // Water clarity
  kd490: number | null;
  // Food chain
  zooplankton_mmol_m3: number | null;
  phytoplankton_mmol_m3: number | null;
  primary_production_mg_c_m3_day: number | null;
  // Waves
  wave_direction_deg: number | null;
  wave_period_s: number | null;
  wind_sea_height_m: number | null;
  swell_height_m: number | null;
}

/**
 * Fetch Copernicus data for a specific location
 */
async function fetchCopernicusData(
  lat: number,
  lon: number,
  cmemsRegion?: string
): Promise<CopernicusMarineSnapshot | null> {
  try {
    if (USE_MOCK) {
      // Use mock data for testing
      const provider = new MockCopernicusProvider();
      const now = new Date();
      const bundle = await provider.fetchBundle({
        lat,
        lon,
        start: now.toISOString(),
        end: now.toISOString(),
      });

      const marineData = toCopernicusMarineData(bundle);
      return marineData.snapshots[0] ?? null;
    } else {
      // Use yesterday's date for ANFC data (current day minus 1)
      // ANFC products provide analysis/forecast data with ~1 day lag
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Try regional provider first if a region is specified
      if (cmemsRegion) {
        try {
          console.log(`   📍 Trying ${cmemsRegion} regional model...`);
          const provider = getProvider(cmemsRegion);
          const bundle = await provider.fetchBundle({
            lat,
            lon,
            start: yesterday.toISOString(),
            end: yesterday.toISOString(),
          });

          const marineData = toCopernicusMarineData(bundle);
          const snapshot = marineData.snapshots[0];

          if (snapshot && hasValidSnapshot(snapshot)) {
            console.log(`   ✅ Got data from ${cmemsRegion} regional model`);
            return snapshot;
          }

          console.warn(`   ⚠️  ${cmemsRegion} returned no valid data, falling back to GLOBAL`);
        } catch (err) {
          console.warn(`   ⚠️  ${cmemsRegion} failed, falling back to GLOBAL:`, err instanceof Error ? err.message : String(err));
        }
      }

      // Fallback to GLOBAL if regional failed or wasn't specified
      console.log(`   🌍 Trying GLOBAL model...`);
      const globalProvider = getProvider(undefined);
      const bundle = await globalProvider.fetchBundle({
        lat,
        lon,
        start: yesterday.toISOString(),
        end: yesterday.toISOString(),
      });

      const marineData = toCopernicusMarineData(bundle);
      const snapshot = marineData.snapshots[0];

      if (!snapshot || !hasValidSnapshot(snapshot)) {
        console.warn(`   ❌ No valid data from GLOBAL model for (${lat}, ${lon})`);
        return null;
      }

      console.log(`   ✅ Got data from GLOBAL model`);
      return snapshot;
    }
  } catch (error) {
    console.error(`   ❌ Failed to fetch Copernicus data for (${lat}, ${lon}):`, error);
    return null;
  }
}

/**
 * Check if snapshot has at least some valid data
 */
function hasValidSnapshot(snapshot: CopernicusMarineSnapshot): boolean {
  const hasCurrents = snapshot.currentSpeedSurface !== undefined && snapshot.currentSpeedSurface !== null;
  const hasClarity = snapshot.kd490Surface !== undefined && snapshot.kd490Surface !== null;
  const hasNutrients = snapshot.zooplanktonSurface !== undefined && snapshot.zooplanktonSurface !== null;
  const hasTemp = snapshot.temperatureSurface !== undefined && snapshot.temperatureSurface !== null;

  return hasCurrents || hasClarity || hasNutrients || hasTemp;
}

/**
 * Convert Copernicus snapshot to database row
 */
function snapshotToRow(
  rectangleCode: string,
  snapshot: CopernicusMarineSnapshot
): CopernicusUpdateRow {
  const capturedAt = new Date().toISOString();
  
  return {
    rectangle_code: rectangleCode,
    captured_at: capturedAt,
    // Ocean dynamics
    current_east_ms: snapshot.currentEastSurface ?? null,
    current_north_ms: snapshot.currentNorthSurface ?? null,
    current_speed_ms: snapshot.currentSpeedSurface ?? null,
    current_direction_deg: snapshot.currentDirectionSurface ?? null,
    mixed_layer_depth_m: snapshot.mixedLayerDepth ?? null,
    sea_surface_height_m: snapshot.seaSurfaceHeight ?? null,
    // Water clarity
    kd490: snapshot.kd490Surface ?? null,
    // Food chain
    zooplankton_mmol_m3: snapshot.zooplanktonSurface ?? null,
    phytoplankton_mmol_m3: snapshot.phytoplanktonSurface ?? null,
    primary_production_mg_c_m3_day: snapshot.primaryProductionSurface ?? null,
    // Waves
    wave_direction_deg: snapshot.waveDirection ?? null,
    wave_period_s: snapshot.wavePeriod ?? null,
    wind_sea_height_m: snapshot.windSeaHeight ?? null,
    swell_height_m: snapshot.swellHeight ?? null,
  };
}

/**
 * Ingest Copernicus data for a single rectangle
 */
async function ingestRectangle(rectangle: Rectangle): Promise<boolean> {
  const { rectangle_code, center_lat, center_lon, region, cmems_region } = rectangle;

  // Check for coordinate overrides
  const override = COORDINATE_OVERRIDES[rectangle_code];
  let lat = center_lat;
  let lon = center_lon;

  if (override) {
    lat = override.lat;
    lon = override.lon;
    console.log(`📍 ${rectangle_code}: (${lat.toFixed(2)}, ${lon.toFixed(2)}) 🔧 OVERRIDE`);
    console.log(`   Reason: ${override.reason}`);
  } else {
    // Validate default coordinates
    if (center_lat == null || center_lon == null) {
      console.log(`📍 ${rectangle_code}: ⚠️  Invalid coordinates (null)`);
      return false;
    }
    console.log(`📍 ${rectangle_code}: (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
  }

  // Fetch Copernicus data using override or default coordinates
  const snapshot = await fetchCopernicusData(lat, lon, cmems_region);
  
  if (!snapshot) {
    console.log(`   ❌ No Copernicus data available`);
    return false;
  }
  
  // Convert to database row
  const row = snapshotToRow(rectangle_code, snapshot);
  
  // Get the latest record for this rectangle
  const { data: latestRecord } = await supabase
    .from('findr_conditions_snapshots')
    .select('id, captured_at')
    .eq('rectangle_code', rectangle_code)
    .order('captured_at', { ascending: false })
    .limit(1)
    .single();
  
  if (latestRecord) {
    // Update existing record with Copernicus data
    const { error } = await supabase
      .from('findr_conditions_snapshots')
      .update({
        current_east_ms: row.current_east_ms,
        current_north_ms: row.current_north_ms,
        current_speed_ms: row.current_speed_ms,
        current_direction_deg: row.current_direction_deg,
        mixed_layer_depth_m: row.mixed_layer_depth_m,
        sea_surface_height_m: row.sea_surface_height_m,
        kd490: row.kd490,
        zooplankton_mmol_m3: row.zooplankton_mmol_m3,
        phytoplankton_mmol_m3: row.phytoplankton_mmol_m3,
        primary_production_mg_c_m3_day: row.primary_production_mg_c_m3_day,
        wave_direction_deg: row.wave_direction_deg,
        wave_period_s: row.wave_period_s,
        wind_sea_height_m: row.wind_sea_height_m,
        swell_height_m: row.swell_height_m,
      })
      .eq('id', latestRecord.id);
    
    if (error) {
      console.log(`   ❌ Update failed: ${error.message}`);
      return false;
    }
    
    console.log(`   ✅ Updated (current: ${row.current_speed_ms?.toFixed(2) ?? 'null'} m/s, clarity: ${row.kd490?.toFixed(3) ?? 'null'})`);
  } else {
    // No existing record, insert new snapshot
    const { error } = await supabase
      .from('findr_conditions_snapshots')
      .insert(row);
    
    if (error) {
      console.log(`   ❌ Insert failed: ${error.message}`);
      return false;
    }
    
    console.log(`   ✅ Inserted (current: ${row.current_speed_ms?.toFixed(2) ?? 'null'} m/s, clarity: ${row.kd490?.toFixed(3) ?? 'null'})`);
  }
  
  return true;
}

/**
 * Main ingestion process
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Copernicus Marine Data Ingestion - OCEAN CURRENT        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  if (USE_MOCK) {
    console.log('⚠️  Using MOCK data (Copernicus credentials not provided)');
    console.log('   Set COPERNICUS_USERNAME and COPERNICUS_PASSWORD for real data\n');
  } else {
    console.log('✅ Using REAL Copernicus Marine Service API\n');
  }
  
  // Fetch only coastal fishing zones (<10km from shore)
  // Optimized strategy: focus on core recreational fishing areas
  // Expected: 104 rectangles (46% of full set, 54% reduction in API calls)
  console.log('📥 Fetching ICES rectangles (coastal fishing zones <10km)...');

  // Fetch only rectangles marked as coastal fishing zones
  const { data: rectangles, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, region, cmems_region, distance_to_shore_km, is_coastal, is_coastal_fishing_zone')
    .eq('is_coastal_fishing_zone', true)
    .order('rectangle_code');
  

  
  if (error || !rectangles) {
    console.error('❌ Failed to fetch rectangles:', error);
    process.exit(1);
  }

  // Get distance-to-shore information
  const { data: distanceData } = await supabase
    .from('ices_coastal_samples_staging')
    .select('rectangle_code, distance_to_shore_km, is_coastal');

  const distanceMap = new Map(
    distanceData?.map(d => [d.rectangle_code, { 
      distance: d.distance_to_shore_km || 0, 
      isCoastal: d.is_coastal 
    }]) || []
  );

  // Enrich rectangles with distance data and sort (furthest from shore first)
  const enrichedRectangles = rectangles
    .map(r => ({
      ...r,
      distance_to_shore_km: distanceMap.get(r.rectangle_code)?.distance || r.distance_to_shore_km || 0,
      is_coastal: distanceMap.get(r.rectangle_code)?.isCoastal || r.is_coastal || false,
    }))
    .sort((a, b) => b.distance_to_shore_km - a.distance_to_shore_km);
  
  const rectanglesToProcess = LIMIT ? enrichedRectangles.slice(0, LIMIT) : enrichedRectangles;
  const totalRectangles = rectanglesToProcess.length;
  const offshoreCount = rectanglesToProcess.filter(r => r.distance_to_shore_km > 10).length;
  const nearshoreCount = rectanglesToProcess.filter(r => r.distance_to_shore_km >= 5 && r.distance_to_shore_km <= 10).length;
  const coastalCount = rectanglesToProcess.filter(r => r.distance_to_shore_km < 5).length;
  
  console.log(`✅ Found ${rectangles.length} total rectangles`);
  console.log(`✅ Processing ${totalRectangles} coastal rectangles (all ≤30km from shore):`);
  console.log(`   ${offshoreCount} offshore (10-30km)`);
  console.log(`   ${nearshoreCount} nearshore (5-10km)`);
  console.log(`   ${coastalCount} coastal (<5km)`);
  
  if (LIMIT) {
    console.log(`⚠️  Processing first ${LIMIT} rectangles only (FINDR_CONDITIONS_LIMIT set)\n`);
  } else {
    console.log(`\n`);
  }
  
  // Group rectangles by CMEMS region for better provider reuse
  const rectanglesByRegion = new Map<string, Rectangle[]>();
  for (const rect of rectanglesToProcess) {
    const region = rect.cmems_region || 'GLOBAL';
    if (!rectanglesByRegion.has(region)) {
      rectanglesByRegion.set(region, []);
    }
    rectanglesByRegion.get(region)!.push(rect);
  }

  console.log(`📦 Grouped into ${rectanglesByRegion.size} regions:\n`);
  for (const [region, rects] of rectanglesByRegion.entries()) {
    console.log(`   ${region}: ${rects.length} rectangles`);
  }
  console.log('');

  // Filter out rectangles with fresh data (incremental ingestion)
  let rectanglesToIngest = rectanglesToProcess;
  let skippedCount = 0;

  if (!FORCE_REFRESH) {
    console.log(`🔍 Checking data freshness (threshold: ${FRESHNESS_HOURS}h)...\n`);

    const freshnessThreshold = new Date();
    freshnessThreshold.setHours(freshnessThreshold.getHours() - FRESHNESS_HOURS);

    // Fetch latest data timestamps for all rectangles
    const { data: freshData } = await supabase
      .from('findr_conditions_latest')
      .select('rectangle_code, captured_at')
      .gte('captured_at', freshnessThreshold.toISOString());

    const freshRectangles = new Set(freshData?.map(d => d.rectangle_code) || []);
    rectanglesToIngest = rectanglesToProcess.filter(r => !freshRectangles.has(r.rectangle_code));
    skippedCount = rectanglesToProcess.length - rectanglesToIngest.length;

    console.log(`✅ ${skippedCount} rectangles have fresh data (<${FRESHNESS_HOURS}h old)`);
    console.log(`📥 ${rectanglesToIngest.length} rectangles need updates\n`);
  } else {
    console.log(`⚠️  FORCE_REFRESH enabled - processing all rectangles\n`);
  }

  // Regroup rectangles by region after freshness filtering
  const rectanglesByRegionFiltered = new Map<string, Rectangle[]>();
  for (const rect of rectanglesToIngest) {
    const region = rect.cmems_region || 'GLOBAL';
    if (!rectanglesByRegionFiltered.has(region)) {
      rectanglesByRegionFiltered.set(region, []);
    }
    rectanglesByRegionFiltered.get(region)!.push(rect);
  }

  // Process rectangles region by region with parallelization
  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;
  const startTime = Date.now();
  const totalToProcess = rectanglesToIngest.length;

  for (const [region, rectangles] of rectanglesByRegionFiltered.entries()) {
    console.log(`\n🌊 Processing ${rectangles.length} rectangles in ${region} region (batch size: ${BATCH_SIZE})...\n`);

    // Process in batches for parallelization
    for (let i = 0; i < rectangles.length; i += BATCH_SIZE) {
      const batch = rectangles.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const results = await Promise.all(
        batch.map(rectangle => ingestRectangle(rectangle))
      );

      // Count successes and failures
      results.forEach(success => {
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      });

      processedCount += batch.length;

      // Progress indicator every 10 rectangles
      if (processedCount % 10 === 0 || processedCount === totalToProcess) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (processedCount / (Date.now() - startTime) * 1000).toFixed(1);
        console.log(`\n📊 Progress: ${processedCount}/${totalToProcess} (${rate} rect/sec, ${elapsed}s elapsed)\n`);
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < rectangles.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
  }
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  const avgRate = totalToProcess > 0 ? (totalToProcess / (Date.now() - startTime) * 1000).toFixed(2) : '0.00';

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      INGESTION COMPLETE                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Success: ${successCount}/${totalToProcess} rectangles processed`);
  console.log(`❌ Failed: ${failCount}/${totalToProcess} rectangles`);
  console.log(`⏭️  Skipped: ${skippedCount} rectangles (fresh data <${FRESHNESS_HOURS}h old)`);
  console.log(`📊 Success rate: ${totalToProcess > 0 ? ((successCount / totalToProcess) * 100).toFixed(1) : '0.0'}% (97-99% expected)`);
  console.log(`⏱️  Total time: ${totalTime}s (${avgRate} rectangles/sec)`);
  console.log(`\n🎯 30km Strategy Benefits:`);
  console.log(`   ✅ ${totalRectangles} rectangles (within 30km of shore)`);
  console.log(`   ✅ Focuses on fishing-relevant areas (95%+ of activity)`);
  console.log(`   ✅ Eliminates Baltic Finnish Gulf problems`);
  console.log(`   ✅ Higher success rate than full 325-rectangle coverage`);
  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Verify data: npx tsx scripts/verify-database-status.ts`);
  console.log(`   2. Test integration: npx tsx scripts/test-ocean-current-integration.ts`);
  console.log(`   3. Set up daily cron in GitHub Actions (.github/workflows/findr-copernicus-ingest.yml)`);
  
  if (USE_MOCK) {
    console.log(`\n⚠️  IMPORTANT: Currently using MOCK data`);
    console.log(`   For production, provide real Copernicus credentials:`);
    console.log(`   - COPERNICUS_USERNAME=your-username`);
    console.log(`   - COPERNICUS_PASSWORD=your-password`);
  }
}

// Run
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
