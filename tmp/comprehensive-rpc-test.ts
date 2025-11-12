import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_RECTANGLES = [
  { code: '31F1', expected_region: 'NE_Atlantic', name: 'English Channel' },
  { code: '31F2', expected_region: 'NE_Atlantic', name: 'English Channel' },
  { code: '28E5', expected_region: 'NE_Atlantic', name: 'Celtic Sea' },
  { code: '39F3', expected_region: 'NE_Atlantic', name: 'North Sea' },
  { code: '07E7', expected_region: 'Mediterranean', name: 'Mediterranean' },
];

async function testRectangle(rectCode: string, expectedRegion: string, name: string) {
  const { data, error } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: rectCode,
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

  const result = {
    code: rectCode,
    name,
    expected_region: expectedRegion,
    success: !error,
    count: data?.length || 0,
    error: error?.message,
    top5: data?.slice(0, 5).map((p: any) => ({
      code: p.species_code,
      name: p.species_common_name,
      confidence: p.confidence_percent
    }))
  };

  return result;
}

async function comprehensiveTest() {
  console.log('🧪 Comprehensive RPC Test\n');
  console.log('Testing get_environmental_predictions_enhanced across multiple rectangles\n');
  console.log('=' .repeat(80));

  const results = [];

  for (const rect of TEST_RECTANGLES) {
    console.log(`\n📍 Testing ${rect.code} (${rect.name})`);
    console.log(`   Expected biogeographic region: ${rect.expected_region}`);

    const result = await testRectangle(rect.code, rect.expected_region, rect.name);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ SUCCESS: ${result.count} species returned`);
      if (result.count >= 20) {
        console.log(`   ✓ Meets 20+ species requirement`);
      } else {
        console.log(`   ⚠️  Below 20 species (expected 20+)`);
      }

      if (result.top5 && result.top5.length > 0) {
        console.log(`\n   Top 5 predictions:`);
        result.top5.forEach((p: any) => {
          console.log(`     ${p.code}: ${p.name} (${p.confidence}%)`);
        });
      }
    } else {
      console.log(`   ❌ FAILED: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary\n');

  const passed = results.filter(r => r.success && r.count >= 20);
  const passedButLow = results.filter(r => r.success && r.count > 0 && r.count < 20);
  const failed = results.filter(r => !r.success || r.count === 0);

  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed (20+ species): ${passed.length}`);
  console.log(`⚠️  Passed but < 20 species: ${passedButLow.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  console.log('\nSpecies count by rectangle:');
  results.forEach(r => {
    const icon = r.count >= 20 ? '✅' : r.count > 0 ? '⚠️ ' : '❌';
    console.log(`  ${icon} ${r.code}: ${r.count} species (${r.name})`);
  });

  // Check for consistent region mapping
  console.log('\nBiogeographic Region Mapping:');
  const neAtlanticCount = results.filter(r => r.expected_region === 'NE_Atlantic' && r.count > 0).length;
  const medCount = results.filter(r => r.expected_region === 'Mediterranean' && r.count > 0).length;

  console.log(`  NE_Atlantic rectangles with species: ${neAtlanticCount}/${results.filter(r => r.expected_region === 'NE_Atlantic').length}`);
  console.log(`  Mediterranean rectangles with species: ${medCount}/${results.filter(r => r.expected_region === 'Mediterranean').length}`);

  // Overall result
  console.log('\n' + '='.repeat(80));
  if (passed.length === results.length) {
    console.log('\n🎉 ALL TESTS PASSED! All rectangles return 20+ species.\n');
  } else if (passed.length + passedButLow.length === results.length) {
    console.log('\n✅ All tests returned species, some below 20 threshold.\n');
  } else {
    console.log('\n⚠️  Some tests failed or returned no species.\n');
  }

  return {
    total: results.length,
    passed: passed.length,
    passedButLow: passedButLow.length,
    failed: failed.length,
    results
  };
}

comprehensiveTest().catch(console.error);
