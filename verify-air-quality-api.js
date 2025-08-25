/**
 * Command line test for Open-Meteo air quality API
 * Simple version that just validates the URL construction
 */

// Get today's date
const now = new Date();
const start = now.toISOString().split('T')[0]; // Today YYYY-MM-DD

// Calculate end date (5 days from now)
const endDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
const end = endDate.toISOString().split('T')[0]; // 5 days later

// Test coordinates (London)
const lat = 51.5074;
const lon = -0.1278;

// Construct URL
const hourlyVars = ['alder_pollen', 'birch_pollen', 'grass_pollen', 'ragweed_pollen', 'us_aqi'];
const url = `https://air-quality-api.open-meteo.com/v1/air-quality?` +
  `latitude=${lat}&longitude=${lon}&` +
  `hourly=${hourlyVars.join(',')}&` +
  `start_date=${start}&end_date=${end}&` +
  `timezone=auto`;

// Display results
console.log('===== Open-Meteo Air Quality API Test =====');
console.log(`Start date: ${start}`);
console.log(`End date: ${end}`);
console.log(`Date range valid: ${new Date(end) > new Date(start) ? 'YES' : 'NO'}`);
console.log(`URL: ${url}`);
console.log('==========================================');

// This script just validates the URL construction
// The actual API call will be made by the weather-with-pollen.ts endpoint
