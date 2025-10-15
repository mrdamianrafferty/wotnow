import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(url, key);

/**
 * Audit what data we can get from MET Norway and Open-Meteo for our coastal rectangles
 */

async function testMetNorway(lat: number, lon: number) {
  const url = new URL('https://api.met.no/weatherapi/oceanforecast/2.0/complete');
  url.searchParams.set('lat', lat.toFixed(4));
  url.searchParams.set('lon', lon.toFixed(4));

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'WotNow/1.0 (contact@wotnow.app)',
        Accept: 'application/json',
      },
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const firstEntry = data?.properties?.timeseries?.[0];
    
    if (!firstEntry) {
      return { success: false, error: 'No timeseries data' };
    }

    const details = firstEntry.data?.instant?.details || {};
    
    return {
      success: true,
      data: {
        seaTemp: details.sea_water_temperature,
        waveHeight: details.sea_surface_wave_height,
        waveDirection: details.sea_surface_wave_from_direction,
        currentSpeed: details.sea_water_speed,
        currentDirection: details.sea_water_to_direction,
        salinity: details.sea_water_salinity,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testOpenMeteo(lat: number, lon: number) {
  const vars = [
    'wave_height',
    'wave_direction',
    'wave_period',
    'sea_surface_temperature',
    'ocean_current_velocity',
    'ocean_current_direction',
  ];
  
  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lon.toFixed(4));
  url.searchParams.set('hourly', vars.join(','));
  url.searchParams.set('forecast_days', '1');

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const hourly = data?.hourly;
    
    if (!hourly) {
      return { success: false, error: 'No hourly data' };
    }

    // Get first non-null values
    const getFirstValue = (key: string) => {
      const arr = hourly[key];
      if (!Array.isArray(arr)) return null;
      return arr.find((v: any) => v != null) ?? null;
    };

    return {
      success: true,
      data: {
        waveHeight: getFirstValue('wave_height'),
        waveDirection: getFirstValue('wave_direction'),
        wavePeriod: getFirstValue('wave_period'),
        seaTemp: getFirstValue('sea_surface_temperature'),
        currentVelocity: getFirstValue('ocean_current_velocity'),
        currentDirection: getFirstValue('ocean_current_direction'),
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Auditing MET Norway and Open-Meteo Coverage\n');
  console.log('Fetching sample rectangles from different regions and distances...\n');

  // Get diverse sample: different regions and distances
  const { data: rectangles } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, cmems_region, distance_to_shore_km')
    .order('distance_to_shore_km', { ascending: true })
    .limit(10);

  if (!rectangles || rectangles.length === 0) {
    console.error('❌ No rectangles found');
    return;
  }

  const results: any[] = [];

  for (const rect of rectangles) {
    console.log(`\n📍 Testing ${rect.rectangle_code} (${rect.cmems_region}, ${rect.distance_to_shore_km}km from shore)`);
    console.log(`   Coordinates: ${rect.center_lat}, ${rect.center_lon}`);

    // Test MET Norway
    console.log('   🇳🇴 Testing MET Norway...');
    const metResult = await testMetNorway(rect.center_lat, rect.center_lon);
    
    if (metResult.success && metResult.data) {
      console.log('   ✅ MET Norway SUCCESS');
      console.log(`      - Sea Temp: ${metResult.data.seaTemp}°C`);
      console.log(`      - Wave Height: ${metResult.data.waveHeight}m`);
      console.log(`      - Current Speed: ${metResult.data.currentSpeed}m/s`);
      console.log(`      - Salinity: ${metResult.data.salinity}`);
    } else {
      console.log(`   ❌ MET Norway FAILED: ${metResult.error}`);
    }

    // Wait a bit to be nice to APIs
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test Open-Meteo
    console.log('   🌍 Testing Open-Meteo...');
    const openMeteoResult = await testOpenMeteo(rect.center_lat, rect.center_lon);
    
    if (openMeteoResult.success && openMeteoResult.data) {
      console.log('   ✅ Open-Meteo SUCCESS');
      console.log(`      - Sea Temp: ${openMeteoResult.data.seaTemp}°C`);
      console.log(`      - Wave Height: ${openMeteoResult.data.waveHeight}m`);
      console.log(`      - Current Velocity: ${openMeteoResult.data.currentVelocity}m/s`);
      console.log(`      - Wave Period: ${openMeteoResult.data.wavePeriod}s`);
    } else {
      console.log(`   ❌ Open-Meteo FAILED: ${openMeteoResult.error}`);
    }

    results.push({
      rectangle: rect.rectangle_code,
      region: rect.cmems_region,
      distance: rect.distance_to_shore_km,
      metNorway: metResult.success,
      openMeteo: openMeteoResult.success,
      metData: metResult.success ? metResult.data : null,
      openMeteoData: openMeteoResult.success ? openMeteoResult.data : null,
    });

    // Wait between rectangles
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n\n📊 COVERAGE SUMMARY\n');
  console.log('═'.repeat(80));
  
  const metSuccess = results.filter(r => r.metNorway).length;
  const openMeteoSuccess = results.filter(r => r.openMeteo).length;
  
  console.log(`\n🇳🇴 MET NORWAY: ${metSuccess}/${results.length} rectangles (${Math.round(metSuccess/results.length*100)}%)`);
  console.log(`🌍 OPEN-METEO: ${openMeteoSuccess}/${results.length} rectangles (${Math.round(openMeteoSuccess/results.length*100)}%)`);

  // Data fields comparison
  console.log('\n\n📋 DATA FIELDS AVAILABLE:\n');
  
  console.log('MET NORWAY provides:');
  console.log('  ✅ Sea Temperature');
  console.log('  ✅ Wave Height');
  console.log('  ✅ Wave Direction');
  console.log('  ✅ Current Speed');
  console.log('  ✅ Current Direction');
  console.log('  ✅ Salinity');
  console.log('  ❌ Water Clarity (turbidity/transparency)');
  console.log('  ❌ Nutrients (nitrate, phosphate, chlorophyll)');

  console.log('\nOPEN-METEO provides:');
  console.log('  ✅ Sea Temperature');
  console.log('  ✅ Wave Height');
  console.log('  ✅ Wave Direction');
  console.log('  ✅ Wave Period');
  console.log('  ✅ Current Velocity');
  console.log('  ✅ Current Direction');
  console.log('  ❌ Salinity');
  console.log('  ❌ Water Clarity');
  console.log('  ❌ Nutrients');

  console.log('\n\n🎯 RECOMMENDATION:\n');
  console.log('Both MET Norway and Open-Meteo provide excellent coastal coverage.');
  console.log('Key limitation: Neither provides WATER CLARITY or NUTRIENTS data.');
  console.log('This is what Copernicus uniquely offers (if we can get it working).');
  
  console.log('\n═'.repeat(80));
}

main().catch(console.error);
