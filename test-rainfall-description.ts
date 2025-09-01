// Test the enhanced rainfall description function
import { getRainfallDescriptionWithHourly } from './utils/weatherLabels';

// Test case 1: No rain in both daily and hourly
console.log('\n-------- Test 1: No rain in both daily and hourly --------');
console.log(getRainfallDescriptionWithHourly(0, [
  { time: '2025-08-27T08:00:00Z', rain: 0 },
  { time: '2025-08-27T09:00:00Z', rain: 0 },
  { time: '2025-08-27T10:00:00Z', rain: 0 },
]));
// Expected: "No rain"

// Test case 2: No daily rain but hourly rain at a specific time
console.log('\n-------- Test 2: No daily rain but hourly rain at a specific time --------');
console.log(getRainfallDescriptionWithHourly(0, [
  { time: '2025-08-27T08:00:00Z', rain: 0 },
  { time: '2025-08-27T09:00:00Z', rain: 0 },
  { time: '2025-08-27T15:00:00Z', rain: 0 },
  { time: '2025-08-27T16:00:00Z', rain: 0 },
  { time: '2025-08-27T17:00:00Z', rain: 0 },
  { time: '2025-08-27T18:00:00Z', rain: 0.5 },
  { time: '2025-08-27T19:00:00Z', rain: 0.8 },
  { time: '2025-08-27T20:00:00Z', rain: 0 },
]));
// Expected: "Mostly dry, chance of showers around 6pm"

// Test case 3: No daily rain but significant hourly rain
console.log('\n-------- Test 3: No daily rain but significant hourly rain --------');
console.log(getRainfallDescriptionWithHourly(0, [
  { time: '2025-08-27T08:00:00Z', rain: 0 },
  { time: '2025-08-27T09:00:00Z', rain: 0 },
  { time: '2025-08-27T15:00:00Z', rain: 0 },
  { time: '2025-08-27T16:00:00Z', rain: 0 },
  { time: '2025-08-27T17:00:00Z', rain: 0 },
  { time: '2025-08-27T18:00:00Z', rain: 3 },
  { time: '2025-08-27T19:00:00Z', rain: 4 },
  { time: '2025-08-27T20:00:00Z', rain: 0 },
]));
// Expected: "Mostly dry, chance of rain around 6pm"

// Test case 4: Significant daily rain
console.log('\n-------- Test 4: Significant daily rain --------');
console.log(getRainfallDescriptionWithHourly(12, [
  { time: '2025-08-27T08:00:00Z', rain: 1 },
  { time: '2025-08-27T09:00:00Z', rain: 2 },
  { time: '2025-08-27T15:00:00Z', rain: 3 },
  { time: '2025-08-27T16:00:00Z', rain: 4 },
  { time: '2025-08-27T17:00:00Z', rain: 2 },
]));
// Expected: "Light rain"

// Test case 5: Different hourly data format (with dt instead of time)
console.log('\n-------- Test 5: Different hourly data format --------');
console.log(getRainfallDescriptionWithHourly(0, [
  { dt: 1755900000, precipitation: 0 },  // Some time in 2025
  { dt: 1755903600, precipitation: 0 },
  { dt: 1755907200, precipitation: 0 },
  { dt: 1755910800, precipitation: 0.2 },
  { dt: 1755914400, precipitation: 0.3 },
]));
// Expected: "Mostly dry, chance of light showers around [some time]"

// Test case 6: No hourly data available
console.log('\n-------- Test 6: No hourly data available --------');
console.log(getRainfallDescriptionWithHourly(0));
// Expected: "No rain"

console.log('\n-------- End of tests --------');
