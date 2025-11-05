#!/usr/bin/env tsx
/**
 * Test Phase 1 weather data integration for a Mediterranean rectangle
 * This verifies that OpenMeteo weather API successfully provides pressure and cloud cover
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

import { ingestRectangle } from './ingestFindrConditions';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testMediterraneanRectangle() {
  console.log('=== Testing Phase 1 Weather Data for Mediterranean Rectangle ===\n');

  // 37E2 is in the Mediterranean (Aegean Sea, near Greece)
  // Lat ~37°15'N, Lon ~24°30'E
  const testRectangle = {
    code: '37E2',
    label: '37E2 (Aegean Sea)',
  };

  const lat = 37.25;  // Center of 37°15'N
  const lon = 24.5;   // Center of 24°30'E
  const capturedAt = new Date().toISOString();

  console.log(`Testing rectangle: ${testRectangle.label}`);
  console.log(`Coordinates: ${lat}°N, ${lon}°E`);
  console.log(`Time: ${capturedAt}\n`);

  console.log('Ingesting data (MET Norway will fail, should fall back to OpenMeteo)...\n');

  const result = await ingestRectangle(
    supabase,
    testRectangle as any,
    lat,
    lon,
    capturedAt,
    undefined, // no stormglass key
    { metOnly: false }
  );

  console.log('\n=== Ingestion Result ===');
  console.log(`Success: ${result.success}`);
  console.log(`Source: ${result.source}`);
  console.log(`MET probe attempts: ${result.metProbeAttempts}`);

  if (result.success) {
    // Query the database to check what was stored
    console.log('\n=== Checking Database ===');

    const { data, error } = await supabase
      .from('findr_conditions_latest')
      .select('rectangle_code, captured_at, air_pressure_hpa, cloud_cover_pct, source')
      .eq('rectangle_code', testRectangle.code)
      .single();

    if (error) {
      console.error('Database query error:', error);
    } else if (data) {
      console.log('\nStored data:');
      console.log(`  Rectangle: ${data.rectangle_code}`);
      console.log(`  Captured at: ${data.captured_at}`);
      console.log(`  Air Pressure: ${data.air_pressure_hpa !== null ? `${data.air_pressure_hpa} hPa` : 'NULL'} ${data.air_pressure_hpa ? '✓' : '✗'}`);
      console.log(`  Cloud Cover: ${data.cloud_cover_pct !== null ? `${data.cloud_cover_pct}%` : 'NULL'} ${data.cloud_cover_pct !== null ? '✓' : '✗'}`);
      console.log(`  Source: ${data.source}`);

      if (data.air_pressure_hpa && data.cloud_cover_pct !== null) {
        console.log('\n✅ SUCCESS: Phase 1 weather data successfully populated!');
      } else {
        console.log('\n❌ FAILURE: Phase 1 weather data missing');
      }
    } else {
      console.log('No data found in database');
    }
  } else {
    console.log('\n❌ FAILURE: Ingestion failed');
  }
}

testMediterraneanRectangle().catch(console.error);
