#!/usr/bin/env tsx
/**
 * Test condition helper functions (tide stage and time of day)
 *
 * Run: npx tsx scripts/test-condition-helpers.ts
 */

import {
  getTideStage,
  getTimeOfDay,
  getTimeOfDayFromCoordinates,
  getTimezoneFromCoordinates,
  convertTidePhase,
  type TideExtreme,
} from '../lib/findr/conditionHelpers';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '━'.repeat(80));
  log(title, colors.bright + colors.blue);
  console.log('━'.repeat(80) + '\n');
}

logSection('CONDITION HELPER FUNCTIONS TEST SUITE');

// ============================================================================
// TEST 1: Tide Stage Detection
// ============================================================================

logSection('TEST 1: Tide Stage Detection');

// Mock tide data (high at 10:00, low at 16:00, high at 22:00)
const mockTideData: TideExtreme[] = [
  { time: '2025-11-20T10:00:00Z', type: 'high', height: 4.2 },
  { time: '2025-11-20T16:00:00Z', type: 'low', height: 0.8 },
  { time: '2025-11-20T22:00:00Z', type: 'high', height: 4.5 },
];

const tideTests = [
  {
    time: '2025-11-20T08:00:00Z',
    expected: 'flooding',
    description: 'Before high tide (2 hours) - should be flooding',
  },
  {
    time: '2025-11-20T09:50:00Z',
    expected: 'high_slack',
    description: 'Just before high tide (10 minutes) - should be high slack',
  },
  {
    time: '2025-11-20T10:00:00Z',
    expected: 'high_slack',
    description: 'At high tide - should be high slack',
  },
  {
    time: '2025-11-20T10:15:00Z',
    expected: 'high_slack',
    description: 'Just after high tide (15 minutes) - should be high slack',
  },
  {
    time: '2025-11-20T11:00:00Z',
    expected: 'ebbing',
    description: 'Between high and low (1 hour after high) - should be ebbing',
  },
  {
    time: '2025-11-20T13:00:00Z',
    expected: 'ebbing',
    description: 'Midway between high and low - should be ebbing',
  },
  {
    time: '2025-11-20T15:45:00Z',
    expected: 'low_slack',
    description: 'Just before low tide (15 minutes) - should be low slack',
  },
  {
    time: '2025-11-20T16:00:00Z',
    expected: 'low_slack',
    description: 'At low tide - should be low slack',
  },
  {
    time: '2025-11-20T16:20:00Z',
    expected: 'low_slack',
    description: 'Just after low tide (20 minutes) - should be low slack',
  },
  {
    time: '2025-11-20T18:00:00Z',
    expected: 'flooding',
    description: 'Between low and high (2 hours after low) - should be flooding',
  },
];

let tidePassCount = 0;
for (const test of tideTests) {
  const result = getTideStage(mockTideData, new Date(test.time));
  const passed = result === test.expected;

  if (passed) {
    tidePassCount++;
    log(`✅ ${test.description}`, colors.green);
    log(`   Time: ${test.time} → Stage: ${result}`, colors.green);
  } else {
    log(`❌ ${test.description}`, colors.red);
    log(`   Expected: ${test.expected}, Got: ${result}`, colors.red);
  }
}

log(`\nTide Stage Tests: ${tidePassCount}/${tideTests.length} passed`,
    tidePassCount === tideTests.length ? colors.green : colors.yellow);

// ============================================================================
// TEST 2: Time of Day Detection
// ============================================================================

logSection('TEST 2: Time of Day Detection');

const timeTests = [
  { hour: 3, expected: 'night', description: '3am - night' },
  { hour: 5, expected: 'dawn', description: '5am - dawn starts' },
  { hour: 6, expected: 'dawn', description: '6am - dawn' },
  { hour: 7, expected: 'day', description: '7am - day starts' },
  { hour: 12, expected: 'day', description: '12pm - midday' },
  { hour: 17, expected: 'day', description: '5pm - still day' },
  { hour: 18, expected: 'dusk', description: '6pm - dusk starts' },
  { hour: 19, expected: 'dusk', description: '7pm - dusk' },
  { hour: 20, expected: 'night', description: '8pm - night starts' },
  { hour: 23, expected: 'night', description: '11pm - night' },
];

let timePassCount = 0;
for (const test of timeTests) {
  // Create a date at the specified hour (UTC)
  const testDate = new Date(Date.UTC(2025, 10, 20, test.hour, 0, 0));
  const result = getTimeOfDay('UTC', testDate);
  const passed = result === test.expected;

  if (passed) {
    timePassCount++;
    log(`✅ ${test.description} → ${result}`, colors.green);
  } else {
    log(`❌ ${test.description}`, colors.red);
    log(`   Expected: ${test.expected}, Got: ${result}`, colors.red);
  }
}

log(`\nTime of Day Tests: ${timePassCount}/${timeTests.length} passed`,
    timePassCount === timeTests.length ? colors.green : colors.yellow);

// ============================================================================
// TEST 3: Timezone Detection from Coordinates
// ============================================================================

logSection('TEST 3: Timezone Detection from Coordinates');

const coordinateTests = [
  { lat: 51.5, lon: -0.1, expected: 'Europe/London', location: 'London' },
  { lat: 48.85, lon: 2.35, expected: 'Europe/Paris', location: 'Paris' },
  { lat: 52.52, lon: 13.4, expected: 'Europe/Berlin', location: 'Berlin' },
  { lat: 40.7, lon: -74.0, expected: 'America/New_York', location: 'New York' },
  { lat: 34.05, lon: -118.25, expected: 'America/Los_Angeles', location: 'Los Angeles' },
  { lat: 35.68, lon: 139.65, expected: 'Asia/Tokyo', location: 'Tokyo' },
  { lat: -33.87, lon: 151.21, expected: 'Australia/Sydney', location: 'Sydney' },
];

let tzPassCount = 0;
for (const test of coordinateTests) {
  const result = getTimezoneFromCoordinates(test.lat, test.lon);
  const passed = result === test.expected;

  if (passed) {
    tzPassCount++;
    log(`✅ ${test.location} (${test.lat}, ${test.lon}) → ${result}`, colors.green);
  } else {
    log(`❌ ${test.location} (${test.lat}, ${test.lon})`, colors.red);
    log(`   Expected: ${test.expected}, Got: ${result}`, colors.red);
  }
}

log(`\nTimezone Detection Tests: ${tzPassCount}/${coordinateTests.length} passed`,
    tzPassCount === coordinateTests.length ? colors.green : colors.yellow);

// ============================================================================
// TEST 4: Time of Day from Coordinates
// ============================================================================

logSection('TEST 4: Time of Day from Coordinates (Integration)');

log('Testing London at different times:', colors.cyan);

const londonTests = [
  { hour: 6, expected: 'dawn', description: '6am in London' },
  { hour: 12, expected: 'day', description: 'Noon in London' },
  { hour: 19, expected: 'dusk', description: '7pm in London' },
  { hour: 23, expected: 'night', description: '11pm in London' },
];

let londonPassCount = 0;
for (const test of londonTests) {
  const testDate = new Date(Date.UTC(2025, 10, 20, test.hour, 0, 0));
  const result = getTimeOfDayFromCoordinates(51.5, -0.1, testDate);
  const passed = result === test.expected;

  if (passed) {
    londonPassCount++;
    log(`✅ ${test.description} → ${result}`, colors.green);
  } else {
    log(`❌ ${test.description}`, colors.red);
    log(`   Expected: ${test.expected}, Got: ${result}`, colors.red);
  }
}

log(`\nLondon Time Tests: ${londonPassCount}/${londonTests.length} passed`,
    londonPassCount === londonTests.length ? colors.green : colors.yellow);

// ============================================================================
// TEST 5: Tide Phase Conversion
// ============================================================================

logSection('TEST 5: Tide Phase Conversion (Backward Compatibility)');

const conversionTests = [
  { input: 'rising', expected: 'flooding' },
  { input: 'falling', expected: 'ebbing' },
  { input: 'high_slack', expected: 'high_slack' },
  { input: 'low_slack', expected: 'low_slack' },
  { input: null, expected: null },
  { input: undefined, expected: null },
];

let conversionPassCount = 0;
for (const test of conversionTests) {
  const result = convertTidePhase(test.input as any);
  const passed = result === test.expected;

  if (passed) {
    conversionPassCount++;
    log(`✅ '${test.input}' → '${result}'`, colors.green);
  } else {
    log(`❌ '${test.input}'`, colors.red);
    log(`   Expected: ${test.expected}, Got: ${result}`, colors.red);
  }
}

log(`\nConversion Tests: ${conversionPassCount}/${conversionTests.length} passed`,
    conversionPassCount === conversionTests.length ? colors.green : colors.yellow);

// ============================================================================
// SUMMARY
// ============================================================================

logSection('SUMMARY');

const totalTests = tideTests.length + timeTests.length + coordinateTests.length +
                   londonTests.length + conversionTests.length;
const totalPassed = tidePassCount + timePassCount + tzPassCount + londonPassCount + conversionPassCount;

log('Test Results:', colors.bright + colors.cyan);
console.log(`  Tide Stage Detection:       ${tidePassCount}/${tideTests.length}`);
console.log(`  Time of Day Detection:      ${timePassCount}/${timeTests.length}`);
console.log(`  Timezone from Coordinates:  ${tzPassCount}/${coordinateTests.length}`);
console.log(`  Time from Coordinates:      ${londonPassCount}/${londonTests.length}`);
console.log(`  Phase Conversion:           ${conversionPassCount}/${conversionTests.length}`);
console.log('');
log(`TOTAL: ${totalPassed}/${totalTests} tests passed`,
    totalPassed === totalTests ? colors.bright + colors.green : colors.yellow);

if (totalPassed === totalTests) {
  log('\n✅ ALL TESTS PASSED - Functions ready for integration!', colors.bright + colors.green);
} else {
  log(`\n⚠️  ${totalTests - totalPassed} tests failed - review output above`, colors.yellow);
}

logSection('USAGE EXAMPLES');

log('Example 1: Using with real tide data', colors.cyan);
console.log(`
const tideData = await fetch('/api/tides?lat=51.5&lon=-0.1')
  .then(r => r.json())
  .then(r => r.data);

const tideStage = getTideStage(tideData);
// Returns: 'flooding' | 'ebbing' | 'high_slack' | 'low_slack'
`);

log('Example 2: Using with coordinates', colors.cyan);
console.log(`
const timeOfDay = getTimeOfDayFromCoordinates(51.5, -0.1);
// Returns: 'dawn' | 'day' | 'dusk' | 'night'
`);

log('Example 3: Integration with approach scoring', colors.cyan);
console.log(`
import { getTideStage, getTimeOfDayFromCoordinates } from '@/lib/findr/conditionHelpers';

const approach = getSpeciesApproach(
  species.preferred_habitats,
  species.effective_techniques,
  {
    wind_speed_kts: conditions.wind_speed_kts,
    wave_height_m: conditions.wave_height_m,
    current_speed_ms: conditions.current_speed_ms,
    kd490: conditions.kd490,
    sea_temp_c: conditions.sea_temp_c,

    // Add helper functions:
    tide_stage: getTideStage(tideData),
    time_of_day: getTimeOfDayFromCoordinates(lat, lon)
  }
);
`);

console.log('\n');
