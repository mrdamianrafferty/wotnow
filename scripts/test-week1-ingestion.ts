#!/usr/bin/env tsx
/**
 * Test Week 1 Data Pipeline - Verify tide waterfall, pressure, and cloud data
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ingestRectangle } from './ingestFindrConditions';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const STORMGLASS_KEY = process.env.STORMGLASS_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test rectangles from English Channel
const testRectangles = [
  { code: '30E8', centerLat: 49.75, centerLon: 1.0 },
  { code: '30E9', centerLat: 49.75, centerLon: 1.5 },
  { code: '30F0', centerLat: 50.25, centerLon: 1.0 },
];

async function testWeek1Pipeline() {
  console.log('🧪 Testing Week 1 Data Pipeline\n');
  console.log('Test Rectangles:', testRectangles.map(r => r.code).join(', '));
  console.log('');

  const capturedAt = new Date().toISOString();
  let successCount = 0;

  for (const rect of testRectangles) {
    console.log(`\n📍 Testing ${rect.code} (${rect.centerLat}°N, ${rect.centerLon}°E)`);
    console.log('─'.repeat(60));

    try {
      const result = await ingestRectangle(
        supabase,
        {
          code: rect.code,
          centerLat: rect.centerLat,
          centerLon: rect.centerLon,
        },
        rect.centerLat,
        rect.centerLon,
        capturedAt,
        STORMGLASS_KEY
      );

      if (result.success) {
        successCount++;
        console.log(`✅ ${rect.code}: SUCCESS`);
        console.log(`   Marine source: ${result.source}`);
        console.log(`   MET probes: ${result.metProbeAttempts}`);
        if (result.metProbeSuccessLabel) {
          console.log(`   MET success: ${result.metProbeSuccessLabel}`);
        }
      } else {
        console.log(`❌ ${rect.code}: FAILED`);
      }
    } catch (error) {
      console.error(`❌ ${rect.code}: ERROR -`, error);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary: ${successCount}/${testRectangles.length} rectangles ingested successfully\n`);

  // Verify data in database
  console.log('🔍 Verifying data in findr_conditions_snapshots...\n');

  for (const rect of testRectangles) {
    const { data, error } = await supabase
      .from('findr_conditions_snapshots')
      .select('*')
      .eq('rectangle_code', rect.code)
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log(`❌ ${rect.code}: No data found`);
      continue;
    }

    console.log(`✅ ${rect.code}:`);
    console.log(`   Tide: ${data.next_high_tide_iso ? 'HIGH' : '---'} ${data.next_low_tide_iso ? 'LOW' : '---'}`);
    console.log(`   Tide Phase: ${data.tide_phase || 'N/A'}`);
    console.log(`   Tide Flow: ${data.tide_flow_speed_ms ? `${data.tide_flow_speed_ms.toFixed(2)} m/s` : 'N/A'}`);
    console.log(`   Pressure: ${data.air_pressure_hpa ? `${data.air_pressure_hpa.toFixed(1)} hPa` : 'N/A'}`);
    console.log(`   Cloud: ${data.cloud_cover_pct !== null ? `${data.cloud_cover_pct.toFixed(0)}%` : 'N/A'}`);
    console.log(`   Wind: ${data.wind_speed_kts ? `${data.wind_speed_kts.toFixed(1)} kts` : 'N/A'}`);
    console.log(`   Wave: ${data.wave_height_m ? `${data.wave_height_m.toFixed(1)} m` : 'N/A'}`);
    console.log('');
  }

  console.log('✅ Week 1 Pipeline Test Complete!\n');
}

testWeek1Pipeline().catch(console.error);
