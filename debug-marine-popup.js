/**
 * Debug script to test marine popup data flow
 * Run this in the browser console to simulate marine popup data
 */

console.log('🌊 MARINE POPUP DEBUG SCRIPT');

// Test data from Stormglass
const mockMarineHour = {
  time: '2025-08-23T12:00:00+00:00',
  windSpeed: { noaa: 15 }, // knots
  windDirection: { noaa: 220 }, // degrees
  windGust: { noaa: 18 }, // knots  
  waveHeight: { noaa: 1.2 }, // meters
  swellHeight: { noaa: 0.8 }, // meters
  swellDirection: { noaa: 200 }, // degrees
  swellPeriod: { noaa: 8 }, // seconds
  waterTemperature: { noaa: 18 }, // celsius
  visibility: { noaa: 15 } // km
};

// Test day object
const mockDay = {
  date: Math.floor(Date.now() / 1000),
  temperature: 22,
  marine: [mockMarineHour]
};

// Simulate the getPopupDay function
function knotsToMps(knots) {
  return knots * 0.514444;
}

const windSpeedKnots = mockMarineHour.windSpeed?.noaa;
const windSpeedMps = windSpeedKnots ? knotsToMps(windSpeedKnots) : undefined;

const processedDay = {
  ...mockDay,
  waveHeight: mockMarineHour.waveHeight?.noaa,
  swellHeight: mockMarineHour.swellHeight?.noaa,
  swellPeriod: mockMarineHour.swellPeriod?.noaa,
  waterTemperature: mockMarineHour.waterTemperature?.noaa,
  windSpeed: windSpeedMps,
  swellDir: mockMarineHour.swellDirection?.noaa,
  gust: mockMarineHour.windGust?.noaa ? knotsToMps(mockMarineHour.windGust.noaa) : undefined,
  vis: mockMarineHour.visibility?.noaa,
  windDir: mockMarineHour.windDirection?.noaa,
};

console.log('📦 Mock marine hour:', mockMarineHour);
console.log('🎯 Processed day object:', processedDay);

// Test the normalization
function testNormalization() {
  const sources = [undefined, processedDay, undefined]; // marine sources order
  
  const fields = {
    windSpeed: ['windSpeed', 'windspeed', 'wind_speed'],
    waveHeight: ['waveHeight', 'wave_height', 'waveHeight'],
    waterTemperature: ['waterTemperature', 'waterTemp', 'waterTemperature'],
    swellHeight: ['swellHeight', 'swell_height', 'swellHeight'],
    swellPeriod: ['swellPeriod', 'swell_period', 'swellPeriod']
  };
  
  const normalized = {};
  
  for (const [fieldName, paths] of Object.entries(fields)) {
    for (const source of sources) {
      if (!source) continue;
      for (const path of paths) {
        if (source[path] !== undefined && source[path] !== null) {
          normalized[fieldName] = source[path];
          break;
        }
      }
      if (normalized[fieldName] !== undefined) break;
    }
  }
  
  console.log('✅ Normalized fields:', normalized);
  return normalized;
}

const normalized = testNormalization();

// Test marineData object construction
const marineData = {
  waveHeight: normalized.waveHeight,
  waterTemperature: normalized.waterTemperature,
  swellHeight: normalized.swellHeight,
  swellPeriod: normalized.swellPeriod,
  windSpeed: normalized.windSpeed,
  gust: processedDay.gust,
  windDir: processedDay.windDir,
  swellDir: processedDay.swellDir,
  vis: processedDay.vis,
  beachOrientation: null
};

console.log('🎭 Final marineData for popup:', marineData);

// Test if popup would show marine fields
const hasMarineData = !!(
  marineData.waveHeight !== undefined ||
  marineData.waterTemperature !== undefined ||
  marineData.swellHeight !== undefined ||
  marineData.swellPeriod !== undefined ||
  marineData.windSpeed !== undefined ||
  marineData.gust !== undefined ||
  marineData.vis !== undefined
);

console.log('🔍 Has marine data:', hasMarineData);
console.log('🎬 Marine fields check:', {
  waveHeight: marineData.waveHeight !== undefined,
  waterTemperature: marineData.waterTemperature !== undefined,
  swellHeight: marineData.swellHeight !== undefined,
  swellPeriod: marineData.swellPeriod !== undefined,
  windSpeed: marineData.windSpeed !== undefined,
  gust: marineData.gust !== undefined,
  vis: marineData.vis !== undefined
});
