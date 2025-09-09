// Debug script to test formatPollutantValue function (CommonJS)
const { formatPollutantValue, convertCOtoPPM } = require('./utils/airQualityUtils');

const testValues = [
  0.08901310043668123,
  1.2345,
  5.999,
  6,
  12.001,
  undefined
];

console.log('Testing formatPollutantValue:');
testValues.forEach(value => {
  console.log(`${value} -> ${formatPollutantValue(value)}`);
});

// Test CO conversion
const coValues = [
  1145, // Should be ~1.00 ppm
  572.5, // Should be ~0.50 ppm
  114.5, // Should be ~0.10 ppm
  57.25, // Should be ~0.05 ppm
  11.45, // Should be ~0.01 ppm
  2.29, // Should be ~0.002 ppm (rounds to 0.01)
];

console.log('\nTesting CO conversion and formatting:');
coValues.forEach(value => {
  const ppm = convertCOtoPPM(value);
  console.log(`${value} μg/m³ -> ${ppm} ppm -> ${formatPollutantValue(ppm)} ppm (formatted)`);
});
