// debug-air-quality-units.js
// Script to examine API response units for air quality data

// Helper function to fetch from our unified weather API
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

// Fetch directly from OpenWeather API to compare units
async function fetchOpenWeatherAirQuality(lat, lon) {
  try {
    // Replace with your actual API key
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY; 
    const url = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching OpenWeather air quality for ${lat},${lon}:`, error);
    return null;
  }
}

// Main function
async function main() {
  // Example countryside location (replace with your actual location if desired)
  const lat = 51.5074;
  const lon = -0.1278;

  console.log(`===== CO Units Debug for location (${lat}, ${lon}) =====`);
  
  // Fetch from our unified API
  console.log("\n1. Fetching from our unified-weather API...");
  const unifiedData = await fetchUnifiedWeather(lat, lon);
  
  if (unifiedData && unifiedData.airQuality) {
    console.log("Air Quality from unified API:");
    console.log(JSON.stringify(unifiedData.airQuality, null, 2));
    
    // Check specifically for CO values
    const coFromUnified = unifiedData.airQuality.components?.co;
    console.log(`\nCO value from unified API: ${coFromUnified} (expected unit: mg/m³ or μg/m³)`);
  } else {
    console.log("No air quality data received from unified API");
  }
  
  // Fetch directly from OpenWeather
  console.log("\n2. Fetching directly from OpenWeather API...");
  const openWeatherData = await fetchOpenWeatherAirQuality(lat, lon);
  
  if (openWeatherData && openWeatherData.list && openWeatherData.list.length > 0) {
    const components = openWeatherData.list[0].components;
    console.log("Air Quality components from OpenWeather API:");
    console.log(JSON.stringify(components, null, 2));
    
    // Check specifically for CO values
    const coFromOpenWeather = components.co;
    console.log(`\nCO value from OpenWeather API: ${coFromOpenWeather} (expected unit: μg/m³)`);
    
    // Calculate conversion if needed (μg/m³ to ppm for CO)
    // For CO at 25°C: 1ppm ≈ 1.145 mg/m³ ≈ 1145 μg/m³
    if (coFromOpenWeather) {
      const coInPpm = coFromOpenWeather / 1145;
      console.log(`CO converted from μg/m³ to ppm: ${coInPpm.toFixed(2)} ppm`);
      
      // Check if this converted value would trigger the hazardous level
      if (coInPpm > 30.5) {
        console.log(`WARNING: Converted value ${coInPpm.toFixed(2)} ppm is in HAZARDOUS range (>30.5 ppm)`);
        console.log("This is unusual for a countryside location and may indicate a unit conversion issue");
      }
    }
  } else {
    console.log("No data received from OpenWeather API");
  }
  
  console.log("\n===== Unit Conversion Issue Check =====");
  console.log("According to EPA and WHO standards:");
  console.log("- OpenWeather API returns CO in μg/m³");
  console.log("- AirQualityCard component expects CO in ppm");
  console.log("- Conversion factor: 1ppm ≈ 1.145 mg/m³ ≈ 1145 μg/m³");
  console.log("\nPOSSIBLE ISSUE: If CO value from API (in μg/m³) is not being converted to ppm before display");
  console.log("A value of 101.92 μg/m³ would be approximately 0.09 ppm (GOOD range), not hazardous");
}

// Run the script
main().catch(console.error);
