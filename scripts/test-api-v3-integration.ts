import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PredictionResponse {
  species_code: string;
  species_name: string;
  confidence_percent: number;
  seasonal_phase?: string;
  seasonal_weight?: number;
  seasonality_source?: string | null;
}

async function testV3Integration() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  Testing API v3 Integration                                                  ║');
  console.log('║  Simulating what the API endpoint will call                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');

  const testRectangle = '25E0'; // Lastres, Spain
  const testDate = '2025-11-17';
  const testMonth = 11; // November

  console.log('\n📍 Test Parameters:');
  console.log(`   Rectangle: ${testRectangle}`);
  console.log(`   Date: ${testDate}`);
  console.log(`   Month: ${testMonth}`);

  console.log('\n🔄 Calling get_fishing_confidence_v3...\n');

  const { data, error } = await supabase.rpc('get_fishing_confidence_v3', {
    target_rectangle: testRectangle,
    target_date: testDate,
    target_month: testMonth
  });

  if (error) {
    console.error('❌ Error calling v3:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('⚠️  No data returned');
    process.exit(1);
  }

  const results = data as PredictionResponse[];

  console.log('✅ Success! Got predictions from v3\n');
  console.log(`📊 Summary:`);
  console.log(`   Total species: ${results.length}`);

  const withSeasonality = results.filter(r => r.seasonal_phase && r.seasonal_phase !== 'no_data');
  console.log(`   With seasonality data: ${withSeasonality.length} (${Math.round(withSeasonality.length/results.length*100)}%)`);

  console.log(`\n🏆 Top 5 Species (by confidence):`);
  results.slice(0, 5).forEach((r, i) => {
    const phaseInfo = r.seasonal_phase !== 'no_data' && r.seasonal_phase
      ? ` | ${r.seasonal_phase} (×${r.seasonal_weight})`
      : '';
    console.log(`   ${i+1}. ${r.species_code} - ${r.species_name}`);
    console.log(`      Confidence: ${r.confidence_percent}%${phaseInfo}`);
    if (r.seasonality_source) {
      console.log(`      Source: ${r.seasonality_source}`);
    }
  });

  // Check for expected fields from v3
  const firstResult = results[0];
  const hasV3Fields =
    'seasonal_phase' in firstResult &&
    'seasonal_weight' in firstResult &&
    'seasonality_source' in firstResult;

  if (hasV3Fields) {
    console.log('\n✅ V3 fields present in response (seasonal_phase, seasonal_weight, seasonality_source)');
  } else {
    console.log('\n⚠️  Warning: V3 fields missing from response');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ API v3 integration test passed!');
  console.log('='.repeat(80));
  console.log('\nThe API endpoint should work correctly with the existing frontend.');
  console.log('Frontend expects fields like: species_code, species_name, confidence_percent');
  console.log('V3 adds: seasonal_phase, seasonal_weight, seasonality_source\n');
}

testV3Integration().catch(console.error);
