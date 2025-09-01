/**
 * This script tests the Open-Meteo air quality API directly
 * to ensure the URL parameters are correctly constructed
 */

// Simulate the fetchOpenMeteoAirPollen function
async function testOpenMeteoAirPollen(lat, lon) {
  const now = new Date();
  const start = now.toISOString().split('T')[0]; // Today YYYY-MM-DD
  
  // Calculate end date (5 days from now)
  const endDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const end = endDate.toISOString().split('T')[0]; // 5 days later
  
  console.log(`Testing date range: ${start} to ${end}`);
  
  // Ensure end date is after start date
  if (new Date(end) <= new Date(start)) {
    console.error(`Invalid date range: start=${start}, end=${end}`);
    throw new Error(`Invalid date range: end date must be after start date`);
  }

  const hourlyVars = [
    'alder_pollen',
    'birch_pollen', 
    'grass_pollen',
    'ragweed_pollen',
    'us_aqi'
  ];

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?` +
    `latitude=${lat}&longitude=${lon}&` +
    `hourly=${hourlyVars.join(',')}&` +
    `start_date=${start}&end_date=${end}&` +
    `timezone=auto`;

  console.log('Open-Meteo air quality URL:', url);
  
  try {
    console.log('Fetching data...');
    const res = await fetch(url);
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      return false;
    }
    
    const data = await res.json();
    console.log('Data received successfully!');
    console.log('Number of hourly data points:', data.hourly?.time?.length || 0);
    return true;
  } catch (error) {
    console.error('Error fetching data:', error);
    return false;
  }
}

// Test with London coordinates
testOpenMeteoAirPollen(51.5074, -0.1278)
  .then(success => {
    console.log('Test result:', success ? 'PASSED' : 'FAILED');
    process.exit(success ? 0 : 1);
  });
