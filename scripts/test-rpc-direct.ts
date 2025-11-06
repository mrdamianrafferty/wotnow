import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  console.log('\n=== Testing RPC Function Directly ===\n');

  // Test the RPC with rectangle 31E8 (Phase 2 signature with tide/flow)
  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: '31E8',
    target_date: '2025-11-05',
    user_lat: null,
    user_lon: null,
    substrate_type: null,
    depth_meters: null,
    current_wind_speed_ms: null,
    current_pressure_hpa: null,
    current_tide_stage: null,
    current_flow_speed_ms: null
  });

  if (error) {
    console.error('Error calling RPC:', error);
    return;
  }

  console.log(`Total species returned: ${data?.length || 0}\n`);

  if (data && data.length > 0) {
    console.log('Top 20 species:');
    data.slice(0, 20).forEach((row: any, i: number) => {
      console.log(`${i + 1}. ${row.name_en} | Combined Score: ${row.combined_score?.toFixed(2)} | Env: ${row.environmental_score?.toFixed(2)} | Stealth: ${row.stealth_score?.toFixed(2)}`);
    });

    // Check if we see more than just mullet
    const mulletCount = data.filter((row: any) => row.name_en?.toLowerCase().includes('mullet')).length;
    const nonMulletCount = data.length - mulletCount;
    console.log(`\nMullet species: ${mulletCount}`);
    console.log(`Non-mullet species: ${nonMulletCount}`);

    // Show sample of biogeographic regions from results
    console.log('\nSample biogeographic regions from results:');
    data.slice(0, 5).forEach((row: any) => {
      console.log(`- ${row.name_en}: ${JSON.stringify(row.biogeographic_regions)}`);
    });
  }
}

testRPC().catch(console.error);
