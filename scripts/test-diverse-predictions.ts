import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 10 diverse rectangles across different European regions
const testRectangles = [
  { code: '28E5', region: 'Southern North Sea (UK)' },
  { code: '31F2', region: 'English Channel (France)' },
  { code: '37I0', region: 'Mediterranean (Spain)' },
  { code: '40F7', region: 'Celtic Sea (Ireland)' },
  { code: '25E0', region: 'North Sea (Netherlands)' },
  { code: '45G2', region: 'Bay of Biscay (France)' },
  { code: '21C6', region: 'Norwegian Sea (Norway)' },
  { code: '35H5', region: 'Irish Sea (UK)' },
  { code: '50H5', region: 'Atlantic (Portugal)' },
  { code: '30E8', region: 'Southern North Sea (Belgium)' },
];

async function testDiversePredictions() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         HYBRID PREDICTION SYSTEM - DIVERSE RECTANGLES            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const predictionDate = new Date().toISOString().slice(0, 10);
  console.log(`📅 Prediction Date: ${predictionDate}\n`);

  for (const rectangle of testRectangles) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📍 ${rectangle.code} - ${rectangle.region}`);
    console.log('═'.repeat(70));

    try {
      // Call the RPC to get environmental predictions
      const { data: predictions, error } = await supabase.rpc(
        'get_environmental_predictions_enhanced',
        {
          target_rectangle: rectangle.code,
          target_date: predictionDate,
          user_lat: null,
          user_lon: null,
          substrate_type: null,
          depth_meters: null,
          current_wind_speed_ms: null,
          current_pressure_hpa: null,
          current_tide_stage: null,
          current_flow_speed_ms: null,
        }
      );

      if (error) {
        console.log(`   ❌ RPC Error: ${error.message}\n`);
        continue;
      }

      if (!predictions || predictions.length === 0) {
        console.log('   ⚠️  No predictions available\n');
        continue;
      }

      // Get regional availability data for this rectangle
      const { data: regionalData } = await supabase
        .from('species_regional_availability')
        .select('species_code, catch_count, confidence, availability_score')
        .eq('region_type', 'ices')
        .eq('region_id', rectangle.code);

      const regionalMap = new Map(
        (regionalData || []).map(r => [r.species_code, r])
      );

      console.log(`\n📊 Total Predictions: ${predictions.length}`);

      // Count catch-validated vs environmental
      const catchValidatedCount = predictions.filter((p: any) =>
        regionalMap.has(p.species_code) && regionalMap.get(p.species_code)!.catch_count > 0
      ).length;

      console.log(`   🎣 Catch-validated: ${catchValidatedCount}`);
      console.log(`   🌊 Environmental: ${predictions.length - catchValidatedCount}`);

      // Show top 5 predictions
      console.log(`\n🏆 Top 5 Species:\n`);

      const top5 = predictions.slice(0, 5);
      top5.forEach((pred: any, index: number) => {
        const regional = regionalMap.get(pred.species_code);
        const hasCatchData = regional && regional.catch_count > 0;

        // Calculate what the hybrid system would do
        let displayConfidence = pred.confidence_percent || pred.confidence || 0;
        let boost = 1.0;
        let source = '🌊 environmental';

        if (hasCatchData) {
          displayConfidence = regional!.confidence;
          boost = calculateBoost(regional!.catch_count);
          source = '🎣 catch_validated';
        }

        const adjustedScore = displayConfidence * boost;

        console.log(`   ${index + 1}. ${pred.species_code || 'UNKNOWN'}`);
        console.log(`      Name: ${pred.species_common_name || pred.name_en || pred.species_name || 'N/A'}`);
        console.log(`      Source: ${source}`);
        console.log(`      Confidence: ${displayConfidence.toFixed(1)}%`);

        if (hasCatchData) {
          console.log(`      Catch Count: ${regional!.catch_count}`);
          console.log(`      Community Boost: ${boost.toFixed(2)}x`);
          console.log(`      Adjusted Score: ${adjustedScore.toFixed(1)}`);
          console.log(`      Availability: ${(regional!.availability_score * 100).toFixed(0)}%`);
        }

        console.log('');
      });

    } catch (err) {
      console.log(`   ❌ Error: ${(err as Error).message}\n`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST COMPLETE                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('💡 Summary:');
  console.log('   - Tested 10 diverse European rectangles');
  console.log('   - Showed top 5 species per rectangle');
  console.log('   - Highlighted catch-validated vs environmental predictions');
  console.log('   - Demonstrated community boost multipliers');
}

function calculateBoost(catchCount: number): number {
  if (catchCount === 0) return 1.0;
  if (catchCount <= 5) return 1.1;
  if (catchCount <= 10) return 1.2;
  if (catchCount <= 25) return 1.3;
  if (catchCount <= 50) return 1.4;
  return 1.5; // 50+ catches
}

testDiversePredictions().catch(console.error);
