#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.cli') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function diagnose() {
  console.log('🔍 Diagnosing empty predictions for rectangle 31E8 on 2025-11-12\n');

  // 1. Check if rectangle exists
  console.log('1. Checking ICES rectangle 31E8...');
  const { data: rectangle, error: rectError } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, center_lat, center_lon')
    .eq('rectangle_code', '31E8')
    .single();

  if (rectError) {
    console.log('❌ Error fetching rectangle:', rectError.message);
  } else if (!rectangle) {
    console.log('❌ Rectangle 31E8 not found in database');
  } else {
    console.log('✅ Rectangle found:', rectangle);
  }

  // 2. Check species with biogeographic regions
  console.log('\n2. Checking species data...');
  const { data: allSpecies, error: speciesError } = await supabase
    .from('species')
    .select('id, species_code, name_en, biogeographic_regions')
    .limit(5);

  if (speciesError) {
    console.log('❌ Error fetching species:', speciesError.message);
  } else {
    console.log(`✅ Found ${allSpecies?.length || 0} species (showing first 5):`);
    allSpecies?.forEach(s => {
      console.log(`  - ${s.name_en} (${s.species_code}): regions = ${s.biogeographic_regions || 'NULL'}`);
    });
  }

  // 3. Check species that match the region
  if (rectangle?.region) {
    console.log(`\n3. Checking species matching region "${rectangle.region}"...`);
    const { data: matchingSpecies, error: matchError } = await supabase
      .from('species')
      .select('id, species_code, name_en, biogeographic_regions');

    if (matchError) {
      console.log('❌ Error:', matchError.message);
    } else {
      const filtered = matchingSpecies?.filter(s =>
        !s.biogeographic_regions ||
        s.biogeographic_regions.length === 0 ||
        s.biogeographic_regions.includes(rectangle.region)
      );
      console.log(`✅ Found ${filtered?.length || 0} species matching region or with NULL regions`);
      if (filtered && filtered.length > 0) {
        console.log('   Sample species:');
        filtered.slice(0, 3).forEach(s => {
          console.log(`  - ${s.name_en} (${s.species_code}): regions = ${s.biogeographic_regions || 'NULL'}`);
        });
      }
    }
  }

  // 4. Check environmental conditions
  console.log('\n4. Checking environmental conditions for 31E8...');
  const { data: conditions, error: condError } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, water_temp_c, sea_temp_c, salinity_psu, captured_at')
    .eq('rectangle_code', '31E8')
    .limit(1);

  if (condError) {
    console.log('❌ Error fetching conditions:', condError.message);
  } else if (!conditions || conditions.length === 0) {
    console.log('❌ No environmental conditions found for rectangle 31E8');
  } else {
    console.log('✅ Conditions found:', conditions[0]);
  }

  // 5. Check moon cache
  console.log('\n5. Checking moon cache for 2025-11-12...');
  const { data: moonData, error: moonError } = await supabase
    .from('moon_cache')
    .select('local_date, moon_phase_name, moon_illumination_pct')
    .eq('local_date', '2025-11-12')
    .single();

  if (moonError) {
    console.log('❌ Error fetching moon data:', moonError.message);
  } else if (!moonData) {
    console.log('❌ No moon data found for 2025-11-12');
  } else {
    console.log('✅ Moon data found:', moonData);
  }

  // 6. Test RPC function directly
  console.log('\n6. Testing RPC function directly...');
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('get_environmental_predictions_enhanced', {
      target_rectangle: '31E8',
      target_date: '2025-11-12',
      user_lat: null,
      user_lon: null,
      substrate_type: null,
      depth_meters: null,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
      current_tide_stage: null,
      current_flow_speed_ms: null
    });

  if (rpcError) {
    console.log('❌ RPC Error:', rpcError);
  } else {
    console.log(`✅ RPC returned ${rpcResult?.length || 0} predictions`);
    if (rpcResult && rpcResult.length > 0) {
      console.log('   Top 3 predictions:');
      rpcResult.slice(0, 3).forEach(p => {
        console.log(`  - ${p.species_common_name}: ${p.confidence_percent}% confidence`);
      });
    }
  }

  console.log('\n✅ Diagnosis complete');
}

diagnose().catch(console.error);
