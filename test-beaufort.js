// Test Beaufort scale calculations
console.log('🌬️ Testing Beaufort Scale Calculations');
console.log('=====================================');

// Manual Beaufort function for testing
function getBeaufortNumber(windMps) {
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const windKmh = windMps * 3.6;
  for (let i = 0; i < thresholds.length; i++) {
    if (windKmh < thresholds[i]) return i;
  }
  return 12; // Hurricane
}

// Convert knots to m/s for testing Stormglass scenarios
function knotsToMps(knots) {
  return knots * 0.51444;
}

// Test cases with expected Beaufort numbers
const testCases = [
  { description: 'Calm', mps: 0, knots: 0, expectedBeaufort: 0 },
  { description: 'Light air', mps: 1, knots: 1.94, expectedBeaufort: 1 },
  { description: 'Light breeze', mps: 3, knots: 5.83, expectedBeaufort: 2 },
  { description: 'Gentle breeze', mps: 5, knots: 9.72, expectedBeaufort: 3 },
  { description: 'Moderate breeze', mps: 7, knots: 13.61, expectedBeaufort: 4 },
  { description: 'Fresh breeze', mps: 10, knots: 19.44, expectedBeaufort: 5 },
  { description: 'Strong breeze', mps: 13, knots: 25.27, expectedBeaufort: 6 },
  { description: 'Near gale', mps: 16, knots: 31.11, expectedBeaufort: 7 },
  { description: 'Gale', mps: 19, knots: 36.94, expectedBeaufort: 8 },
  { description: 'Severe gale', mps: 22, knots: 42.78, expectedBeaufort: 9 },
  { description: 'Storm', mps: 26, knots: 50.55, expectedBeaufort: 10 },
  { description: 'Violent storm', mps: 30, knots: 58.33, expectedBeaufort: 11 },
  { description: 'Hurricane', mps: 35, knots: 68.05, expectedBeaufort: 12 },
];

console.log('Testing with direct m/s values:');
console.log('Wind Speed (m/s) | km/h | Expected Beaufort | Actual | Status');
console.log('-------------------------------------------------------------');

testCases.forEach(({ description, mps, expectedBeaufort }) => {
  const kmh = mps * 3.6;
  const actualBeaufort = getBeaufortNumber(mps);
  const status = actualBeaufort === expectedBeaufort ? '✅' : '❌';
  console.log(`${mps.toString().padEnd(16)} | ${kmh.toFixed(1).padEnd(4)} | ${expectedBeaufort.toString().padEnd(17)} | ${actualBeaufort.toString().padEnd(6)} | ${status} ${description}`);
});

console.log('\n🌊 Testing Stormglass conversion (knots → m/s → Beaufort):');
console.log('Knots | m/s  | km/h | Beaufort | Description');
console.log('--------------------------------------------');

// Test some specific Stormglass scenarios
const stormglassTests = [
  { knots: 10, expected: 'Light breeze' },
  { knots: 20, expected: 'Moderate breeze' },
  { knots: 35, expected: 'Severe gale' },
  { knots: 50, expected: 'Violent storm' },
];

stormglassTests.forEach(({ knots, expected }) => {
  const mps = knotsToMps(knots);
  const kmh = mps * 3.6;
  const beaufort = getBeaufortNumber(mps);
  console.log(`${knots.toString().padEnd(5)} | ${mps.toFixed(2).padEnd(4)} | ${kmh.toFixed(1).padEnd(4)} | ${beaufort.toString().padEnd(8)} | ${expected}`);
});

console.log('\n🐛 Bug scenario check:');
console.log('35 knots incorrectly treated as 35 m/s:');
const buggyBeaufort = getBeaufortNumber(35); // treating 35 knots as m/s
const buggyKmh = 35 * 3.6;
console.log(`35 m/s (wrong) = ${buggyKmh} km/h = Beaufort ${buggyBeaufort} (Hurricane!)`);

console.log('\n35 knots correctly converted to m/s:');
const correctMps = knotsToMps(35);
const correctBeaufort = getBeaufortNumber(correctMps);
const correctKmh = correctMps * 3.6;
console.log(`35 knots = ${correctMps.toFixed(2)} m/s = ${correctKmh.toFixed(1)} km/h = Beaufort ${correctBeaufort} (Severe gale)`);
