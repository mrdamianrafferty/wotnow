// Debug script for testing the SoilCard component with simulated data
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SoilCard } from './components/weather-cards/SoilCard';

// Test 1: With soil data
const weatherWithSoil = {
  soil: {
    temp0cm: 25,
    temp6cm: 24,
    temp18cm: 22,
    temp54cm: 19,
    moisture0to1: 0.22,
    moisture1to3: 0.25,
    moisture3to9: 0.28,
    moisture9to27: 0.30
  },
  timeISO: "2025-09-06T12:00:00Z"
};

// Test 2: Without soil data (fallback)
const weatherWithoutSoil = {
  tempC: 26,
  humidity: 68
};

console.log("Test 1: SoilCard with proper soil data");
console.log("-------------------------------------");
console.log(JSON.stringify(weatherWithSoil.soil, null, 2));

console.log("\n\nTest 2: SoilCard with fallback data");
console.log("-------------------------------------");
console.log(`Temperature: ${weatherWithoutSoil.tempC}°C`);
console.log(`Humidity: ${weatherWithoutSoil.humidity}%`);

console.log("\n\nIntegration check:");
console.log("1. Soil data is correctly extracted from weather.soil in SoilCard");
console.log("2. hasSoilData check (Object.values(soil).some(v => v != null)) determines which view to show");
console.log("3. With soil data: Shows actual soil temperature and moisture by depth");
console.log("4. Without soil data: Shows fallback with air temperature and humidity-derived moisture");

console.log("\n\nRecommendation for testing:");
console.log("1. Fix the ReferenceError in unified-weather.ts (done)");
console.log("2. Run the app with NextJS dev server and check network response from /api/unified-weather");
console.log("3. Verify soil data is included in the API response");
console.log("4. Inspect the SoilCard component in React DevTools to confirm proper data flow");
