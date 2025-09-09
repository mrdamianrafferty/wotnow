// debug-air-quality-mapping-simple.js
// A simplified script to debug AirQualityCard data mapping issues

// Sample air quality data with different structures to test
const testData = [
  {
    name: "Complete Data (Nested Structure)",
    weather: {
      airQuality: {
        aqi: 75,
        components: {
          co: 400,
          no: 10,
          no2: 120,
          o3: 60,
          so2: 150,
          pm2_5: 20,
          pm10: 80,
          nh3: 5
        }
      }
    }
  },
  {
    name: "Flat Structure",
    weather: {
      airQuality: {
        aqi: 120,
        pm2_5: 40,
        pm10: 200,
        no2: 250,
        o3: 80,
        so2: 250,
        co: 10
      }
    }
  },
  {
    name: "Missing Some Components",
    weather: {
      airQuality: {
        aqi: 50,
        components: {
          co: 300,
          no2: 90,
          // o3, so2, pm2_5, pm10 missing
        }
      }
    }
  },
  {
    name: "API Response Format",
    weather: {
      airQuality: {
        aqi: 85,
        components: {
          co: 303.7,
          no: 0.2,
          no2: 7.9,
          o3: 140.9,
          so2: 2.5,
          pm2_5: 11.1,
          pm10: 12.1,
          nh3: 1.3
        }
      }
    }
  }
];

// Simulate AirQualityCard extraction logic (current implementation)
function extractValuesCurrentImplementation(weather) {
  return {
    aqi: weather?.airQuality?.aqi || 0,
    pm2_5: weather?.airQuality?.pm2_5,
    pm10: weather?.airQuality?.pm10,
    no2: weather?.airQuality?.no2,
    o3: weather?.airQuality?.o3,
    so2: weather?.airQuality?.so2,
    co: weather?.airQuality?.co
  };
}

// Simulate fixed extraction logic (proposed implementation)
function extractValuesFixedImplementation(weather) {
  return {
    aqi: weather?.airQuality?.aqi || 0,
    pm2_5: weather?.airQuality?.pm2_5 !== undefined 
      ? weather.airQuality.pm2_5 
      : weather?.airQuality?.components?.pm2_5,
    pm10: weather?.airQuality?.pm10 !== undefined 
      ? weather.airQuality.pm10 
      : weather?.airQuality?.components?.pm10,
    no2: weather?.airQuality?.no2 !== undefined 
      ? weather.airQuality.no2 
      : weather?.airQuality?.components?.no2,
    o3: weather?.airQuality?.o3 !== undefined 
      ? weather.airQuality.o3 
      : weather?.airQuality?.components?.o3,
    so2: weather?.airQuality?.so2 !== undefined 
      ? weather.airQuality.so2 
      : weather?.airQuality?.components?.so2,
    co: weather?.airQuality?.co !== undefined 
      ? weather.airQuality.co 
      : weather?.airQuality?.components?.co
  };
}

// Function to run the tests
function testComponentMapping() {
  console.log("=== TESTING AIR QUALITY COMPONENT DATA MAPPING ===\n");
  
  testData.forEach(data => {
    console.log(`\n---------- TEST CASE: ${data.name} ----------`);
    
    // Log raw input data
    console.log("\nInput data:");
    console.log(JSON.stringify(data.weather.airQuality, null, 2));
    
    // Extract values using current implementation
    const currentValues = extractValuesCurrentImplementation(data.weather);
    console.log("\nCurrent implementation extraction:");
    console.log(JSON.stringify(currentValues, null, 2));
    
    // Extract values using fixed implementation
    const fixedValues = extractValuesFixedImplementation(data.weather);
    console.log("\nFixed implementation extraction:");
    console.log(JSON.stringify(fixedValues, null, 2));
    
    // Check for missing values
    const undefinedValues = Object.entries(currentValues)
      .filter(([key, value]) => value === undefined && key !== 'aqi')
      .map(([key]) => key);
    
    if (undefinedValues.length > 0) {
      console.log(`\nCurrent implementation - Values that are undefined: ${undefinedValues.join(', ')}`);
    }
    
    const fixedUndefined = Object.entries(fixedValues)
      .filter(([key, value]) => value === undefined && key !== 'aqi')
      .map(([key]) => key);
    
    if (fixedUndefined.length > 0) {
      console.log(`\nFixed implementation - Values that are still undefined: ${fixedUndefined.join(', ')}`);
    }
  });
  
  console.log("\n=== ISSUE IDENTIFIED ===");
  console.log(`
The AirQualityCard component is only checking for pollutant values directly on the airQuality object:
- weather?.airQuality?.pm2_5
- weather?.airQuality?.pm10
- etc.

However, the API response structure from unified-weather.ts places these values inside a components object:
- weather?.airQuality?.components?.pm2_5
- weather?.airQuality?.components?.pm10
- etc.

This discrepancy in data structure is causing the pollutant values to be undefined in the component.
  `);
  
  console.log("\n=== PROPOSED SOLUTION ===");
  console.log(`
The AirQualityCard component should check for pollutant values in both structures:
1. Directly on airQuality (flat structure: weather.airQuality.pm2_5)
2. Inside components (nested structure: weather.airQuality.components.pm2_5)

Modified extraction code example:
const pm2_5 = weather?.airQuality?.pm2_5 !== undefined 
  ? weather.airQuality.pm2_5 
  : weather?.airQuality?.components?.pm2_5;

// Similar pattern for other pollutants
  `);
}

// Run the test
testComponentMapping();
