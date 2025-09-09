/**
 * Simple debug script for testing pollutant value formatting
 * This script avoids imports to troubleshoot the formatting logic directly
 */

// The formatPollutantValue function reimplemented inline
function formatPollutantValue(value) {
  if (value === undefined) return 'N/A';
  
  // Multiply by 100, ceil, then divide by 100 to round up to 2 decimal places
  const roundedUp = Math.ceil(value * 100) / 100;
  
  // Ensure we always display 2 decimal places
  return roundedUp.toFixed(2);
}

// Sample pollutant values
const testValues = [
  0.08901310043668123, // Should format to 0.09
  1.25,                // Should format to 1.25
  3.567,               // Should format to 3.57
  0.001,               // Should format to 0.01
  42.9999,             // Should format to 43.00
  undefined            // Should format to N/A
];

// Format and display the values
console.log('Pollutant Value Formatting Test:');
console.log('===============================');
testValues.forEach(value => {
  console.log(`Original: ${value} → Formatted: ${formatPollutantValue(value)}`);
});
