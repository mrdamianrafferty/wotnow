/**
 * Test script for air quality assessment
 */

// Mock the air quality data
const mockAirQuality = {
  overall: 75, // Moderate
  pm2_5: 30,   // Moderate
  pm10: 80,    // Moderate
  no2: 120,    // Moderate
  o3: 60,      // Moderate
  so2: 40,     // Good
  co: 572.5,   // 0.5 ppm - Good
  components: {
    pm2_5: 30,
    pm10: 80,
    no2: 120,
    o3: 60,
    so2: 40,
    co: 572.5
  }
};

// Air Quality Levels enum (copy from actual code)
const AirQualityLevel = {
  NONE: 0,
  GOOD: 1,
  MODERATE: 2,
  UNHEALTHY_SENSITIVE: 3,
  UNHEALTHY: 4,
  VERY_UNHEALTHY: 5,
  HAZARDOUS: 6
};

// Mock getAirQualityLevel function
function getAirQualityLevel(aqi) {
  if (aqi === undefined || aqi < 0) return AirQualityLevel.NONE;
  
  if (aqi <= 50) return AirQualityLevel.GOOD;
  if (aqi <= 100) return AirQualityLevel.MODERATE;
  if (aqi <= 150) return AirQualityLevel.UNHEALTHY_SENSITIVE;
  if (aqi <= 200) return AirQualityLevel.UNHEALTHY;
  if (aqi <= 300) return AirQualityLevel.VERY_UNHEALTHY;
  return AirQualityLevel.HAZARDOUS;
}

// Mock convertCOtoPPM function
function convertCOtoPPM(coMicrogramsPerM3) {
  if (coMicrogramsPerM3 === undefined) return undefined;
  return coMicrogramsPerM3 / 1145;
}

// Mock formatPollutantValue function
function formatPollutantValue(value) {
  if (value === undefined) return 'N/A';
  
  // Multiply by 100, ceil, then divide by 100 to round up to 2 decimal places
  const roundedUp = Math.ceil(value * 100) / 100;
  
  // Ensure we always display 2 decimal places
  return roundedUp.toFixed(2);
}

// Mock assessAirQualityConditions function
function assessAirQualityConditions(airQuality) {
  // Get values from either direct properties or nested components
  const pm2_5Value = airQuality?.pm2_5 !== undefined ? airQuality.pm2_5 : airQuality?.components?.pm2_5;
  const pm10Value = airQuality?.pm10 !== undefined ? airQuality.pm10 : airQuality?.components?.pm10;
  const no2Value = airQuality?.no2 !== undefined ? airQuality.no2 : airQuality?.components?.no2;
  const o3Value = airQuality?.o3 !== undefined ? airQuality.o3 : airQuality?.components?.o3;
  const so2Value = airQuality?.so2 !== undefined ? airQuality.so2 : airQuality?.components?.so2;
  
  // For CO, we need to convert from μg/m³ to ppm
  const coRaw = airQuality?.co !== undefined ? airQuality.co : airQuality?.components?.co;
  const coValue = convertCOtoPPM(coRaw);

  const assessment = {
    overall: getAirQualityLevel(airQuality.overall),
    pm2_5: getAirQualityLevel(pm2_5Value),
    pm10: getAirQualityLevel(pm10Value),
    no2: getAirQualityLevel(no2Value),
    o3: getAirQualityLevel(o3Value),
    so2: getAirQualityLevel(so2Value),
    co: getAirQualityLevel(coValue),
    warnings: []
  };

  // Generate warnings based on levels (simplified for test)
  if (assessment.overall >= AirQualityLevel.UNHEALTHY_SENSITIVE) {
    assessment.warnings.push('Air quality warning: Unhealthy conditions');
  }

  return assessment;
}

// Run test
console.log("Testing Air Quality Assessment");
console.log("==============================");

const assessment = assessAirQualityConditions(mockAirQuality);

console.log("Air Quality Data:");
console.log(mockAirQuality);
console.log("\nAssessment Results:");
console.log(assessment);

console.log("\nFormatted Values for UI Display:");
console.log(`PM2.5: ${formatPollutantValue(mockAirQuality.pm2_5)}`);
console.log(`PM10: ${formatPollutantValue(mockAirQuality.pm10)}`);
console.log(`NO2: ${formatPollutantValue(mockAirQuality.no2)}`);
console.log(`O3: ${formatPollutantValue(mockAirQuality.o3)}`);
console.log(`SO2: ${formatPollutantValue(mockAirQuality.so2)}`);
console.log(`CO: ${formatPollutantValue(convertCOtoPPM(mockAirQuality.co))}`);

// Test a value that needs rounding up
const smallValue = 0.08901310043668123; // Should round to 0.09
console.log(`\nTesting rounding up: ${smallValue} → ${formatPollutantValue(smallValue)}`);
