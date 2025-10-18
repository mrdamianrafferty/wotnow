#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const rectangleCode = process.argv[2] || '28E5';
  
  const { data, error } = await supabase
    .from('findr_conditions_snapshots')
    .select('*')
    .eq('rectangle_code', rectangleCode)
    .eq('source', 'copernicus')
    .order('captured_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n${rectangleCode} Data from Database:`);
  console.log('='.repeat(50) + '\n');
  
  if (!data || data.length === 0) {
    console.log('No data found.\n');
    return;
  }
  
  data?.forEach((row, i) => {
    console.log(`Record ${i + 1}:`);
    console.log(`  Date: ${row.captured_at.split('T')[0]}`);
    console.log(`  Temperature: ${row.sea_temperature_c ?? 'N/A'} °C`);
    console.log(`  Salinity: ${row.salinity_psu ?? 'N/A'} PSU`);
    console.log(`  Chlorophyll: ${row.chlorophyll_ug_l ?? 'N/A'} µg/L`);
    console.log(`  Clarity: ${row.clarity_m ?? 'N/A'} m`);
    console.log(`  Nitrate: ${row.nitrate_umol_l ?? 'N/A'} µmol/L`);
    console.log(`  Phosphate: ${row.phosphate_umol_l ?? 'N/A'} µmol/L`);
    console.log(`  Oxygen: ${row.dissolved_oxygen_mg_l ?? 'N/A'} mg/L`);
    
    const variables = [
      row.sea_temperature_c, row.salinity_psu, row.chlorophyll_ug_l,
      row.clarity_m, row.nitrate_umol_l, row.phosphate_umol_l,
      row.dissolved_oxygen_mg_l
    ];
    const count = variables.filter(v => v !== null && v !== undefined).length;
    const present = variables.map((v, i) => 
      v !== null && v !== undefined ? ['Temp', 'Sal', 'Chl', 'Clar', 'NO3', 'PO4', 'O2'][i] : null
    ).filter(Boolean);
    
    console.log(`  Variables: ${count}/7 [${present.join(', ')}]`);
    console.log();
  });
}

main();
