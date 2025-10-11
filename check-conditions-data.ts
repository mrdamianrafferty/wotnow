import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

async function checkConditionsData() {
  // Check specific rectangle that showed in the logs
  const { data, error } = await client
    .from('findr_conditions_latest')
    .select('*')
    .eq('rectangle_code', '20C5')
    .single();

  if (error) {
    console.error('Query error:', error);
  } else if (data) {
    console.log('Data for rectangle 20C5:');
    console.log('- Rectangle:', data.rectangle_code);
    console.log('- Wind speed (kts):', data.wind_speed_kts);
    console.log('- Wave height (m):', data.wave_height_m);
    console.log('- Sea temp (C):', data.sea_temp_c);
    console.log('- Source:', data.source);
    console.log('- Captured at:', data.captured_at);
    
    // Check hourly data
    if (data.hourly_marine_json) {
      console.log('\nHourly data type:', typeof data.hourly_marine_json);
      let hourly;
      try {
        hourly = typeof data.hourly_marine_json === 'string' 
          ? JSON.parse(data.hourly_marine_json)
          : data.hourly_marine_json;
        
        if (Array.isArray(hourly) && hourly.length > 0) {
          console.log('\nFirst 3 hourly entries:');
          hourly.slice(0, 3).forEach((hour: { windSpeedKts?: number; waveHeightM?: number; seaTemperatureC?: number }, i: number) => {
            console.log(`  Hour ${i + 1}: Wind ${hour.windSpeedKts}kts, Wave ${hour.waveHeightM}m, Temp ${hour.seaTemperatureC}°C`);
          });
        } else {
          console.log('\nHourly data is not an array or is empty:', hourly);
        }
      } catch (err) {
        console.error('\nFailed to parse hourly data:', err);
      }
    } else {
      console.log('\nNo hourly marine data');
    }
  } else {
    console.log('No data found for rectangle 20C5');
  }
}

checkConditionsData().catch(console.error);