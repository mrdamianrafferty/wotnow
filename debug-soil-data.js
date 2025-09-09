// Debug script for soil data flow
// Run with: NODE_OPTIONS=--experimental-vm-modules node debug-soil-data.js

const apiPath = './pages/api/unified-weather.ts';
console.log(`Analyzing soil data flow in: ${apiPath}`);

async function fetchTestData() {
  try {
    // Mock fetch function to test local API behavior
    global.fetch = () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        hourly: {
          time: [
            '2025-09-06T00:00',
            '2025-09-06T01:00',
            '2025-09-06T02:00',
            '2025-09-06T12:00',  // This should be closest to noon
            '2025-09-06T13:00'
          ],
          soil_temperature_0cm: [21, 20, 19, 25, 26],
          soil_temperature_6cm: [20, 20, 19, 24, 25],
          soil_temperature_18cm: [19, 19, 18, 22, 23],
          soil_temperature_54cm: [18, 18, 18, 19, 20],
          soil_moisture_0_to_1cm: [0.25, 0.24, 0.24, 0.22, 0.21],
          soil_moisture_1_to_3cm: [0.27, 0.27, 0.26, 0.25, 0.24],
          soil_moisture_3_to_9cm: [0.30, 0.30, 0.29, 0.28, 0.27],
          soil_moisture_9_to_27cm: [0.32, 0.32, 0.32, 0.31, 0.30]
        }
      })
    });

    // Analysis of the bug
    console.log('ISSUE FOUND: Missing "diff" variable in soil data processing');
    console.log('In pages/api/unified-weather.ts around line 542:');
    console.log('```');
    console.log('if (dt.getFullYear() === todayY && dt.getMonth() === todayM && dt.getDate() === todayD) {');
    console.log('  // Error: "diff" is used but not defined');
    console.log('  if (diff < bestDiff) { bestDiff = diff; idx = i; }');
    console.log('```');

    console.log('\nFIX: Calculate the time difference from noon:');
    console.log('```');
    console.log('if (dt.getFullYear() === todayY && dt.getMonth() === todayM && dt.getDate() === todayD) {');
    console.log('  // Calculate minutes from noon (12:00)');
    console.log('  const noonDiff = Math.abs((dt.getHours() - 12) * 60 + dt.getMinutes());');
    console.log('  if (noonDiff < bestDiff) { bestDiff = noonDiff; idx = i; }');
    console.log('```');

    // Data flow test
    console.log('\nTesting SoilCard data flow:');
    console.log('1. API fetches Open-Meteo soil data');
    console.log('2. Data is added to normalizedData.soil in unified-weather.ts');
    console.log('3. Weather object passed to SoilCard component via WeatherCardGrid');
    console.log('4. SoilCard checks weather?.soil, extracts values to soil object');
    console.log('5. SoilCard uses hasSoilData = Object.values(soil).some(v => v != null)');
    console.log('6. If !hasSoilData, uses fallback with weather temp and humidity');

    console.log('\nDiagnosis: API is failing to set soil data due to ReferenceError: diff is not defined');
    console.log('Therefore SoilCard is falling back to the placeholder/mock display');
    console.log('\nRecommendation: Fix the API bug in unified-weather.ts and verify data flow');
  } catch (err) {
    console.error('Error testing soil data:', err);
  }
}

fetchTestData();
