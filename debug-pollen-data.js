// Debug script to fetch and display pollen data
const fetch = require('node-fetch');

const location = {
  lat: 51.5074,
  lon: -0.1278
};

async function fetchPollenData() {
  try {
    console.log(`Fetching data from: http://localhost:3000/api/weather-with-pollen?lat=${location.lat}&lon=${location.lon}`);
    console.log('Please make sure Next.js dev server is running!\n');

    const response = await fetch(`http://localhost:3000/api/weather-with-pollen?lat=${location.lat}&lon=${location.lon}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('=== POLLEN DATA CHECK ===');
    if (data && data.pollenToday) {
      console.log('✅ Pollen data is present in the API response');
      console.log(JSON.stringify(data.pollenToday, null, 2));
      console.log(`Pollen Index: ${data.pollenIdx}`);
      
      if (data.pollenAssess) {
        console.log('\n=== POLLEN ASSESSMENT ===');
        console.log(JSON.stringify(data.pollenAssess, null, 2));
      }
    } else {
      console.log('❌ No pollen data found in the API response');
      console.log(JSON.stringify(data, null, 2));
    }
    
    // Show forecast if available
    if (data && data.pollenForecast) {
      console.log('\n=== POLLEN FORECAST ===');
      console.log(JSON.stringify(data.pollenForecast, null, 2));
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchPollenData();
