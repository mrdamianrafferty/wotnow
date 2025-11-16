import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reverseEngineerFormula() {
  console.log('Reverse-engineering bio_band_score formula...\n');

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

  if (error || !data || data.length === 0) {
    console.error('Error:', error);
    return;
  }

  // Test CUT (cephalopod) - highest scorer
  const cut = data.find((p: any) => p.species_code === 'CUT');
  if (!cut) {
    console.log('CUT not found');
    return;
  }

  console.log('CUT (Common Cuttlefish) - cephalopod guild');
  console.log('═'.repeat(60));
  console.log(`Actual bio_band_score: ${cut.bio_band_score}`);
  console.log(`Actual confidence_percent: ${cut.confidence_percent}`);
  console.log('');

  console.log('Factor scores:');
  console.log(`  temp_score: ${cut.temp_score} (weight: ${cut.temp_weight})`);
  console.log(`  light_score: ${cut.light_score} (weight: ${cut.light_weight})`);
  console.log(`  tide_score: ${cut.tide_score} (weight: ${cut.tide_weight})`);
  console.log(`  lunar_score: ${cut.lunar_score} (weight: ${cut.lunar_weight})`);
  console.log('');

  // Check if there's a salinity_score in the JSONB factors
  console.log('Factors JSONB:', JSON.stringify(cut.factors, null, 2));
  console.log('');

  // Try different formulas:
  console.log('Testing formulas:');
  console.log('─'.repeat(60));

  // Formula 1: Sum of (score * species_weight)
  const sum1 = (cut.temp_score * cut.temp_weight) +
                (cut.light_score * cut.light_weight) +
                (cut.tide_score * cut.tide_weight) +
                (cut.lunar_score * cut.lunar_weight);
  console.log(`1. SUM(score × species_weight) = ${sum1.toFixed(3)}`);
  console.log(`   × 10 = ${(sum1 * 10).toFixed(1)} ${Math.abs(sum1 * 10 - cut.bio_band_score) < 0.5 ? '✅' : '❌'}`);
  console.log('');

  // Formula 2: Sum of raw scores
  const sum2 = cut.temp_score + cut.light_score + cut.tide_score + cut.lunar_score;
  console.log(`2. SUM(raw scores) = ${sum2.toFixed(3)}`);
  console.log(`   × something = ${cut.bio_band_score}`);
  console.log(`   Multiplier = ${(cut.bio_band_score / sum2).toFixed(3)}`);
  console.log('');

  // Formula 3: Sum with salinity
  // Check if salinity contributes
  if (cut.factors?.salinity?.score) {
    const salinityScore = cut.factors.salinity.score;
    const sum3 = sum1 + salinityScore;
    console.log(`3. SUM(weighted) + salinity(${salinityScore}) = ${sum3.toFixed(3)}`);
    console.log(`   × 10 = ${(sum3 * 10).toFixed(1)} ${Math.abs(sum3 * 10 - cut.bio_band_score) < 0.5 ? '✅' : '❌'}`);
    console.log('');
  }

  // Formula 4: Check what multiplier gets us from sum1 to bio_band_score
  const multiplier = cut.bio_band_score / sum1;
  console.log(`4. Multiplier to reach bio_band_score: ${multiplier.toFixed(2)}`);
  console.log('');

  // Test across multiple species to find pattern
  console.log('\nTesting pattern across top 5 species:');
  console.log('═'.repeat(60));

  data.slice(0, 5).forEach((p: any) => {
    const weightedSum = (p.temp_score * p.temp_weight) +
                         (p.light_score * p.light_weight) +
                         (p.tide_score * p.tide_weight) +
                         (p.lunar_score * p.lunar_weight);

    const mult = p.bio_band_score / weightedSum;

    console.log(`${p.species_code} (${p.guild}):`);
    console.log(`  weighted_sum = ${weightedSum.toFixed(3)}`);
    console.log(`  bio_band_score = ${p.bio_band_score}`);
    console.log(`  multiplier = ${mult.toFixed(2)}`);
  });
}

reverseEngineerFormula().catch(console.error);
