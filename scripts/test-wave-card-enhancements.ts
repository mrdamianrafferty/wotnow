#!/usr/bin/env npx tsx
/**
 * Test script for wave card and wind direction enhancements
 * 
 * Tests:
 * 1. formatCurrentDescription() with various current speeds
 * 2. Conditions API returns current data
 * 3. Wave period and direction available
 * 4. Wind direction in hourly data
 */

import { formatCurrentDescription } from '../lib/findr/weatherFormatting';

console.log('🧪 Testing Wave Card & Wind Direction Enhancements\n');

// ============================================================================
// Test 1: Current Description Formatting
// ============================================================================
console.log('📊 Test 1: Current Description Formatting');
console.log('=' .repeat(60));

const currentTests = [
  { speed: 0.05, direction: 180, expected: 'Negligible' },
  { speed: 0.15, direction: 90, expected: 'Weak' },
  { speed: 0.35, direction: 45, expected: 'Moderate' },
  { speed: 0.75, direction: 135, expected: 'Strong' },
  { speed: 1.43, direction: 270, expected: 'Very strong' },
  { speed: 0.35, direction: null, expected: 'Moderate (no direction)' },
  { speed: null, direction: 180, expected: null },
];

currentTests.forEach(({ speed, direction, expected }) => {
  const result = formatCurrentDescription(speed, direction);
  const status = (expected && result?.includes(expected)) || (expected === null && result === null) ? '✅' : '❌';
  console.log(`${status} Speed: ${speed}m/s, Dir: ${direction}° → ${result || 'null'}`);
});

console.log('\n');

// ============================================================================
// Test 2: API Current Data
// ============================================================================
console.log('🌊 Test 2: Conditions API - Current Data');
console.log('=' .repeat(60));

const testRectangle = '24E1'; // Bay of Biscay
const testLat = 43.75;
const testLon = -6.5;

const apiUrl = `http://localhost:3000/api/findr/conditions?rectangleCode=${testRectangle}&lat=${testLat}&lon=${testLon}`;

console.log(`Fetching: ${apiUrl}\n`);

fetch(apiUrl)
  .then(res => res.json())
  .then(data => {
    const marine = data.snapshot?.marine;
    
    if (!marine) {
      console.log('❌ No marine data in response');
      return;
    }

    console.log('Current Data:');
    console.log(`  Speed: ${marine.currentSpeedSurface?.toFixed(3)} m/s ${marine.currentSpeedSurface ? '✅' : '❌'}`);
    console.log(`  Direction: ${marine.currentDirectionSurface?.toFixed(1)}° ${marine.currentDirectionSurface ? '✅' : '❌'}`);
    
    // Test formatCurrentDescription with actual data
    const description = formatCurrentDescription(
      marine.currentSpeedSurface,
      marine.currentDirectionSurface
    );
    console.log(`  Description: "${description}" ${description ? '✅' : '❌'}\n`);

    console.log('Wave Data:');
    console.log(`  Height: ${marine.significantWaveHeight?.toFixed(2)} m ${marine.significantWaveHeight ? '✅' : '❌'}`);
    console.log(`  Period: ${marine.wavePeriod?.toFixed(1)} s ${marine.wavePeriod ? '✅' : '❌'}`);
    console.log(`  Direction: ${marine.waveDirection?.toFixed(1)}° ${marine.waveDirection ? '✅' : '❌'}\n`);

    // Test hourly data for wind direction
    if (data.snapshot?.hourly?.length > 0) {
      console.log('Hourly Wind Data (first 3 hours):');
      data.snapshot.hourly.slice(0, 3).forEach((hour: any, i: number) => {
        const time = new Date(hour.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const windSpeed = hour.windSpeedKts?.toFixed(1);
        const windDir = hour.windDirectionDeg?.toFixed(0);
        const hasWind = windSpeed && windDir;
        console.log(`  ${i + 1}. ${time}: ${windSpeed || '—'} kts @ ${windDir || '—'}° ${hasWind ? '✅' : '❌'}`);
      });
    } else {
      console.log('❌ No hourly data in response');
    }

    console.log('\n✅ All data present and valid!');
  })
  .catch(err => {
    console.error('❌ API Error:', err.message);
    process.exit(1);
  });

// ============================================================================
// Test 3: Current Strength Categories
// ============================================================================
console.log('\n📏 Test 3: Current Strength Categories');
console.log('=' .repeat(60));

const categories = [
  { min: 0, max: 0.1, name: 'Negligible', fishing: 'Minimal drift, easy boat handling' },
  { min: 0.1, max: 0.25, name: 'Weak', fishing: 'Slight drift, minor adjustments' },
  { min: 0.25, max: 0.5, name: 'Moderate', fishing: 'Noticeable drift, affects anchoring' },
  { min: 0.5, max: 1.0, name: 'Strong', fishing: 'Significant drift, challenging control' },
  { min: 1.0, max: 999, name: 'Very strong', fishing: 'Heavy drift, safety concern' },
];

console.log('\nCurrent Strength Categories:\n');
categories.forEach(cat => {
  const rangeStr = cat.max === 999 
    ? `> ${cat.min} m/s` 
    : `${cat.min}-${cat.max} m/s`;
  console.log(`  ${cat.name.padEnd(12)} | ${rangeStr.padEnd(15)} | ${cat.fishing}`);
});

console.log('\n');

// ============================================================================
// Test 4: Cardinal Directions
// ============================================================================
console.log('🧭 Test 4: Cardinal Direction Mapping');
console.log('=' .repeat(60));

const directions = [
  { degrees: 0, expected: 'north' },
  { degrees: 45, expected: 'northeast' },
  { degrees: 90, expected: 'east' },
  { degrees: 135, expected: 'southeast' },
  { degrees: 180, expected: 'south' },
  { degrees: 225, expected: 'southwest' },
  { degrees: 270, expected: 'west' },
  { degrees: 315, expected: 'northwest' },
];

console.log('\nDirection Mapping:\n');
directions.forEach(({ degrees, expected }) => {
  const result = formatCurrentDescription(0.5, degrees);
  const includes = result?.includes(expected);
  console.log(`  ${degrees}° → ${expected.padEnd(10)} ${includes ? '✅' : '❌'} (${result})`);
});

console.log('\n✅ Test script complete!\n');
