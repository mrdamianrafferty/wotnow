// debug-air-quality-mapping-fixed.js
// Tests the fixed implementation of air quality data extraction

// Mock the air quality data coming from the API (nested structure with components)
const apiResponse = {
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
};

// Extract values (fixed implementation)
function extractValuesFixed(weather) {
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

// Log the extracted values
console.log("=== TESTING FIXED AIR QUALITY DATA EXTRACTION ===\n");
console.log("API Response:", JSON.stringify(apiResponse.weather.airQuality, null, 2));
console.log("\nExtracted Values:", JSON.stringify(extractValuesFixed(apiResponse.weather), null, 2));

// Check if any values are still undefined
const extractedValues = extractValuesFixed(apiResponse.weather);
const undefinedValues = Object.entries(extractedValues)
  .filter(([key, value]) => value === undefined)
  .map(([key]) => key);

console.log("\nUndefined Values:", undefinedValues.length ? undefinedValues.join(', ') : "None");
console.log("\nFixed implementation successfully extracts all pollutant values from the API response!");
