#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
);

async function main() {
  // Get a sample NOAA grid to see what data is populated
  const { data: sample, error } = await supabase
    .from('grid_conditions_latest')
    .select('*')
    .contains('sources', ['noaacwBLENDEDsstDaily.analysed_sst'])
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('Sample NOAA grid data:');
  console.log('');

  // Check each environmental variable
  const vars: Record<string, string> = {
    'Temperature': 'surface_temperature_c',
    'Chlorophyll': 'chlorophyll_mg_m3',
    'Oxygen': 'oxygen_mg_l',
    'Salinity': 'salinity_psu',
    'Nitrate': 'nitrate_umol_l',
    'Phosphate': 'phosphate_umol_l',
    'Bottom Temp': 'bottom_temperature_c',
    'Water Clarity (Kd490)': 'kd490',
    'pH': 'ph',
    'Wind Speed': 'wind_speed_ms',
    'Wind Direction': 'wind_direction_deg',
    'Wave Height': 'wave_height_m',
    'Wave Period': 'wave_period_s',
    'Wave Direction': 'wave_direction_deg',
    'Current Speed': 'current_speed_ms',
    'Current Direction': 'current_direction_deg',
    'Sea Level Anomaly': 'sea_level_anomaly_m',
    'Ice Fraction': 'ice_fraction',
  };

  console.log('Environmental Variables from NOAA:');
  console.log('=====================================');
  console.log('');

  let populatedCount = 0;
  let nullCount = 0;

  for (const [label, field] of Object.entries(vars)) {
    const value = (sample as any)[field];
    const isPopulated = value !== null && value !== undefined;
    const status = isPopulated ? '✅' : '❌';
    const display = isPopulated ? value : 'NULL';

    console.log(`${status} ${label.padEnd(25)} ${display}`);

    if (isPopulated) {
      populatedCount++;
    } else {
      nullCount++;
    }
  }

  console.log('');
  console.log(`Populated: ${populatedCount} / ${Object.keys(vars).length}`);
  console.log(`Missing: ${nullCount} / ${Object.keys(vars).length}`);
  console.log('');
  console.log('Conclusion:');
  console.log('===========');
  if (populatedCount === 1 && (sample as any).surface_temperature_c !== null) {
    console.log('❌ NOAA ERDDAP noaacwBLENDEDsstDaily dataset ONLY provides sea surface temperature.');
    console.log('❌ All other environmental variables (chlorophyll, oxygen, salinity, etc.) are NULL.');
    console.log('');
    console.log('To get additional environmental data, you would need to:');
    console.log('1. Find additional NOAA ERDDAP datasets for biogeochemical variables');
    console.log('2. Integrate CMEMS data for American waters (currently only using NOAA)');
    console.log('3. Modify the Edge Function to fetch from multiple datasets per grid');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
