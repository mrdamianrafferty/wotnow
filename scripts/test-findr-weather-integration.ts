#!/usr/bin/env npx tsx

/**
 * Test Findr conditions API with weather data integration
 * 
 * Verifies:
 * - Marine data from Supabase (sea temp, waves, etc.)
 * - Weather data from waterfall (air temp, weather icon, precip)
 * - Proper merging of both data sources
 */

const TEST_RECTANGLE = '24E1'; // North Sea, good test location

async function testFindrWeatherIntegration() {
  console.log('🧪 Testing Findr Conditions API with Weather Integration\n');
  console.log(`📍 Test Rectangle: ${TEST_RECTANGLE}\n`);

  try {
    const url = `http://localhost:3000/api/findr/conditions?rectangleCode=${TEST_RECTANGLE}`;
    console.log(`🌐 Fetching: ${url}\n`);

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    const data = await response.json();

    // Check rectangle metadata
    console.log('📦 Rectangle Metadata:');
    console.log(`   Code: ${data.rectangle?.code}`);
    console.log(`   Name: ${data.rectangle?.name}`);
    console.log(`   Region: ${data.rectangle?.region}`);
    console.log(`   Center: ${data.rectangle?.centerLat?.toFixed(4)}, ${data.rectangle?.centerLon?.toFixed(4)}`);
    console.log(`   Source: ${data.source}\n`);

    // Check marine snapshot data
    console.log('🌊 Marine Snapshot:');
    console.log(`   Sea Temp: ${data.snapshot?.marine?.seaTemperatureC?.toFixed(1)}°C`);
    console.log(`   Wave Height: ${data.snapshot?.marine?.waveHeightM?.toFixed(1)}m`);
    console.log(`   Wind Speed: ${data.snapshot?.marine?.windSpeedKts?.toFixed(0)} kts`);
    console.log(`   Captured: ${data.snapshot?.capturedAt}\n`);

    // Check hourly data
    const hourly = data.snapshot?.hourly;
    if (!hourly || hourly.length === 0) {
      console.error('❌ No hourly data found');
      process.exit(1);
    }

    console.log(`📊 Hourly Data: ${hourly.length} entries\n`);

    // Find first entry with weather data (skip past hours)
    const firstWeatherIndex = hourly.findIndex((h: any) => h.airTempC !== null && h.airTempC !== undefined);
    const startIndex = firstWeatherIndex >= 0 ? firstWeatherIndex : 0;

    // Check 3 hourly entries starting from first weather data
    console.log(`🕐 Next 3 Hours (starting from ${startIndex === firstWeatherIndex ? 'first weather data' : 'beginning'}):`);
    for (let i = startIndex; i < Math.min(startIndex + 3, hourly.length); i++) {
      const entry = hourly[i];
      const time = new Date(entry.time).toLocaleString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        day: '2-digit',
        month: 'short'
      });
      
      console.log(`\n   [${time}]`);
      
      // Marine data (should always be present)
      console.log(`   Marine:`);
      console.log(`     Sea Temp: ${entry.seaTemperatureC?.toFixed(1) || '—'}°C`);
      console.log(`     Wave Height: ${entry.waveHeightM?.toFixed(1) || '—'}m`);
      console.log(`     Wind Speed: ${entry.windSpeedKts?.toFixed(0) || '—'} kts`);
      
      // Weather data (newly integrated)
      console.log(`   Weather:`);
      console.log(`     Air Temp: ${entry.airTempC?.toFixed(1) || '—'}°C`);
      console.log(`     Icon: ${entry.weatherIcon || '—'}`);
      console.log(`     Precip: ${entry.precipMM?.toFixed(1) || '—'}mm`);
      console.log(`     Precip Prob: ${entry.precipProbability ? (entry.precipProbability * 100).toFixed(0) + '%' : '—'}`);
    }

    // Verify weather data is present
    console.log('\n✅ Verification:');
    const hasAirTemp = hourly.some((h: any) => h.airTempC !== null && h.airTempC !== undefined);
    const hasWeatherIcon = hourly.some((h: any) => h.weatherIcon !== null && h.weatherIcon !== undefined);
    const hasPrecip = hourly.some((h: any) => h.precipMM !== null && h.precipMM !== undefined);

    console.log(`   Air Temperature: ${hasAirTemp ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Weather Icons: ${hasWeatherIcon ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Precipitation: ${hasPrecip ? '✅ Present' : '❌ Missing'}`);

    if (hasAirTemp && hasWeatherIcon) {
      console.log('\n🎉 SUCCESS! Weather data successfully integrated into Findr conditions!');
      console.log('✨ Findr hourly carousel should now display air temperature and weather icons.');
      process.exit(0);
    } else {
      console.log('\n⚠️  WARNING: Some weather fields are missing.');
      console.log('   Check server logs for weather waterfall errors.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error testing Findr weather integration:', error);
    process.exit(1);
  }
}

// Run the test
testFindrWeatherIntegration();
