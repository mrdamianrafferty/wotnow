/**
 * Simple debug script for testing CO value conversion and formatting
 * This script avoids imports to troubleshoot the logic directly
 */

// The convertCOtoPPM function reimplemented inline
function convertCOtoPPM(coMicrogramsPerM3) {
  if (coMicrogramsPerM3 === undefined) return undefined;
  return coMicrogramsPerM3 / 1145;
}

// The formatPollutantValue function reimplemented inline
function formatPollutantValue(value) {
  if (value === undefined) return 'N/A';
  
  // Multiply by 100, ceil, then divide by 100 to round up to 2 decimal places
  const roundedUp = Math.ceil(value * 100) / 100;
  
  // Ensure we always display 2 decimal places
  return roundedUp.toFixed(2);
}

// Sample CO values in μg/m³
const coValues = [
  1145,   // Should be ~1.00 ppm
  572.5,  // Should be ~0.50 ppm
  114.5,  // Should be ~0.10 ppm
  57.25,  // Should be ~0.05 ppm
  11.45,  // Should be ~0.01 ppm
  2.29,   // Should be ~0.002 ppm (rounds to 0.01)
  undefined // Should remain undefined, then format to N/A
];

// Convert, format and display the values
console.log('CO Conversion and Formatting Test:');
console.log('=================================');
coValues.forEach(value => {
  const ppm = convertCOtoPPM(value);
  console.log(`${value} μg/m³ → ${ppm} ppm → ${formatPollutantValue(ppm)} ppm (formatted)`);
});
