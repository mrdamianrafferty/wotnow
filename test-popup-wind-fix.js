// Test wind icon fixes for popup
console.log('🌬️ Testing Popup Wind Icon Fixes');
console.log('=================================');

// Test functions (manually copied logic)
function getBeaufortNumber(windMps) {
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const windKmh = windMps * 3.6;
  for (let i = 0; i < thresholds.length; i++) {
    if (windKmh < thresholds[i]) return i;
  }
  return 12;
}

function mpsToKnots(mps) {
  return mps * 1.94384;
}

function mpsToKmh(mps) {
  return mps * 3.6;
}

function knotsToMps(knots) {
  return knots * 0.51444;
}

function getWindIcon(windMs) {
  const beaufort = getBeaufortNumber(windMs); // FIXED: Pass m/s directly
  if (beaufort < 3) return 'windsock.svg';
  if (beaufort <= 12) return `wind-beaufort-${beaufort}.svg`;
  return 'wind.svg';
}

// Test the scenario: 11 knots showing as Force 8 gale
console.log('🐛 Bug scenario: 11 knots from Stormglass');
const elevenKnots = 11;
const elevenKnotsInMps = knotsToMps(elevenKnots);
const elevenKnotsInKmh = mpsToKmh(elevenKnotsInMps);
const correctBeaufort = getBeaufortNumber(elevenKnotsInMps);
const correctIcon = getWindIcon(elevenKnotsInMps);

console.log(`11 knots = ${elevenKnotsInMps.toFixed(2)} m/s = ${elevenKnotsInKmh.toFixed(1)} km/h`);
console.log(`Correct Beaufort: ${correctBeaufort} (should be 3-4, not 8!)`);
console.log(`Correct icon: ${correctIcon}`);

// Test what the OLD buggy code would have done
console.log('\n❌ What the old buggy code was doing:');
const buggyKmh = mpsToKmh(elevenKnotsInMps);
const buggyBeaufort = getBeaufortNumber(buggyKmh); // This was passing km/h to function expecting m/s!
console.log(`Old code: ${elevenKnotsInMps.toFixed(2)} m/s → ${buggyKmh.toFixed(1)} km/h → getBeaufortNumber(${buggyKmh.toFixed(1)}) = Beaufort ${buggyBeaufort}`);
console.log(`This would show: wind-beaufort-${buggyBeaufort}.svg (Force ${buggyBeaufort} - way too strong!)`);

// Test a few more realistic scenarios
console.log('\n✅ Testing other wind speeds:');
const testCases = [
  { knots: 5, description: 'Light breeze' },
  { knots: 15, description: 'Moderate breeze' },
  { knots: 25, description: 'Strong breeze' },
  { knots: 35, description: 'Severe gale' },
];

testCases.forEach(({ knots, description }) => {
  const mps = knotsToMps(knots);
  const beaufort = getBeaufortNumber(mps);
  const icon = getWindIcon(mps);
  console.log(`${knots} knots → ${mps.toFixed(2)} m/s → Beaufort ${beaufort} → ${icon} (${description})`);
});
