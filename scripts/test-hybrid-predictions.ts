import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testHybridPredictions() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           HYBRID PREDICTION SYSTEM TEST                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Test rectangles with catch data (from conversation summary)
  const testRectangles = ['28E5', '25E0'];

  console.log('📋 Testing rectangles:', testRectangles.join(', '));
  console.log('   These rectangles should have catch-validated data\n');

  for (const rectangleCode of testRectangles) {
    console.log(`\n🔍 Testing rectangle: ${rectangleCode}`);
    console.log('═'.repeat(70));

    // 1. Check species_regional_availability data
    const { data: regionalData, error: regionalError } = await supabase
      .from('species_regional_availability')
      .select('species_code, catch_count, confidence, availability_score, data_source')
      .eq('region_type', 'ices')
      .eq('region_id', rectangleCode)
      .gt('catch_count', 0);

    if (regionalError) {
      console.error('❌ Error fetching regional data:', regionalError.message);
      continue;
    }

    console.log(`\n📊 Regional Availability Data (catch_count > 0):`);
    if (!regionalData || regionalData.length === 0) {
      console.log('   ⚠️  No catch-validated data found for this rectangle');
      console.log('   📝 All species will use environmental matching');
    } else {
      console.log(`   ✅ Found ${regionalData.length} species with catch data:`);
      regionalData.forEach(row => {
        console.log(`      • ${row.species_code}: ${row.catch_count} catches (confidence: ${row.confidence}, score: ${row.availability_score})`);
      });
    }

    // 2. Call predictions API via local simulation (not actual HTTP)
    // We'll query the RPC directly to mimic the API behavior
    const predictionDate = new Date().toISOString().slice(0, 10);

    console.log(`\n🎯 Simulating predictions API call...`);
    console.log(`   Rectangle: ${rectangleCode}`);
    console.log(`   Date: ${predictionDate}`);

    const { data: predictions, error: predictionsError } = await supabase.rpc(
      'get_environmental_predictions_enhanced',
      {
        target_rectangle: rectangleCode,
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

    if (predictionsError) {
      console.error('   ❌ RPC error:', predictionsError.message);
      continue;
    }

    if (!predictions || predictions.length === 0) {
      console.log('   ⚠️  No predictions returned from RPC');
      continue;
    }

    console.log(`   ✅ Received ${predictions.length} predictions from RPC\n`);

    // 3. Show which species have catch data vs environmental only
    console.log('📈 Prediction Data Source Breakdown:');

    const speciesWithCatchData = regionalData?.map(r => r.species_code) || [];
    const catchValidatedCount = predictions.filter((p: any) =>
      speciesWithCatchData.includes(p.species_code)
    ).length;

    console.log(`   🎣 Catch-validated species: ${catchValidatedCount}`);
    console.log(`   🌊 Environmental-only species: ${predictions.length - catchValidatedCount}`);

    // 4. Show top 5 predictions (these should be ranked by confidence × community boost)
    console.log(`\n🏆 Top 5 Predictions (would be re-ranked in API):`);
    const top5 = predictions.slice(0, 5);
    top5.forEach((pred: any, index: number) => {
      const hasCatchData = speciesWithCatchData.includes(pred.species_code);
      const source = hasCatchData ? '🎣 catch_validated' : '🌊 environmental';
      const catchInfo = regionalData?.find(r => r.species_code === pred.species_code);
      const boost = catchInfo ? calculateBoost(catchInfo.catch_count) : 1.0;
      const confidence = pred.confidence_percent || pred.confidence || 0;
      const adjustedScore = confidence * boost;

      console.log(`   ${index + 1}. ${pred.species_code || 'UNKNOWN'} (${source})`);
      console.log(`      Confidence: ${confidence.toFixed(1)}%`);
      if (hasCatchData && catchInfo) {
        console.log(`      Catch Count: ${catchInfo.catch_count}`);
        console.log(`      Community Boost: ${boost.toFixed(2)}x`);
        console.log(`      Adjusted Score: ${adjustedScore.toFixed(1)}`);
      }
    });
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST COMPLETE                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('💡 Next Steps:');
  console.log('   1. Run type check: npm run typecheck');
  console.log('   2. Test locally: npm run dev');
  console.log('   3. Make predictions API call with bypassCache=true');
  console.log('   4. Verify data_source, catch_count, community_boost fields in response');
}

function calculateBoost(catchCount: number): number {
  if (catchCount === 0) return 1.0;
  if (catchCount <= 5) return 1.1;
  if (catchCount <= 10) return 1.2;
  if (catchCount <= 25) return 1.3;
  if (catchCount <= 50) return 1.4;
  return 1.5; // 50+ catches
}

testHybridPredictions().catch(console.error);
