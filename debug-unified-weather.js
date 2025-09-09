// Debug script to fetch unified weather data
const fetch = require('node-fetch');

const location = {
  lat: 51.5074,
  lon: -0.1278
};

async function fetchUnifiedWeatherData() {
  try {
    console.log(`Fetching data from: http://localhost:3000/api/unified-weather?lat=${location.lat}&lon=${location.lon}`);
    console.log('Please make sure Next.js dev server is running!\n');

    const response = await fetch(`http://localhost:3000/api/unified-weather?lat=${location.lat}&lon=${location.lon}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('=== POLLEN DATA CHECK ===');
    if (data && data.pollen) {
      console.log('✅ Pollen data is present in the API response');
      console.log(JSON.stringify(data.pollen, null, 2));
      
      if (data.pollen && data.pollen.pollenToday) {
        console.log('\n=== POLLEN TODAY VALUES ===');
        console.log(JSON.stringify(data.pollen.pollenToday, null, 2));
      }
      
      if (data.pollen && data.pollen.pollenIdx) {
        console.log(`\nPollen Index: ${data.pollen.pollenIdx}`);
      }
    } else {
      console.log('❌ No pollen data found in the API response');
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchUnifiedWeatherData();
