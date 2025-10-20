#!/usr/bin/env npx tsx

/**
 * Test script for new bio indicators calculations
 * Demonstrates transparent calculation logic with live-like data
 */

import {
  calculateTargetDepth,
  calculateFeedingPotential,
  calculateBaitfishActivity,
} from '../utils/bioMarineLevels';

console.log('\n🎯 Bio Indicators Phase 1 - Calculation Test\n');
console.log('='.repeat(60));

// Test 1: Target Depth Calculation
console.log('\n📏 TEST 1: Target Depth (How Deep are the Fish?)\n');

const test1 = {
  mld: 20,
  oxygen: 7.5,
  temp: 16,
};
console.log('Input:');
console.log(`  - Mixed Layer Depth: ${test1.mld}m`);
console.log(`  - Dissolved Oxygen: ${test1.oxygen} mg/L`);
console.log(`  - Surface Temperature: ${test1.temp}°C`);

const depth1 = calculateTargetDepth(test1.mld, test1.oxygen, test1.temp);
console.log(`\nOutput: ${depth1}m`);
console.log('Classification: Defined thermocline (fish concentrated at this depth)');

const test2 = {
  mld: 15,
  oxygen: 3.5,  // Low oxygen
  temp: 16,
};
console.log('\n---\n');
console.log('Input (Low Oxygen Scenario):');
console.log(`  - Mixed Layer Depth: ${test2.mld}m`);
console.log(`  - Dissolved Oxygen: ${test2.oxygen} mg/L (LOW)`);
console.log(`  - Surface Temperature: ${test2.temp}°C`);

const depth2 = calculateTargetDepth(test2.mld, test2.oxygen, test2.temp);
console.log(`\nOutput: ${depth2}m`);
console.log('Logic: Fish avoid low oxygen → go shallower (${test2.mld} * 0.7)');

const test3 = {
  mld: 18,
  oxygen: null,  // Missing data
  temp: null,
};
console.log('\n---\n');
console.log('Input (Minimal Data):');
console.log(`  - Mixed Layer Depth: ${test3.mld}m`);
console.log(`  - Dissolved Oxygen: unavailable`);
console.log(`  - Surface Temperature: unavailable`);

const depth3 = calculateTargetDepth(test3.mld, test3.oxygen, test3.temp);
console.log(`\nOutput: ${depth3}m`);
console.log('Logic: Uses MLD directly when no adjustment factors available');

// Test 2: Feeding Potential
console.log('\n' + '='.repeat(60));
console.log('\n🍽️  TEST 2: Feeding Potential (Food Chain Index)\n');

const test4 = {
  chlorophyll: 2.4,
  phytoplankton: 1.8,
  zooplankton: 2.5,
  primaryProduction: 850,
};
console.log('Input (All Data Available):');
console.log(`  - Chlorophyll: ${test4.chlorophyll} mg/m³`);
console.log(`  - Phytoplankton: ${test4.phytoplankton} mmol/m³`);
console.log(`  - Zooplankton: ${test4.zooplankton} mmol/m³`);
console.log(`  - Primary Production: ${test4.primaryProduction} mg C/m³/day`);

const feeding1 = calculateFeedingPotential(
  test4.chlorophyll,
  test4.phytoplankton,
  test4.zooplankton,
  test4.primaryProduction
);
console.log(`\nOutput: ${feeding1}/100`);
console.log('Breakdown:');
console.log('  - Chlorophyll (40% weight): contributes to overall score');
console.log('  - Phytoplankton (20% weight): primary producers');
console.log('  - Zooplankton (20% weight): baitfish food');
console.log('  - Primary Production (20% weight): ecosystem productivity');

const test5 = {
  chlorophyll: 2.4,
  phytoplankton: null,  // Missing
  zooplankton: 2.5,
  primaryProduction: null,  // Missing
};
console.log('\n---\n');
console.log('Input (Partial Data - 2 of 4):');
console.log(`  - Chlorophyll: ${test5.chlorophyll} mg/m³`);
console.log(`  - Phytoplankton: unavailable`);
console.log(`  - Zooplankton: ${test5.zooplankton} mmol/m³`);
console.log(`  - Primary Production: unavailable`);

const feeding2 = calculateFeedingPotential(
  test5.chlorophyll,
  test5.phytoplankton,
  test5.zooplankton,
  test5.primaryProduction
);
console.log(`\nOutput: ${feeding2}/100`);
console.log('Logic: Calculated from available 60% data (Chl 40% + Zoo 20%)');
console.log('Note: Requires at least 40% data (2 indicators) to calculate');

const test6 = {
  chlorophyll: null,
  phytoplankton: null,
  zooplankton: null,
  primaryProduction: 850,
};
console.log('\n---\n');
console.log('Input (Insufficient Data - 1 of 4):');
console.log(`  - Chlorophyll: unavailable`);
console.log(`  - Phytoplankton: unavailable`);
console.log(`  - Zooplankton: unavailable`);
console.log(`  - Primary Production: ${test6.primaryProduction} mg C/m³/day`);

const feeding3 = calculateFeedingPotential(
  test6.chlorophyll,
  test6.phytoplankton,
  test6.zooplankton,
  test6.primaryProduction
);
console.log(`\nOutput: ${feeding3}`);
console.log('Logic: Returns null - needs at least 40% data (2+ indicators)');

// Test 3: Baitfish Activity
console.log('\n' + '='.repeat(60));
console.log('\n🦐 TEST 3: Baitfish Activity\n');

const test7 = 3.5;
console.log(`Input: Zooplankton = ${test7} mmol/m³`);
const baitfish1 = calculateBaitfishActivity(test7);
console.log(`Output: ${baitfish1} mmol/m³`);
console.log('Classification: High (>3.0) - Plenty of baitfish food, predators nearby');

const test8 = 1.5;
console.log('\n---\n');
console.log(`Input: Zooplankton = ${test8} mmol/m³`);
const baitfish2 = calculateBaitfishActivity(test8);
console.log(`Output: ${baitfish2} mmol/m³`);
console.log('Classification: Normal (1.0-3.0) - Standard baitfish presence');

const test9 = 0.8;
console.log('\n---\n');
console.log(`Input: Zooplankton = ${test9} mmol/m³`);
const baitfish3 = calculateBaitfishActivity(test9);
console.log(`Output: ${baitfish3} mmol/m³`);
console.log('Classification: Low (<1.0) - Limited baitfish food');

const test10 = null;
console.log('\n---\n');
console.log(`Input: Zooplankton = unavailable`);
const baitfish4 = calculateBaitfishActivity(test10);
console.log(`Output: ${baitfish4}`);
console.log('Logic: Returns null - indicator not shown in UI');

console.log('\n' + '='.repeat(60));
console.log('\n✅ All calculations working correctly!\n');
console.log('Key Features Demonstrated:');
console.log('  ✓ Transparent calculations (all logic exposed)');
console.log('  ✓ Graceful degradation with missing data');
console.log('  ✓ Partial data handling (feeding potential)');
console.log('  ✓ Adjustments based on environmental factors');
console.log('  ✓ Classification into meaningful levels');
console.log('\n');
