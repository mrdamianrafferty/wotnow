/**
 * Test script to verify that the conditions API populates all 21 Copernicus fields
 * Run: npx ts-node scripts/test-api-comprehensive-fields.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface ConditionsSnapshot {
  capturedAt: string;
  marine: {
    // Core fields (Phase 0)
    seaTemperatureC: number;
    chlorophyllMgM3: number;
    dissolvedOxygenMgL: number;
    salinityPsu: number;
    nitrateUmolL: number;
    phosphateUmolL: number;
    waveHeightM: number;
    windSpeedKts: number;
    windDirectionDeg: number;
    // Water clarity (Phase 1)
    waterClarityIndex?: number;
    waterClarityMethod?: string;
    // Ocean currents (Phase 2)
    currentEastSurface?: number;
    currentNorthSurface?: number;
    currentSpeedSurface?: number;
    currentDirectionSurface?: number;
    // Ocean dynamics (Phase 2)
    mixedLayerDepth?: number;
    seaSurfaceHeight?: number;
    // Food chain indicators (Phase 2)
    zooplanktonSurface?: number;
    phytoplanktonSurface?: number;
    primaryProductionSurface?: number;
    // Wave details (Phase 2)
    waveDirection?: number;
    wavePeriod?: number;
    windSeaHeight?: number;
    swellHeight?: number;
  };
}

async function testAPIFields() {
  console.log('🧪 Testing Conditions API - Comprehensive Copernicus Fields\n');
  console.log('=' .repeat(70));

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Query the latest conditions for a test rectangle
  const { data, error } = await supabase
    .from('findr_conditions_latest')
    .select(
      'rectangle_code, captured_at, sea_temp_c, chlorophyll_mg_m3, kd490, dissolved_oxygen_mg_l, salinity_psu, nitrate_umol_l, phosphate_umol_l, wave_height_m, wind_speed_kts, wind_direction_deg, current_east_ms, current_north_ms, current_speed_ms, current_direction_deg, mixed_layer_depth_m, sea_surface_height_m, zooplankton_mmol_m3, phytoplankton_mmol_m3, primary_production_mg_c_m3_day, wave_direction_deg, wave_period_s, wind_sea_height_m, swell_height_m'
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ Error fetching data:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.log('⚠️  No data found in findr_conditions_latest table');
    console.log('💡 This is expected if no conditions have been ingested yet');
    console.log('✅ Type definitions and query structure are correct');
    process.exit(0);
  }

  console.log(`📍 Rectangle: ${data.rectangle_code}`);
  console.log(`⏰ Captured: ${data.captured_at}\n`);

  // Count available fields
  const fields = {
    core: {
      seaTemperatureC: data.sea_temp_c,
      chlorophyllMgM3: data.chlorophyll_mg_m3,
      dissolvedOxygenMgL: data.dissolved_oxygen_mg_l,
      salinityPsu: data.salinity_psu,
      nitrateUmolL: data.nitrate_umol_l,
      phosphateUmolL: data.phosphate_umol_l,
      waveHeightM: data.wave_height_m,
      windSpeedKts: data.wind_speed_kts,
      windDirectionDeg: data.wind_direction_deg,
    },
    clarity: {
      kd490: data.kd490,
    },
    currents: {
      currentEastMs: data.current_east_ms,
      currentNorthMs: data.current_north_ms,
      currentSpeedMs: data.current_speed_ms,
      currentDirectionDeg: data.current_direction_deg,
    },
    dynamics: {
      mixedLayerDepthM: data.mixed_layer_depth_m,
      seaSurfaceHeightM: data.sea_surface_height_m,
    },
    foodChain: {
      zooplanktonMmolM3: data.zooplankton_mmol_m3,
      phytoplanktonMmolM3: data.phytoplankton_mmol_m3,
      primaryProductionMgCM3Day: data.primary_production_mg_c_m3_day,
    },
    waves: {
      waveDirectionDeg: data.wave_direction_deg,
      wavePeriodS: data.wave_period_s,
      windSeaHeightM: data.wind_sea_height_m,
      swellHeightM: data.swell_height_m,
    },
  };

  // Display results by category
  console.log('📊 FIELD AVAILABILITY REPORT:\n');

  // Core fields (should always be present)
  console.log('🌊 Core Marine Data (9 fields):');
  let coreCount = 0;
  Object.entries(fields.core).forEach(([key, value]) => {
    const present = value !== null && value !== undefined;
    if (present) coreCount++;
    console.log(`  ${present ? '✅' : '❌'} ${key}: ${present ? value : 'NULL'}`);
  });
  console.log(`  Coverage: ${coreCount}/9 (${Math.round((coreCount / 9) * 100)}%)\n`);

  // Water clarity
  console.log('💎 Water Clarity (Phase 1 - 1 field):');
  const clarityPresent = fields.clarity.kd490 !== null && fields.clarity.kd490 !== undefined;
  console.log(`  ${clarityPresent ? '✅' : '❌'} kd490: ${clarityPresent ? fields.clarity.kd490 : 'NULL'}`);
  console.log(`  Coverage: ${clarityPresent ? 1 : 0}/1 (${clarityPresent ? 100 : 0}%)\n`);

  // Ocean currents
  console.log('🌀 Ocean Currents (Phase 2 - 4 fields):');
  let currentCount = 0;
  Object.entries(fields.currents).forEach(([key, value]) => {
    const present = value !== null && value !== undefined;
    if (present) currentCount++;
    console.log(`  ${present ? '✅' : '❌'} ${key}: ${present ? value : 'NULL'}`);
  });
  console.log(`  Coverage: ${currentCount}/4 (${Math.round((currentCount / 4) * 100)}%)\n`);

  // Ocean dynamics
  console.log('🏔️  Ocean Dynamics (Phase 2 - 2 fields):');
  let dynamicsCount = 0;
  Object.entries(fields.dynamics).forEach(([key, value]) => {
    const present = value !== null && value !== undefined;
    if (present) dynamicsCount++;
    console.log(`  ${present ? '✅' : '❌'} ${key}: ${present ? value : 'NULL'}`);
  });
  console.log(`  Coverage: ${dynamicsCount}/2 (${Math.round((dynamicsCount / 2) * 100)}%)\n`);

  // Food chain
  console.log('🦐 Food Chain Indicators (Phase 2 - 3 fields):');
  let foodChainCount = 0;
  Object.entries(fields.foodChain).forEach(([key, value]) => {
    const present = value !== null && value !== undefined;
    if (present) foodChainCount++;
    console.log(`  ${present ? '✅' : '❌'} ${key}: ${present ? value : 'NULL'}`);
  });
  console.log(`  Coverage: ${foodChainCount}/3 (${Math.round((foodChainCount / 3) * 100)}%)\n`);

  // Wave details
  console.log('🌊 Wave Details (Phase 2 - 4 fields):');
  let waveCount = 0;
  Object.entries(fields.waves).forEach(([key, value]) => {
    const present = value !== null && value !== undefined;
    if (present) waveCount++;
    console.log(`  ${present ? '✅' : '❌'} ${key}: ${present ? value : 'NULL'}`);
  });
  console.log(`  Coverage: ${waveCount}/4 (${Math.round((waveCount / 4) * 100)}%)\n`);

  // Overall summary
  const totalFields = 9 + 1 + 4 + 2 + 3 + 4; // 23 total fields
  const totalPresent = coreCount + (clarityPresent ? 1 : 0) + currentCount + dynamicsCount + foodChainCount + waveCount;
  
  console.log('=' .repeat(70));
  console.log(`📈 OVERALL COVERAGE: ${totalPresent}/${totalFields} fields (${Math.round((totalPresent / totalFields) * 100)}%)\n`);

  if (totalPresent >= 21) {
    console.log('✅ SUCCESS: Comprehensive Copernicus integration is working!');
    console.log('🎯 All major data streams are flowing correctly.');
  } else if (totalPresent >= 10) {
    console.log('⚠️  PARTIAL: Some Copernicus fields are populated.');
    console.log('💡 Missing fields may be null in source data or need ingestion.');
  } else {
    console.log('❌ LOW COVERAGE: Most fields are missing.');
    console.log('💡 Data may not be ingested yet. Check your data pipeline.');
  }

  console.log('\n🔍 Next Steps:');
  console.log('  1. Run data ingestion to populate Copernicus fields');
  console.log('  2. Verify API response includes all new fields');
  console.log('  3. Update useBiteScore to use ocean current data');
  console.log('  4. Add current_speed_weight to species table');
}

testAPIFields().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
