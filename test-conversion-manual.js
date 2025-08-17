// Quick manual test of wind speed conversion
console.log('🌬️ Testing Wind Speed Unit Conversions');
console.log('======================================');

// Manual conversion functions for testing
function knotsToMps(knots) {
  return knots * 0.51444;
}

function mpsToKnots(mps) {
  return mps * 1.94384;
}

function mpsToKmh(mps) {
  return mps * 3.6;
}

// Test cases
const testCases = [
  { knots: 0, expectedMps: 0 },
  { knots: 10, expectedMps: 5.1444 },
  { knots: 20, expectedMps: 10.2888 },
  { knots: 35, expectedMps: 18.004 }, // This should be severe gale in m/s
];

testCases.forEach(({ knots, expectedMps }) => {
  const actualMps = knotsToMps(knots);
  const backToKnots = mpsToKnots(actualMps);
  const kmh = mpsToKmh(actualMps);
  
  console.log(`${knots} knots → ${actualMps.toFixed(3)} m/s (expected: ${expectedMps}) → ${backToKnots.toFixed(1)} knots → ${kmh.toFixed(1)} km/h`);
  
  // Verify round-trip conversion
  const diff = Math.abs(backToKnots - knots);
  if (diff > 0.001) {
    console.log(`⚠️ Round-trip error: ${diff}`);
  }
});

console.log('\n📊 Beaufort Scale Check (35 knots = severe gale):');
const thirtyFiveKnotsInMps = knotsToMps(35);
const thirtyFiveKnotsInKmh = mpsToKmh(thirtyFiveKnotsInMps);
console.log(`35 knots = ${thirtyFiveKnotsInMps.toFixed(2)} m/s = ${thirtyFiveKnotsInKmh.toFixed(1)} km/h`);
console.log('This should register as "Severe gale" on Beaufort scale (75-89 km/h)');

console.log('\n🐛 Bug scenario - what happens if we treated 35 knots as m/s?');
const buggyKmh = mpsToKmh(35); // treating 35 knots as if it were m/s
console.log(`35 (incorrectly as m/s) = ${buggyKmh.toFixed(1)} km/h`);
console.log('This would register as "Hurricane" (>118 km/h) - explaining the bug!');
