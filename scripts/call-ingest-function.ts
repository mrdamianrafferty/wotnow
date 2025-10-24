#!/usr/bin/env tsx
/**
 * Call the existing Supabase ingest-conditions Edge Function
 *
 * This function already has working NOAA OISST integration
 * Much more reliable than reimplementing the ERDDAP API
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

async function callIngestFunction(options: {
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  providers?: string[];
  vars?: string[];
  limit?: number;
}) {
  console.log('🌊 Calling ingest-conditions Edge Function\n');
  console.log('Options:', JSON.stringify(options, null, 2), '\n');

  const { data, error } = await supabase.functions.invoke('ingest-conditions', {
    body: options,
  });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Success!\n');
  console.log('Results:', JSON.stringify(data, null, 2));
}

// Parse command line arguments
const args = process.argv.slice(2);

// Default: American waters (California coast for testing)
// IMPORTANT: Bounding boxes are coastal-only to exclude land cells (which return 0°C from NOAA)
const bbox: [number, number, number, number] = args.includes('--americas')
  ? [-130, 20, -60, 50] // All American coastal waters
  : args.includes('--california')
  ? [-125, 32, -120, 42] // California coast ONLY (excludes W117-W119 inland)
  : args.includes('--florida')
  ? [-85, 24, -79, 31] // Florida coast (excludes inland panhandle)
  : args.includes('--newyork')
  ? [-75, 39, -71, 42] // New York coast (excludes inland NY)
  : args.includes('--pacific-nw')
  ? [-125, 42, -123, 50] // Pacific Northwest coast
  : args.includes('--gulf')
  ? [-98, 18, -88, 31] // Gulf of Mexico coast (excludes deep inland)
  : args.includes('--hawaii')
  ? [-161, 18, -154, 23] // Hawaii (already island-only)
  : [-125, 32, -120, 42]; // Default: California coast ONLY

const providers = args.includes('--cmems') ? ['CMEMS'] : ['NOAA']; // NOAA only for American waters
const vars = ['surface_temperature_c']; // Temperature only for now
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;

let regionName = 'California (default)';
if (args.includes('--americas')) regionName = 'All Americas';
else if (args.includes('--california')) regionName = 'California';
else if (args.includes('--florida')) regionName = 'Florida';
else if (args.includes('--newyork')) regionName = 'New York';
else if (args.includes('--pacific-nw')) regionName = 'Pacific Northwest';
else if (args.includes('--gulf')) regionName = 'Gulf of Mexico';
else if (args.includes('--hawaii')) regionName = 'Hawaii';
console.log(`Region: ${regionName}`);
console.log(`Provider: ${providers.join(', ')}`);
console.log(`Max cells: ${limit}\n`);

callIngestFunction({
  bbox,
  providers,
  vars,
  limit,
}).catch(console.error);
