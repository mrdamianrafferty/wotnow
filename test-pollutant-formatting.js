/**
 * Simple test script for the formatPollutantValue function
 * No module imports required
 */

// Function to test
function formatPollutantValue(value) {
  if (value === undefined) return 'N/A';
  
  // Multiply by 100, ceil, then divide by 100 to round up to 2 decimal places
  const roundedUp = Math.ceil(value * 100) / 100;
  
  // Ensure we always display 2 decimal places
  return roundedUp.toFixed(2);
}

// Test cases
const testValues = [
  0.08901310043668123,  // Should become 0.09
  1.995,                // Should become 2.00
  0.001,                // Should become 0.01
  0,                    // Should become 0.00
  123.456789,           // Should become 123.46
  undefined,            // Should become N/A
  42                    // Should become 42.00
];

// Run tests
console.log("Testing formatPollutantValue function:");
console.log("=====================================");
testValues.forEach(value => {
  console.log(`Input: ${value} → Output: ${formatPollutantValue(value)}`);
});

// Function to test CO conversion
function convertCOtoPPM(coMicrogramsPerM3) {
  if (coMicrogramsPerM3 === undefined) return undefined;
  return coMicrogramsPerM3 / 1145;
}

// Test cases for CO conversion
const coTestValues = [
  1145,       // Should become 1.00 ppm
  572.5,      // Should become 0.50 ppm
  2290,       // Should become 2.00 ppm
  100,        // Should become ~0.09 ppm
  undefined   // Should remain undefined
];

console.log("\nTesting CO conversion:");
console.log("=====================");
coTestValues.forEach(value => {
  const converted = convertCOtoPPM(value);
  console.log(`Input: ${value} μg/m³ → Converted: ${converted} ppm → Formatted: ${formatPollutantValue(converted)}`);
});
