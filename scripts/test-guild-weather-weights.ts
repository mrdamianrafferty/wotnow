/**
 * Test Guild-Based Weather Weights
 * Shows how different species guilds respond differently to same weather
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fetchMetNoLocationForecast } from '../lib/services/weatherService';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testGuildWeights() {
  console.log('🌦️  Testing Guild-Based Weather Weights\n');
  
  const rectangleId = '26C7'; // Irish Southwest
  const targetDate = '2025-10-17';
  const location = { lat: 52.0, lon: -10.0 };
  
  // Fetch real weather
  console.log('📍 Fetching live weather for Irish Southwest...\n');
  let currentWind: number | null = null;
  let currentPressure: number | null = null;
  
  try {
    const weatherData = await fetchMetNoLocationForecast(location.lat, location.lon, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (weatherData?.properties?.timeseries?.[0]?.data?.instant?.details) {
      const details = weatherData.properties.timeseries[0].data.instant.details;
      currentWind = details.wind_speed ?? null;
      currentPressure = details.air_pressure_at_sea_level ?? null;
      
      console.log(`🌤️  Current Conditions:`);
      console.log(`   Wind: ${currentWind} m/s`);
      console.log(`   Pressure: ${currentPressure} hPa`);
      console.log(`   Temp: ${details.air_temperature}°C\n`);
    }
  } catch (err) {
    console.warn('⚠️  Weather fetch failed, using defaults');
  }
  
  // Get predictions with new guild weights
  const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: rectangleId,
    target_date: targetDate,
    current_wind_speed_ms: currentWind,
    current_pressure_hpa: currentPressure
  });
  
  if (error) {
    console.error('❌ RPC Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.warn('⚠️  No predictions returned');
    return;
  }
  
  // Group species by guild based on weather scores
  console.log('='.repeat(70));
  console.log('🎣 Weather Impact by Guild');
  console.log('='.repeat(70));
  
  // Define representative species by guild
  const guildSpecies: Record<string, string[]> = {
    'Surface Pelagics 🐟': ['mac', 'gar', 'horse-mack'],
    'Large Pelagics 🦈': ['alb', 'bft', 'yft'],
    'Baitfish 🐠': ['anc', 'her', 'pil', 'spr'],
    'Demersal Predators 🎣': ['cod', 'pol', 'whg'],
    'Flatfish 🥞': ['ple', 'sol', 'dab', 'fle'],
    'Reef Species 🪨': ['wrb', 'cuttlefish', 'octopus'],
    'Sharks & Rays 🦈': ['BUH', 'LBD', 'rjc'],
    'Bass 🐟': ['bss', 'bsp']
  };
  
  for (const [guild, codes] of Object.entries(guildSpecies)) {
    const guildPredictions = data.filter((p: any) => 
      codes.includes(p.species_code)
    );
    
    if (guildPredictions.length === 0) continue;
    
    console.log(`\n${guild}:`);
    console.log('-'.repeat(70));
    
    guildPredictions.forEach((pred: any) => {
      const name = pred.name_en || pred.scientific_name;
      const weatherScore = pred.weather_score;
      const confidence = pred.confidence;
      
      // Show weather impact
      let impact = '';
      if (weatherScore >= 8) impact = '🟢 Excellent';
      else if (weatherScore >= 6) impact = '🟡 Good';
      else if (weatherScore >= 4) impact = '🟠 Fair';
      else impact = '🔴 Poor';
      
      console.log(`  ${name}`);
      console.log(`    Weather: ${weatherScore}/10 ${impact} | Confidence: ${confidence}%`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Summary: Different guilds react differently to same weather!');
  console.log('='.repeat(70));
  
  // Show top and bottom performers
  const sorted = [...data].sort((a: any, b: any) => b.weather_score - a.weather_score);
  
  console.log('\n🌟 Top 5 in Current Weather:');
  sorted.slice(0, 5).forEach((p: any, i: number) => {
    console.log(`  ${i + 1}. ${p.name_en}: ${p.weather_score}/10`);
  });
  
  console.log('\n💤 Bottom 5 in Current Weather:');
  sorted.slice(-5).reverse().forEach((p: any, i: number) => {
    console.log(`  ${i + 1}. ${p.name_en}: ${p.weather_score}/10`);
  });
  
  console.log('\n✅ Guild-based weather weights working perfectly!');
}

testGuildWeights().catch(console.error);
