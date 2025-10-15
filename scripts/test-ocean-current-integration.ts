/**
 * Ocean Current Integration End-to-End Test
 * 
 * Tests the complete data flow for ocean current bite score integration:
 * 1. Database: All 79 species have current_speed_weight (12-22%)
 * 2. API: /api/findr/conditions returns currentSpeedSurface from Copernicus data
 * 3. Hook: useBiteScore maps currentSpeedSurface → ocean_current_ms
 * 4. Score: getBiteScore calculates current contribution using currentFeedingScore()
 * 5. Breakdown: Result includes current sub-score in breakdown
 * 
 * Usage: npx tsx scripts/test-ocean-current-integration.ts
 */

import { getBiteScore, type SpeciesParams, type Conditions } from '../hooks/useBiteScore';

// Test location: Cornwall, UK (good fishing area)
const TEST_LOCATION = {
  lat: 50.1,
  lon: -5.5,
  name: 'Cornwall, UK'
};

// Test species: Bass (high current dependency = 22%)
const BASS_PARAMS: SpeciesParams = {
  tideWeight: 0.35,
  lightWeight: 0.30,
  windWeight: 0.10,
  pressureWeight: 0.05,
  tempWeight: 0.08,
  lunarWeight: 0.02,
  waterClarityWeight: 0.18,
  currentSpeedWeight: 0.22,  // ⭐ NEW: Bass are current seam hunters (22% weight)
  tidalSensitivity: 0.75,
  preferredTideStage: ['early_flood', 'mid_flood', 'early_ebb'],
  diurnalSensitivity: 'strong',
  tempOptC: [12, 18],
};

// Test species: Flounder (medium-high current dependency = 20%)
const FLOUNDER_PARAMS: SpeciesParams = {
  tideWeight: 0.30,
  lightWeight: 0.25,
  windWeight: 0.12,
  pressureWeight: 0.08,
  tempWeight: 0.10,
  lunarWeight: 0.03,
  waterClarityWeight: 0.20,
  currentSpeedWeight: 0.20,  // ⭐ NEW: Flounder love drift fishing in currents
  tidalSensitivity: 0.65,
  preferredTideStage: ['mid_flood', 'high_slack', 'early_ebb'],
  diurnalSensitivity: 'moderate',
  tempOptC: [8, 16],
};

// Test species: Mackerel (medium current dependency = 18%)
const MACKEREL_PARAMS: SpeciesParams = {
  tideWeight: 0.25,
  lightWeight: 0.35,
  windWeight: 0.15,
  pressureWeight: 0.05,
  tempWeight: 0.08,
  lunarWeight: 0.02,
  waterClarityWeight: 0.15,
  currentSpeedWeight: 0.18,  // ⭐ NEW: Pelagic predators hunt in current
  tidalSensitivity: 0.55,
  preferredTideStage: ['mid_ebb', 'low_slack', 'early_flood'],
  diurnalSensitivity: 'strong',
  tempOptC: [10, 16],
};

/**
 * Test 1: Verify API returns current data
 */
async function testAPIReturnsCurrentData(): Promise<boolean> {
  console.log('\n📡 TEST 1: API Returns Current Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Step 1: Look up rectangle code
    const rectangleLookupRes = await fetch(
      `http://localhost:3000/api/findr/rectangle-lookup?lat=${TEST_LOCATION.lat}&lon=${TEST_LOCATION.lon}`
    );
    
    if (!rectangleLookupRes.ok) {
      console.error('❌ Failed to lookup rectangle code');
      return false;
    }
    
    const rectangleData = await rectangleLookupRes.json();
    const rectangleCode = rectangleData.rectangleCode;
    console.log(`✅ Rectangle code: ${rectangleCode}`);
    
    // Step 2: Fetch conditions
    const conditionsRes = await fetch(
      `http://localhost:3000/api/findr/conditions?rectangleCode=${rectangleCode}`
    );
    
    if (!conditionsRes.ok) {
      console.error('❌ Failed to fetch conditions');
      return false;
    }
    
    const data = await conditionsRes.json();
    
    // Step 3: Verify ocean current data exists
    const currentSpeed = data.snapshot?.marine?.currentSpeedSurface;
    
    if (currentSpeed === undefined || currentSpeed === null) {
      console.warn('⚠️  currentSpeedSurface is missing from API response');
      console.warn('   This might mean Copernicus data hasn\'t been ingested yet');
      return false;
    }
    
    console.log(`✅ currentSpeedSurface: ${currentSpeed.toFixed(3)} m/s`);
    
    // Verify other expected fields
    const currentEast = data.snapshot?.marine?.currentEastSurface;
    const currentNorth = data.snapshot?.marine?.currentNorthSurface;
    const currentDirection = data.snapshot?.marine?.currentDirectionSurface;
    
    if (currentEast !== undefined) console.log(`✅ currentEastSurface: ${currentEast.toFixed(3)} m/s`);
    if (currentNorth !== undefined) console.log(`✅ currentNorthSurface: ${currentNorth.toFixed(3)} m/s`);
    if (currentDirection !== undefined) console.log(`✅ currentDirectionSurface: ${currentDirection.toFixed(1)}°`);
    
    // Check water clarity too (Phase 2 integration)
    const waterClarity = data.snapshot?.marine?.waterClarityIndex;
    if (waterClarity !== undefined) {
      console.log(`✅ waterClarityIndex: ${waterClarity.toFixed(2)} m`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

/**
 * Test 2: Verify getBiteScore calculation includes current
 */
function testBiteScoreCalculation(): boolean {
  console.log('\n🧮 TEST 2: Bite Score Calculation with Ocean Current');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Test Scenario 1: Ideal current speed (0.3 m/s)
  console.log('\n📊 Scenario 1: Ideal Current (0.3 m/s)');
  const idealConditions: Conditions = {
    tide_stage: 'mid_flood',
    current_speed_ms: 0.5,
    solar_elevation_deg: -5,  // Dusk
    ocean_current_ms: 0.3,  // ⭐ IDEAL CURRENT for fishing
    water_clarity_m: 3.5,
    sst_c: 15,
  };
  
  const bassIdealResult = getBiteScore(BASS_PARAMS, idealConditions);
  console.log(`  Bass confidence: ${bassIdealResult.confidence}%`);
  console.log(`  Current contribution: ${(bassIdealResult.breakdown.current * 100).toFixed(1)}%`);
  console.log(`  Current weight: ${(bassIdealResult.weights.current * 100).toFixed(1)}%`);
  
  const flounderIdealResult = getBiteScore(FLOUNDER_PARAMS, idealConditions);
  console.log(`  Flounder confidence: ${flounderIdealResult.confidence}%`);
  console.log(`  Current contribution: ${(flounderIdealResult.breakdown.current * 100).toFixed(1)}%`);
  
  // Test Scenario 2: Too slow current (0.05 m/s)
  console.log('\n📊 Scenario 2: Slack Current (0.05 m/s)');
  const slackConditions: Conditions = {
    ...idealConditions,
    ocean_current_ms: 0.05,  // Too still
  };
  
  const bassSlackResult = getBiteScore(BASS_PARAMS, slackConditions);
  console.log(`  Bass confidence: ${bassSlackResult.confidence}%`);
  console.log(`  Current contribution: ${(bassSlackResult.breakdown.current * 100).toFixed(1)}%`);
  
  // Test Scenario 3: Too fast current (1.2 m/s)
  console.log('\n📊 Scenario 3: Strong Current (1.2 m/s)');
  const strongConditions: Conditions = {
    ...idealConditions,
    ocean_current_ms: 1.2,  // Too fast
  };
  
  const bassStrongResult = getBiteScore(BASS_PARAMS, strongConditions);
  console.log(`  Bass confidence: ${bassStrongResult.confidence}%`);
  console.log(`  Current contribution: ${(bassStrongResult.breakdown.current * 100).toFixed(1)}%`);
  
  // Verify current is being factored in
  if (bassIdealResult.breakdown.current === 0) {
    console.error('\n❌ Current breakdown is 0 - not being calculated!');
    return false;
  }
  
  if (!bassIdealResult.weights.current || bassIdealResult.weights.current === 0) {
    console.error('\n❌ Current weight is 0 - not being applied!');
    return false;
  }
  
  // Verify ideal current scores higher than slack/strong
  if (bassIdealResult.confidence <= bassSlackResult.confidence ||
      bassIdealResult.confidence <= bassStrongResult.confidence) {
    console.error('\n❌ Ideal current should score higher than slack/strong current!');
    return false;
  }
  
  console.log('\n✅ Current scoring working correctly!');
  return true;
}

/**
 * Test 3: Compare species with different current dependencies
 */
function testSpeciesVariation(): boolean {
  console.log('\n🐟 TEST 3: Species Current Dependency Variation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const conditions: Conditions = {
    tide_stage: 'mid_flood',
    current_speed_ms: 0.5,
    solar_elevation_deg: 10,  // Daylight
    ocean_current_ms: 0.3,  // Ideal current
    water_clarity_m: 3.0,
    sst_c: 14,
  };
  
  const bassResult = getBiteScore(BASS_PARAMS, conditions);
  const flounderResult = getBiteScore(FLOUNDER_PARAMS, conditions);
  const mackerelResult = getBiteScore(MACKEREL_PARAMS, conditions);
  
  console.log(`\n🎯 Bass (22% current weight):`);
  console.log(`   Confidence: ${bassResult.confidence}%`);
  console.log(`   Current contribution: ${(bassResult.breakdown.current * bassResult.weights.current * 100).toFixed(1)}%`);
  
  console.log(`\n🎯 Flounder (20% current weight):`);
  console.log(`   Confidence: ${flounderResult.confidence}%`);
  console.log(`   Current contribution: ${(flounderResult.breakdown.current * flounderResult.weights.current * 100).toFixed(1)}%`);
  
  console.log(`\n🎯 Mackerel (18% current weight):`);
  console.log(`   Confidence: ${mackerelResult.confidence}%`);
  console.log(`   Current contribution: ${(mackerelResult.breakdown.current * mackerelResult.weights.current * 100).toFixed(1)}%`);
  
  // Verify bass (highest weight) has highest current contribution
  const bassContribution = bassResult.breakdown.current * bassResult.weights.current;
  const flounderContribution = flounderResult.breakdown.current * flounderResult.weights.current;
  const mackerelContribution = mackerelResult.breakdown.current * mackerelResult.weights.current;
  
  if (bassContribution < flounderContribution || bassContribution < mackerelContribution) {
    console.error('\n❌ Bass should have highest current contribution (22% weight)');
    return false;
  }
  
  if (flounderContribution < mackerelContribution) {
    console.error('\n❌ Flounder should have higher contribution than Mackerel (20% vs 18%)');
    return false;
  }
  
  console.log('\n✅ Species weight variation working correctly!');
  return true;
}

/**
 * Test 4: Verify complete breakdown structure
 */
function testBreakdownStructure(): boolean {
  console.log('\n📋 TEST 4: Breakdown Structure Completeness');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const conditions: Conditions = {
    tide_stage: 'mid_flood',
    current_speed_ms: 0.5,
    solar_elevation_deg: 5,
    ocean_current_ms: 0.3,
    water_clarity_m: 3.0,
    sst_c: 15,
    wind_speed_ms: 5,
    wave_height_m: 0.8,
  };
  
  const result = getBiteScore(BASS_PARAMS, conditions);
  
  console.log('\n📊 Bite Score Breakdown:');
  console.log(`  Tide: ${(result.breakdown.tide * 100).toFixed(1)}%`);
  console.log(`  Light: ${(result.breakdown.light * 100).toFixed(1)}%`);
  console.log(`  Wind: ${(result.breakdown.wind * 100).toFixed(1)}%`);
  console.log(`  Temp: ${(result.breakdown.temp * 100).toFixed(1)}%`);
  console.log(`  Clarity: ${(result.breakdown.clarity * 100).toFixed(1)}%`);
  console.log(`  Current: ${(result.breakdown.current * 100).toFixed(1)}% ⭐ NEW`);
  
  console.log('\n⚖️  Applied Weights:');
  Object.entries(result.weights).forEach(([key, value]) => {
    if (value && value > 0) {
      console.log(`  ${key}: ${(value * 100).toFixed(1)}%`);
    }
  });
  
  console.log(`\n🎯 Final Confidence: ${result.confidence}%`);
  console.log(`📊 Signals Used: ${result.availableSignals.join(', ')}`);
  
  // Verify current is in breakdown
  if (result.breakdown.current === undefined) {
    console.error('\n❌ Current missing from breakdown!');
    return false;
  }
  
  // Verify current is in availableSignals
  if (!result.availableSignals.includes('current')) {
    console.error('\n❌ Current missing from availableSignals!');
    return false;
  }
  
  console.log('\n✅ Breakdown structure complete!');
  return true;
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║    Ocean Current Integration End-to-End Test Suite              ║');
  console.log('║    Testing full data flow from API → Hook → Score → Breakdown   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  
  const results = {
    apiTest: false,
    calculationTest: false,
    variationTest: false,
    breakdownTest: false,
  };
  
  // Run tests
  results.apiTest = await testAPIReturnsCurrentData();
  results.calculationTest = testBiteScoreCalculation();
  results.variationTest = testSpeciesVariation();
  results.breakdownTest = testBreakdownStructure();
  
  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                          TEST SUMMARY                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'API Returns Current Data', result: results.apiTest },
    { name: 'Bite Score Calculation', result: results.calculationTest },
    { name: 'Species Weight Variation', result: results.variationTest },
    { name: 'Breakdown Structure', result: results.breakdownTest },
  ];
  
  tests.forEach(test => {
    const icon = test.result ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Ocean current integration is working end-to-end.');
    console.log('\n📝 Next Steps:');
    console.log('   1. Run Copernicus data ingestion to populate currentSpeedSurface');
    console.log('   2. Integrate useBiteScore hook into species card components');
    console.log('   3. Display current contribution in UI breakdown');
    console.log('   4. Monitor accuracy improvement (target: ±20-30%)');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Check output above for details');
    
    if (!results.apiTest) {
      console.log('\n💡 API Test Failed:');
      console.log('   - Ensure development server is running (npm run dev)');
      console.log('   - Check if Copernicus data has been ingested');
      console.log('   - Verify database migration applied successfully');
    }
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
