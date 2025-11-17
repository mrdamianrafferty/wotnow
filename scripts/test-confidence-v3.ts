import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testV3() {
  console.log('Testing get_fishing_confidence_v3 function...\n');

  const { data, error } = await supabase.rpc('get_fishing_confidence_v3', {
    target_rectangle: '31F2',
    target_date: '2025-11-17',
    target_month: 11
  });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`✅ V3 function works! Found ${data?.length || 0} species\n`);

  if (data && data.length > 0) {
    console.log('Top 5 results:\n');
    data.slice(0, 5).forEach((r: any, i: number) => {
      console.log(`${i+1}. ${r.species_code} - ${r.species_name}`);
      console.log(`   Confidence: ${r.confidence_percent}%`);
      console.log(`   Seasonal phase: ${r.seasonal_phase}`);
      console.log(`   Seasonal weight: ${r.seasonal_weight}`);
      console.log(`   Availability multiplier: ${r.availability_multiplier}`);
      console.log(`   Source: ${r.seasonality_source || 'none'}`);
      console.log('');
    });

    // Check if any species have actual seasonality data
    const withSeasonality = data.filter((d: any) => d.seasonal_phase !== 'no_data');
    console.log(`\nSpecies with seasonality data: ${withSeasonality.length} / ${data.length}`);

    if (withSeasonality.length > 0) {
      console.log('\nExample with seasonality:');
      const example = withSeasonality[0];
      console.log(`  ${example.species_code}: phase=${example.seasonal_phase}, weight=${example.seasonal_weight}, multiplier=${example.availability_multiplier}`);
    } else {
      console.log('\n⚠️  No species have seasonality data yet.');
      console.log('   All species showing seasonal_phase="no_data" (expected if species_region_seasonality table is empty)');
    }
  }
}

testV3().catch(console.error);
