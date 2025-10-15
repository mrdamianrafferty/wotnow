import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(url, key);

async function fetchOpenMeteo(lat: number, lon: number) {
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

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const data = await response.json();
  const hourly = data?.hourly;
  if (!hourly) return null;

  // Get first non-null values
  const getFirstValue = (key: string) => {
    const arr = hourly[key];
    if (!Array.isArray(arr)) return null;
    return arr.find((v: any) => v != null) ?? null;
  };

  return {
    waveHeight: getFirstValue('wave_height'),
    waveDirection: getFirstValue('wave_direction'),
    wavePeriod: getFirstValue('wave_period'),
    seaTemp: getFirstValue('sea_surface_temperature'),
    currentVelocity: getFirstValue('ocean_current_velocity'),
    currentDirection: getFirstValue('ocean_current_direction'),
    timestamp: hourly.time?.[0],
  };
}

async function main() {
  const LIMIT = parseInt(process.env.FINDR_CONDITIONS_LIMIT || '0') || undefined;
  
  console.log('🌊 Open-Meteo Marine Data Ingestion\n');

  // Get rectangles
  let query = supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, cmems_region, distance_to_shore_km')
    .order('distance_to_shore_km', { ascending: true });

  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: rectangles } = await query;

  if (!rectangles || rectangles.length === 0) {
    console.error('❌ No rectangles found');
    return;
  }

  console.log(`📍 Processing ${rectangles.length} rectangles...\n`);

  let successCount = 0;
  let failCount = 0;
  const capturedAt = new Date().toISOString();

  for (const rect of rectangles) {
    console.log(`Processing ${rect.rectangle_code} (${rect.cmems_region}, ${rect.distance_to_shore_km}km)...`);
    
    const data = await fetchOpenMeteo(rect.center_lat, rect.center_lon);
    
    if (!data || data.seaTemp == null) {
      console.log(`  ❌ No data`);
      failCount++;
      continue;
    }

    // Insert into database
    const { error } = await supabase
      .from('findr_conditions_snapshots')
      .upsert({
        rectangle_code: rect.rectangle_code,
        captured_at: capturedAt,
        sea_temp_c: data.seaTemp,
        wave_height_m: data.waveHeight,
        wind_speed_kts: null, // Open-Meteo marine doesn't provide wind
        wind_direction_deg: null,
        source: 'open-meteo-marine',
        hourly_marine_json: data,
      }, {
        onConflict: 'rectangle_code,captured_at'
      });

    if (error) {
      console.log(`  ❌ Database error: ${error.message}`);
      failCount++;
    } else {
      console.log(`  ✅ Success - Temp: ${data.seaTemp}°C, Wave: ${data.waveHeight}m`);
      successCount++;
    }

    // Be nice to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Success: ${successCount}/${rectangles.length} (${Math.round(successCount/rectangles.length*100)}%)`);
  console.log(`   Failed: ${failCount}`);
}

main().catch(console.error);
