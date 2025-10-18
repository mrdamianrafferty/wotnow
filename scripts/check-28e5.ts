#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('*')
    .eq('rectangle_code', '28E5')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n28E5 Rectangle Details:');
  console.log('======================');
  console.log(`Code: ${data.rectangle_code}`);
  console.log(`Lat: ${data.center_lat}°N`);
  console.log(`Lon: ${data.center_lon}°E`);
  console.log(`Region: ${data.region}`);
  console.log(`CMEMS Region: ${data.cmems_region}`);
  console.log(`Coastal: ${data.is_coastal}`);
  console.log(`Name: ${data.name_en || 'N/A'}`);
}

main();
