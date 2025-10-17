/**
 * Direct Test of Weather Service
 * Tests Met Norway API fetching
 */

import { fetchMetNoLocationForecast } from '../lib/services/weatherService';

async function testWeatherService() {
  console.log('🌦️  Testing Met Norway Weather Service\n');
  
  // Test location: Irish Southwest (26C7 center)
  const lat = 52.0;
  const lon = -10.0;
  
  console.log(`📍 Fetching weather for: ${lat}, ${lon}`);
  console.log('-'.repeat(60));
  
  try {
    const weatherData = await fetchMetNoLocationForecast(lat, lon, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!weatherData) {
      console.error('❌ No weather data returned');
      return;
    }
    
    console.log('✅ Weather data received');
    
    const firstEntry = weatherData.properties?.timeseries?.[0];
    if (!firstEntry) {
      console.error('❌ No timeseries data');
      return;
    }
    
    const details = firstEntry.data?.instant?.details;
    if (!details) {
      console.error('❌ No instant details');
      return;
    }
    
    console.log('\n📊 Current Conditions:');
    console.log(`   Time: ${firstEntry.time}`);
    console.log(`   Wind Speed: ${details.wind_speed ?? 'N/A'} m/s`);
    console.log(`   Wind Direction: ${details.wind_from_direction ?? 'N/A'}°`);
    console.log(`   Pressure: ${details.air_pressure_at_sea_level ?? 'N/A'} hPa`);
    console.log(`   Air Temp: ${details.air_temperature ?? 'N/A'}°C`);
    console.log(`   Cloud Cover: ${details.cloud_area_fraction ?? 'N/A'}%`);
    console.log(`   Humidity: ${details.relative_humidity ?? 'N/A'}%`);
    
    // Calculate weather score using our algorithm
    const windSpeed = details.wind_speed ?? null;
    const pressure = details.air_pressure_at_sea_level ?? null;
    
    if (windSpeed !== null && pressure !== null) {
      const windScore = windSpeed < 3 ? 10 : windSpeed < 5 ? 8 : windSpeed < 8 ? 6 : windSpeed < 12 ? 4 : 2;
      const pressureScore = pressure > 1020 ? 10 : pressure >= 1010 ? 7 : pressure >= 1000 ? 9 : 4;
      
      // Default weights
      const windWeight = 0.5;
      const pressureWeight = 0.5;
      
      const weatherScore = Math.round(
        (windScore * windWeight + pressureScore * pressureWeight) / (windWeight + pressureWeight)
      );
      
      console.log('\n🎯 Calculated Scores:');
      console.log(`   Wind Score: ${windScore}/10`);
      console.log(`   Pressure Score: ${pressureScore}/10`);
      console.log(`   Combined Weather Score: ${weatherScore}/10`);
      
      console.log('\n✅ Met Norway integration working!');
    } else {
      console.warn('\n⚠️  Missing wind or pressure data');
    }
    
  } catch (error) {
    console.error('❌ Weather fetch failed:', error);
  }
}

testWeatherService().catch(console.error);
