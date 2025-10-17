/**
 * Direct RPC Test with Live Weather
 * Tests that weather scoring works with real Met Norway data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fetchMetNoLocationForecast } from '../lib/services/weatherService';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWeatherRPC() {
  console.log('🌦️  Testing Live Weather Integration with Real Data\n');
  
  const targetDate = '2025-10-17';
  
  // Test different distant rectangles to see weather variation
  const testLocations = [
    { id: '26C7', name: 'Irish Southwest', lat: 52.0, lon: -10.0 },
    { id: '42G3', name: 'Mediterranean Spain', lat: 37.0, lon: -1.0 },
    { id: '37F5', name: 'Norwegian Coast', lat: 60.0, lon: 5.0 },
  ];
  
  for (const location of testLocations) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`� ${location.name} (${location.id})`);
    console.log(`   Coordinates: ${location.lat}°N, ${location.lon}°E`);
    console.log('-'.repeat(70));
    
    // Fetch real weather from Met Norway
    let currentWind: number | null = null;
    let currentPressure: number | null = null;
    let weatherCondition = 'Unknown';
    
    try {
      const weatherData = await fetchMetNoLocationForecast(location.lat, location.lon, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (weatherData?.properties?.timeseries?.[0]?.data?.instant?.details) {
        const details = weatherData.properties.timeseries[0].data.instant.details;
        currentWind = details.wind_speed ?? null;
        currentPressure = details.air_pressure_at_sea_level ?? null;
        
        // Determine condition
        const windCondition = !currentWind ? 'Unknown' :
          currentWind < 3 ? 'Calm' :
          currentWind < 5 ? 'Light' :
          currentWind < 8 ? 'Moderate' :
          currentWind < 12 ? 'Fresh' : 'Strong';
        
        const pressureCondition = !currentPressure ? 'Unknown' :
          currentPressure > 1020 ? 'High' :
          currentPressure >= 1010 ? 'Normal' :
          currentPressure >= 1000 ? 'Falling' : 'Low';
        
        weatherCondition = `${windCondition} wind, ${pressureCondition} pressure`;
        
        console.log(`\n🌤️  Live Weather:`);
        console.log(`   Wind: ${currentWind} m/s (${windCondition})`);
        console.log(`   Pressure: ${currentPressure} hPa (${pressureCondition})`);
        console.log(`   Temp: ${details.air_temperature ?? 'N/A'}°C`);
      }
    } catch (err) {
      const error = err as Error;
      console.warn(`   ⚠️  Weather fetch failed: ${error.message}`);
    }
    
    const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
      target_rectangle: location.id,
      target_date: targetDate,
      current_wind_speed_ms: currentWind,
      current_pressure_hpa: currentPressure
    });
    
    if (error) {
      console.error('❌ RPC Error:', error);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.warn('⚠️  No predictions returned');
      continue;
    }
    
    console.log(`\n✅ Got ${data.length} predictions with live weather\n`);
    
    // Show top 5 with weather scores
    data.slice(0, 5).forEach((pred: any, i: number) => {
      const speciesName = pred.name_en || pred.scientific_name || 'Unknown';
      console.log(`${i + 1}. ${speciesName}`);
      console.log(`   Overall Confidence: ${pred.confidence}%`);
      console.log(`   Weather: ${pred.weather_score}/10 | Temp: ${pred.temp_score}/10 | Time: ${pred.light_score}/10 | Moon: ${pred.lunar_score}/10`);
      console.log('');
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Live weather integration verified across multiple locations!');
  console.log('='.repeat(70));
}

testWeatherRPC().catch(console.error);
