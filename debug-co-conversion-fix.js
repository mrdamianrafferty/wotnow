// debug-co-conversion-fix.js
// Script to verify CO unit conversion fix

const { convertCOtoPPM } = require('./utils/airQualityUtils');

// Test values
const testValues = [
  { microgramsPerM3: 101.92, expectedPPM: 0.09 },
  { microgramsPerM3: 400, expectedPPM: 0.35 },
  { microgramsPerM3: 1145, expectedPPM: 1.0 },
  { microgramsPerM3: 5725, expectedPPM: 5.0 },
  { microgramsPerM3: 11450, expectedPPM: 10.0 },
  { microgramsPerM3: 34350, expectedPPM: 30.0 },
  { microgramsPerM3: undefined, expectedPPM: undefined },
];

// Verify the CO range categorization
function getCOCategory(ppm) {
  if (ppm === undefined) return "No data";
  if (ppm <= 4.4) return "🟢 Good";
  if (ppm <= 9.4) return "🟡 Moderate";
  if (ppm <= 12.4) return "🟠 UFS";
  if (ppm <= 15.4) return "🔴 Unhealthy";
  if (ppm <= 30.4) return "🟣 Very Unhealthy";
  return "🟤 Hazardous";
}

console.log("===== CO Unit Conversion Test =====");
console.log("Testing conversion from μg/m³ to ppm (parts per million)");
console.log("Conversion factor: 1ppm ≈ 1145 μg/m³\n");

testValues.forEach(({ microgramsPerM3, expectedPPM }) => {
  const convertedPPM = convertCOtoPPM(microgramsPerM3);
  const actualPPM = convertedPPM !== undefined ? convertedPPM.toFixed(2) : 'undefined';
  const expected = expectedPPM !== undefined ? expectedPPM.toFixed(2) : 'undefined';
  
  console.log(`CO: ${microgramsPerM3 ?? 'undefined'} μg/m³`);
  console.log(`Converted: ${actualPPM} ppm (expected: ${expected} ppm)`);
  
  if (convertedPPM !== undefined) {
    console.log(`Category: ${getCOCategory(convertedPPM)}`);
  } else {
    console.log(`Category: No data`);
  }
  
  console.log("---");
});

// Check the specific value from the user's question
const userCaseValue = 101.92;
const userCasePPM = convertCOtoPPM(userCaseValue);

console.log("\n===== User's Case Analysis =====");
console.log(`The CO value of ${userCaseValue} μg/m³ from the API converts to approximately ${userCasePPM?.toFixed(2)} ppm`);
console.log(`This falls in the "${getCOCategory(userCasePPM)}" category`);
console.log(`\nEXPLANATION: The value was incorrectly being treated as ${userCaseValue} ppm (without conversion),`);
console.log(`which would fall into the "🟤 Hazardous" category (>30.5 ppm).`);
console.log(`\nThe fix ensures that CO values from the API (in μg/m³) are properly converted to ppm before display.`);
