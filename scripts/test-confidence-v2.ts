import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestScenario {
  description: string;
  rectangle: string;
  date: string;
  month: number;
  expectedSpecies: string[];
  expectedRanges: {
    [species: string]: {
      min: number;
      max: number;
    };
  };
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    description: 'Mackerel in summer (North Sea)',
    rectangle: '28E5',
    date: '2025-07-15',
    month: 7,
    expectedSpecies: ['MAC'],
    expectedRanges: {
      MAC: { min: 80, max: 100 },
    },
  },
  {
    description: 'Mackerel in winter (North Sea)',
    rectangle: '28E5',
    date: '2025-01-15',
    month: 1,
    expectedSpecies: ['MAC'],
    expectedRanges: {
      MAC: { min: 10, max: 40 },
    },
  },
  {
    description: 'Bass in summer (English Channel)',
    rectangle: '30E1',
    date: '2025-08-15',
    month: 8,
    expectedSpecies: ['BSS'],
    expectedRanges: {
      BSS: { min: 70, max: 100 },
    },
  },
  {
    description: 'Bass in winter (English Channel)',
    rectangle: '30E1',
    date: '2025-01-15',
    month: 1,
    expectedSpecies: ['BSS'],
    expectedRanges: {
      BSS: { min: 20, max: 50 },
    },
  },
  {
    description: 'Cod in winter (North Sea)',
    rectangle: '28E5',
    date: '2025-02-15',
    month: 2,
    expectedSpecies: ['COD'],
    expectedRanges: {
      COD: { min: 60, max: 100 },
    },
  },
];

async function testConfidenceV2() {
  console.log('═'.repeat(80));
  console.log('CONFIDENCE V2 FORMULA TESTING');
  console.log('═'.repeat(80));
  console.log('');

  // Check if we have environmental data for test rectangles
  console.log('Step 1: Checking environmental data availability...');
  const testRectangles = [...new Set(TEST_SCENARIOS.map((s) => s.rectangle))];

  for (const rect of testRectangles) {
    const { data: conditions } = await supabase
      .from('findr_conditions_latest')
      .select('ices_rectangle, captured_at, sea_temp_c, chlorophyll_mg_m3')
      .eq('ices_rectangle', rect)
      .order('captured_at', { ascending: false })
      .limit(1);

    if (conditions && conditions.length > 0) {
      console.log(`✅ ${rect}: Has data (${conditions[0].captured_at})`);
      console.log(
        `   Temp: ${conditions[0].sea_temp_c}°C, Chlorophyll: ${conditions[0].chlorophyll_mg_m3} mg/m³`
      );
    } else {
      console.log(`⚠️  ${rect}: No environmental data found`);
    }
  }
  console.log('');

  // Run test scenarios
  console.log('Step 2: Running test scenarios...');
  console.log('─'.repeat(80));

  let passCount = 0;
  let failCount = 0;

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📋 Test: ${scenario.description}`);
    console.log(`   Rectangle: ${scenario.rectangle}`);
    console.log(`   Date: ${scenario.date}`);
    console.log(`   Month: ${scenario.month}`);

    const { data, error } = await supabase.rpc('get_fishing_confidence_v2', {
      target_rectangle: scenario.rectangle,
      target_date: scenario.date,
      target_month: scenario.month,
    });

    if (error) {
      console.error(`   ❌ RPC Error:`, error);
      failCount++;
      continue;
    }

    if (!data || data.length === 0) {
      console.log('   ⚠️  No results returned');
      failCount++;
      continue;
    }

    // Find expected species in results
    for (const speciesCode of scenario.expectedSpecies) {
      const result = data.find((r: any) => r.species_code === speciesCode);

      if (!result) {
        console.log(`   ❌ ${speciesCode}: Not found in results`);
        failCount++;
        continue;
      }

      const expected = scenario.expectedRanges[speciesCode];
      const actual = result.confidence_percent;
      const inRange = actual >= expected.min && actual <= expected.max;

      if (inRange) {
        console.log(
          `   ✅ ${speciesCode}: ${actual}% (expected ${expected.min}-${expected.max}%)`
        );
        console.log(`      Base Availability: ${result.base_availability_score}`);
        console.log(`      Environmental Match: ${result.environmental_match_score}`);

        // Show breakdown
        if (result.breakdown?.environmental_match) {
          const em = result.breakdown.environmental_match;
          console.log(`      Factors: temp=${em.temperature}, chl=${em.chlorophyll}, oxy=${em.oxygen}`);
          console.log(`      Weighted Sum: ${em.weighted_sum} / Available Weight: ${em.available_weight}`);
        }

        passCount++;
      } else {
        console.log(
          `   ❌ ${speciesCode}: ${actual}% (expected ${expected.min}-${expected.max}%)`
        );
        console.log(`      Base Availability: ${result.base_availability_score}`);
        console.log(`      Environmental Match: ${result.environmental_match_score}`);
        console.log(`      Breakdown:`, JSON.stringify(result.breakdown, null, 2));
        failCount++;
      }
    }

    // Show top 5 species for context
    console.log(`\n   Top 5 species for this scenario:`);
    data.slice(0, 5).forEach((r: any, i: number) => {
      console.log(
        `   ${i + 1}. ${r.species_code} (${r.species_name}): ${r.confidence_percent}%`
      );
    });
  }

  console.log('');
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);
  console.log('');

  if (failCount === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Review the output above.');
    console.log('');
    console.log('Common reasons for failure:');
    console.log('- Missing environmental data for test rectangles');
    console.log('- Species preferences not yet populated (catches_2024, peak_months, etc.)');
    console.log('- Environmental conditions not matching species preferences');
  }
}

testConfidenceV2().catch(console.error);
