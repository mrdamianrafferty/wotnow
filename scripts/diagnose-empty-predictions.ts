// Diagnose why predictions are returning empty results
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseEmptyPredictions() {
  console.log('Diagnosing empty predictions for rectangle 31F1...\n');

  // 1. Check if rectangle exists
  console.log('1. Checking rectangle data...');
  const { data: rectangleData, error: rectangleError } = await supabase
    .from('ices_rectangles')
    .select('*')
    .eq('rectangle_code', '31F1')
    .single();

  if (rectangleError) {
    console.error('❌ Rectangle error:', rectangleError.message);
  } else if (!rectangleData) {
    console.error('❌ Rectangle 31F1 not found');
  } else {
    console.log('✅ Rectangle found:', {
      code: rectangleData.rectangle_code,
      region: rectangleData.region,
      lat: rectangleData.center_lat,
      lon: rectangleData.center_lon,
    });
  }

  // 2. Check if there are conditions for this rectangle
  console.log('\n2. Checking conditions data...');
  const { data: conditionsData, error: conditionsError } = await supabase
    .from('findr_conditions_latest')
    .select('*')
    .eq('rectangle_code', '31F1')
    .single();

  if (conditionsError) {
    console.error('❌ Conditions error:', conditionsError.message);
  } else if (!conditionsData) {
    console.log('⚠️  No conditions data for 31F1');
  } else {
    console.log('✅ Conditions found:', {
      temp: conditionsData.sea_temp_c,
      salinity: conditionsData.salinity_psu,
      chlorophyll: conditionsData.chlorophyll_mg_m3,
      oxygen: conditionsData.dissolved_oxygen_mg_l,
      captured_at: conditionsData.captured_at,
    });
  }

  // 3. Check species count and regions
  console.log('\n3. Checking species...');
  const { count: totalSpecies, error: countError } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .not('name_en', 'is', null);

  if (countError) {
    console.error('❌ Species count error:', countError.message);
  } else {
    console.log(`✅ Total species with name_en: ${totalSpecies}`);
  }

  // Check species with biogeographic regions
  const { data: speciesWithRegions, error: regionsError } = await supabase
    .from('species')
    .select('name_en, biogeographic_regions')
    .not('name_en', 'is', null)
    .not('biogeographic_regions', 'is', null)
    .limit(10);

  if (regionsError) {
    console.error('❌ Regions error:', regionsError.message);
  } else {
    console.log('\nSample species with regions:');
    speciesWithRegions?.forEach(s => {
      console.log(`  - ${s.name_en}: ${JSON.stringify(s.biogeographic_regions)}`);
    });
  }

  // 4. Test the function directly
  console.log('\n4. Testing RPC function...');
  const { data: predictions, error: rpcError } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '31F1',
      target_date: '2025-10-23',
      user_lat: 51.5,
      user_lon: -3.5,
      substrate_type: null,
      depth_meters: null,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
    }
  );

  if (rpcError) {
    console.error('❌ RPC error:', rpcError);
  } else {
    console.log(`✅ RPC returned ${predictions?.length || 0} predictions`);
    if (predictions && predictions.length > 0) {
      console.log('\nFirst 3 predictions:');
      predictions.slice(0, 3).forEach((p: any) => {
        console.log(`  - ${p.name_en}: confidence=${p.confidence}, bite_score=${p.bite_score}`);
      });
    }
  }

  // 5. Check for species without biogeographic regions (should match any region)
  const { count: noRegionsCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .not('name_en', 'is', null)
    .is('biogeographic_regions', null);

  console.log(`\n5. Species without regional restrictions: ${noRegionsCount}`);
}

diagnoseEmptyPredictions();
