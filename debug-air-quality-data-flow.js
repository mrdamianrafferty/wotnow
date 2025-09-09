// debug-air-quality-data-flow.js
// Script to debug the flow of air quality data from API to component rendering

import fetch from 'node-fetch';
import { assessAirQualityConditions } from './utils/airQualityUtils';

// Sample coordinates for testing
const TEST_LOCATIONS = [
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "New York", lat: 40.7128, lon: -74.0060 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "Beijing", lat: 39.9042, lon: 116.4074 }
];

// Helper to fetch from our API
async function fetchUnifiedWeather(lat, lon) {
  try {
    const url = `http://localhost:3000/api/unified-weather?lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching weather for ${lat},${lon}:`, error);
    return null;
  }
}

// Format air quality data for display
function formatAirQualityData(airQuality) {
  if (!airQuality) {
    return "No air quality data available";
  }

  const { aqi, components } = airQuality;
  
  // Extract and map component keys to readable names
  const componentMap = {
    co: 'Carbon Monoxide (CO)',
    no: 'Nitric Oxide (NO)',
    no2: 'Nitrogen Dioxide (NO₂)',
    o3: 'Ozone (O₃)',
    so2: 'Sulfur Dioxide (SO₂)',
    pm2_5: 'PM2.5',
    pm10: 'PM10',
    nh3: 'Ammonia (NH₃)'
  };
  
  let result = `AQI: ${aqi ?? 'N/A'}\n`;
  result += "Components:\n";
  
  if (!components || Object.keys(components).length === 0) {
    result += "  No component data available\n";
  } else {
    Object.entries(components).forEach(([key, value]) => {
      const name = componentMap[key] || key;
      result += `  ${name}: ${value ?? 'N/A'}\n`;
    });
  }
  
  return result;
}

// Log detailed mapping of data through the system
function logDataMapping(data) {
  if (!data) {
    console.log("No data received");
    return;
  }
  
  const { airQuality } = data;
  
  console.log("\n---------- RAW DATA ----------");
  console.log("airQuality object:", JSON.stringify(airQuality, null, 2));
  
  // Log what the component would receive
  console.log("\n---------- COMPONENT PROPS ----------");
  console.log("weather.airQuality:", JSON.stringify({
    aqi: airQuality?.aqi,
    pm2_5: airQuality?.components?.pm2_5,
    pm10: airQuality?.components?.pm10,
    no2: airQuality?.components?.no2,
    o3: airQuality?.components?.o3,
    so2: airQuality?.components?.so2,
    co: airQuality?.components?.co
  }, null, 2));
  
  // Log assessment result
  const assessment = assessAirQualityConditions({
    overall: airQuality?.aqi,
    pm2_5: airQuality?.components?.pm2_5,
    pm10: airQuality?.components?.pm10,
    no2: airQuality?.components?.no2,
    o3: airQuality?.components?.o3,
    so2: airQuality?.components?.so2,
    co: airQuality?.components?.co
  });
  
  console.log("\n---------- ASSESSMENT RESULT ----------");
  console.log(JSON.stringify(assessment, null, 2));
  
  // Check for potential data mapping issues
  console.log("\n---------- POTENTIAL ISSUES ----------");
  
  // Check if components exist but are not properly mapped
  if (airQuality?.components) {
    const componentKeys = Object.keys(airQuality.components);
    const expectedKeys = ['pm2_5', 'pm10', 'no2', 'o3', 'so2', 'co'];
    const missingKeys = expectedKeys.filter(key => !componentKeys.includes(key));
    
    if (missingKeys.length > 0) {
      console.log(`Missing expected components: ${missingKeys.join(', ')}`);
    }
    
    // Check if there are keys with different naming conventions
    const possibleNameMappings = {
      'PM2.5': 'pm2_5',
      'PM10': 'pm10',
      'NO2': 'no2',
      'O3': 'o3',
      'SO2': 'so2',
      'CO': 'co'
    };
    
    Object.entries(possibleNameMappings).forEach(([altKey, standardKey]) => {
      if (altKey in airQuality.components && !(standardKey in airQuality.components)) {
        console.log(`Found alternative key "${altKey}" instead of standard key "${standardKey}"`);
      }
    });
  } else {
    console.log("No components object found in airQuality data");
  }
  
  // Check for undefined vs null values
  if (airQuality?.components) {
    const undefinedValues = [];
    const nullValues = [];
    
    Object.entries(airQuality.components).forEach(([key, value]) => {
      if (value === undefined) undefinedValues.push(key);
      if (value === null) nullValues.push(key);
    });
    
    if (undefinedValues.length > 0) {
      console.log(`Components with undefined values: ${undefinedValues.join(', ')}`);
    }
    
    if (nullValues.length > 0) {
      console.log(`Components with null values: ${nullValues.join(', ')}`);
    }
  }
}

// Main execution
async function main() {
  console.log("=== AIR QUALITY DATA FLOW DEBUGGER ===");
  
  for (const location of TEST_LOCATIONS) {
    console.log(`\n========== ${location.name} (${location.lat}, ${location.lon}) ==========`);
    const data = await fetchUnifiedWeather(location.lat, location.lon);
    
    if (!data) {
      console.log("Failed to fetch data");
      continue;
    }
    
    console.log(formatAirQualityData(data.airQuality));
    logDataMapping(data);
  }
  
  console.log("\n=== DEBUGGING COMPLETE ===");
}

// Run the debug script
main().catch(console.error);
