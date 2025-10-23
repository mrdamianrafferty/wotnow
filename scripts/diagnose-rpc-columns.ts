// Diagnose RPC column mismatch
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseRPC() {
  console.log('Testing simplified query...\n');

  // Test a simpler version to see if the basic structure works
  const testQuery = `
    SELECT
      id as species_id,
      species_code,
      name_en,
      scientific_name,
      playful_bio_en,
      '31F1'::text as ices_rectangle,
      '2025-10-23'::date as prediction_date,
      50 as confidence,
      40 as bite_score,
      30 as bio_band_score,
      20 as temp_score,
      10 as substrate_score,
      10 as depth_score,
      10 as light_score,
      0 as habitat_bonus,
      5 as lunar_score,
      5 as weather_score,
      10 as freshness_score,
      8 as completeness_score,
      'Full Moon' as moon_phase,
      0.99 as moon_illumination,
      biogeographic_regions
    FROM species
    WHERE name_en IS NOT NULL
    LIMIT 5
  `;

  try {
    const { data, error } = await supabase.rpc('sql', { query: testQuery });

    if (error) {
      console.error('Direct query failed:', error);

      // Try the actual RPC
      console.log('\n\nTrying actual RPC...\n');
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_environmental_predictions_enhanced', {
        target_rectangle: '31F1',
        target_date: '2025-10-23',
        user_lat: 51.5,
        user_lon: -3.5,
        substrate_type: null,
        depth_meters: null,
        current_wind_speed_ms: null,
        current_pressure_hpa: null,
      });

      if (rpcError) {
        console.error('❌ RPC Error:', {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        });
      } else {
        console.log('✅ RPC succeeded!');
        console.log('Results:', rpcData);
      }
    } else {
      console.log('✅ Direct query succeeded!');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

diagnoseRPC();
