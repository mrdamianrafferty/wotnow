import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRectangle() {
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, region')
    .eq('rectangle_code', '21C6')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Rectangle 21C6:');
    console.log(`  Coordinates: ${data.center_lat}°N, ${data.center_lon}°E`);
    console.log(`  Region: ${data.region}`);
    
    // Determine CMEMS region
    const lat = data.center_lat;
    const lon = data.center_lon;
    const cmemsRegion = lat >= 53 && lat <= 66 && lon >= 9 && lon <= 30 ? 'BAL' : 
                       lat >= 30 && lat <= 46 && lon >= -6 && lon <= 37 ? 'MED' : 'IBI';
    console.log(`  CMEMS Region: ${cmemsRegion}`);
  }
}

checkRectangle();
