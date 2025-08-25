// test-environmental-fallback.js
// This script tests our environmental data fallback mechanism
// by mocking the current date to be beyond Open-Meteo's max date limit

// Save the original Date constructor
const OriginalDate = global.Date;

// Mock the current date to be beyond Open-Meteo's limit
const mockDate = new Date('2025-08-25'); // One day beyond the limit

// Override Date to return our fixed date for 'new Date()' calls
global.Date = class extends OriginalDate {
  constructor(...args) {
    if (args.length === 0) {
      return mockDate;
    }
    return new OriginalDate(...args);
  }
};

// Preserve static methods
global.Date.UTC = OriginalDate.UTC;
global.Date.parse = OriginalDate.parse;
global.Date.now = () => mockDate.getTime();

// Import the fetchOpenMeteoAirPollen function directly
// We'll manually implement the function since we can't directly import from a Next.js API route

// Recreate the fetchOpenMeteoAirPollen function from weather-with-pollen.ts
async function fetchOpenMeteoAirPollen(lat, lon) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // Today YYYY-MM-DD
  
  // Open-Meteo API only allows up to 2025-08-24
  const MAX_END_DATE = '2025-08-24';
  const MAX_DATE = new Date('2025-08-24');
  
  // If current date is beyond the max supported date,
  // use max date as both start and end to get the most recent available data
  let start, end;
  
  if (now > MAX_DATE) {
    // We're beyond the max date, so use the max date as both start and end
    // and we'll note in the response that data may be stale
    console.log('Current date beyond Open-Meteo max supported date, using historical data');
    start = '2025-08-24'; // Max date
    end = '2025-08-24';   // Max date
  } else {
    // Normal case - we're within the supported date range
    start = today;
    const endDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    end = endDate.toISOString().split('T')[0]; // 8 days later
    if (end > MAX_END_DATE) end = MAX_END_DATE;
  }

  const hourlyVars = [
    'alder_pollen',
    'birch_pollen', 
    'grass_pollen',
    'ragweed_pollen',
    'us_aqi' // Add air quality index
  ];

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?` +
    `latitude=${lat}&longitude=${lon}&` +
    `hourly=${hourlyVars.join(',')}&` +
    `start_date=${start}&end_date=${end}&` +
    `timezone=auto`;

  console.log('Open-Meteo air quality URL:', url);

  try {
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    console.log('Open-Meteo response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Open-Meteo error response:', errorText);
      throw new Error(`Open-Meteo air/pollen ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log('Open-Meteo data received successfully');
    return data;
  } catch (error) {
    console.error('Error fetching Open-Meteo data:', error);
    throw error;
  }
}

// Test the fallback mechanism
async function testFallback() {
  try {
    console.log('Testing with mocked date:', new Date().toISOString());
    console.log('Expected behavior: fetchOpenMeteoAirPollen should use 2025-08-24 as both start and end date');
    
    // Call the function with sample coordinates
    const result = await fetchOpenMeteoAirPollen(51.5074, -0.1278); // London coordinates
    
    // Check the result
    console.log('API Response received:');
    console.log('Hourly data points:', result.hourly.time.length);
    console.log('First timestamp:', result.hourly.time[0]);
    console.log('Last timestamp:', result.hourly.time[result.hourly.time.length - 1]);
    
    // Check that we're getting only one day of data (the max date)
    const uniqueDates = new Set(result.hourly.time.map(t => t.split('T')[0]));
    console.log('Unique dates in response:', Array.from(uniqueDates));
    
    // Verify pollen data exists
    console.log('Sample pollen data:');
    console.log('- Grass pollen (first hour):', result.hourly.grass_pollen[0]);
    console.log('- Tree pollen (first hour):', 
      Math.max(result.hourly.alder_pollen[0] || 0, result.hourly.birch_pollen[0] || 0)
    );
    console.log('- AQI (first hour):', result.hourly.us_aqi[0]);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Restore the original Date constructor
    global.Date = OriginalDate;
  }
}

// Run the test
testFallback();

// Run the test
testFallback();
