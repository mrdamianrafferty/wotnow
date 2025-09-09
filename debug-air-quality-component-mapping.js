// debug-air-quality-component-mapping.js
// Script to debug the transformation of data in the AirQualityCard component

import React from 'react';
import { renderToString } from 'react-dom/server';
import { assessAirQualityConditions } from './utils/airQualityUtils';

// Sample air quality data with different structures to test component handling
const testData = [
  {
    name: "Complete Data",
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
    name: "Flat Structure (OpenWeatherMap format)",
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
    name: "Null Components",
    weather: {
      airQuality: {
        aqi: 30,
        components: {
          co: 200,
          no: 5,
          no2: 30,
          o3: null,
          so2: null,
          pm2_5: null,
          pm10: null
        }
      }
    }
  }
];

// Mock the AirQualityCard component to test data mapping
const MockAirQualityCard = ({ weather, aqiAssess }) => {
  // Extract values directly from weather (for flat structure)
  const aqi = weather?.airQuality?.aqi || 0;
  
  // Extract component values, checking both flat and nested structures
  const pm2_5 = weather?.airQuality?.pm2_5 !== undefined 
    ? weather.airQuality.pm2_5 
    : weather?.airQuality?.components?.pm2_5;
  
  const pm10 = weather?.airQuality?.pm10 !== undefined 
    ? weather.airQuality.pm10 
    : weather?.airQuality?.components?.pm10;
  
  const no2 = weather?.airQuality?.no2 !== undefined 
    ? weather.airQuality.no2 
    : weather?.airQuality?.components?.no2;
  
  const o3 = weather?.airQuality?.o3 !== undefined 
    ? weather.airQuality.o3 
    : weather?.airQuality?.components?.o3;
  
  const so2 = weather?.airQuality?.so2 !== undefined 
    ? weather.airQuality.so2 
    : weather?.airQuality?.components?.so2;
  
  const co = weather?.airQuality?.co !== undefined 
    ? weather.airQuality.co 
    : weather?.airQuality?.components?.co;
  
  // Return a debug representation
  return (
    <div>
      <h3>AirQualityCard Debug Output</h3>
      <div>
        <strong>AQI:</strong> {aqi}
      </div>
      <div>
        <strong>Component values extracted by component:</strong>
        <ul>
          <li>PM2.5: {pm2_5 !== undefined ? pm2_5 : 'undefined'}</li>
          <li>PM10: {pm10 !== undefined ? pm10 : 'undefined'}</li>
          <li>NO2: {no2 !== undefined ? no2 : 'undefined'}</li>
          <li>O3: {o3 !== undefined ? o3 : 'undefined'}</li>
          <li>SO2: {so2 !== undefined ? so2 : 'undefined'}</li>
          <li>CO: {co !== undefined ? co : 'undefined'}</li>
        </ul>
      </div>
    </div>
  );
};

// Function to run the tests
function testComponentMapping() {
  console.log("=== TESTING AIR QUALITY COMPONENT DATA MAPPING ===\n");
  
  testData.forEach(data => {
    console.log(`\n---------- TEST CASE: ${data.name} ----------`);
    
    // Log raw input data
    console.log("\nInput data:");
    console.log(JSON.stringify(data.weather.airQuality, null, 2));
    
    // Create assessment for the component
    const aqiAssess = assessAirQualityConditions({
      overall: data.weather.airQuality.aqi,
      pm2_5: data.weather.airQuality.pm2_5 || data.weather.airQuality.components?.pm2_5,
      pm10: data.weather.airQuality.pm10 || data.weather.airQuality.components?.pm10,
      no2: data.weather.airQuality.no2 || data.weather.airQuality.components?.no2,
      o3: data.weather.airQuality.o3 || data.weather.airQuality.components?.o3,
      so2: data.weather.airQuality.so2 || data.weather.airQuality.components?.so2,
      co: data.weather.airQuality.co || data.weather.airQuality.components?.co
    });
    
    // Render the component to string to see how it processes the data
    try {
      const output = renderToString(
        <MockAirQualityCard weather={data.weather} aqiAssess={aqiAssess} />
      );
      
      // Extract relevant information from the rendered output for logging
      const extractedValues = {
        aqi: data.weather.airQuality.aqi,
        pm2_5: data.weather.airQuality.pm2_5 || data.weather.airQuality.components?.pm2_5,
        pm10: data.weather.airQuality.pm10 || data.weather.airQuality.components?.pm10,
        no2: data.weather.airQuality.no2 || data.weather.airQuality.components?.no2,
        o3: data.weather.airQuality.o3 || data.weather.airQuality.components?.o3,
        so2: data.weather.airQuality.so2 || data.weather.airQuality.components?.so2,
        co: data.weather.airQuality.co || data.weather.airQuality.components?.co
      };
      
      console.log("\nExtracted values by component:");
      console.log(JSON.stringify(extractedValues, null, 2));
      
      // Provide analysis of potential issues
      const undefinedValues = Object.entries(extractedValues)
        .filter(([key, value]) => value === undefined)
        .map(([key]) => key);
      
      const nullValues = Object.entries(extractedValues)
        .filter(([key, value]) => value === null)
        .map(([key]) => key);
      
      if (undefinedValues.length > 0) {
        console.log(`\nValues that are undefined: ${undefinedValues.join(', ')}`);
      }
      
      if (nullValues.length > 0) {
        console.log(`\nValues that are null: ${nullValues.join(', ')}`);
      }
    } catch (error) {
      console.error("Error rendering component:", error);
    }
  });
  
  console.log("\n=== PROPOSED SOLUTION ===");
  console.log(`
The AirQualityCard component should check for pollutant values in both structures:
1. Directly on airQuality (flat structure: weather.airQuality.pm2_5)
2. Inside components (nested structure: weather.airQuality.components.pm2_5)

Modified extraction code:
const pm2_5 = weather?.airQuality?.pm2_5 !== undefined 
  ? weather.airQuality.pm2_5 
  : weather?.airQuality?.components?.pm2_5;

// Similar pattern for other pollutants
  `);
}

// Run the test
testComponentMapping();
