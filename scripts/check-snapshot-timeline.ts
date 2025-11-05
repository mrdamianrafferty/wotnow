#!/usr/bin/env tsx
/**
 * Check snapshot timeline to understand data coverage for pressure trends
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

async function checkTimeline() {
  console.log('=== Snapshot Timeline Analysis ===\n');

  // Overall coverage
  const { data: coverage } = await supabase
    .from('findr_conditions_snapshots')
    .select('captured_at, air_pressure_hpa, rectangle_code')
    .gte('captured_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('captured_at', { ascending: false });

  if (!coverage || coverage.length === 0) {
    console.log('No snapshots found in last 7 days');
    return;
  }

  const earliest = coverage[coverage.length - 1].captured_at;
  const latest = coverage[0].captured_at;
  const withPressure = coverage.filter(s => s.air_pressure_hpa !== null).length;

  console.log(`Total snapshots (last 7 days): ${coverage.length}`);
  console.log(`Earliest: ${earliest}`);
  console.log(`Latest: ${latest}`);
  console.log(`With pressure: ${withPressure} (${((withPressure / coverage.length) * 100).toFixed(1)}%)\n`);

  // Check specific rectangle timeline
  const testRectangle = coverage.find(s => s.air_pressure_hpa !== null)?.rectangle_code;

  if (!testRectangle) {
    console.log('No snapshots with pressure data found');
    return;
  }

  console.log(`=== Timeline for ${testRectangle} ===\n`);

  const { data: timeline } = await supabase
    .from('findr_conditions_snapshots')
    .select('captured_at, air_pressure_hpa')
    .eq('rectangle_code', testRectangle)
    .not('air_pressure_hpa', 'is', null)
    .order('captured_at', { ascending: false })
    .limit(20);

  if (timeline && timeline.length > 0) {
    console.log('Latest snapshots:');
    timeline.forEach((snap, idx) => {
      console.log(`${idx + 1}. ${snap.captured_at} - ${snap.air_pressure_hpa} hPa`);
    });

    // Check time gaps
    if (timeline.length >= 2) {
      console.log('\nTime gaps between snapshots:');
      for (let i = 0; i < Math.min(5, timeline.length - 1); i++) {
        const current = new Date(timeline[i].captured_at);
        const previous = new Date(timeline[i + 1].captured_at);
        const gapHours = (current.getTime() - previous.getTime()) / (1000 * 60 * 60);
        console.log(`  ${gapHours.toFixed(1)} hours`);
      }
    }
  }
}

checkTimeline().catch(console.error);
