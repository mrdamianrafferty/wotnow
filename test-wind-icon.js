// Test WindIcon logic
console.log('🌬️ Testing WindIcon Logic');
console.log('=========================');

function getBeaufortNumber(windMps) {
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const windKmh = windMps * 3.6;
  for (let i = 0; i < thresholds.length; i++) {
    if (windKmh < thresholds[i]) return i;
  }
  return 12; // Hurricane
}

function getWindIconName(windMs) {
  const beaufort = getBeaufortNumber(windMs);
  
  let iconName = '';
  if (beaufort < 3) {
    iconName = 'windsock.svg';
  } else if (beaufort <= 12) {
    iconName = `wind-beaufort-${beaufort}.svg`;
  } else {
    iconName = 'wind.svg';
  }
  
  return { beaufort, iconName };
}

function knotsToMps(knots) {
  return knots * 0.51444;
}

// Test scenarios
const testScenarios = [
  { description: 'Calm (0 m/s)', windMs: 0 },
  { description: 'Light air (1 m/s)', windMs: 1 },
  { description: 'Light breeze (3 m/s)', windMs: 3 },
  { description: 'Fresh breeze (10 m/s)', windMs: 10 },
  { description: 'Stormglass: 15 knots', windMs: knotsToMps(15) },
  { description: 'Stormglass: 25 knots', windMs: knotsToMps(25) },
  { description: 'Stormglass: 35 knots (severe gale)', windMs: knotsToMps(35) },
  { description: 'Very strong (25 m/s)', windMs: 25 },
  { description: 'Hurricane (35 m/s)', windMs: 35 },
];

console.log('Wind Speed | Beaufort | Icon Name');
console.log('--------------------------------------');

testScenarios.forEach(({ description, windMs }) => {
  const { beaufort, iconName } = getWindIconName(windMs);
  const kmh = windMs * 3.6;
  console.log(`${description.padEnd(30)} | ${windMs.toFixed(2).padEnd(6)} m/s (${kmh.toFixed(1)} km/h) | Beaufort ${beaufort} | ${iconName}`);
});

console.log('\n🔍 Edge cases:');
console.log('Beaufort 2 (just under threshold 3): ', getWindIconName(2.8)); // Should use windsock
console.log('Beaufort 3 (threshold): ', getWindIconName(3.5)); // Should use wind-beaufort-3
console.log('Beaufort 12 (hurricane): ', getWindIconName(35)); // Should use wind-beaufort-12
