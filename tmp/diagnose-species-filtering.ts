import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 Diagnosing Species Filtering Issues\n');

  // Test 1: Check rectangle region
  console.log('=== Test 1: Rectangle 31F1 Region ===');
  const { data: rect, error: rectError } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, center_lat, center_lon')
    .eq('rectangle_code', '31F1')
    .single();

  if (rectError) {
    console.error('Error:', rectError);
  } else {
    console.log('Rectangle:', rect);
  }

  const rectangleRegion = rect?.region;
  console.log('\nRectangle region value:', JSON.stringify(rectangleRegion));

  // Test 2: Count total species
  console.log('\n=== Test 2: Total Species Count ===');
  const { count: totalCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true });

  console.log('Total species in database:', totalCount);

  // Test 3: Count species with biogeographic_regions
  console.log('\n=== Test 3: Species with Biogeographic Regions ===');

  const { data: allSpecies, error: speciesError } = await supabase
    .from('species')
    .select('species_code, name_en, biogeographic_regions, guild');

  if (speciesError) {
    console.error('Error:', speciesError);
  } else {
    const withRegions = allSpecies?.filter(s => s.biogeographic_regions && s.biogeographic_regions.length > 0) || [];
    const withNull = allSpecies?.filter(s => !s.biogeographic_regions || s.biogeographic_regions.length === 0) || [];

    console.log(`Species with regions: ${withRegions.length}`);
    console.log(`Species with NULL/empty regions: ${withNull.length}`);

    // Check how many match our rectangle region
    if (rectangleRegion) {
      const matching = withRegions.filter(s =>
        s.biogeographic_regions?.includes(rectangleRegion)
      );
      console.log(`\nSpecies matching region "${rectangleRegion}": ${matching.length}`);

      if (matching.length > 0) {
        console.log('\nSample matching species:');
        matching.slice(0, 10).forEach(s => {
          console.log(`  - ${s.species_code}: ${s.name_en} (${s.guild || 'no guild'})`);
        });
      }
    }

    console.log('\nAll unique biogeographic regions in database:');
    const allRegions = new Set<string>();
    withRegions.forEach(s => {
      s.biogeographic_regions?.forEach((r: string) => allRegions.add(r));
    });
    console.log(Array.from(allRegions).sort());
  }

  // Test 4: Check environmental conditions
  console.log('\n=== Test 4: Environmental Conditions for 31F1 ===');
  const { data: conditions } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, sea_temp_c, water_temp_c, salinity_psu, captured_at')
    .eq('rectangle_code', '31F1')
    .limit(1)
    .maybeSingle();

  if (conditions) {
    console.log('Temperature:', conditions.water_temp_c || conditions.sea_temp_c, '°C');
    console.log('Salinity:', conditions.salinity_psu, 'PSU');
    console.log('Data age:', new Date().toISOString(), 'vs', conditions.captured_at);
  } else {
    console.log('⚠️  No environmental conditions found!');
  }

  // Test 5: Test the actual RPC call
  console.log('\n=== Test 5: RPC Call ===');
  const { data: predictions, error: rpcError } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '31F1',
      target_date: '2025-01-12',
      user_lat: null,
      user_lon: null,
      substrate_type: null,
      depth_meters: null,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
      current_tide_stage: null,
      current_flow_speed_ms: null
    }
  );

  if (rpcError) {
    console.error('RPC Error:', rpcError);
  } else {
    console.log(`RPC returned ${predictions?.length || 0} species`);
    if (predictions && predictions.length > 0) {
      console.log('\nTop 5 predictions:');
      predictions.slice(0, 5).forEach((p: any) => {
        console.log(`  ${p.species_code}: ${p.species_common_name} (${p.confidence_percent}%)`);
      });
    }
  }

  // Test 6: Try manual query with same filter
  console.log('\n=== Test 6: Manual Query (Same Filter as RPC) ===');

  const { data: manualResults } = await supabase
    .from('species')
    .select('species_code, name_en, biogeographic_regions, guild')
    .or(`biogeographic_regions.cs.{${rectangleRegion}},biogeographic_regions.is.null`);

  console.log(`Manual query returned ${manualResults?.length || 0} species`);

  // Test 7: Try without region filter
  console.log('\n=== Test 7: RPC with Different Rectangle ===');

  // Try a coastal rectangle that should have more species
  const { data: predictions2, error: rpcError2 } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '31F2',  // Different rectangle
      target_date: '2025-01-12',
      user_lat: null,
      user_lon: null,
      substrate_type: null,
      depth_meters: null,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
      current_tide_stage: null,
      current_flow_speed_ms: null
    }
  );

  if (rpcError2) {
    console.error('RPC Error:', rpcError2);
  } else {
    console.log(`RPC for 31F2 returned ${predictions2?.length || 0} species`);
  }

  console.log('\n✅ Diagnosis Complete');
}

diagnose().catch(console.error);
