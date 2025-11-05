#!/usr/bin/env tsx
/**
 * Poll Pressure Trends Script
 *
 * Hourly script that:
 * 1. Queries unique rounded coordinates from ICES rectangles
 * 2. Fetches pressure data from MET Norway for each coordinate
 * 3. Calculates pressure trends using our utility function
 * 4. Inserts/updates pressure_snapshots table
 *
 * Designed to run via GitHub Actions cron or manually.
 *
 * Usage:
 *   tsx scripts/poll-pressure-trends.ts
 *
 * Related: docs/PRESSURE_TREND_DATA_STRATEGY.md
 */

import { createClient } from '@supabase/supabase-js';
import {
  calculatePressureTrend,
  roundCoordinates,
  getUniqueRoundedCoordinates,
  type MetNoTimeseriesEntry,
  type PressureTrend
} from '../lib/utils/pressureTrends';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Fetch pressure timeseries from MET Norway Locationforecast API
 *
 * @param lat - Latitude (rounded to 0 decimal places)
 * @param lon - Longitude (rounded to 0 decimal places)
 * @returns Timeseries data with pressure readings
 */
async function fetchMetNoPressure(
  lat: number,
  lon: number
): Promise<MetNoTimeseriesEntry[] | null> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FishFindr/1.0 contact@fishfindr.eu'
      }
    });

    if (!response.ok) {
      console.error(`❌ MET Norway API error for (${lat}, ${lon}):`, response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data?.properties?.timeseries || data.properties.timeseries.length === 0) {
      console.error(`❌ No timeseries data for (${lat}, ${lon})`);
      return null;
    }

    return data.properties.timeseries;
  } catch (error) {
    console.error(`❌ Error fetching MET Norway data for (${lat}, ${lon}):`, error);
    return null;
  }
}

/**
 * Insert or update pressure snapshot in database
 *
 * @param lat - Rounded latitude
 * @param lon - Rounded longitude
 * @param trend - Calculated pressure trend
 * @param capturedAt - Timestamp of the snapshot
 * @param rawJson - Optional raw MET Norway response for debugging
 */
async function upsertPressureSnapshot(
  lat: number,
  lon: number,
  trend: PressureTrend,
  capturedAt: Date,
  rawJson?: any
) {
  const { data, error } = await supabase
    .from('pressure_snapshots')
    .upsert({
      lat_rounded: lat,
      lon_rounded: lon,
      captured_at: capturedAt.toISOString(),
      pressure_hpa: trend.pressureNow,
      pressure_3h_ago_hpa: trend.pressure3hAgo,
      pressure_6h_ago_hpa: trend.pressure6hAgo,
      trend_3h_hpa: trend.delta3h,
      trend_6h_hpa: trend.delta6h,
      trend_category: trend.category,
      source: 'met_norway',
      raw_json: rawJson || null
    }, {
      onConflict: 'lat_rounded,lon_rounded,captured_at'
    });

  if (error) {
    console.error(`❌ Error upserting snapshot for (${lat}, ${lon}):`, error);
    return false;
  }

  return true;
}

/**
 * Get unique rounded coordinates from ICES rectangles
 */
async function getUniqueCoordinates(): Promise<Array<{ lat: number; lon: number }>> {
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('anchor_latitude, anchor_longitude');

  if (error) {
    console.error('❌ Error fetching ICES rectangles:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.error('❌ No ICES rectangles found in database');
    return [];
  }

  const coordinates = data.map(row => ({
    lat: row.anchor_latitude,
    lon: row.anchor_longitude
  }));

  return getUniqueRoundedCoordinates(coordinates);
}

/**
 * Rate limiter: sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main polling function
 */
async function pollPressureTrends() {
  console.log('🌊 Starting pressure trends polling...');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  // Step 1: Get unique rounded coordinates
  console.log('📍 Step 1: Fetching unique rounded coordinates...');
  const coordinates = await getUniqueCoordinates();
  console.log(`✓ Found ${coordinates.length} unique rounded coordinates`);
  console.log('');

  if (coordinates.length === 0) {
    console.error('❌ No coordinates to poll. Exiting.');
    process.exit(1);
  }

  // Step 2: Fetch pressure data for each coordinate
  console.log('📡 Step 2: Fetching pressure data from MET Norway...');
  console.log(`   Rate limit: 1 request every 500ms (safe for ${coordinates.length} coords)`);
  console.log('');

  let successCount = 0;
  let failCount = 0;
  const capturedAt = new Date();

  for (const coord of coordinates) {
    const { lat, lon } = coord;
    process.stdout.write(`   Fetching (${lat}, ${lon})... `);

    // Fetch timeseries from MET Norway
    const timeseries = await fetchMetNoPressure(lat, lon);

    if (!timeseries) {
      failCount++;
      console.log('❌ FAILED');
      continue;
    }

    // Calculate pressure trend
    const trend = calculatePressureTrend(timeseries, capturedAt);

    if (trend.category === 'unknown') {
      failCount++;
      console.log(`⚠️  UNKNOWN (${trend.explanation})`);
      continue;
    }

    // Insert into database
    const success = await upsertPressureSnapshot(
      lat,
      lon,
      trend,
      capturedAt,
      { timeseries: timeseries.slice(0, 10) } // Store first 10 entries for debugging
    );

    if (success) {
      successCount++;
      console.log(`✓ ${trend.category} (${trend.delta3h?.toFixed(1)} hPa/3h)`);
    } else {
      failCount++;
      console.log('❌ DB ERROR');
    }

    // Rate limiting: 500ms between requests (2 req/sec)
    await sleep(500);
  }

  // Step 3: Summary
  console.log('');
  console.log('📊 Polling Summary:');
  console.log(`   Total coordinates: ${coordinates.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Success rate: ${((successCount / coordinates.length) * 100).toFixed(1)}%`);
  console.log('');

  if (successCount === 0) {
    console.error('❌ No successful pressure snapshots. Exiting with error.');
    process.exit(1);
  }

  console.log('✅ Pressure trends polling complete!');
  process.exit(0);
}

// Run the script
pollPressureTrends().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
