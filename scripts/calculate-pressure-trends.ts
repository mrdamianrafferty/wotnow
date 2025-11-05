#!/usr/bin/env tsx
/**
 * Calculate pressure trends from historical snapshots
 *
 * This script calculates 3-hour and 6-hour pressure trends for snapshots
 * that have air pressure data. It looks back in time to find historical
 * pressure values and computes the change.
 *
 * Trend categories:
 * - rising: +2 hPa or more in 3h
 * - steady: -2 to +2 hPa in 3h
 * - falling: -2 to -5 hPa in 3h
 * - rapid_falling: < -5 hPa in 3h
 * - unknown: insufficient historical data
 *
 * Usage:
 *   npx tsx scripts/calculate-pressure-trends.ts
 *   npx tsx scripts/calculate-pressure-trends.ts --rectangle=22L4
 *   npx tsx scripts/calculate-pressure-trends.ts --days=7
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface PressureSnapshot {
  id: string;
  rectangle_code: string;
  captured_at: string;
  air_pressure_hpa: number | null;
  pressure_trend_3h_hpa: number | null;
  pressure_trend_6h_hpa: number | null;
  pressure_trend_category: string | null;
}

/**
 * Categorize pressure trend based on 3-hour change
 */
function categorizeTrend(trend3h: number): string {
  if (trend3h >= 2) return 'rising';
  if (trend3h <= -5) return 'rapid_falling';
  if (trend3h <= -2) return 'falling';
  return 'steady';
}

/**
 * Find the closest historical pressure reading within a time window
 */
async function findHistoricalPressure(
  rectangleCode: string,
  targetTime: Date,
  hoursBack: number,
  toleranceMinutes: number = 30
): Promise<number | null> {
  const targetTimestamp = new Date(targetTime.getTime() - hoursBack * 60 * 60 * 1000);
  const windowStart = new Date(targetTimestamp.getTime() - toleranceMinutes * 60 * 1000);
  const windowEnd = new Date(targetTimestamp.getTime() + toleranceMinutes * 60 * 1000);

  const { data, error } = await supabase
    .from('findr_conditions_snapshots')
    .select('air_pressure_hpa, captured_at')
    .eq('rectangle_code', rectangleCode)
    .gte('captured_at', windowStart.toISOString())
    .lte('captured_at', windowEnd.toISOString())
    .not('air_pressure_hpa', 'is', null)
    .order('captured_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error(`Error fetching historical pressure for ${rectangleCode}:`, error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0].air_pressure_hpa;
}

/**
 * Calculate pressure trends for a single snapshot
 */
async function calculateTrendsForSnapshot(snapshot: PressureSnapshot): Promise<{
  pressure_trend_3h_hpa: number | null;
  pressure_trend_6h_hpa: number | null;
  pressure_trend_category: string;
}> {
  const currentPressure = snapshot.air_pressure_hpa;
  const capturedAt = new Date(snapshot.captured_at);

  if (!currentPressure) {
    return {
      pressure_trend_3h_hpa: null,
      pressure_trend_6h_hpa: null,
      pressure_trend_category: 'unknown',
    };
  }

  // Find historical pressures
  const pressure3hAgo = await findHistoricalPressure(snapshot.rectangle_code, capturedAt, 3);
  const pressure6hAgo = await findHistoricalPressure(snapshot.rectangle_code, capturedAt, 6);

  // Calculate trends
  const trend3h = pressure3hAgo !== null ? currentPressure - pressure3hAgo : null;
  const trend6h = pressure6hAgo !== null ? currentPressure - pressure6hAgo : null;

  // Categorize based on 3h trend if available
  const category = trend3h !== null ? categorizeTrend(trend3h) : 'unknown';

  return {
    pressure_trend_3h_hpa: trend3h,
    pressure_trend_6h_hpa: trend6h,
    pressure_trend_category: category,
  };
}

/**
 * Update snapshot with calculated trends
 */
async function updateSnapshotTrends(
  snapshotId: string,
  trends: {
    pressure_trend_3h_hpa: number | null;
    pressure_trend_6h_hpa: number | null;
    pressure_trend_category: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('findr_conditions_snapshots')
    .update(trends)
    .eq('id', snapshotId);

  if (error) {
    console.error(`Error updating snapshot ${snapshotId}:`, error);
    return false;
  }

  return true;
}

/**
 * Main function to process pressure trends
 */
async function main() {
  const args = process.argv.slice(2);
  const rectangleArg = args.find(arg => arg.startsWith('--rectangle='));
  const daysArg = args.find(arg => arg.startsWith('--days='));

  const targetRectangle = rectangleArg ? rectangleArg.split('=')[1] : null;
  const daysBack = daysArg ? parseInt(daysArg.split('=')[1]) : 1;

  console.log('=== Pressure Trend Calculation ===');
  console.log(`Target rectangle: ${targetRectangle || 'all'}`);
  console.log(`Processing last ${daysBack} day(s)\n`);

  // Build query to fetch snapshots that need trend calculation
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  let query = supabase
    .from('findr_conditions_snapshots')
    .select('id, rectangle_code, captured_at, air_pressure_hpa, pressure_trend_3h_hpa, pressure_trend_6h_hpa, pressure_trend_category')
    .not('air_pressure_hpa', 'is', null)
    .gte('captured_at', cutoffDate.toISOString())
    .order('captured_at', { ascending: true });

  if (targetRectangle) {
    query = query.eq('rectangle_code', targetRectangle);
  }

  const { data: snapshots, error } = await query;

  if (error) {
    console.error('Error fetching snapshots:', error);
    process.exit(1);
  }

  if (!snapshots || snapshots.length === 0) {
    console.log('No snapshots found to process.');
    return;
  }

  console.log(`Found ${snapshots.length} snapshots to process\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const snapshot of snapshots) {
    processed++;

    // Skip if already has trend data (unless we're forcing recalculation)
    if (
      snapshot.pressure_trend_3h_hpa !== null &&
      snapshot.pressure_trend_category !== null &&
      snapshot.pressure_trend_category !== 'unknown'
    ) {
      skipped++;
      if (processed % 100 === 0) {
        console.log(`Progress: ${processed}/${snapshots.length} (${updated} updated, ${skipped} skipped, ${failed} failed)`);
      }
      continue;
    }

    try {
      // Calculate trends
      const trends = await calculateTrendsForSnapshot(snapshot as PressureSnapshot);

      // Update snapshot
      const success = await updateSnapshotTrends(snapshot.id, trends);

      if (success) {
        updated++;

        // Log interesting trends
        if (trends.pressure_trend_category === 'rapid_falling') {
          console.log(`⚠️  Rapid falling pressure detected: ${snapshot.rectangle_code} @ ${snapshot.captured_at} (${trends.pressure_trend_3h_hpa?.toFixed(1)} hPa/3h)`);
        }
      } else {
        failed++;
      }

      // Progress update every 100 snapshots
      if (processed % 100 === 0) {
        console.log(`Progress: ${processed}/${snapshots.length} (${updated} updated, ${skipped} skipped, ${failed} failed)`);
      }
    } catch (error) {
      console.error(`Error processing snapshot ${snapshot.id}:`, error);
      failed++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already calculated): ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Show distribution of trend categories
  const { data: distribution } = await supabase
    .from('findr_conditions_snapshots')
    .select('pressure_trend_category')
    .not('air_pressure_hpa', 'is', null)
    .gte('captured_at', cutoffDate.toISOString());

  if (distribution) {
    const categories = distribution.reduce((acc, row) => {
      const cat = row.pressure_trend_category || 'null';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n=== Trend Distribution ===');
    Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`${category}: ${count}`);
      });
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
