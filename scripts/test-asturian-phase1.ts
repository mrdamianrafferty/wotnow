#!/usr/bin/env tsx
/**
 * Test Phase 1 weather data integration for Asturian coast rectangle (Bay of Biscay)
 * This verifies that OpenMeteo weather API provides pressure and cloud cover for Spanish waters
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

async function testAsturianRectangle() {
  console.log('=== Testing Phase 1 Weather Data for Asturian Coast Rectangle ===\n');

  // 43P1 is in the Bay of Biscay (Asturian coast, Spain)
  const testRectangle = {
    code: '43P1',
    label: '43P1 (Bay of Biscay - Asturias)',
  };

  // Get the actual rectangle coordinates from the database
  const { data: rectData, error: rectError } = await supabase
    .from('ices_rectangles')
    .select('*')
    .eq('rectangle_code', '43P1')
    .single();

  if (rectError || !rectData) {
    console.error('Failed to find rectangle 43P1:', rectError);
    return;
  }

  // Calculate center point - ICES rectangles are 30min lat × 1° lon
  // Rectangle code format: LLMM where LL = latitude tens, MM = minutes/10 for lat, P = prime meridian offset, last digit = longitude
  // 43P1 means: 43°N (43), P = west of 0°, 1 = 6-7°W
  const lat = 43.25;  // Center of 43-43.5°N
  const lon = -6.5;   // Center of 6-7°W

  const capturedAt = new Date().toISOString();

  console.log(`Testing rectangle: ${testRectangle.label}`);
  console.log(`Coordinates: ${lat}°N, ${lon}°E`);
  console.log(`Time: ${capturedAt}\n`);

  console.log('Ingesting data (MET Norway will fail for Spanish waters, should fall back to OpenMeteo)...\n');

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
        console.log('\n✅ SUCCESS: Phase 1 weather data successfully populated for Asturian coast!');
        console.log('   OpenMeteo weather API integration working correctly.');
      } else {
        console.log('\n❌ FAILURE: Phase 1 weather data missing');
        console.log('   Expected: OpenMeteo to provide pressure and cloud cover for Spanish waters');
      }
    } else {
      console.log('No data found in database');
    }
  } else {
    console.log('\n❌ FAILURE: Ingestion failed');
  }
}

testAsturianRectangle().catch(console.error);
