#!/usr/bin/env tsx
/**
 * Test Bio-Bands Classification Function
 * 
 * Tests the classify_parameter() function with real-world scenarios
 * from UK and European waters to validate threshold boundaries.
 * 
 * Scenarios covered:
 * 1. Summer Cornwall (warm, productive)
 * 2. Winter Irish Sea (cold, rough)
 * 3. Baltic Brackish (low salinity)
 * 4. Channel Summer (optimal for most species)
 * 5. North Sea Winter (harsh conditions)
 * 6. Mediterranean (warm, clear)
 * 7. Spring Bloom (high chlorophyll)
 * 8. Dead Zone (hypoxic)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test scenarios with expected outcomes
const scenarios = [
  {
    name: '☀️ Summer Cornwall (Optimal Bass/Wrasse)',
    location: 'Falmouth Bay, July',
    conditions: {
      surfaceTemperature: 16.5,
      salinity: 34.2,
      oxygen: 7.5,
      chlorophyll: 2.1,
      phosphate: 0.25,
      nitrate: 2.5
    },
    expected: {
      surfaceTemperature: 'normal',
      salinity: 'normal',
      oxygen: 'normal',
      chlorophyll: 'normal',
      phosphate: 'low',
      nitrate: 'low'
    },
    targetSpecies: ['Bass', 'Ballan Wrasse', 'Pollock'],
    avoidSpecies: ['Cod (too warm)']
  },
  {
    name: '❄️ Winter Irish Sea (Optimal Cod/Whiting)',
    location: 'Morecambe Bay, February',
    conditions: {
      surfaceTemperature: 6.5,
      salinity: 35.0,
      oxygen: 9.2,
      chlorophyll: 0.8,
      phosphate: 0.4,
      nitrate: 4.5
    },
    expected: {
      surfaceTemperature: 'very_low',
      salinity: 'normal',
      oxygen: 'high',
      chlorophyll: 'low',
      phosphate: 'normal',
      nitrate: 'normal'
    },
    targetSpecies: ['Cod', 'Whiting', 'Haddock'],
    avoidSpecies: ['Bass (lethargic)', 'Wrasse (hibernating)']
  },
  {
    name: '🌊 Baltic Brackish (Flounder-friendly)',
    location: 'Bornholm Basin, May',
    conditions: {
      surfaceTemperature: 8.5,
      salinity: 12.0,
      oxygen: 5.5,
      chlorophyll: 3.2,
      phosphate: 0.5,
      nitrate: 5.2
    },
    expected: {
      surfaceTemperature: 'low',
      salinity: 'very_low', // Below 20 ppt
      oxygen: 'normal',
      chlorophyll: 'high',
      phosphate: 'normal',
      nitrate: 'normal'
    },
    targetSpecies: ['Flounder (euryhaline)', 'Herring'],
    avoidSpecies: ['Wrasse (needs full salinity)', 'Bass']
  },
  {
    name: '🌸 English Channel Spring (Balanced)',
    location: 'Solent, April',
    conditions: {
      surfaceTemperature: 11.5,
      salinity: 33.5,
      oxygen: 8.1,
      chlorophyll: 1.8,
      phosphate: 0.28,
      nitrate: 3.2
    },
    expected: {
      surfaceTemperature: 'low',
      salinity: 'normal',
      oxygen: 'high',
      chlorophyll: 'normal',
      phosphate: 'low',
      nitrate: 'normal'
    },
    targetSpecies: ['Plaice', 'Dab', 'Mackerel (early)'],
    avoidSpecies: []
  },
  {
    name: '🌊 North Sea Winter (Harsh)',
    location: 'Dogger Bank, January',
    conditions: {
      surfaceTemperature: 4.2,
      salinity: 34.8,
      oxygen: 10.5,
      chlorophyll: 0.3,
      phosphate: 0.35,
      nitrate: 6.8
    },
    expected: {
      surfaceTemperature: 'very_low',
      salinity: 'normal',
      oxygen: 'very_high',
      chlorophyll: 'very_low',
      phosphate: 'normal',
      nitrate: 'high'
    },
    targetSpecies: ['Cod', 'Whiting', 'Saithe'],
    avoidSpecies: ['Bass', 'Mullet', 'Wrasse']
  },
  {
    name: '🌞 Mediterranean Summer (Warm & Clear)',
    location: 'Costa Brava, August',
    conditions: {
      surfaceTemperature: 25.5,
      salinity: 38.2,
      oxygen: 6.2,
      chlorophyll: 0.4,
      phosphate: 0.08,
      nitrate: 1.2
    },
    expected: {
      surfaceTemperature: 'high',
      salinity: 'high',
      oxygen: 'normal',
      chlorophyll: 'very_low',
      phosphate: 'very_low',
      nitrate: 'low'
    },
    targetSpecies: ['Gilthead Bream', 'Dentex', 'Amberjack'],
    avoidSpecies: ['Cod', 'Whiting', 'Pollock']
  },
  {
    name: '🌿 Spring Bloom (Plankton Explosion)',
    location: 'Celtic Sea, March',
    conditions: {
      surfaceTemperature: 9.8,
      salinity: 35.5,
      oxygen: 8.8,
      chlorophyll: 6.2,
      phosphate: 0.55,
      nitrate: 8.5
    },
    expected: {
      surfaceTemperature: 'low',
      salinity: 'normal',
      oxygen: 'high',
      chlorophyll: 'very_high',
      phosphate: 'normal',
      nitrate: 'high'
    },
    targetSpecies: ['Herring', 'Mackerel', 'Sprat (following plankton)'],
    avoidSpecies: []
  },
  {
    name: '☠️ Dead Zone (Hypoxic Event)',
    location: 'Shallow estuary, August low tide',
    conditions: {
      surfaceTemperature: 22.5,
      salinity: 28.5,
      oxygen: 1.5, // Critical hypoxia
      chlorophyll: 4.8,
      phosphate: 0.85,
      nitrate: 9.2
    },
    expected: {
      surfaceTemperature: 'high',
      salinity: 'low',
      oxygen: 'very_low', // DANGER
      chlorophyll: 'high',
      phosphate: 'normal',
      nitrate: 'high'
    },
    targetSpecies: [],
    avoidSpecies: ['ALL SPECIES (fish kill risk)']
  }
];

// Helper to format bio_level with color
function formatBioLevel(level: string | null): string {
  const colors: Record<string, string> = {
    'very_low': '🔵',
    'low': '🟢',
    'normal': '🟡',
    'high': '🟠',
    'very_high': '🔴'
  };
  
  if (!level) return '⚫ NULL';
  return `${colors[level] || '⚪'} ${level}`;
}

// Test a single parameter classification
async function testClassification(
  parameter: string,
  value: number
): Promise<string | null> {
  const { data, error } = await supabase.rpc('classify_parameter', {
    p_parameter: parameter,
    p_value: value
  });

  if (error) {
    console.error(`Error classifying ${parameter}:`, error.message);
    return null;
  }

  return data;
}

// Run all tests
async function runTests() {
  console.log('🧪 Bio-Bands Classification Function Test Suite\n');
  console.log('Testing classify_parameter() with real-world scenarios...\n');
  console.log('═'.repeat(80));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const scenario of scenarios) {
    console.log(`\n${scenario.name}`);
    console.log(`📍 ${scenario.location}`);
    console.log('─'.repeat(80));

    // Test each parameter
    const results: Record<string, string | null> = {};
    let scenarioPassed = true;

    for (const [param, value] of Object.entries(scenario.conditions)) {
      totalTests++;
      const result = await testClassification(param, value);
      results[param] = result;

      const expected = scenario.expected[param as keyof typeof scenario.expected];
      const passed = result === expected;

      if (passed) {
        passedTests++;
      } else {
        failedTests++;
        scenarioPassed = false;
      }

      const status = passed ? '✅' : '❌';
      console.log(
        `${status} ${param.padEnd(20)} ${String(value).padEnd(8)} → ` +
        `${formatBioLevel(result).padEnd(20)} ` +
        `(expected: ${formatBioLevel(expected)})`
      );
    }

    // Show species implications
    console.log('\n🎣 Species Implications:');
    if (scenario.targetSpecies.length > 0) {
      console.log(`   Good for: ${scenario.targetSpecies.join(', ')}`);
    }
    if (scenario.avoidSpecies.length > 0) {
      console.log(`   Avoid:    ${scenario.avoidSpecies.join(', ')}`);
    }

    console.log(`\n${scenarioPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('═'.repeat(80));
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('─'.repeat(80));
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`✅ Passed:    ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed:    ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log('═'.repeat(80));

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Classification function working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check threshold boundaries or function logic.\n');
    process.exit(1);
  }
}

// Edge case tests
async function runEdgeCaseTests() {
  console.log('\n🔬 Edge Case Tests\n');
  console.log('═'.repeat(80));

  const edgeCases = [
    { name: 'Freezing water', param: 'surfaceTemperature', value: -1, expected: 'very_low' },
    { name: 'Exact threshold', param: 'surfaceTemperature', value: 14.0, expected: 'normal' },
    { name: 'Just below threshold', param: 'surfaceTemperature', value: 13.99, expected: 'low' },
    { name: 'Zero salinity (freshwater)', param: 'salinity', value: 0, expected: 'very_low' },
    { name: 'Hypersaline', param: 'salinity', value: 45, expected: 'very_high' },
    { name: 'No oxygen (anoxic)', param: 'oxygen', value: 0, expected: 'very_low' },
    { name: 'Supersaturated oxygen', param: 'oxygen', value: 15, expected: 'very_high' },
    { name: 'Ultra-clear water', param: 'chlorophyll', value: 0.1, expected: 'very_low' },
    { name: 'Extreme bloom', param: 'chlorophyll', value: 10, expected: 'very_high' }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of edgeCases) {
    const result = await testClassification(test.param, test.value);
    const testPassed = result === test.expected;

    if (testPassed) {
      passed++;
    } else {
      failed++;
    }

    const status = testPassed ? '✅' : '❌';
    console.log(
      `${status} ${test.name.padEnd(30)} ${test.param.padEnd(20)} ` +
      `${String(test.value).padEnd(8)} → ${formatBioLevel(result).padEnd(20)} ` +
      `(expected: ${formatBioLevel(test.expected)})`
    );
  }

  console.log('═'.repeat(80));
  console.log(`Edge cases: ${passed}/${edgeCases.length} passed\n`);

  return failed === 0;
}

// Performance test
async function runPerformanceTest() {
  console.log('\n⚡ Performance Test\n');
  console.log('═'.repeat(80));

  const iterations = 100;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    await testClassification('surfaceTemperature', 16.5);
    await testClassification('salinity', 34.2);
    await testClassification('oxygen', 7.5);
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const avgTime = duration / (iterations * 3);

  console.log(`Total classifications: ${iterations * 3}`);
  console.log(`Total time: ${duration}ms`);
  console.log(`Average per classification: ${avgTime.toFixed(2)}ms`);
  console.log('═'.repeat(80));

  if (avgTime < 50) {
    console.log('✅ Performance acceptable (<50ms per call)\n');
  } else {
    console.log('⚠️  Performance slow (>50ms per call). Consider indexing.\n');
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Bio-Bands Classification Tests...\n');

  try {
    // Check if function exists
    const { data, error } = await supabase.rpc('classify_parameter', {
      p_parameter: 'surfaceTemperature',
      p_value: 16.5
    });

    if (error) {
      console.error('❌ Error: classify_parameter() function not found!');
      console.error('\nPlease run the migration first:');
      console.error('  migrations/create_bio_bands_thresholds.sql\n');
      process.exit(1);
    }

    console.log('✅ classify_parameter() function found\n');

    // Run test suites
    await runTests();
    const edgeCasesPassed = await runEdgeCaseTests();
    await runPerformanceTest();

    console.log('\n✨ All test suites complete!\n');

  } catch (err) {
    console.error('💥 Test suite failed:', err);
    process.exit(1);
  }
}

main();
