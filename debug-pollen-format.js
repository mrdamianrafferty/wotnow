// Debug script to trace pollen data transformation
const fs = require('fs');
const path = require('path');

// Mock implementation of pollen utility functions
const PollenLevel = {
  NONE: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  VERY_HIGH: 4,
  EXTREME: 5
};

function getPollenLevelDescription(level) {
  switch (level) {
    case PollenLevel.NONE: return 'None';
    case PollenLevel.LOW: return 'Low';
    case PollenLevel.MODERATE: return 'Moderate';
    case PollenLevel.HIGH: return 'High';
    case PollenLevel.VERY_HIGH: return 'Very High';
    case PollenLevel.EXTREME: return 'Extreme';
    default: return 'Unknown';
  }
}

function classifyPollenLevel(value) {
  if (!value || value < 0) return PollenLevel.NONE;
  if (value <= 0.5) return PollenLevel.LOW;
  if (value <= 2) return PollenLevel.MODERATE;
  if (value <= 4) return PollenLevel.HIGH;
  if (value <= 10) return PollenLevel.VERY_HIGH;
  return PollenLevel.EXTREME; 
}

// Sample pollen data for testing - modify these values for different test cases
const pollenData = {
  grass: 0.8,  // Corresponds to "Low" or "Moderate" based on our classification
  tree: 1.7,   // Corresponds to "Moderate"
  weed: 0.3,   // Corresponds to "Low" 
  olive: 0     // Corresponds to "Low" or "None"
};

// This is the expected format for the pollenToday object passed to PollenCard
function createPollenTodayObject(pollen) {
  return {
    grass_pollen: getPollenLevelDescription(classifyPollenLevel(pollen.grass)),
    tree_pollen: getPollenLevelDescription(classifyPollenLevel(pollen.tree)),
    weed_pollen: getPollenLevelDescription(classifyPollenLevel(pollen.weed)),
    olive_pollen: getPollenLevelDescription(classifyPollenLevel(pollen.olive))
  };
}

// Run the test
const pollenToday = createPollenTodayObject(pollenData);
console.log("Sample Pollen Data Input:", pollenData);
console.log("Expected pollenToday Format for PollenCard:", pollenToday);

// Show how the UI will display each pollen type based on these values
console.log("\nUI Display Information:");
Object.entries(pollenToday).forEach(([key, value]) => {
  console.log(`${key}: ${value || '—'} (Shows as "${value || '—'}" in UI)`);
});

// Explain what might be wrong
console.log("\nPossible Issues:");
console.log("1. If pollenToday is empty or contains null/undefined values, the card will show '—' for all pollen types");
console.log("2. The API might be returning numeric values but the PollenCard expects string descriptions");
console.log("3. The data transformation might be missing between the API and the PollenCard");
