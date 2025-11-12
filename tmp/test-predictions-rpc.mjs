// Test if the predictions RPC works
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.cli
dotenv.config({ path: join(__dirname, '../.env.cli') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  console.error('SUPABASE_URL:', SUPABASE_URL ?'set' : 'NOT SET');
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'set' : 'NOT SET');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRPC() {
  console.log('Testing RPC function get_environmental_predictions_enhanced...');
  console.log('SUPABASE_URL:', SUPABASE_URL);

  // Use a known rectangle code (e.g., from Irish coast)
  const params = {
    target_rectangle: '35E5',
    target_date: '2025-11-12',
    user_lat: null,
    user_lon: null,
    substrate_type: null,
    depth_meters: null,
    current_wind_speed_ms: null,
    current_pressure_hpa: null,
    current_tide_stage: null,
    current_flow_speed_ms: null
  };

  console.log('Calling RPC with params:', JSON.stringify(params, null, 2));

  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', params);

  if (error) {
    console.error('RPC Error:');
    console.error('  Code:', error.code);
    console.error('  Message:', error.message);
    console.error('  Details:', error.details);
    console.error('  Hint:', error.hint);
    return;
  }

  console.log('SUCCESS! Received data:');
  console.log('  Number of predictions:', Array.isArray(data) ? data.length : 'N/A');
  if (Array.isArray(data) && data.length > 0) {
    console.log('  First prediction:');
    console.log('    Species:', data[0].species_common_name);
    console.log('    Confidence:', data[0].confidence_percent);
    console.log('    Fields:', Object.keys(data[0]).join(', '));
  }
}

testRPC().catch(console.error);
