// Debug script for checking the API response directly
// Run with: NODE_OPTIONS=--experimental-vm-modules node debug-soil-api-response.js

async function checkApiResponse() {
  try {
    // Test with a known location (example: London)
    const lat = 51.5074;
    const lon = -0.1278;
    const url = `http://localhost:3000/api/unified-weather?lat=${lat}&lon=${lon}&mode=land`;
    
    console.log(`Fetching data from: ${url}`);
    console.log('Please make sure Next.js dev server is running!');
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for soil data
    console.log('\n=== SOIL DATA CHECK ===');
    if (data.soil) {
      console.log('✅ Soil data is present in the API response');
      console.log(JSON.stringify(data.soil, null, 2));
      console.log(`Soil timestamp: ${data.soilTimeISO || 'not provided'}`);
    } else {
      console.log('❌ No soil data found in the API response');
    }
    
    // Check for other related data that might be relevant
    console.log('\n=== RELATED WEATHER DATA ===');
    console.log(`Temperature: ${data.tempC || data.temperatureC || 'not found'}°C`);
    console.log(`Humidity: ${data.humidity || data.humidityPct || 'not found'}%`);
    
  } catch (error) {
    console.error('Error checking API response:', error);
    console.log('\nMake sure the Next.js dev server is running on port 3000');
  }
}

checkApiResponse();
