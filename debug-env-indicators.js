// This script helps debug the environmental data flow problem
// Run this with: node debug-env-indicators.js

const fs = require('fs');

// Mock data to simulate a day object with environmental data
const mockDay = {
  date: 1724590800, // August 25, 2025
  temperature: 25,
  humidity: 65,
  windSpeed: 12,
  // Add environmental data
  pollen: {
    grass: 3.2,
    tree: 1.5, 
    weed: 2.1
  },
  airQuality: {
    overall: 42
  },
  isEnvironmentalDataStale: true,
  environmentalDataLastUpdated: new Date().toISOString()
};

// Mock ActivityDayPayload for testing
const mockPayload = {
  activityId: 'hiking',
  day: mockDay,
  score: 85
};

// Import the buildPopupActivityPayload function dynamically
async function runTest() {
  try {
    // First, log the mock input data
    console.log('🔍 INPUT: Mock day environmental data:');
    console.log('- Pollen:', mockDay.pollen);
    console.log('- AirQuality:', mockDay.airQuality);
    console.log('- IsStale:', mockDay.isEnvironmentalDataStale);
    console.log('- LastUpdated:', mockDay.environmentalDataLastUpdated);
    console.log('\n');

    // Dynamically import the buildPopupActivityPayload function
    // This approach allows us to use ESM imports in a CommonJS context
    const { buildPopupActivityPayload } = await import('./utils/buildPopupActivityPayload.js');
    
    if (!buildPopupActivityPayload) {
      console.error('❌ Could not import buildPopupActivityPayload function');
      return;
    }
    
    // Call the function with our mock data
    const result = buildPopupActivityPayload(mockPayload);
    
    // Log the output (what would be passed to Popup component)
    console.log('🔍 OUTPUT: Popup payload environmental data:');
    console.log('- Pollen:', result.pollen);
    console.log('- AirQuality:', result.airQuality);
    console.log('- IsStale:', result.isEnvironmentalDataStale);
    console.log('- LastUpdated:', result.environmentalDataLastUpdated);
    
    // Verify data flow
    console.log('\n🔍 VERIFICATION:');
    console.log('- Pollen data preserved:', !!result.pollen);
    console.log('- AirQuality data preserved:', !!result.airQuality);
    console.log('- Stale flag preserved:', result.isEnvironmentalDataStale === mockDay.isEnvironmentalDataStale);
    console.log('- LastUpdated preserved:', result.environmentalDataLastUpdated === mockDay.environmentalDataLastUpdated);
    
    // Now try with a marine activity
    mockPayload.activityId = 'surfing';
    console.log('\n🏄 Testing with marine activity:');
    const marineResult = buildPopupActivityPayload(mockPayload);
    
    console.log('🔍 MARINE OUTPUT: Popup payload environmental data:');
    console.log('- Pollen:', marineResult.pollen);
    console.log('- AirQuality:', marineResult.airQuality);
    console.log('- IsStale:', marineResult.isEnvironmentalDataStale);
    console.log('- LastUpdated:', marineResult.environmentalDataLastUpdated);
    
  } catch (error) {
    console.error('Error running test:', error);
  }
}

runTest();
