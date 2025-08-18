// Test script to check air quality visibility
const fetch = require('node-fetch');

async function testAirQualityData() {
  try {
    console.log('🧪 Testing air quality data visibility...');
    
    const response = await fetch('http://localhost:3000/api/weather-with-pollen?lat=43.4667&lon=-5.45');
    const data = await response.json();
    
    console.log('📅 Air Quality by Date:');
    Object.entries(data.airQualityByDate || {}).forEach(([date, aq]) => {
      console.log(`  ${date}: overall=${aq.overall}`);
      
      // Check if it meets display threshold (MODERATE = 2)
      const level = getAirQualityLevel(aq.overall);
      const shouldDisplay = level >= 2; // MODERATE or worse
      console.log(`    Level: ${level}, Should display: ${shouldDisplay}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing air quality data:', error);
  }
}

function getAirQualityLevel(aqi) {
  if (aqi === undefined || aqi < 0) return 0; // NONE
  if (aqi <= 50) return 1; // GOOD
  if (aqi <= 100) return 2; // MODERATE
  if (aqi <= 150) return 3; // UNHEALTHY_SENSITIVE
  if (aqi <= 200) return 4; // UNHEALTHY
  if (aqi <= 300) return 5; // VERY_UNHEALTHY
  return 6; // HAZARDOUS
}

testAirQualityData();
