import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeBioBandCalculation() {
  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: '28E5',
    target_date: '2025-11-16',
    user_lat: null,
    user_lon: null,
    substrate_type: null,
    depth_meters: null,
    current_wind_speed_ms: null,
    current_pressure_hpa: null,
    current_tide_stage: null,
    current_flow_speed_ms: null,
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Top 5 predictions with detailed scoring breakdown:\n');

  data.slice(0, 5).forEach((p: any, i: number) => {
    console.log(`${i + 1}. ${p.species_code} (${p.guild})`);
    console.log(`   confidence_percent: ${p.confidence_percent}`);
    console.log(`   bio_band_score: ${p.bio_band_score}`);
    console.log(`   habitat_bonus: ${p.habitat_bonus}`);
    console.log(`   temp_score: ${p.temp_score} (weight: ${p.temp_weight})`);
    console.log(`   light_score: ${p.light_score} (weight: ${p.light_weight})`);
    console.log(`   tide_score: ${p.tide_score} (weight: ${p.tide_weight})`);
    console.log(`   lunar_score: ${p.lunar_score} (weight: ${p.lunar_weight})`);

    // Get guild-specific weights from the RPC function
    const guildWeights: any = {
      pelagic: { temp: 0.4, light: 0.3, lunar: 0.2, tide: 0.1 },
      reef_kelp: { temp: 0.3, light: 0.25, lunar: 0.2, tide: 0.25 },
      benthic: { temp: 0.25, light: 0.2, lunar: 0.25, tide: 0.3 },
      surf_estuary: { temp: 0.25, light: 0.2, lunar: 0.2, tide: 0.35 },
      cephalopod: { temp: 0.35, light: 0.3, lunar: 0.2, tide: 0.15 },
    };

    const weights = guildWeights[p.guild] || guildWeights.reef_kelp;

    const weightedScores = {
      temp: p.temp_score * weights.temp,
      light: p.light_score * weights.light,
      lunar: p.lunar_score * weights.lunar,
      tide: p.tide_score * weights.tide,
    };

    const maxWeighted = Math.max(...Object.values(weightedScores));
    const expectedBioBand = maxWeighted * 10;

    console.log(`   Guild weights for ${p.guild}:`);
    console.log(`     temp: ${weights.temp}, light: ${weights.light}, lunar: ${weights.lunar}, tide: ${weights.tide}`);
    console.log(`   Weighted factor scores:`);
    console.log(`     temp: ${p.temp_score} × ${weights.temp} = ${weightedScores.temp.toFixed(2)}`);
    console.log(`     light: ${p.light_score} × ${weights.light} = ${weightedScores.light.toFixed(2)}`);
    console.log(`     lunar: ${p.lunar_score} × ${weights.lunar} = ${weightedScores.lunar.toFixed(2)}`);
    console.log(`     tide: ${p.tide_score} × ${weights.tide} = ${weightedScores.tide.toFixed(2)}`);
    console.log(`   GREATEST(weighted scores) = ${maxWeighted.toFixed(2)}`);
    console.log(`   Expected bio_band_score (max × 10): ${expectedBioBand.toFixed(1)}`);
    console.log(`   Actual bio_band_score: ${p.bio_band_score}`);
    console.log(`   Match: ${Math.abs(expectedBioBand - p.bio_band_score) < 0.1 ? '✅' : '❌'}`);
    console.log('');
  });

  // Summary
  const maxConfidence = Math.max(...data.map((p: any) => p.confidence_percent));
  const maxBioBand = Math.max(...data.map((p: any) => p.bio_band_score));

  console.log('\n═══════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Maximum confidence across all species: ${maxConfidence}%`);
  console.log(`Maximum bio_band_score: ${maxBioBand}`);
  console.log(`Total species returned: ${data.length}`);
}

analyzeBioBandCalculation().catch(console.error);
