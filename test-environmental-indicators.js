/**
 * Environmental Indicators Smoke Test
 * 
 * This script tests the data flow for environmental indicators (pollen, UVI, AQI)
 * from the API to the UI components. It verifies:
 * 
 * 1. Data is correctly fetched from Open-Meteo API
 * 2. Environmental data is properly processed and transformed
 * 3. The data structure matches what the UI components expect
 * 
 * Usage: npx tsx test-environmental-indicators.js
 */

// Try different import methods to ensure compatibility
let openMeteoService;
try {
  openMeteoService = require('./lib/services/openMeteoService');
} catch (err) {
  console.error('Error importing as CommonJS:', err.message);
  try {
    // Try dynamic import for ESM
    import('./lib/services/openMeteoService.js').then(module => {
      openMeteoService = module;
      runTest();
    }).catch(err => {
      console.error('Error importing as ESM:', err.message);
      console.error('Please check the import/export format of openMeteoService.ts');
    });
  } catch (err) {
    console.error('Both import methods failed. Check the module system being used.');
  }
}

// Test location (Barcelona, Spain)
const lat = 41.3874;
const lon = 2.1686;

async function runTest() {
  console.log('🔍 Testing Environmental Indicators Data Flow');
  console.log('-------------------------------------------');
  console.log(`Testing location: ${lat}, ${lon} (Barcelona)`);
  
  try {
    if (!openMeteoService || !openMeteoService.fetchEnvironmentalData) {
      console.error('❌ fetchEnvironmentalData function not found. Import failed.');
      return;
    }

    console.log('\n1. Fetching environmental data from Open-Meteo...');
    const envData = await openMeteoService.fetchEnvironmentalData(lat, lon);
    
    console.log('✅ Successfully fetched environmental data');
    
    // Check pollen data
    if (envData.pollen) {
      console.log('\n2. Pollen data received:');
      const pollenTypes = Object.keys(envData.pollen);
      console.log(`Found ${pollenTypes.length} pollen types: ${pollenTypes.join(', ')}`);
      
      // Log highest pollen values
      const highestPollen = {};
      for (const type of pollenTypes) {
        const values = envData.pollen[type];
        if (Array.isArray(values) && values.length > 0) {
          highestPollen[type] = Math.max(...values.filter(v => typeof v === 'number'));
        }
      }
      console.log('Highest pollen values:', highestPollen);
    } else {
      console.log('❌ No pollen data received');
    }
    
    // Check air quality data
    if (envData.airQuality) {
      console.log('\n3. Air Quality data received:');
      const aqiParameters = Object.keys(envData.airQuality);
      console.log(`Found ${aqiParameters.length} AQI parameters: ${aqiParameters.join(', ')}`);
      
      // Log highest AQI values
      const highestAQI = {};
      for (const param of aqiParameters) {
        const values = envData.airQuality[param];
        if (Array.isArray(values) && values.length > 0) {
          highestAQI[param] = Math.max(...values.filter(v => typeof v === 'number'));
        }
      }
      console.log('Highest AQI values:', highestAQI);
    } else {
      console.log('❌ No air quality data received');
    }
    
    // Check UVI data
    if (envData.uvi) {
      console.log('\n4. UV Index data received:');
      console.log(`Max UVI: ${envData.uvi.max}`);
      console.log(`Mean UVI: ${envData.uvi.mean}`);
    } else {
      console.log('❌ No UVI data received');
    }
    
    // Check data freshness
    if (envData.lastUpdated) {
      console.log('\n5. Data freshness:');
      console.log(`Last updated: ${new Date(envData.lastUpdated).toLocaleString()}`);
      console.log(`Is stale data: ${envData.isStale ? 'Yes' : 'No'}`);
    }
    
    // Verify data structure for UI components
    console.log('\n6. Verifying data structure for UI components...');
    const hasValidStructure = 
      (envData.pollen && typeof envData.pollen === 'object') ||
      (envData.airQuality && typeof envData.airQuality === 'object') ||
      (envData.uvi && typeof envData.uvi === 'object');
    
    if (hasValidStructure) {
      console.log('✅ Data structure is valid for UI components');
    } else {
      console.log('❌ Data structure is not valid for UI components');
    }
    
    // Full data dump (commented out to avoid cluttering the console)
    // console.log('\nFull data response:', JSON.stringify(envData, null, 2));
    
    console.log('\n🎉 Environmental indicators smoke test completed');
  } catch (error) {
    console.error('❌ Error testing environmental indicators:', error);
  }
}

// Test location (Barcelona, Spain)
const lat = 41.3874;
const lon = 2.1686;

// Only run directly if we're using require (CommonJS)
if (typeof require !== 'undefined') {
  runTest();
}
