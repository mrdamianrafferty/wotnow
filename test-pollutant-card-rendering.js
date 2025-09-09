/**
 * Test script to check the behavior of the PollutantCard component
 * This simulates the rendering logic in React
 */

// Mock pollutant data
const pollutantData = [
  {
    name: 'SO₂ — Sulphur Dioxide',
    value: 0.82,
    emoji: '🏭',
    unit: 'µg/m³',
    description: 'From burning sulphur fuels: coal, heavy oil, industry.',
    currentRange: {
      level: '🟢 Good',
      description: 'No concern.',
      cause: 'Clean air.'
    }
  },
  {
    name: 'O₃ — Ozone',
    value: 52.76,
    emoji: '🌆',
    unit: 'ppb',
    description: 'Formed when sunlight reacts with traffic fumes; classic "summer smog".',
    currentRange: {
      level: '🟢 Good',
      description: 'No concern.',
      cause: 'Clean, cool air.'
    }
  },
  {
    name: 'NO₂ — Nitrogen Dioxide',
    value: 105,
    emoji: '🚛',
    unit: 'µg/m³',
    description: 'Gas from traffic exhaust and boilers/heaters.',
    currentRange: {
      level: '🟡 Moderate',
      description: 'Can irritate airways in sensitive people.',
      cause: 'Local traffic flow, diesel vehicles.'
    }
  }
];

// Function to format pollutant values
function formatPollutantValue(value) {
  if (value === undefined) return 'N/A';
  const roundedUp = Math.ceil(value * 100) / 100;
  return roundedUp.toFixed(2);
}

// Test function to simulate rendering logic
function simulateRendering(pollutant) {
  console.log(`\n${pollutant.emoji} ${pollutant.name} (${pollutant.unit})`);
  console.log(`${formatPollutantValue(pollutant.value)} - ${pollutant.currentRange.level.split(' ')[0]}`);
  
  console.log(pollutant.description);
  
  // Check if we should display explanation and cause
  if (!pollutant.currentRange.level.includes('Good')) {
    console.log(`\n${pollutant.currentRange.description}`);
    console.log(`Likely cause: ${pollutant.currentRange.cause}`);
  } else {
    console.log("\n[Explanation hidden for Good air quality]");
  }
}

// Run tests
console.log("Testing PollutantCard rendering with Good vs non-Good air quality:");
console.log("===========================================================");

pollutantData.forEach(pollutant => {
  simulateRendering(pollutant);
  console.log("-----------------------------------------------------------");
});
