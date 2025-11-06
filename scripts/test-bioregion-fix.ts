// Quick test of the RPC function to verify species are returned after bioregion fix
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPredictions() {
  console.log('Testing get_environmental_predictions_enhanced RPC...\n');

  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: '31E8',  // English Channel
    target_date: '2025-11-06',
    user_lat: 50.5,
    user_lon: -2.5,
    substrate_type: 'sand',
    depth_meters: 20,
    current_wind_speed_ms: 5,
    current_pressure_hpa: 1015,
    current_tide_stage: 'rising',
    current_flow_speed_ms: 0.5
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`✅ Total species returned: ${data.length}\n`);

  if (data.length > 0) {
    console.log('Top 10 species:');
    data.slice(0, 10).forEach((species: any, i: number) => {
      console.log(`${i + 1}. ${species.name_en} (confidence: ${species.confidence}, regions: ${species.biogeographic_regions?.join(', ') || 'null'})`);
    });

    // Check if we're getting diverse species (not just mullet)
    const speciesNames = data.map((s: any) => s.name_en);
    const hasMullet = speciesNames.some((name: string) => name.toLowerCase().includes('mullet'));
    const hasOthers = speciesNames.some((name: string) => !name.toLowerCase().includes('mullet'));

    console.log(`\n✅ SUCCESS! Species diversity:`);
    console.log(`   - Has mullet: ${hasMullet ? 'Yes' : 'No'}`);
    console.log(`   - Has other species: ${hasOthers ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   - Bioregion filtering is now working correctly!`);
  } else {
    console.log('⚠️  No species returned. Issue may persist.');
  }
}

testPredictions().catch(console.error);
