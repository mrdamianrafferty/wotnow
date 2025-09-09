// debug-uv-card-simple.js
console.log('Testing UVCard nighttime behavior simulation');

// Nighttime scenario data
const nighttimeWeather = {
  uvi: 0,
  sunriseISO: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
  sunsetISO: new Date(new Date().setHours(20, 0, 0, 0)).toISOString()
};

// Current time
const now = new Date();
console.log('Current real time:', now.toLocaleTimeString());

// Check if it's nighttime according to our logic
const sunrise = new Date(nighttimeWeather.sunriseISO);
const sunset = new Date(nighttimeWeather.sunsetISO);
const isNightTime = now < sunrise || now > sunset;

console.log('\nNighttime detection parameters:');
console.log('Sunrise time:', sunrise.toLocaleTimeString());
console.log('Sunset time:', sunset.toLocaleTimeString());

console.log('\nNighttime detection results:');
console.log('Is nighttime?', isNightTime);
console.log('Now < Sunrise?', now < sunrise);
console.log('Now > Sunset?', now > sunset);

// Simulating the getUVColor and other functions from UVCard
const getUVColor = (uvi, isNight) => {
  if (isNight) return '#000000'; // Black for night-time
  if (uvi == null) return 'gray';
  if (uvi <= 2) return '#4ade80'; // Green
  if (uvi <= 5) return '#facc15'; // Yellow
  if (uvi <= 7) return '#fb923c'; // Orange
  if (uvi <= 10) return '#ef4444'; // Red
  return '#a855f7'; // Purple
};

const getUVRiskLevel = (uvi) => {
  if (uvi == null) return 'Unknown';
  if (uvi <= 2) return 'Low';
  if (uvi <= 5) return 'Moderate';
  if (uvi <= 7) return 'High';
  if (uvi <= 10) return 'Very High';
  return 'Extreme';
};

const getUVDescription = (uvi, isNight) => {
  if (isNight) return '🧛‍♀️ Party all night'; // Night-time vampire message
  if (uvi == null) return 'Unable to determine UV index';
  if (uvi <= 2) return 'Minimal risk from sun exposure';
  if (uvi <= 5) return '🧴 Moderate risk - use sun protection';
  if (uvi <= 7) return '🥵 High risk - take extra precautions';
  if (uvi <= 10) return '⚠️ Very high risk - minimize sun exposure';
  return '☢️ Extreme risk - avoid sun exposure when possible';
};

// Simulate badge display logic
const uvNow = nighttimeWeather.uvi;
const uvColor = getUVColor(uvNow, isNightTime);
const uvRiskLevel = isNightTime ? "Nighttime" : getUVRiskLevel(uvNow);
const uvDescription = getUVDescription(uvNow, isNightTime);

console.log('\nUVCard display values:');
console.log('UV Color:', uvColor);
console.log('UV Risk Level:', uvRiskLevel);
console.log('UV Description:', uvDescription);
console.log('Badge Text:', isNightTime ? '🧛‍♀️ Party all night' : `${uvNow} - ${uvRiskLevel}`);
console.log('Badge Background Color:', uvColor);
console.log('Badge Text Color:', isNightTime || uvNow > 5 ? 'white' : 'black');

console.log('\nVerification complete! If "Is nighttime?" is true, then the UVCard should show "🧛‍♀️ Party all night" on a black badge with white text.');
